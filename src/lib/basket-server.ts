/**
 * The basket on the server (inventory parity plan, "Basket wire format") — the
 * web port of the Appwrite functions' `basket.js` + the row readers of
 * `functions/<fn>/src/pricing-engine.js`, identical in behaviour and pinned by
 * the same fixture (`__tests__/fixtures/basket-wire.json`, a byte copy of
 * pickltmobile's).
 *
 * Wire contract:
 *   inventoryItems = JSON `{ itemId: int > 0 }`
 *   customItems    = string[] of JSON `{ id, name, quantity: int ≥ 1,
 *                    approxSize: small|medium|large|extra_large, approxWeight: kg > 0 }`
 *
 * `basketFromWire` normalises legacy rows (free-text sizes → band, "45 kg" →
 * 45, missing size → medium, missing/invalid weight → 20 kg, missing quantity →
 * 1, zero counts dropped); `serializeBasket` writes the contract;
 * `basketCapViolation` enforces `MAX_ITEM_QTY` (99) and, for catalog category
 * `special`, `MAX_SPECIAL_ITEM_QTY` (10) — routes reject with fnCode
 * `inventory.quantityTooHigh`. Pure: no I/O (the client pages import it through
 * `pricingInputs.ts`).
 */

import type { CustomItemSize } from './moveVolume'

/** Weight assumed for a custom item whose weight is missing or unreadable (kg per unit). */
export const DEFAULT_CUSTOM_ITEM_WEIGHT_KG = 20
/** Most units of one ordinary catalog item, or of one custom item, per move. */
export const MAX_ITEM_QTY = 99
/** Most units of one catalog item in category `special` (piano, safe…) per move. */
export const MAX_SPECIAL_ITEM_QTY = 10
export const SPECIAL_CATEGORY = 'special'
/** The fnCode a basket over the caps is rejected with (HTTP 400). */
export const QUANTITY_TOO_HIGH = 'inventory.quantityTooHigh'
/** `moves.extraHelpers` schema bound; the engine clamps further to `crew.maxExtraHelpers`. */
export const EXTRA_HELPERS_SCHEMA_MAX = 10

/** A custom item in the contract shape. */
export interface WireCustomItem {
  id: string
  name: string
  quantity: number
  approxSize: CustomItemSize
  approxWeight: number
}

export interface NormalizedBasket {
  counts: Record<string, number>
  customItems: WireCustomItem[]
}

export interface WireBasket {
  inventoryItems: string
  customItems: string[]
}

export interface CapViolation {
  itemId: string
  quantity: number
  max: number
}

const SIZE_BANDS: readonly CustomItemSize[] = ['small', 'medium', 'large', 'extra_large']

/**
 * Free text ("large", "XL", "sehr groß") → a size band; anything unrecognised
 * reads as `medium`, which is also what the engine and the volume model assume
 * for an unknown band — so a typo never shrinks a load to zero.
 */
export function normalizeCustomSize(raw: unknown): CustomItemSize {
  if (typeof raw !== 'string') return 'medium'
  const s = raw.trim().toLowerCase().replace(/[\s-]+/g, '_')
  if ((SIZE_BANDS as readonly string[]).includes(s)) return s as CustomItemSize
  if (s === 'xl' || s === 'xxl' || s === 'extralarge' || s === 'huge') return 'extra_large'
  if (s === 's' || s === 'xs' || s === 'tiny') return 'small'
  if (s === 'l' || s === 'big') return 'large'
  return 'medium'
}

/** `45`, `"45"`, `"45 kg"`, `"4,5"` → kg; missing, unreadable or ≤ 0 → `DEFAULT_CUSTOM_ITEM_WEIGHT_KG`. */
export function normalizeCustomWeightKg(raw: unknown): number {
  const n = typeof raw === 'number' ? raw : parseFloat(String(raw ?? '').replace(',', '.'))
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_CUSTOM_ITEM_WEIGHT_KG
}

/**
 * One custom item in the contract shape, or null when it does not count: not
 * an object, or a quantity below 1 after flooring. A MISSING quantity is 1.
 */
export function normalizeCustomItem(raw: unknown, index = 0): WireCustomItem | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const ci = raw as Record<string, unknown>
  const q = ci.quantity === undefined || ci.quantity === null || ci.quantity === '' ? 1 : Number(ci.quantity)
  const quantity = Number.isFinite(q) ? Math.floor(q) : 0
  if (quantity < 1) return null
  return {
    id: typeof ci.id === 'string' && ci.id ? ci.id : `custom_${index + 1}`,
    name: typeof ci.name === 'string' ? ci.name : '',
    quantity,
    approxSize: normalizeCustomSize(ci.approxSize),
    approxWeight: normalizeCustomWeightKg(ci.approxWeight ?? ci.estimatedWeightKg),
  }
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

/** `{ itemId: int ≥ 1 }` from a JSON string or an object; numeric strings read, junk and zeros dropped. */
export function countsFromWire(inventoryItems: unknown): Record<string, number> {
  const parsed = parseJsonMaybe(inventoryItems)
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
  const out: Record<string, number> = {}
  for (const [itemId, value] of Object.entries(parsed as Record<string, unknown>)) {
    const n = typeof value === 'number' ? value : Number(value)
    const qty = Number.isFinite(n) ? Math.floor(n) : 0
    if (qty >= 1) out[itemId] = qty
  }
  return out
}

/** Custom items from an array of objects / JSON strings, or one JSON array string. */
export function customItemsFromWire(customItems: unknown): WireCustomItem[] {
  const list = Array.isArray(customItems) ? customItems : parseJsonMaybe(customItems)
  if (!Array.isArray(list)) return []
  const out: WireCustomItem[] = []
  list.forEach((entry, index) => {
    const item = normalizeCustomItem(parseJsonMaybe(entry), index)
    if (item) out.push(item)
  })
  return out
}

/** Any basket encoding (JSON strings, objects, legacy rows) → the normalised basket. */
export function basketFromWire(inventoryItems: unknown, customItems: unknown): NormalizedBasket {
  return { counts: countsFromWire(inventoryItems), customItems: customItemsFromWire(customItems) }
}

/** A normalised basket → the `moves` column shapes (zeros stripped). */
export function serializeBasket(basket: {
  counts?: Record<string, number> | null
  customItems?: ReadonlyArray<WireCustomItem> | null
}): WireBasket {
  const counts: Record<string, number> = {}
  for (const [itemId, qty] of Object.entries(basket?.counts ?? {})) {
    if (typeof qty === 'number' && Number.isFinite(qty) && qty >= 1) counts[itemId] = Math.floor(qty)
  }
  return {
    inventoryItems: JSON.stringify(counts),
    customItems: (basket?.customItems ?? [])
      .filter((c) => c && typeof c.quantity === 'number' && c.quantity >= 1)
      .map((c) =>
        JSON.stringify({
          id: c.id,
          name: c.name,
          quantity: Math.floor(c.quantity),
          approxSize: c.approxSize,
          approxWeight: c.approxWeight,
        }),
      ),
  }
}

/** The quantity cap for one catalog item (`MAX_SPECIAL_ITEM_QTY` for category `special`). */
export function maxQtyFor(def: { category?: string | null } | null | undefined): number {
  return def?.category === SPECIAL_CATEGORY ? MAX_SPECIAL_ITEM_QTY : MAX_ITEM_QTY
}

/**
 * The first line over its cap, or null. `catalog` entries are keyed by `itemId`
 * (function/catalog-row shape) or `id` (the web's `InventoryItemDef`); an item
 * missing from the catalog gets the ordinary cap. Custom items report their id.
 */
export function basketCapViolation(
  basket: NormalizedBasket,
  catalog: ReadonlyArray<{ itemId?: string; id?: string; category?: string | null }>,
): CapViolation | null {
  const byId = new Map(catalog.map((i) => [i.itemId ?? i.id ?? '', i]))
  for (const [itemId, qty] of Object.entries(basket.counts)) {
    const max = maxQtyFor(byId.get(itemId))
    if (qty > max) return { itemId, quantity: qty, max }
  }
  for (const ci of basket.customItems) {
    if (ci.quantity > MAX_ITEM_QTY) return { itemId: ci.id, quantity: ci.quantity, max: MAX_ITEM_QTY }
  }
  return null
}

/** A requested extra-helper count as a whole number in 0…`EXTRA_HELPERS_SCHEMA_MAX`. */
export function extraHelpersFromWire(raw: unknown): number {
  const n = typeof raw === 'number' ? raw : Number(raw)
  if (!Number.isFinite(n) || n <= 0) return 0
  return Math.min(EXTRA_HELPERS_SCHEMA_MAX, Math.floor(n))
}
