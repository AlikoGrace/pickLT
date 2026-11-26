/**
 * A price the client has to confirm (plan `.agent/plans/pricing/8.approach-distance.md`,
 * option B).
 *
 * Every instant offer is priced for the mover it goes to, including that
 * mover's drive to the pickup address. When a mover accepts an offer that costs
 * more than the price the client agreed to, the server does not assign the
 * move: it writes the offer to `moves.pendingOffer`, sets the request to
 * `awaiting_client` and waits for the client's answer. This module reads that
 * state for the apps. The server half is `functions/<fn>/src/pending-offer.js`.
 *
 * Pure. Byte-identical in pickltmover `lib/` and pickLT `src/lib/`.
 */

/** How long the client has to answer; the server stamps the exact deadline. */
export const CLIENT_CONFIRM_SECONDS = 180;
/** `move_requests.status` while the client is being asked. */
export const AWAITING_CLIENT = 'awaiting_client';

export interface PendingOffer {
  requestId: string;
  moverProfileId: string;
  moverName: string;
  /** What the client would pay with this mover, VAT included. */
  total: number;
  /** What the client agreed to before. */
  previousTotal: number;
  /** Straight-line metres from the mover to the pickup address. */
  approachM: number;
  /** ISO time after which the offer is closed. */
  expiresAt: string;
}

/** Tolerant reader for `moves.pendingOffer`: a JSON string or an object; anything unusable is `null`. */
export function parsePendingOffer(raw: unknown): PendingOffer | null {
  let v: unknown = raw;
  if (typeof v === 'string') {
    if (!v.trim()) return null;
    try {
      v = JSON.parse(v);
    } catch {
      return null;
    }
  }
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
  const o = v as Record<string, unknown>;
  if (typeof o.requestId !== 'string' || !o.requestId) return null;
  if (typeof o.total !== 'number' || !Number.isFinite(o.total)) return null;
  const expiresMs = typeof o.expiresAt === 'string' ? Date.parse(o.expiresAt) : NaN;
  if (!Number.isFinite(expiresMs)) return null;
  return {
    requestId: o.requestId,
    moverProfileId: typeof o.moverProfileId === 'string' ? o.moverProfileId : '',
    moverName: typeof o.moverName === 'string' ? o.moverName : '',
    total: o.total,
    previousTotal: typeof o.previousTotal === 'number' && Number.isFinite(o.previousTotal) ? o.previousTotal : 0,
    approachM: typeof o.approachM === 'number' && Number.isFinite(o.approachM) ? o.approachM : 0,
    expiresAt: new Date(expiresMs).toISOString(),
  };
}

/** The offer the client can still answer, or `null` (none, unreadable, or out of time). */
export function openPendingOffer(raw: unknown, nowMs: number): PendingOffer | null {
  const offer = parsePendingOffer(raw);
  return offer && Date.parse(offer.expiresAt) > nowMs ? offer : null;
}

/** Whole seconds left to answer, never negative. */
export function secondsLeft(offer: PendingOffer, nowMs: number): number {
  return Math.max(0, Math.ceil((Date.parse(offer.expiresAt) - nowMs) / 1000));
}

/** How much more the client would pay, in the move's currency (0 when not more). */
export function priceIncrease(offer: PendingOffer): number {
  return Math.max(0, Math.round((offer.total - offer.previousTotal) * 100) / 100);
}

/** What a mover earns on an offer, from `move_requests.offerPayoutCents`; `null` when the offer carries no price. */
export function offerPayout(request: { offerPayoutCents?: unknown } | null | undefined): number | null {
  const c = request?.offerPayoutCents;
  return typeof c === 'number' && Number.isFinite(c) && c >= 0 ? c / 100 : null;
}

/** The mover's straight-line distance to the pickup on an offer, in km; `null` when unknown. */
export function offerApproachKm(request: { offerApproachM?: unknown } | null | undefined): number | null {
  const m = request?.offerApproachM;
  return typeof m === 'number' && Number.isFinite(m) && m >= 0 ? m / 1000 : null;
}

/**
 * What the mover's screen shows for an offer they accepted:
 * - `waiting`: the client is being asked to confirm the price;
 * - `assigned`: the client confirmed (or no confirmation was needed);
 * - `declined`: the client said no;
 * - `closed`: it ran out, or the move went to someone else.
 */
export type OfferOutcome = 'waiting' | 'assigned' | 'declined' | 'closed' | 'open';

export function offerOutcome(status: unknown): OfferOutcome {
  if (status === AWAITING_CLIENT) return 'waiting';
  if (status === 'accepted') return 'assigned';
  if (status === 'cancelled') return 'declined';
  if (status === 'expired' || status === 'declined') return 'closed';
  return 'open';
}
