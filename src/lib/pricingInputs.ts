/**
 * Adapters from the shapes this app stores to the engine's `QuoteInput`.
 *
 * The engine (`pricingEngine.ts`) is a port kept arithmetically identical to
 * the mobile client's; everything web-specific about *where the numbers come
 * from* lives here instead, so the port stays diffable against its source.
 *
 * Three sources feed a quote on the web:
 *   - the booking context (`context/moveSearch.tsx`) while the user is still
 *     in the wizard — `inventory` is `{ itemId: qty }`, `customItems` carry a
 *     free-text size band and weight;
 *   - the request body of `create-instant` / `create-scheduled` — the same
 *     data, with `inventoryItems` already a JSON string and `customItems` an
 *     array of JSON strings (the `moves` column shapes);
 *   - a persisted `moves` row, for a re-quote.
 *
 * All three go through `basketFromWire`, which accepts any of those encodings.
 * Pure: no I/O, no React.
 */

import {
  basketFromWire as normalizedBasketFromWire,
  countsFromWire,
  customItemsFromWire,
  normalizeCustomSize,
  normalizeCustomWeightKg,
} from './basket-server'
import type { PricingBasket } from './pricingEngine'

// The basket readers live in `basket-server.ts` — the web port of the
// functions' `basket.js`, so a quote on a page, in a route and in an Appwrite
// function reads the same basket (legacy free-text sizes → band, "45 kg" → 45,
// missing weight → 20 kg, missing quantity → 1, zeros dropped). Re-exported
// under the names the pages already import.
export { countsFromWire, customItemsFromWire, normalizeCustomSize }

/** `"45 kg"`, `"45"`, `45` → 45; anything unparseable → the 20 kg custom-item default. */
export const normalizeWeightKg = normalizeCustomWeightKg

function parseJsonMaybe(value: unknown): unknown {
  if (typeof value !== 'string') return value
  const trimmed = value.trim()
  if (!trimmed) return null
  try {
    return JSON.parse(trimmed)
  } catch {
    return null
  }
}

export function basketFromWire(inventoryItems: unknown, customItems: unknown): PricingBasket {
  return normalizedBasketFromWire(inventoryItems, customItems)
}

/**
 * Floor level slug → number of floors. `'ground'` and anything unparseable is
 * 0; `'5plus'`-style slugs read their leading integer. Mirrors the parse the
 * legacy `calculateprice` used, so a floor surcharge is counted the same way the
 * row has always been read.
 */
export function floorCount(level: unknown): number {
  if (typeof level === 'number') return Number.isFinite(level) && level > 0 ? Math.floor(level) : 0
  const n = parseInt(String(level ?? '0'), 10)
  return Number.isFinite(n) && n > 0 ? n : 0
}

/** Pickup floors without a lift + drop-off floors without a lift (master D10). */
export function floorsNoLiftFor(access: {
  pickupFloorLevel?: unknown
  pickupElevator?: unknown
  dropoffFloorLevel?: unknown
  dropoffElevator?: unknown
}): number {
  let floors = 0
  if (!access.pickupElevator) floors += floorCount(access.pickupFloorLevel)
  if (!access.dropoffElevator) floors += floorCount(access.dropoffFloorLevel)
  return floors
}

/** Addresses needing a no-parking (Halteverbot) arrangement, 0–2. */
export function haltverbotCountFor(pickup: unknown, dropoff: unknown): number {
  return (pickup ? 1 : 0) + (dropoff ? 1 : 0)
}

/** Metres → km; null/junk → 0. The engine clamps negatives itself. */
export function kmFromMeters(meters: unknown): number {
  const n = typeof meters === 'number' ? meters : Number(meters)
  return Number.isFinite(n) && n > 0 ? n / 1000 : 0
}

export function secondsFrom(seconds: unknown): number {
  const n = typeof seconds === 'number' ? seconds : Number(seconds)
  return Number.isFinite(n) && n > 0 ? n : 0
}

/** Additional service ids as a clean string list, whatever the wire sent. */
export function servicesFromWire(services: unknown): string[] {
  const list = Array.isArray(services) ? services : parseJsonMaybe(services)
  if (!Array.isArray(list)) return []
  return list.filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
}
