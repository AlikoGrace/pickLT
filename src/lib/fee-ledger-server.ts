import type { Databases, Models } from 'node-appwrite'
import { ID, Query } from 'node-appwrite'

import { APPWRITE } from '@/lib/constants'
import { DEFAULT_CURRENCY, normalizeCurrency, type CurrencyCode } from '@/lib/currency'
import { moverLedgerPermissions } from '@/lib/doc-permissions'
import {
  computeFeeStanding,
  parseFeePolicy,
  type FeePolicy,
  type FeeStanding,
  type FeeStandingResult,
  type LedgerEntryLike,
  type LedgerKind,
} from '@/lib/feeLedger'

/**
 * Server-side half of the driver's fee balance (plan `fees/0.master.md` §11
 * contract): append a `mover_ledger` row, and recompute the `mover_profiles`
 * snapshot from the whole ledger with the market's `fee_policy`. The same two
 * steps every ledger writer runs (`postmoverledger`, `settlefees`, admin).
 *
 * The pure parts (row → entry, snapshot patch, Stripe intent verification) are
 * exported for the unit tests; the I/O takes `databases` from the caller's
 * `createAdminClient()`. Server-only: imports `node-appwrite`.
 */

export const MOVER_LEDGER_COLLECTION = process.env.APPWRITE_COLLECTION_MOVER_LEDGER || 'mover_ledger'
const PLATFORM_CONFIG_COLLECTION = 'platform_config'

/** Appwrite rows are schemaless at the SDK boundary. */
type AnyDoc = Record<string, any>

export interface FeeSnapshot {
  feeBalanceCents: number
  feeOwedCents: number
  feeOldestDueAt: string | null
  feeStanding: FeeStanding
  feeSuspendSuggested: boolean
}

/** The snapshot as stored on a profile. Legacy rows without the fields are ok (contract). */
export function snapshotOf(profile: AnyDoc | null | undefined): FeeSnapshot {
  const int = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? Math.round(v) : 0)
  const standing = profile?.feeStanding
  return {
    feeBalanceCents: int(profile?.feeBalanceCents),
    feeOwedCents: int(profile?.feeOwedCents),
    feeOldestDueAt: typeof profile?.feeOldestDueAt === 'string' ? profile.feeOldestDueAt : null,
    feeStanding: standing === 'due' || standing === 'overdue' || standing === 'restricted' ? standing : 'ok',
    feeSuspendSuggested: profile?.feeSuspendSuggested === true,
  }
}

/** A `mover_ledger` row as the pure module's entry; the row's own `$createdAt` is its time. */
export function ledgerEntryFromDoc(doc: AnyDoc): LedgerEntryLike {
  return {
    kind: String(doc.kind ?? ''),
    amountCents: typeof doc.amountCents === 'number' ? doc.amountCents : Number(doc.amountCents) || 0,
    dueAt: typeof doc.dueAt === 'string' ? doc.dueAt : null,
    createdAt: String(doc.createdAt ?? doc.$createdAt ?? ''),
  }
}

/**
 * The profile update for a recomputed standing. `feeStandingSince` moves only
 * when the standing changes (contract).
 */
export function snapshotPatch(
  previous: AnyDoc | null | undefined,
  result: FeeStandingResult,
  nowIso: string,
): Record<string, unknown> {
  const patch: Record<string, unknown> = {
    feeBalanceCents: result.balanceCents,
    feeOwedCents: result.owedCents,
    feeOldestDueAt: result.oldestUnpaidDueAt,
    feeStanding: result.standing,
    feeSuspendSuggested: result.suspendSuggested,
  }
  if (snapshotOf(previous).feeStanding !== result.standing || !previous?.feeStandingSince) {
    patch.feeStandingSince = nowIso
  }
  return patch
}

/** `'22.60'` — the `i18nParams.amount` shape (conventions §3.4: the app formats the currency). */
export function centsToAmountParam(cents: number): string {
  return (Math.abs(Math.round(cents)) / 100).toFixed(2)
}

/**
 * The currency a driver's balance is kept in: that of their ledger rows (plan
 * currency/0; port of `ledgerCurrency` in the functions' `fee-standing.js`). A
 * driver works in one market, so every row shares it; a row from before
 * markets had currencies is euro. An empty ledger is euro.
 */
export function ledgerCurrency(rows: readonly AnyDoc[] | null | undefined): CurrencyCode {
  const list = rows ?? []
  for (let i = list.length - 1; i >= 0; i -= 1) {
    const c = list[i]?.currency
    if (typeof c === 'string' && c) return normalizeCurrency(c)
  }
  return DEFAULT_CURRENCY
}

export interface StripeIntentLike {
  id?: string
  status?: string
  amount?: number
  amount_received?: number
  currency?: string
  metadata?: Record<string, string> | null
}

export type IntentRefusal =
  | 'payment.intentNotSucceeded'
  | 'payment.metadataMismatch'
  | 'payment.amountMismatch'

/**
 * `settlefees` confirm: the intent must have succeeded, be a fee settlement
 * for THIS driver, and have collected exactly what it asked for, in the
 * currency of the driver's ledger (plan currency/0: one balance, one currency,
 * nothing converted; euro when the caller names none).
 * Returns the amount to credit, or the refusal code (same codes as chargemove).
 */
export function verifyFeeSettlementIntent(
  intent: StripeIntentLike,
  moverProfileId: string,
  expectedCurrency: string = DEFAULT_CURRENCY,
): { ok: true; amountCents: number } | { ok: false; fnCode: IntentRefusal } {
  if (intent.status !== 'succeeded') return { ok: false, fnCode: 'payment.intentNotSucceeded' }
  if (intent.metadata?.kind !== 'fee_settlement' || intent.metadata?.moverProfileId !== moverProfileId) {
    return { ok: false, fnCode: 'payment.metadataMismatch' }
  }
  const amount = intent.amount
  if (
    typeof amount !== 'number' ||
    !(amount > 0) ||
    (typeof intent.amount_received === 'number' && intent.amount_received !== amount) ||
    (intent.currency ?? '').toUpperCase() !== normalizeCurrency(expectedCurrency)
  ) {
    return { ok: false, fnCode: 'payment.amountMismatch' }
  }
  return { ok: true, amountCents: amount }
}

/** Appwrite's duplicate (unique index / id) failure — an idempotent re-post. */
export function isDuplicateError(err: unknown): boolean {
  const e = err as { code?: number; type?: string } | null
  return e?.code === 409 || e?.type === 'document_already_exists'
}

// ── I/O ──────────────────────────────────────────────────────────────────────

/** `platform_config.fee_policy` for the driver's market; defaults on any failure. */
export async function loadFeePolicy(databases: Databases, countryCode: unknown): Promise<FeePolicy> {
  try {
    const cfg = await databases.listDocuments(APPWRITE.DATABASE_ID, PLATFORM_CONFIG_COLLECTION, [
      Query.equal('key', 'fee_policy'),
      Query.limit(1),
    ])
    const raw = (cfg.documents[0] as unknown as { value?: string } | undefined)?.value
    return parseFeePolicy(raw ?? null, typeof countryCode === 'string' ? countryCode : null)
  } catch (err) {
    console.warn('[fees] fee_policy lookup failed, using defaults:', err)
    return parseFeePolicy(null)
  }
}

/** Every ledger row of one driver (oldest first), paged through. */
export async function listAllLedgerRows(databases: Databases, moverProfileId: string): Promise<Models.Document[]> {
  const rows: Models.Document[] = []
  let cursor: string | null = null
  for (;;) {
    const queries = [Query.equal('moverProfileId', moverProfileId), Query.orderAsc('$createdAt'), Query.limit(100)]
    if (cursor) queries.push(Query.cursorAfter(cursor))
    const page = await databases.listDocuments(APPWRITE.DATABASE_ID, MOVER_LEDGER_COLLECTION, queries)
    rows.push(...page.documents)
    if (page.documents.length < 100) break
    cursor = page.documents[page.documents.length - 1].$id
  }
  return rows
}

export interface LedgerRowInput {
  moverProfileId: string
  driverUserId: string
  kind: LedgerKind
  amountCents: number
  idempotencyKey: string
  actorRole: 'system' | 'admin' | 'mover'
  actorId?: string | null
  moveId?: string | null
  moveHandle?: string | null
  currency?: string
  countryCode?: string | null
  dueAt?: string | null
  method?: string | null
  reference?: string | null
  note?: string | null
}

/** The refusal of a row in another currency than the driver's ledger (plan currency/0). */
export const CURRENCY_MISMATCH = 'fees.currencyMismatch'

/**
 * Appends one row; readable by the driver only (contract). Idempotent on
 * `idempotencyKey` (unique index): a duplicate returns `{ created: false }`.
 *
 * One balance, one currency (plan currency/0): a row in another currency than
 * the driver's ledger is refused and logged, never converted
 * (`{ created: false, refused: 'fees.currencyMismatch' }`), as
 * `postCompletedMove` and `settlefees` do.
 */
export async function appendLedgerRow(
  databases: Databases,
  row: LedgerRowInput,
): Promise<{ created: boolean; refused?: typeof CURRENCY_MISMATCH }> {
  const currency = normalizeCurrency(row.currency)
  const latest = await databases.listDocuments(APPWRITE.DATABASE_ID, MOVER_LEDGER_COLLECTION, [
    Query.equal('moverProfileId', row.moverProfileId),
    Query.orderDesc('$createdAt'),
    Query.limit(1),
  ])
  if (latest.documents.length > 0 && ledgerCurrency(latest.documents) !== currency) {
    console.error(
      `[fees] ${row.kind} in ${currency} refused, the ledger of ${row.moverProfileId} is in ${ledgerCurrency(latest.documents)}`,
    )
    return { created: false, refused: CURRENCY_MISMATCH }
  }
  const data: Record<string, unknown> = {
    moverProfileId: row.moverProfileId,
    driverUserId: row.driverUserId,
    kind: row.kind,
    amountCents: Math.round(row.amountCents),
    currency,
    actorRole: row.actorRole,
    idempotencyKey: row.idempotencyKey,
  }
  for (const key of ['actorId', 'moveId', 'moveHandle', 'countryCode', 'dueAt', 'method', 'reference', 'note'] as const) {
    const v = row[key]
    if (v != null && v !== '') data[key] = v
  }
  try {
    await databases.createDocument(
      APPWRITE.DATABASE_ID,
      MOVER_LEDGER_COLLECTION,
      ID.unique(),
      data,
      moverLedgerPermissions(row.driverUserId),
    )
    return { created: true }
  } catch (err) {
    if (isDuplicateError(err)) return { created: false }
    throw err
  }
}

/**
 * Recompute and write the profile snapshot from the whole ledger. Returns the
 * standing before and after so the caller can send a transition notification.
 */
export async function recomputeFeeSnapshot(
  databases: Databases,
  profile: AnyDoc,
  nowMs: number = Date.now(),
): Promise<{ before: FeeSnapshot; result: FeeStandingResult; currency: CurrencyCode }> {
  const [rows, policy] = await Promise.all([
    listAllLedgerRows(databases, profile.$id),
    loadFeePolicy(databases, profile.countryCode),
  ])
  const result = computeFeeStanding(rows.map(ledgerEntryFromDoc), nowMs, policy)
  await databases.updateDocument(
    APPWRITE.DATABASE_ID,
    APPWRITE.COLLECTIONS.MOVER_PROFILES,
    profile.$id,
    snapshotPatch(profile, result, new Date(nowMs).toISOString()),
  )
  return { before: snapshotOf(profile), result, currency: ledgerCurrency(rows) }
}
