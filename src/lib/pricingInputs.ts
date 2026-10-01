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

import type { CustomItemSize } from './moveVolume'
import type { PricingBasket, PricingCustomItem } from './pricingEngine'

const SIZE_BANDS: readonly CustomItemSize[] = ['small', 'medium', 'large', 'extra_large']

/**
 * The web wizard asks for a custom item's size as free text ("large", "XL",
 * "sehr groß"), not as a band. Anything recognisable maps to a band; anything
 * else reads as `medium`, which is also what the engine and the volume model
 * assume for an unknown band — so a typo never shrinks a load to zero.
 */
export function normalizeCustomSize(raw: unknown): CustomItemSize {
  if (typeof raw !== 'string') return 'medium'
  const s = raw.trim().toLowerCase().replace(/[\s-]+/g, '_')
  if ((SIZE_BANDS as readonly string[]).includes(s)) return s as CustomItemSize
  if (s === 'xl' || s === 'xxl' || s === 'extralarge' || s === 'huge') return 'extra_large'
  if (s === 's' || s === 'xs' || s === 'tiny') return 'small'
  if (s === 'l' || s === 'big') return 'large'
  if (s === 'm') return 'medium'
  return 'medium'
}

/** `"45 kg"`, `"45"`, `45` → 45; anything unparseable → 0 (unknown weight, not NaN). */
export function normalizeWeightKg(raw: unknown): number {
  const n = typeof raw === 'number' ? raw : parseFloat(String(raw ?? '').replace(',', '.'))
  return Number.isFinite(n) && n > 0 ? n : 0
}

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

/** `{ itemId: qty }` from a JSON string or an object; junk → `{}`. */
export function countsFromWire(inventoryItems: unknown): Record<string, number> {
  const parsed = parseJsonMaybe(inventoryItems)
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
  const out: Record<string, number> = {}
  for (const [id, qty] of Object.entries(parsed as Record<string, unknown>)) {
    const n = typeof qty === 'number' ? qty : Number(qty)
    if (Number.isFinite(n) && n > 0) out[id] = n
  }
  return out
}

/** Custom items from an array of objects or of JSON strings (the `moves` column shape). */
export function customItemsFromWire(customItems: unknown): PricingCustomItem[] {
  const list = Array.isArray(customItems) ? customItems : parseJsonMaybe(customItems)
  if (!Array.isArray(list)) return []
  const out: PricingCustomItem[] = []
  for (const entry of list) {
    const item = parseJsonMaybe(entry)
    if (!item || typeof item !== 'object') continue
    const ci = item as Record<string, unknown>
    const quantity = typeof ci.quantity === 'number' ? ci.quantity : Number(ci.quantity)
    if (!Number.isFinite(quantity) || quantity <= 0) continue
    out.push({
      quantity,
      approxSize: normalizeCustomSize(ci.approxSize),
      approxWeight: normalizeWeightKg(ci.approxWeight ?? ci.estimatedWeightKg),
    })
  }
  return out
}

export function basketFromWire(inventoryItems: unknown, customItems: unknown): PricingBasket {
  return {
    counts: countsFromWire(inventoryItems),
    customItems: customItemsFromWire(customItems),
  }
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
