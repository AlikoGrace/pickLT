/**
 * The driver's balance with the platform (plan `.agent/plans/fees/0.master.md`,
 * owner decisions 2026-10-03). One signed number per driver, kept as an
 * append-only ledger:
 *
 *   + the platform owes the driver   (card earnings, a driver's payment in)
 *   − the driver owes the platform   (the platform fee on a cash move, charges)
 *
 * A cash driver owes the **platform fee only** (D1) — the quote's
 * `platformFee` line; VAT stays with the driver. Card earnings net against it
 * (D4). Credits pay off the oldest debts first, and the age of the oldest
 * unpaid debt plus the amount owed decide the standing (D2):
 *
 *   ok          nothing owed
 *   due         owed, not yet past its due date (7 days after the move)
 *   overdue     past its due date
 *   restricted  ≥ 7 days overdue, or more than €100 owed — no broadcasts,
 *               cannot go online, cannot accept; lifts the moment it is paid
 *
 * and `suspendSuggested` once a debt is 30 days overdue (suspension itself
 * stays an admin decision). All amounts are integer euro cents.
 *
 * Pure. Web port of `pickltmobile/lib/fee-ledger.ts` (same arithmetic, this
 * repo's module names; golden tests ported in `__tests__/feeLedger.test.ts`).
 * Edit the mobile file first and keep the two in step.
 */

import { type PricingConfig } from '@/lib/pricing'
import { parseBreakdown, type QuoteBreakdown } from '@/lib/pricingEngine'
import { moverPayoutEur, moverPayoutFromGross, payoutRatesFrom, type PayoutMoveLike } from '@/lib/moverPayout'

export type LedgerKind =
  | 'cash_fee_due'
  | 'card_earning'
  | 'driver_payment'
  | 'payout'
  | 'adjustment'
  | 'waiver'
  | 'charge'

export type FeeStanding = 'ok' | 'due' | 'overdue' | 'restricted'

export interface FeePolicy {
  /** A cash move's fee falls due this many days after completion. */
  cashGraceHours: number
  cashRestrictOverdueHours: number
  graceDays: number
  /** Restricted once the oldest unpaid fee is this many days past due. */
  restrictOverdueDays: number
  /** …or once the driver owes more than this (cents). */
  restrictBalanceCents: number
  /** Suspension suggested to admin at this many days past due. */
  suspendSuggestDays: number
}

/** Owner decision D2 (2026-10-03); overridable per market in `platform_config.fee_policy`. */
export const DEFAULT_FEE_POLICY: FeePolicy = {
  cashGraceHours: 24,
  cashRestrictOverdueHours: 0,
  graceDays: 7,
  restrictOverdueDays: 7,
  restrictBalanceCents: 10000,
  suspendSuggestDays: 30,
}

const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS

export interface LedgerEntryLike {
  kind: LedgerKind | string
  /** Signed cents: + platform owes driver, − driver owes platform. */
  amountCents: number
  /** When a debt falls due; absent on credits and on debts due at once. */
  dueAt?: string | null
  createdAt: string
}

export interface FeeStandingResult {
  balanceCents: number
  /** What the driver owes (≥ 0). */
  owedCents: number
  /** Due date of the oldest debt not yet covered by credits, or null. */
  oldestUnpaidDueAt: string | null
  standing: FeeStanding
  suspendSuggested: boolean
}

function isNum(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n)
}

function positiveInt(v: unknown, fallback: number): number {
  return isNum(v) && v >= 0 ? Math.round(v) : fallback
}

/**
 * `platform_config.fee_policy`: `{ "GLOBAL": {...}, "GH": {...} }` (a bare
 * object counts as GLOBAL). Unknown or malformed fields keep the default.
 */
export function parseFeePolicy(raw: unknown, countryCode?: string | null): FeePolicy {
  let doc: unknown = raw
  if (typeof doc === 'string') {
    try {
      doc = JSON.parse(doc)
    } catch {
      doc = null
    }
  }
  if (!doc || typeof doc !== 'object' || Array.isArray(doc)) return { ...DEFAULT_FEE_POLICY }
  const table = doc as Record<string, unknown>
  const looksBare = Object.keys(DEFAULT_FEE_POLICY).some((k) => k in table)
  const global = (looksBare ? table : table.GLOBAL) as Record<string, unknown> | undefined
  const code = typeof countryCode === 'string' ? countryCode.trim().toUpperCase() : ''
  const market = (code && !looksBare ? table[code] : undefined) as Record<string, unknown> | undefined
  const pick = (key: keyof FeePolicy): number =>
    positiveInt(market?.[key], positiveInt(global?.[key], DEFAULT_FEE_POLICY[key]))
  return {
    cashGraceHours: pick('cashGraceHours'),
    cashRestrictOverdueHours: pick('cashRestrictOverdueHours'),
    graceDays: pick('graceDays'),
    restrictOverdueDays: pick('restrictOverdueDays'),
    restrictBalanceCents: pick('restrictBalanceCents'),
    suspendSuggestDays: pick('suspendSuggestDays'),
  }
}

function grossOf(move: PayoutMoveLike): number {
  const final = move.finalPrice
  if (isNum(final) && final > 0) return final
  return isNum(move.estimatedPrice) && move.estimatedPrice > 0 ? move.estimatedPrice : 0
}

function breakdownOf(move: PayoutMoveLike): QuoteBreakdown | null {
  return typeof move.priceBreakdown === 'string' || move.priceBreakdown == null
    ? parseBreakdown(move.priceBreakdown)
    : move.priceBreakdown
}

/**
 * The platform fee on a move, in cents (D1). Exact from the quote when the
 * charged gross is the quote's total; otherwise the fee the engine would have
 * taken on that gross (VAT stripped, payout subtracted). 0 without a price.
 */
export function platformFeeCents(move: PayoutMoveLike, config?: PricingConfig | null): number {
  const gross = grossOf(move)
  if (!(gross > 0)) return 0
  const breakdown = breakdownOf(move)
  if (breakdown && Math.abs(breakdown.total - gross) < 0.005 && isNum(breakdown.platformFee)) {
    return Math.max(0, Math.round(breakdown.platformFee * 100))
  }
  const rates = payoutRatesFrom(breakdown, config)
  const exVatCents = Math.round((gross / (1 + rates.vatRate)) * 100)
  const payoutCents = Math.round(moverPayoutFromGross(gross, rates) * 100)
  return Math.max(0, exVatCents - payoutCents)
}

export interface CompletedMoveLike extends PayoutMoveLike {
  $id: string
  paymentMethod?: string | null
  completedAt?: string | null
}

export interface LedgerPosting {
  kind: 'cash_fee_due' | 'card_earning'
  amountCents: number
  dueAt: string | null
  idempotencyKey: string
}

/**
 * What a completed move posts to the ledger: a card move credits the driver's
 * payout (the platform holds the money), anything else is cash in the
 * driver's hand and debits the platform fee, due `cashGraceHours` later. Null when
 * there is nothing to post (no price, or a zero fee/payout).
 */
export function postingForCompletedMove(
  move: CompletedMoveLike,
  nowIso: string,
  policy: FeePolicy = DEFAULT_FEE_POLICY,
  config?: PricingConfig | null,
): LedgerPosting | null {
  const completedAt = move.completedAt && Number.isFinite(Date.parse(move.completedAt)) ? move.completedAt : nowIso
  if ((move.paymentMethod ?? '').toLowerCase() === 'card') {
    const cents = Math.round(moverPayoutEur(move, config) * 100)
    if (cents <= 0) return null
    return { kind: 'card_earning', amountCents: cents, dueAt: null, idempotencyKey: `move:${move.$id}:card_earning` }
  }
  const fee = platformFeeCents(move, config)
  if (fee <= 0) return null
  return {
    kind: 'cash_fee_due',
    amountCents: -fee,
    dueAt: new Date(Date.parse(completedAt) + policy.cashGraceHours * HOUR_MS).toISOString(),
    idempotencyKey: `move:${move.$id}:cash_fee_due`,
  }
}

/**
 * Balance and standing from the ledger. Credits pay off debts oldest-due
 * first (FIFO); each debt still (partly) unpaid then has a due time and a
 * cut-off — a cash fee's cut-off is its due time (+ `cashRestrictOverdueHours`),
 * any other debt's is `restrictOverdueDays` after its due date. A debt without
 * `dueAt` is due when it was created.
 */
export function computeFeeStanding(
  entries: readonly LedgerEntryLike[],
  nowMs: number,
  policy: FeePolicy = DEFAULT_FEE_POLICY,
): FeeStandingResult {
  let balanceCents = 0
  let credit = 0
  const debts: { cents: number; dueMs: number; cutoffMs: number }[] = []
  for (const e of entries) {
    const amount = isNum(e.amountCents) ? Math.round(e.amountCents) : 0
    balanceCents += amount
    if (amount > 0) credit += amount
    else if (amount < 0) {
      const parsed = Date.parse(e.dueAt ?? e.createdAt)
      const dueMs = Number.isFinite(parsed) ? parsed : nowMs
      const allowance =
        e.kind === 'cash_fee_due' ? policy.cashRestrictOverdueHours * HOUR_MS : policy.restrictOverdueDays * DAY_MS
      debts.push({ cents: -amount, dueMs, cutoffMs: dueMs + allowance })
    }
  }
  debts.sort((a, b) => a.dueMs - b.dueMs)
  const unpaid: { dueMs: number; cutoffMs: number }[] = []
  for (const d of debts) {
    if (credit >= d.cents) {
      credit -= d.cents
      continue
    }
    credit = 0
    unpaid.push(d)
  }

  const owedCents = Math.max(0, -balanceCents)
  // Owing nothing on balance means every debt is covered, whatever the order.
  if (owedCents === 0) unpaid.length = 0
  const oldestUnpaidMs = unpaid.length ? Math.min(...unpaid.map((d) => d.dueMs)) : null

  let standing: FeeStanding = 'ok'
  let suspendSuggested = false
  if (owedCents > 0) {
    const cutOff = unpaid.some((d) => nowMs >= d.cutoffMs)
    const pastDue = unpaid.some((d) => nowMs > d.dueMs)
    if (owedCents > policy.restrictBalanceCents || cutOff) standing = 'restricted'
    else if (pastDue) standing = 'overdue'
    else standing = 'due'
    suspendSuggested = oldestUnpaidMs != null && nowMs - oldestUnpaidMs >= policy.suspendSuggestDays * DAY_MS
  }
  return {
    balanceCents,
    owedCents,
    oldestUnpaidDueAt: oldestUnpaidMs == null ? null : new Date(oldestUnpaidMs).toISOString(),
    standing,
    suspendSuggested,
  }
}

/** The work gate (D2): everything but `restricted` may receive and accept moves. */
export function feeStandingAllowsWork(profile: { feeStanding?: string | null } | null | undefined): boolean {
  return profile?.feeStanding !== 'restricted'
}
