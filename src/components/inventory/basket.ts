/**
 * The booking basket on the wire (crew plan 1 §basket), for the web client.
 *
 *   inventoryItems = JSON `{ itemId: int > 0 }` (zeros stripped)
 *   customItems    = string[] of JSON `{ id, name, quantity, approxSize, approxWeight }`
 *
 * Also normalises custom items restored from an older draft (free-text size,
 * "45 kg" weight) into the current shape. Pure.
 */

import { MAX_ITEM_QTY, type CustomItem, type CustomItemSize } from './selector-logic'

const SIZES: readonly CustomItemSize[] = ['small', 'medium', 'large', 'extra_large']

function sizeFrom(raw: unknown): CustomItemSize {
  if (typeof raw !== 'string') return 'medium'
  const s = raw.trim().toLowerCase().replace(/[\s-]+/g, '_')
  if ((SIZES as readonly string[]).includes(s)) return s as CustomItemSize
  if (s === 'xl' || s === 'xxl' || s === 'extralarge' || s === 'huge') return 'extra_large'
  if (s === 's' || s === 'xs' || s === 'tiny') return 'small'
  if (s === 'l' || s === 'big') return 'large'
  return 'medium'
}

function weightFrom(raw: unknown): number {
  const n = typeof raw === 'number' ? raw : parseFloat(String(raw ?? '').replace(',', '.'))
  return Number.isFinite(n) && n > 0 ? n : 0
}

/** Restored draft custom items → the current shape; junk and zero quantities dropped. */
export function normalizeCustomItems(raw: unknown): CustomItem[] {
  if (!Array.isArray(raw)) return []
  const out: CustomItem[] = []
  raw.forEach((entry, i) => {
    if (!entry || typeof entry !== 'object') return
    const c = entry as Record<string, unknown>
    const name = typeof c.name === 'string' ? c.name.trim() : ''
    const qty = Math.min(MAX_ITEM_QTY, Math.floor(Number(c.quantity)))
    if (!name || !Number.isFinite(qty) || qty < 1) return
    out.push({
      id: typeof c.id === 'string' && c.id ? c.id : `custom_${i}`,
      name,
      quantity: qty,
      approxSize: sizeFrom(c.approxSize),
      approxWeight: weightFrom(c.approxWeight),
    })
  })
  return out
}

/** `{ itemId: qty }` with zero/negative/non-finite counts removed and the rest floored. */
export function stripZeroCounts(counts: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = {}
  for (const [id, qty] of Object.entries(counts)) {
    const n = Math.floor(Number(qty))
    if (Number.isFinite(n) && n > 0) out[id] = n
  }
  return out
}

export function serializeBasket(
  counts: Record<string, number>,
  customItems: readonly CustomItem[],
): { inventoryItems: string; customItems: string[] } {
  return {
    inventoryItems: JSON.stringify(stripZeroCounts(counts)),
    customItems: customItems
      .filter((c) => c.quantity > 0)
      .map((c) =>
        JSON.stringify({
          id: c.id,
          name: c.name,
          quantity: c.quantity,
          approxSize: c.approxSize,
          approxWeight: c.approxWeight,
        }),
      ),
  }
}

/** Catalog + custom quantities — what the client shows as "N items". */
export function basketItemCount(counts: Record<string, number>, customItems: readonly CustomItem[]): number {
  return (
    Object.values(stripZeroCounts(counts)).reduce((s, n) => s + n, 0) +
    customItems.reduce((s, c) => s + (c.quantity > 0 ? c.quantity : 0), 0)
  )
}
