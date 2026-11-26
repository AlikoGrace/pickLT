/**
 * The price of an instant move for one particular mover, and the offer that
 * waits for the client (plan pickltmobile `.agent/plans/pricing/8.approach-distance.md`,
 * option B).
 *
 * The move is priced once; each offer then carries the mover's own drive to
 * the pickup address, so a mover sees earnings for their distance and the
 * client is never charged for someone else's. When a mover accepts an offer
 * that costs the client more than the price the client agreed to, the move is
 * not assigned: the client is asked first.
 *
 * Web port of `functions/acceptmove/src/offer-pricing.js` and of the server
 * half of `pending-offer.js`, on top of the web engine. The reader half is
 * `./pending-offer` (shared with the apps). Server-only.
 */
import { Query, type Databases, type Models } from 'node-appwrite'

import { APPWRITE, PLATFORM_TZ } from '@/lib/constants'
import { unknownAttributeOf, writeDroppingUnknownAttributes } from '@/lib/appwrite-write'
import { acceptedServiceDateFor } from '@/lib/mover-vetting'
import { relId, writeNotification } from '@/lib/notify'
import { AWAITING_CLIENT, CLIENT_CONFIRM_SECONDS, parsePendingOffer, type PendingOffer } from '@/lib/pending-offer'
import type { PricingConfig } from '@/lib/pricing'
import { parseBreakdown, repriceApproach, serializeBreakdown, type QuoteBreakdown } from '@/lib/pricingEngine'
import { loadPricingConfig } from '@/lib/pricing-server'

export { AWAITING_CLIENT, CLIENT_CONFIRM_SECONDS, parsePendingOffer } from '@/lib/pending-offer'

type Row = Record<string, unknown>

// ── offer-pricing.js ───────────────────────────────────────────────────────

const EARTH_RADIUS_KM = 6371

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const rad = (d: number) => (d * Math.PI) / 180
  const dLat = rad(lat2 - lat1)
  const dLon = rad(lon2 - lon1)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
}

function coord(v: unknown): number | null {
  // `null` and '' are "no position", not the equator.
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

/** Straight-line metres from the mover's stored position to the pickup, or `null` when either is unknown. */
export function approachMetres(move: Row | null | undefined, mover: Row | null | undefined): number | null {
  const pLat = coord(move?.pickupLatitude)
  const pLng = coord(move?.pickupLongitude)
  const mLat = coord(mover?.currentLatitude)
  const mLng = coord(mover?.currentLongitude)
  if (pLat === null || pLng === null || mLat === null || mLng === null) return null
  if (mLat === 0 && mLng === 0) return null
  return Math.round(haversineKm(pLat, pLng, mLat, mLng) * 1000)
}

/** A move's price for one mover. */
export interface MoverOffer {
  breakdown: QuoteBreakdown
  /** Straight-line metres from the mover to the pickup address. */
  approachM: number
  /** What the client pays with this mover, VAT included. */
  total: number
  /** What the mover earns: the total less VAT and less the platform fee. */
  payout: number
}

/**
 * The offer for this mover: the move's stored quote with the approach line for
 * the mover's distance. `null` when the move has no v3 quote, is not an instant
 * move, or a position is missing; the caller then offers the move at its
 * stored price, as before this feature.
 */
export function priceOfferForMover(args: {
  move: Row | null | undefined
  mover?: Row | null
  config?: PricingConfig | null
  /** A distance already measured (the one the offer row carries); otherwise it is measured here. */
  approachM?: number | null
}): MoverOffer | null {
  const { move, mover, config, approachM } = args
  if (!move || move.moveCategory !== 'instant') return null
  const stored = parseBreakdown(move.priceBreakdown)
  if (!stored || stored.mode !== 'instant') return null
  const metres =
    typeof approachM === 'number' && Number.isFinite(approachM)
      ? Math.max(0, Math.round(approachM))
      : approachMetres(move, mover)
  if (metres === null) return null
  const breakdown = repriceApproach(stored, metres / 1000, config)
  return {
    breakdown,
    approachM: metres,
    total: breakdown.total,
    payout: Math.round((breakdown.net - breakdown.platformFee) * 100) / 100,
  }
}

/** Columns of a `move_requests` row that carry its price. */
export function offerColumns(offer: MoverOffer | null | undefined): Row {
  if (!offer) return {}
  return {
    offerTotalCents: Math.round(offer.total * 100),
    offerPayoutCents: Math.round(offer.payout * 100),
    offerApproachM: offer.approachM,
  }
}

/** Columns of a `moves` row when this offer becomes the price of the move. */
export function movePriceColumns(offer: MoverOffer): { estimatedPrice: number; priceBreakdown: string; approachM: number } {
  return {
    estimatedPrice: offer.total,
    priceBreakdown: serializeBreakdown(offer.breakdown),
    approachM: offer.approachM,
  }
}

/**
 * The market's rates, GLOBAL with the country's rows laid over. Never throws:
 * the compiled defaults apply. The web's one config loader, under the name the
 * functions use.
 */
export function loadPricingOverrides(databases: Databases, countryCode?: unknown): Promise<PricingConfig> {
  return loadPricingConfig(databases, typeof countryCode === 'string' ? countryCode : null)
}

// ── pending-offer.js (server half) ─────────────────────────────────────────

function cents(eur: unknown): number {
  const n = Number(eur)
  return Number.isFinite(n) ? Math.round(n * 100) : 0
}

/**
 * Whether the client must confirm before this offer can be accepted: only when
 * it costs more than what they agreed to. The same price or a lower one goes
 * through, and the client pays the lower amount.
 */
export function offerNeedsClientConfirmation(agreedTotal: unknown, offerTotal: unknown): boolean {
  return cents(offerTotal) > cents(agreedTotal)
}

/** The JSON kept in `moves.pendingOffer` while the client is being asked. */
export function buildPendingOffer(args: {
  requestId: string
  moverProfileId: string
  moverName?: unknown
  total: unknown
  previousTotal: unknown
  approachM: unknown
  nowMs: number
}): string {
  return JSON.stringify({
    requestId: args.requestId,
    moverProfileId: args.moverProfileId,
    moverName: typeof args.moverName === 'string' ? args.moverName.slice(0, 80) : '',
    total: cents(args.total) / 100,
    previousTotal: cents(args.previousTotal) / 100,
    approachM: Math.max(0, Math.round(Number(args.approachM) || 0)),
    expiresAt: new Date(args.nowMs + CLIENT_CONFIRM_SECONDS * 1000).toISOString(),
  })
}

export function pendingOfferExpired(offer: PendingOffer | null | undefined, nowMs: number): boolean {
  return !offer || Date.parse(offer.expiresAt) <= nowMs
}

/**
 * Whether a write failed only because a column of this feature does not exist
 * yet (the schema script has not been applied). Callers retry without the new
 * columns, so code deployed ahead of the schema keeps working as before.
 */
export function isUnknownAttributeError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String((e as { message?: unknown } | null)?.message ?? e ?? '')
  return unknownAttributeOf(e) !== null || /unknown attribute|invalid document structure|attribute not found|unknown column/i.test(msg)
}

// ── What the two web routes share ──────────────────────────────────────────

/**
 * A move is assignable when it sits in a pre-assignment status.
 * Mirrors functions/acceptmove/src/main.js and pickltmover/lib/move-requests.ts.
 */
export const ASSIGNABLE_STATUSES: ReadonlySet<unknown> = new Set([
  'draft',
  'pending_payment',
  'paid',
  'booked',
  'mover_assigned',
])

/**
 * Assign the mover and advance the move, as `/api/mover/accept-move` always
 * did, plus the price for this mover and the end of any price prompt. The
 * columns of this feature are dropped one by one when the schema does not have
 * them yet, which leaves exactly the write the route made before.
 */
export async function assignMoveToMover(args: {
  databases: Databases
  moveId: string
  moverProfile: Row & { $id: string }
  /** `movePriceColumns(offer)`, or nothing when the move keeps its stored price. */
  priceColumns?: Row | null
  nowMs?: number
  tag?: string
}): Promise<Models.Document & Row> {
  const { databases, moveId, moverProfile, priceColumns } = args
  return writeDroppingUnknownAttributes<Models.Document & Row>(
    {
      moverProfileId: moverProfile.$id,
      status: 'mover_accepted',
      // Snapshot of the vehicle doing the job (master D13); the client's
      // requested class in `moves.vehicleType` is left alone.
      vehicleId: moverProfile.currentVehicleId ?? null,
      // The service day of the acceptance: what the daily cap counts on.
      acceptedServiceDate: acceptedServiceDateFor(args.nowMs ?? Date.now(), PLATFORM_TZ),
      ...(priceColumns ?? {}),
      pendingOffer: null,
    },
    async (data) =>
      (await databases.updateDocument(APPWRITE.DATABASE_ID, APPWRITE.COLLECTIONS.MOVES, moveId, data)) as Models.Document & Row,
    args.tag ?? 'assign-move',
  )
}

/**
 * Close a price prompt without assigning, and tell the mover at once. Never
 * throws: the caller has already decided the outcome.
 */
export async function closePendingOffer(args: {
  databases: Databases
  move: Row
  moveId: string
  pending: PendingOffer
  requestStatus: 'cancelled' | 'expired'
  i18nKey: 'offer.clientDeclined' | 'offer.clientNoAnswer'
  /** English fallback; the recipient reads `i18nKey` in their own language. */
  title: string
  body: string
}): Promise<void> {
  const { databases, move, moveId, pending } = args
  const respondedAt = new Date().toISOString()
  await databases
    .updateDocument(APPWRITE.DATABASE_ID, APPWRITE.COLLECTIONS.MOVE_REQUESTS, pending.requestId, {
      status: args.requestStatus,
      respondedAt,
    })
    .catch((e) => console.warn(`[offer] closing request ${pending.requestId} failed:`, e))
  await databases
    .updateDocument(APPWRITE.DATABASE_ID, APPWRITE.COLLECTIONS.MOVES, moveId, { pendingOffer: null })
    .catch((e) => console.warn(`[offer] clearing the price prompt on ${moveId} failed:`, e))
  let moverAuthId: string | null = null
  try {
    const mover = await databases.getDocument(
      APPWRITE.DATABASE_ID,
      APPWRITE.COLLECTIONS.MOVER_PROFILES,
      pending.moverProfileId,
    )
    moverAuthId = relId(mover.userId)
  } catch (e) {
    console.warn(`[offer] mover ${pending.moverProfileId} not readable for the notice:`, e)
  }
  if (!moverAuthId) return
  const handle = typeof move.handle === 'string' ? move.handle : ''
  await writeNotification({
    userId: moverAuthId,
    type: 'system',
    title: args.title,
    body: args.body,
    data: { moveId, handle: move.handle ?? null, requestId: pending.requestId },
    i18n: { key: args.i18nKey, params: { handle } },
  })
}

/**
 * After an assignment: the other open offers for this move stop showing. A
 * pending one is declined (as the accept route always did); another mover's
 * price that was still with the client is closed. Best-effort, never throws.
 */
export async function closeOtherOffers(args: {
  databases: Databases
  moveId: string
  acceptedRequestId: string
  /** `moves.pendingOffer` as read before the assignment. */
  pendingOfferRaw?: unknown
}): Promise<void> {
  const { databases, moveId, acceptedRequestId } = args
  const respondedAt = new Date().toISOString()
  try {
    const others = await databases.listDocuments(APPWRITE.DATABASE_ID, APPWRITE.COLLECTIONS.MOVE_REQUESTS, [
      Query.equal('status', ['pending']),
      Query.limit(100),
    ])
    // Filter in application code to avoid Query issues with relationship fields.
    const toDecline = others.documents.filter((r) => r.$id !== acceptedRequestId && relId(r.moveId) === moveId)
    await Promise.all(
      toDecline.map((r) =>
        databases
          .updateDocument(APPWRITE.DATABASE_ID, APPWRITE.COLLECTIONS.MOVE_REQUESTS, r.$id, { status: 'declined', respondedAt })
          .catch((e) => console.warn('Failed to decline request', r.$id, e)),
      ),
    )
  } catch (e) {
    // Non-fatal: the move was already assigned.
    console.warn('Failed to decline other requests (non-fatal):', e)
  }
  const open = parsePendingOffer(args.pendingOfferRaw)
  if (open && open.requestId !== acceptedRequestId) {
    try {
      const row = await databases.getDocument(APPWRITE.DATABASE_ID, APPWRITE.COLLECTIONS.MOVE_REQUESTS, open.requestId)
      if (row.status === AWAITING_CLIENT) {
        await databases.updateDocument(APPWRITE.DATABASE_ID, APPWRITE.COLLECTIONS.MOVE_REQUESTS, open.requestId, {
          status: 'expired',
          respondedAt,
        })
      }
    } catch (e) {
      console.warn(`[offer] closing superseded request ${open.requestId} failed:`, e)
    }
  }
}
