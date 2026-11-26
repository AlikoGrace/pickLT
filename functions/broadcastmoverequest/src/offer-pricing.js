/**
 * The price of an instant move for one particular mover (plan
 * `.agent/plans/pricing/8.approach-distance.md`).
 *
 * The move is priced once without a mover. Each offer then adds the mover's
 * own drive to the pickup address, so a mover sees earnings for their distance
 * and the client is never charged for someone else's.
 *
 * Byte-identical in every function that carries it (`SHARED_FILES`); needs
 * `pricing-engine.js` beside it.
 */

import { GLOBAL_PRICING_SCOPE, parseBreakdown, repriceApproach, serializeBreakdown, toPricingConfig } from './pricing-engine.js';

const EARTH_RADIUS_KM = 6371;

export function haversineKm(lat1, lon1, lat2, lon2) {
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function coord(v) {
  // `null` and '' are "no position", not the equator.
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Straight-line metres from the mover's stored position to the pickup, or `null` when either is unknown. */
export function approachMetres(move, mover) {
  const a = [coord(move?.pickupLatitude), coord(move?.pickupLongitude), coord(mover?.currentLatitude), coord(mover?.currentLongitude)];
  if (a.some((v) => v === null)) return null;
  if (a[2] === 0 && a[3] === 0) return null;
  return Math.round(haversineKm(a[0], a[1], a[2], a[3]) * 1000);
}

/**
 * The offer for this mover: the move's stored quote with the approach line for
 * the mover's distance. `null` when the move has no v3 quote, is not an instant
 * move, or a position is missing; the caller then offers the move at its
 * stored price, as before this feature.
 */
export function priceOfferForMover({ move, mover, config, approachM }) {
  if (!move || move.moveCategory !== 'instant') return null;
  const stored = parseBreakdown(move.priceBreakdown);
  if (!stored || stored.mode !== 'instant') return null;
  const metres = typeof approachM === 'number' && Number.isFinite(approachM) ? Math.max(0, Math.round(approachM)) : approachMetres(move, mover);
  if (metres === null) return null;
  const breakdown = repriceApproach(stored, metres / 1000, config);
  return {
    breakdown,
    approachM: metres,
    total: breakdown.total,
    // What the mover earns: the total less VAT and less the platform fee.
    payout: Math.round((breakdown.net - breakdown.platformFee) * 100) / 100,
  };
}

/** Columns of a `move_requests` row that carry its price. */
export function offerColumns(offer) {
  if (!offer) return {};
  return {
    offerTotalCents: Math.round(offer.total * 100),
    offerPayoutCents: Math.round(offer.payout * 100),
    offerApproachM: offer.approachM,
  };
}

/** Columns of a `moves` row when this offer becomes the price of the move. */
export function movePriceColumns(offer) {
  return {
    estimatedPrice: offer.total,
    priceBreakdown: serializeBreakdown(offer.breakdown),
    approachM: offer.approachM,
  };
}

/** The market's rates, GLOBAL with the country's rows laid over. Never throws: defaults apply. */
export async function loadPricingOverrides({ databases, Query, databaseId, collectionId, countryCode, error }) {
  const cc = typeof countryCode === 'string' && countryCode.trim() ? countryCode.trim().toUpperCase() : null;
  try {
    const res = await databases.listDocuments(databaseId, collectionId || 'pricing_config', [
      Query.equal('country', cc ? [GLOBAL_PRICING_SCOPE, cc] : [GLOBAL_PRICING_SCOPE]),
      Query.limit(400),
    ]);
    return toPricingConfig(res.documents, cc);
  } catch (e) {
    try {
      const res = await databases.listDocuments(databaseId, collectionId || 'pricing_config', [Query.limit(400)]);
      return toPricingConfig(res.documents, cc);
    } catch (e2) {
      if (typeof error === 'function') error(`pricing config unavailable for offers (defaults apply): ${e2.message}`);
      return {};
    }
  }
}
