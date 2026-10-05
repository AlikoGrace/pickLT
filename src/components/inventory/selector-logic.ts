/**
 * Pure logic behind `<InventorySelector>` (crew plan 1 — inventory parity).
 *
 * The mobile `InventorySelector` (pickltmobile/components/ui/booking/
 * inventory-selector.tsx) is the behavioural spec; this module is its web port
 * minus the React: category order, search, quantity caps, custom-item
 * validation and the upgrade-with-undo state machine. No React, no i18next —
 * so every rule here is unit-tested in `__tests__/selector-logic.test.ts`.
 */

import {
  classifyMove,
  enforcedTier,
  type ClassificationWarning,
  type ClassifyThresholds,
  type CustomItemInput,
  type InventoryItemDef,
} from '@/lib/classifyMove'
import type { MoveType } from '@/lib/types'

// ── Catalog rows ────────────────────────────────────────────────────────────

/** A row of `GET /api/inventory/catalog`: the engine def plus label/visibility fields. */
export type CatalogItem = InventoryItemDef & {
  /** The English `name`; `name` itself arrives localized. */
  englishName?: string | null
  nameTranslations?: unknown
  /** `false` = retired by an admin: hidden from the selector, still used for labels and pricing. */
  isActive?: boolean | null
}

/** Items a client may still pick (inactive rows stay in the catalog for labels/pricing). */
export function selectableItems<T extends CatalogItem>(catalog: readonly T[]): T[] {
  return catalog.filter((i) => i.isActive !== false)
}

// ── Quantity caps (shared with mobile and every server path) ───────────────

export const MAX_ITEM_QTY = 99
export const MAX_SPECIAL_ITEM_QTY = 10

export function capFor(item: Pick<CatalogItem, 'category'>): number {
  return item.category === 'special' ? MAX_SPECIAL_ITEM_QTY : MAX_ITEM_QTY
}

/** `counts` with `itemId` set to `qty` clamped to 0…cap; a zero removes the key. */
export function setCount(
  counts: Record<string, number>,
  itemId: string,
  qty: number,
  cap: number,
): Record<string, number> {
  const n = Number.isFinite(qty) ? Math.max(0, Math.min(cap, Math.floor(qty))) : 0
  const next = { ...counts }
  if (n > 0) next[itemId] = n
  else delete next[itemId]
  return next
}

// ── Categories (port of pickltmobile/lib/inventory-catalog.ts) ─────────────

/** Known slugs render in this order; admin-added slugs append in catalog order. */
export const KNOWN_CATEGORY_ORDER: readonly string[] = [
  'living_room', 'bedroom', 'kitchen', 'office', 'boxes', 'miscellaneous',
]

export function compareCategoryByKnownOrder(a: string, b: string): number {
  const ai = KNOWN_CATEGORY_ORDER.indexOf(a)
  const bi = KNOWN_CATEGORY_ORDER.indexOf(b)
  if (ai === -1 && bi === -1) return 0
  if (ai === -1) return 1
  if (bi === -1) return -1
  return ai - bi
}

/** Tab slugs (every category but `special`), in the known order. The default tab is `[0]`. */
export function tabCategories(catalog: readonly Pick<CatalogItem, 'category'>[]): string[] {
  const ordered: string[] = []
  for (const item of catalog) {
    if (item.category === 'special' || ordered.includes(item.category)) continue
    ordered.push(item.category)
  }
  // Array.prototype.sort is stable, so unknown slugs keep catalog order.
  return ordered.sort(compareCategoryByKnownOrder)
}

/** Locale-aware name order; guarded because a stripped ICU build can throw on a tag. */
export function compareNames(a: string, b: string, locale: string): number {
  try {
    return a.localeCompare(b, locale, { sensitivity: 'base', numeric: true })
  } catch {
    return a.localeCompare(b)
  }
}

// ── Search (port of pickltmobile/lib/inventory-catalog.ts) ─────────────────
//
// Two normal forms, applied to the query and every haystack string, matching
// on any pairing: "kuche" and "kueche" both find "Küche", "grosz"/"gross" find
// "groß". An explicit map rather than `normalize('NFD')` so the result is the
// same in every runtime.

const FOLD_MAP: Record<string, string> = {
  á: 'a', à: 'a', â: 'a', ä: 'a', ã: 'a', å: 'a', ą: 'a',
  ć: 'c', ç: 'c', č: 'c',
  ď: 'd', đ: 'd',
  é: 'e', è: 'e', ê: 'e', ë: 'e', ę: 'e', ě: 'e',
  ğ: 'g',
  í: 'i', ì: 'i', î: 'i', ï: 'i', ı: 'i',
  ł: 'l',
  ñ: 'n', ń: 'n', ň: 'n',
  ó: 'o', ò: 'o', ô: 'o', ö: 'o', õ: 'o', ø: 'o',
  ř: 'r',
  ś: 's', š: 's', ş: 's',
  ť: 't',
  ú: 'u', ù: 'u', û: 'u', ü: 'u', ů: 'u',
  ý: 'y', ÿ: 'y',
  ź: 'z', ż: 'z', ž: 'z',
  ß: 'ss', æ: 'ae', œ: 'oe', ĳ: 'ij',
}

const EXPAND_MAP: Record<string, string> = { ...FOLD_MAP, ä: 'ae', ö: 'oe', ü: 'ue', å: 'aa' }

function normalizeWith(value: string, map: Record<string, string>): string {
  let out = ''
  for (const ch of value.toLowerCase()) {
    const mapped = map[ch]
    if (mapped !== undefined) out += mapped
    else if (ch === '_' || ch === '-') out += ' '
    else if (ch >= '̀' && ch <= 'ͯ') continue
    else out += ch
  }
  return out.replace(/\s+/g, ' ').trim()
}

/** Diacritics stripped: `Fürs` → `furs`, `Łóżko` → `lozko`. */
export function foldForSearch(value: string): string {
  return normalizeWith(value, FOLD_MAP)
}

/** German transliteration: `Küche` → `kueche`, `groß` → `gross`. */
export function expandForSearch(value: string): string {
  return normalizeWith(value, EXPAND_MAP)
}

function normalForms(value: string): string[] {
  const folded = foldForSearch(value)
  const expanded = expandForSearch(value)
  return folded === expanded ? [folded] : [folded, expanded]
}

function translatedNameFor(raw: unknown, locale: string): string | null {
  let bag: unknown = raw
  if (typeof bag === 'string') {
    try {
      bag = JSON.parse(bag)
    } catch {
      return null
    }
  }
  if (!bag || typeof bag !== 'object' || Array.isArray(bag)) return null
  const map = bag as Record<string, unknown>
  const base = locale.trim().replace('_', '-').split('-')[0]!.toLowerCase()
  const hit = map[locale] ?? map[base]
  return typeof hit === 'string' && hit.trim() ? hit.trim() : null
}

/** Localized name, English name and the id — every string an item can be found by. */
export function searchHaystack(item: CatalogItem, locale: string): string[] {
  const out: string[] = []
  const push = (s: unknown) => {
    const v = typeof s === 'string' ? s.trim() : ''
    if (v && !out.includes(v)) out.push(v)
  }
  push(item.name)
  push(translatedNameFor(item.nameTranslations, locale))
  push(item.englishName)
  push(item.id)
  return out
}

function matchItem(item: CatalogItem, query: string, locale: string): { prefix: boolean } | null {
  const needles = normalForms(query).filter((n) => n.length > 0)
  if (needles.length === 0) return null
  let matched = false
  let prefix = false
  for (const candidate of searchHaystack(item, locale)) {
    for (const hay of normalForms(candidate)) {
      for (const needle of needles) {
        if (!hay.includes(needle)) continue
        matched = true
        if (hay.startsWith(needle)) prefix = true
      }
    }
  }
  return matched ? { prefix } : null
}

/** Every category (incl. Special), prefix hits first, then by localized name. */
export function searchCatalog<T extends CatalogItem>(catalog: readonly T[], query: string, locale: string): T[] {
  const trimmed = query.trim()
  if (!trimmed) return []
  const hits: { item: T; prefix: boolean }[] = []
  for (const item of catalog) {
    const m = matchItem(item, trimmed, locale)
    if (m) hits.push({ item, prefix: m.prefix })
  }
  return hits
    .sort((a, b) => (a.prefix !== b.prefix ? (a.prefix ? -1 : 1) : compareNames(a.item.name, b.item.name, locale)))
    .map((h) => h.item)
}

// ── Custom items (wire contract: crew plan 1 §basket) ──────────────────────

export type CustomItemSize = 'small' | 'medium' | 'large' | 'extra_large'

export const CUSTOM_SIZE_OPTIONS: readonly { value: CustomItemSize; keySegment: string }[] = [
  { value: 'small', keySegment: 'small' },
  { value: 'medium', keySegment: 'medium' },
  { value: 'large', keySegment: 'large' },
  { value: 'extra_large', keySegment: 'extraLarge' },
]

export interface CustomItem {
  id: string
  name: string
  quantity: number
  approxSize: CustomItemSize
  /** kg per unit; required and > 0. */
  approxWeight: number
}

export interface CustomItemDraft {
  name: string
  quantity: number
  approxSize: string
  /** As typed: "25", "12,5". */
  weight: string
}

/** Comma-tolerant positive number, or `null`. */
export function parseWeightKg(raw: string): number | null {
  const s = raw.trim().replace(',', '.')
  if (!/^\d+(\.\d+)?$/.test(s)) return null
  const n = Number(s)
  return Number.isFinite(n) && n > 0 ? n : null
}

function isSize(v: unknown): v is CustomItemSize {
  return v === 'small' || v === 'medium' || v === 'large' || v === 'extra_large'
}

/** The item a valid draft makes, or `null` (name, size band, 1…99 units and a weight are all required). */
export function customItemFromDraft(draft: CustomItemDraft, id: string): CustomItem | null {
  const name = draft.name.trim()
  const quantity = Math.floor(draft.quantity)
  const weight = parseWeightKg(draft.weight)
  if (!name || !isSize(draft.approxSize) || weight === null) return null
  if (!Number.isFinite(quantity) || quantity < 1 || quantity > MAX_ITEM_QTY) return null
  return { id, name, quantity, approxSize: draft.approxSize, approxWeight: weight }
}

/** `items` with `id`'s quantity set to `qty` (clamped to 0…99); a zero removes it. */
export function setCustomQuantity(items: readonly CustomItem[], id: string, qty: number): CustomItem[] {
  const n = Number.isFinite(qty) ? Math.max(0, Math.min(MAX_ITEM_QTY, Math.floor(qty))) : 0
  return items.map((c) => (c.id === id ? { ...c, quantity: n } : c)).filter((c) => c.quantity > 0)
}

export function toClassifyCustom(items: readonly CustomItem[]): CustomItemInput[] {
  return items.map((c) => ({
    id: c.id,
    name: c.name,
    quantity: c.quantity,
    estimatedWeightKg: c.approxWeight,
    approxSize: c.approxSize,
  }))
}

// ── Upgrade with undo ───────────────────────────────────────────────────────
//
// Every increase is classified against the tier the client already has. When
// the basket now needs a higher tier, the change is applied but held as
// `pending` with the basket it replaced: Continue lifts the tier, Cancel puts
// the previous basket back. There is no "keep the lower tier" — the server
// would price the higher tier anyway (crew master D5).

export interface Basket {
  counts: Record<string, number>
  customItems: CustomItem[]
}

export interface PendingUpgrade {
  upgradeTo: MoveType
  /** What the client just added (catalog name, or the custom item's own text). */
  triggerName: string
  warnings: ClassificationWarning[]
  previous: Basket
}

export interface SelectorState extends Basket {
  tier: MoveType
  pending: PendingUpgrade | null
}

export function proposeChange(
  state: SelectorState,
  next: Basket,
  triggerName: string,
  catalog: InventoryItemDef[],
  thresholds?: ClassifyThresholds,
): SelectorState {
  const result = classifyMove(next.counts, toClassifyCustom(next.customItems), state.tier, catalog, thresholds)
  if (result.requiresUpgrade && result.upgradeTo) {
    return {
      ...next,
      tier: state.tier,
      pending: {
        upgradeTo: result.upgradeTo,
        triggerName,
        warnings: result.warningKeys,
        previous: { counts: state.counts, customItems: state.customItems },
      },
    }
  }
  return { ...next, tier: state.tier, pending: null }
}

export function resolveUpgrade(state: SelectorState, accept: boolean): SelectorState {
  const pending = state.pending
  if (!pending) return state
  if (accept) return { ...state, tier: enforcedTier(state.tier, pending.upgradeTo), pending: null }
  return { ...pending.previous, tier: state.tier, pending: null }
}
