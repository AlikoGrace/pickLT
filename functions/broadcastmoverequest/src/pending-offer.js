/**
 * An offer that waits for the client (plan `.agent/plans/pricing/8.approach-distance.md`,
 * option B).
 *
 * Every instant offer carries the price for the mover it is sent to. When a
 * mover accepts an offer that costs the client more than the price the client
 * agreed to, the move is not assigned yet: the client is asked first, and the
 * mover is told at once if the client declines or does not answer in time.
 *
 * Import-free and pure. Byte-identical in every function that carries it
 * (`SHARED_FILES` in scripts/check-function-mirrors.sh); the apps mirror the
 * reader in `lib/pending-offer.ts`.
 */

/** How long the client has to answer a higher price. */
export const CLIENT_CONFIRM_SECONDS = 180;
/** The request status while the client is being asked. */
export const AWAITING_CLIENT = 'awaiting_client';

function cents(eur) {
  const n = Number(eur);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

/**
 * Whether the client must confirm before this offer can be accepted: only when
 * it costs more than what they agreed to. The same price or a lower one goes
 * through, and the client pays the lower amount.
 */
export function offerNeedsClientConfirmation(agreedTotal, offerTotal) {
  return cents(offerTotal) > cents(agreedTotal);
}

/** The JSON kept in `moves.pendingOffer` while the client is being asked. */
export function buildPendingOffer({ requestId, moverProfileId, moverName, total, previousTotal, approachM, nowMs }) {
  return JSON.stringify({
    requestId,
    moverProfileId,
    moverName: typeof moverName === 'string' ? moverName.slice(0, 80) : '',
    total: cents(total) / 100,
    previousTotal: cents(previousTotal) / 100,
    approachM: Math.max(0, Math.round(Number(approachM) || 0)),
    expiresAt: new Date(nowMs + CLIENT_CONFIRM_SECONDS * 1000).toISOString(),
  });
}

/** Tolerant reader: a string from the wire or an object; anything unusable is `null`. */
export function parsePendingOffer(raw) {
  let v = raw;
  if (typeof v === 'string') {
    if (!v.trim()) return null;
    try {
      v = JSON.parse(v);
    } catch {
      return null;
    }
  }
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
  if (typeof v.requestId !== 'string' || !v.requestId) return null;
  if (typeof v.total !== 'number' || !Number.isFinite(v.total)) return null;
  const expiresMs = Date.parse(v.expiresAt);
  if (!Number.isFinite(expiresMs)) return null;
  return {
    requestId: v.requestId,
    moverProfileId: typeof v.moverProfileId === 'string' ? v.moverProfileId : '',
    moverName: typeof v.moverName === 'string' ? v.moverName : '',
    total: v.total,
    previousTotal: typeof v.previousTotal === 'number' && Number.isFinite(v.previousTotal) ? v.previousTotal : 0,
    approachM: typeof v.approachM === 'number' && Number.isFinite(v.approachM) ? v.approachM : 0,
    expiresAt: new Date(expiresMs).toISOString(),
  };
}

export function pendingOfferExpired(offer, nowMs) {
  return !offer || Date.parse(offer.expiresAt) <= nowMs;
}

/**
 * Whether a write failed only because a column of this feature does not exist
 * yet (the schema script has not been applied). Callers retry without the new
 * columns, so a function deployed ahead of the schema keeps working as before.
 */
export function isUnknownAttributeError(e) {
  const msg = String((e && e.message) || '');
  return /unknown attribute|invalid document structure|attribute not found|unknown column/i.test(msg);
}
