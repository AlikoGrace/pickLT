/**
 * Locale resolution for the admin-managed inventory catalog (master plan D7).
 *
 * Pure — no React, no i18next, no Appwrite — so it is importable from route
 * handlers, Server Components and `'use client'` modules alike. `src/lib/
 * inventory-labels.ts` is `'use client'` and therefore cannot hold this.
 *
 * `itemId` and `category` are STABLE KEYS and are never translated. `name` is
 * the English fallback and stays exactly where it is. One additive column,
 * `nameTranslations`, carries `{"de": "2-Sitzer-Sofa", "fr": "…", …}`.
 *
 * Because a persisted move stores `inventoryItems` as `{itemId: count}` — IDs
 * only, never labels — translating the catalog retroactively translates every
 * move ever booked. There is no move-row backfill.
 *
 * This is a subset mirror of `pickltmobile/lib/inventory-catalog.ts`. The
 * search/sort half lives only in the two React Native apps, which are the only
 * surfaces with an item search box. Keep the shared half in step: a divergence
 * means the web renders one item name and the app renders another for the same
 * move row.
 */

/** `{"de": "2-Sitzer-Sofa", "fr": "Canapé 2 places"}`. Locale codes are keys. */
export type NameTranslations = Record<string, string>

/** The fields name resolution needs. */
export interface TranslatableName {
  itemId: string
  name?: string | null
  nameTranslations?: NameTranslations | string | null
}

/**
 * Appwrite has no JSON attribute type, so `nameTranslations` is stored as a
 * JSON *string*. Accept either shape. Anything malformed degrades to `null`
 * rather than throwing — a bad row must render English, not break the page.
 */
export function parseNameTranslations(raw: unknown): NameTranslations | null {
  let value: unknown = raw

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return null
    try {
      value = JSON.parse(trimmed)
    } catch {
      return null
    }
  }

  if (!value || typeof value !== 'object' || Array.isArray(value)) return null

  const out: NameTranslations = {}
  for (const [locale, name] of Object.entries(value as Record<string, unknown>)) {
    if (typeof name === 'string' && name.trim()) out[locale] = name.trim()
  }
  return Object.keys(out).length > 0 ? out : null
}

function baseLocale(locale: string): string {
  return locale.trim().replace('_', '-').split('-')[0]!.toLowerCase()
}

/** The item's name in `locale`, or `null` when this locale has no translation. */
export function translatedName(item: TranslatableName, locale: string): string | null {
  const bag = parseNameTranslations(item.nameTranslations)
  if (!bag) return null
  const exact = bag[locale]?.trim()
  if (exact) return exact
  const base = baseLocale(locale)
  if (base !== locale) {
    const fallback = bag[base]?.trim()
    if (fallback) return fallback
  }
  return null
}

function titleCaseSlug(slug: string): string {
  return slug
    .split('_')
    .map((p) => (p.length > 0 ? p[0].toUpperCase() + p.slice(1) : ''))
    .join(' ')
    .trim()
}

/**
 * The display name for a catalog item, in the active locale.
 *
 *   1. `nameTranslations[locale]` — the admin's wording in this language
 *   2. `name`                     — the English original
 *   3. the `itemId`, title-cased  — only reachable for a malformed row
 */
export function localizedItemName(item: TranslatableName, locale: string): string {
  const translated = translatedName(item, locale)
  if (translated) return translated
  const english = item.name?.trim()
  if (english) return english
  return titleCaseSlug(item.itemId)
}

// ── Categories ──────────────────────────────────────────────────────────────

/** English labels; also the fallback whenever a translation is missing. */
const KNOWN_LABELS: Record<string, string> = {
  living_room: 'Living Room',
  bedroom: 'Bedroom',
  kitchen: 'Kitchen',
  office: 'Office',
  boxes: 'Boxes',
  miscellaneous: 'Miscellaneous',
  special: 'Special Items',
}

export const KNOWN_CATEGORY_SLUGS: readonly string[] = Object.keys(KNOWN_LABELS)

export function isKnownCategorySlug(slug: string): boolean {
  return Object.prototype.hasOwnProperty.call(KNOWN_LABELS, slug)
}

/**
 * The catalog key segment for a category slug: `living_room` → `livingRoom`.
 *
 * The slug is DATA — what `inventory_catalog.category` holds, never renamed.
 * The key segment is CATALOG, and i18next reserves `_` for plural suffixes
 * (4.catalog-conventions.md §2). This is the only place the mapping exists.
 */
export function categoryKeySegment(slug: string): string {
  return slug
    .toLowerCase()
    .split('_')
    .filter((p) => p.length > 0)
    .map((p, i) => (i === 0 ? p : p[0].toUpperCase() + p.slice(1)))
    .join('')
}

/** Resolves `category.<keySegment>`, or `undefined` when the key is absent. */
export type CategoryTranslator = (slug: string) => string | undefined

/** Chain: translated label → English `KNOWN_LABELS` → title-cased slug. */
export function categoryLabel(slug: string, translate?: CategoryTranslator): string {
  const translated = translate?.(slug)?.trim()
  if (translated) return translated
  if (KNOWN_LABELS[slug]) return KNOWN_LABELS[slug]
  return titleCaseSlug(slug)
}

/** A `t()` narrowed to what we call. */
type TFunc = (key: string, options?: Record<string, unknown>) => string

// i18n-keys: inventory.category.livingRoom, inventory.category.bedroom,
// inventory.category.kitchen, inventory.category.office, inventory.category.boxes,
// inventory.category.miscellaneous, inventory.category.special
//
// (Dynamic key call site — this comment is what stops a future key-usage sweep
// from deleting these as orphans. See 4.catalog-conventions.md §5.6.)

/**
 * Build a `CategoryTranslator` from a `t()`.
 *
 * `defaultValue: ''` makes the missing-key case detectable: without it i18next
 * returns the key, and `categoryLabel()` would render
 * `inventory:category.garden` on screen instead of the title-cased slug.
 */
export function categoryTranslator(t: TFunc): CategoryTranslator {
  return (slug: string) => {
    const value = t(`inventory:category.${categoryKeySegment(slug)}`, { defaultValue: '' })
    return value || undefined
  }
}

/**
 * Locale-aware name comparison.
 *
 * A bare `localeCompare()` uses the runtime's default locale, which orders
 * `ä`/`ö`/`ü` wrong for a German catalog. Guarded because a stripped-down ICU
 * build can throw on an unknown tag.
 */
export function compareLocalizedNames(a: string, b: string, locale: string): number {
  try {
    return a.localeCompare(b, locale, { sensitivity: 'base', numeric: true })
  } catch {
    return a.localeCompare(b)
  }
}
