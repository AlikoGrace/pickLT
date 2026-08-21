import type { TFunction } from 'i18next'

/**
 * The "Light Move · Instant · 12 Nov" line under a move title.
 *
 * ## Why this is a lookup table and not `t('…', { type, category })`
 *
 * It used to be three template keys —
 *
 *     moves:card.typeAndCategory.subtitle  = "{{type}} Move · {{category}}"
 *     moves:card.typeAndDate.subtitle      = "{{type}} Move · {{date}}"
 *     moves:card.typeCategoryDate.subtitle = "{{type}} Move · {{category}} · {{date}}"
 *
 * — fed with `t('booking:moveType.light.short')` and
 * `t('moves:moveCategory.instant.label')`. That assembles a noun phrase out of
 * separately translated fragments, and it is unfixable by translation
 * (`5.glossary.md` §7):
 *
 *  - **fr/es/it** — the type word is an *adjective* that must agree in gender
 *    with the noun for "move". Spanish needs *Mudanza ligera* (f.); the
 *    fragment key can only ever hold "ligero" or "ligera", and whichever
 *    the translator picks is wrong in the other half of the product.
 *  - **pl** — the same, in whichever case the surrounding phrase governs;
 *    Polish has seven, and a frozen fragment carries none of them.
 *  - **tr** — vowel harmony decides the suffix on the noun from the *sounds of
 *    the preceding word*. Nothing computed at translation time can know it.
 *  - **de** — compounds. *Leichter Umzug* is not "Leicht" + " Umzug", and the
 *    adjective ending changes with the article the sentence does not have.
 *
 * Move type (`light` | `regular` | `premium`, see `classify-move.ts`) and move
 * category (`instant` | `scheduled`) are small closed enumerations, so the
 * cross product is 3 × 2 = six whole phrases per shape. A translator writes six
 * complete noun phrases and inflects each one however their language requires.
 * `{{date}}` stays a placeholder — it is data, not a translated word, and it
 * arrives pre-formatted for the locale (conventions §3.4).
 *
 * Adding a fourth move type or a third category means adding keys, and the
 * locale-parity test says so out loud. That is the point: the old shape let a
 * new enum value ship silently in broken grammar.
 */

const MOVE_TYPES = ['light', 'regular', 'premium'] as const
const MOVE_CATEGORIES = ['instant', 'scheduled'] as const
/**
 * The home types that can actually be stored. `lib/home-type.ts` offers a
 * fifth option, `other`, which `toHomeType` maps to null rather than to a
 * column value — so no move ever comes back carrying it.
 */
const HOME_TYPES = ['apartment', 'house', 'office', 'storage'] as const

type MoveType = (typeof MOVE_TYPES)[number]
type MoveCategory = (typeof MOVE_CATEGORIES)[number]
type HomeType = (typeof HOME_TYPES)[number]

function asType(value: unknown): MoveType | null {
  return typeof value === 'string' && (MOVE_TYPES as readonly string[]).includes(value)
    ? (value as MoveType)
    : null
}

function asCategory(value: unknown): MoveCategory | null {
  return typeof value === 'string' && (MOVE_CATEGORIES as readonly string[]).includes(value)
    ? (value as MoveCategory)
    : null
}

function asHomeType(value: unknown): HomeType | null {
  return typeof value === 'string' && (HOME_TYPES as readonly string[]).includes(value)
    ? (value as HomeType)
    : null
}

/**
 * `date` is the already-formatted date string, or null/'' for "no date".
 *
 * The fallbacks below fire only for a move whose type or category is absent or
 * is a slug this build does not know. There can be no whole phrase for a value
 * nobody has written copy for, so the degraded path joins whole labels with the
 * same separator rather than inventing grammar — one unknown enum value should
 * cost a slightly flatter line, not a crash and not a raw slug.
 */
// i18n-keys: moves:card.typeCategoryDate.light.instant.subtitle, moves:card.typeCategoryDate.light.scheduled.subtitle
// i18n-keys: moves:card.typeCategoryDate.regular.instant.subtitle, moves:card.typeCategoryDate.regular.scheduled.subtitle
// i18n-keys: moves:card.typeCategoryDate.premium.instant.subtitle, moves:card.typeCategoryDate.premium.scheduled.subtitle
// i18n-keys: moves:card.typeAndCategory.light.instant.subtitle, moves:card.typeAndCategory.light.scheduled.subtitle
// i18n-keys: moves:card.typeAndCategory.regular.instant.subtitle, moves:card.typeAndCategory.regular.scheduled.subtitle
// i18n-keys: moves:card.typeAndCategory.premium.instant.subtitle, moves:card.typeAndCategory.premium.scheduled.subtitle
// i18n-keys: moves:card.typeAndDate.light.subtitle, moves:card.typeAndDate.regular.subtitle, moves:card.typeAndDate.premium.subtitle
// i18n-keys: booking:moveType.light.label, booking:moveType.regular.label, booking:moveType.premium.label
// i18n-keys: moves:moveCategory.instant.label, moves:moveCategory.scheduled.label
export function moveSubtitle(
  t: TFunction,
  moveType: unknown,
  moveCategory: unknown,
  date?: string | null
): string {
  const type = asType(moveType)
  const category = asCategory(moveCategory)
  const hasDate = typeof date === 'string' && date.length > 0

  if (type && category && hasDate) {
    return t(`moves:card.typeCategoryDate.${type}.${category}.subtitle`, { date })
  }
  if (type && category) {
    return t(`moves:card.typeAndCategory.${type}.${category}.subtitle`)
  }
  if (type && hasDate) {
    return t(`moves:card.typeAndDate.${type}.subtitle`, { date })
  }
  if (type) {
    return t(`booking:moveType.${type}.label`)
  }

  const parts = [
    category ? t(`moves:moveCategory.${category}.label`) : null,
    hasDate ? date : null,
  ].filter(Boolean) as string[]
  return parts.length ? parts.join(' · ') : t('common:value.notSpecified.empty')
}

/**
 * Just "Light Move" — the badge on a move card, and the header subtitle's
 * degraded form.
 *
 * Was `web:mover.moveTypeBadge.label` / `web:preview.moveTypeBadge.label`,
 * both `"{{type}} Move"` fed with a *capitalised slug* — the English word
 * "Light" reached the German and Turkish badges untranslated, and even once it
 * was translated the slot could only ever hold an uninflected adjective. There
 * is already a whole, translated noun phrase per tier in `booking:moveType`,
 * so the badges point at that instead of restating it.
 */
// i18n-keys: booking:moveType.light.label, booking:moveType.regular.label, booking:moveType.premium.label
export function moveTypeLabel(t: TFunction, moveType: unknown): string {
  const type = asType(moveType)
  return type ? t(`booking:moveType.${type}.label`) : t('common:value.notSpecified.empty')
}

/**
 * The "Apartment · Light" badge on an available-move card.
 *
 * Was `web:mover.homeTypeMoveType.label` = `"{{homeType}} · {{moveType}}"`,
 * with both slots filled by `formatLabel` — i.e. by capitalised English slugs
 * that never went through the catalog at all. Both halves are translated
 * words, so both leave the template: home type (`lib/home-type.ts`, four
 * stored values — `other` is offered in the picker but is never written to the
 * column) × move type is a 12-cell closed cross product, and a translator gets
 * twelve whole badges to inflect. Same shape as
 * `moves:detail.typeAndCategory.*`, which this line sits next to on screen.
 */
// i18n-keys: web:mover.homeTypeMoveType.apartment.light.label, web:mover.homeTypeMoveType.apartment.regular.label
// i18n-keys: web:mover.homeTypeMoveType.apartment.premium.label, web:mover.homeTypeMoveType.house.light.label
// i18n-keys: web:mover.homeTypeMoveType.house.regular.label, web:mover.homeTypeMoveType.house.premium.label
// i18n-keys: web:mover.homeTypeMoveType.office.light.label, web:mover.homeTypeMoveType.office.regular.label
// i18n-keys: web:mover.homeTypeMoveType.office.premium.label, web:mover.homeTypeMoveType.storage.light.label
// i18n-keys: web:mover.homeTypeMoveType.storage.regular.label, web:mover.homeTypeMoveType.storage.premium.label
// i18n-keys: booking:homeType.apartment.option, booking:homeType.house.option
// i18n-keys: booking:homeType.office.option, booking:homeType.storage.option
export function homeTypeAndMoveTypeBadge(t: TFunction, homeType: unknown, moveType: unknown): string {
  const home = asHomeType(homeType)
  const type = asType(moveType)

  if (home && type) return t(`web:mover.homeTypeMoveType.${home}.${type}.label`)
  if (home) return t(`booking:homeType.${home}.option`)
  return moveTypeLabel(t, moveType)
}

/**
 * The same phrase without the "Move" noun, for the two-column detail row where
 * the row's own label already says "Type of move".
 */
// i18n-keys: moves:detail.typeAndCategory.light.instant.value, moves:detail.typeAndCategory.light.scheduled.value
// i18n-keys: moves:detail.typeAndCategory.regular.instant.value, moves:detail.typeAndCategory.regular.scheduled.value
// i18n-keys: moves:detail.typeAndCategory.premium.instant.value, moves:detail.typeAndCategory.premium.scheduled.value
// i18n-keys: booking:moveType.light.short, booking:moveType.regular.short, booking:moveType.premium.short
export function moveTypeAndCategoryValue(t: TFunction, moveType: unknown, moveCategory: unknown): string {
  const type = asType(moveType)
  const category = asCategory(moveCategory)

  if (type && category) return t(`moves:detail.typeAndCategory.${type}.${category}.value`)
  if (type) return t(`booking:moveType.${type}.short`)
  if (category) return t(`moves:moveCategory.${category}.label`)
  return t('common:value.notSpecified.empty')
}

/**
 * The move-request popup's header line, which puts the category first.
 * Separate keys rather than a reordering of `moveSubtitle` — the two lines are
 * different sentences and a translator must be free to make them differ by
 * more than word order.
 */
// i18n-keys: web:mover.request.categoryAndType.instant.light.subtitle, web:mover.request.categoryAndType.instant.regular.subtitle
// i18n-keys: web:mover.request.categoryAndType.instant.premium.subtitle, web:mover.request.categoryAndType.scheduled.light.subtitle
// i18n-keys: web:mover.request.categoryAndType.scheduled.regular.subtitle, web:mover.request.categoryAndType.scheduled.premium.subtitle
export function requestCategoryAndType(t: TFunction, moveCategory: unknown, moveType: unknown): string {
  const type = asType(moveType)
  // The popup only ever renders a real offer, so an unknown category defaults
  // to the scheduled wording rather than dropping the line — same behaviour the
  // ternary it replaces had.
  const category = asCategory(moveCategory) ?? 'scheduled'

  if (type) return t(`web:mover.request.categoryAndType.${category}.${type}.subtitle`)
  return t(`moves:moveCategory.${category}.label`)
}

/**
 * The "Upgrade to Regular Move" button in the classification dialog.
 *
 * Was `t('booking:classification.upgrade.cta', { tier: t('booking:moveType.regular.label') })`
 * against `"Upgrade to {{tier}}"`. The Polish translator's report is the whole
 * argument: "Zmień na" governs the **accusative**, the tier fragment can only
 * ever be stored in the nominative, and the button rendered "Zmień na Mała"
 * where it must read "Zmień na małą". No amount of care inside either key fixes
 * that, because the case is decided by the sentence and the sentence is in a
 * different key. Three tiers, three whole CTAs, each inflected by the person who
 * writes it.
 *
 * `fallback` covers a classification with no `upgradeTo`, which used to render
 * the literal "Upgrade to " with a trailing space.
 */
// i18n-keys: booking:classification.upgrade.light.cta, booking:classification.upgrade.regular.cta
// i18n-keys: booking:classification.upgrade.premium.cta, booking:classification.upgrade.fallback.cta
export function upgradeCta(t: TFunction, upgradeTo: unknown): string {
  const tier = asType(upgradeTo)
  return t(`booking:classification.upgrade.${tier ?? 'fallback'}.cta`)
}

/**
 * The "Base rate (Light Move)" row in a price breakdown.
 *
 * Was `booking:pricing.baseRate.label` = `"Base rate ({{moveType}})"`, fed on
 * both web call sites by the local `formatLabel()` — a helper that title-cases
 * the database slug. So the tier word never reached the catalog at all and
 * `move-preview` rendered **"Basistarif (Light, 12 km)"** in German: not a
 * grammar problem, an untranslated string on screen. (`checkout` had the same
 * bug; mobile passed a translated title and so only had the grammar half.)
 *
 * Even translated, the slot could not work. German writes the tier as a
 * compound (*Premium-Umzug*), Polish inflects it for the case the surrounding
 * phrase governs, and Turkish picks the suffix from the sounds of the
 * preceding word — none of which a fragment frozen in another key can carry.
 * Three tiers (`MoveType`, `classify-move.ts`) is a closed enumeration, so it
 * is three whole labels, exactly as `moveSubtitle` above.
 *
 * `{{distance}}` stays a placeholder: it is data, pre-formatted for the locale
 * by `formatDistanceKm`, not a translated word (conventions §3.4).
 *
 * `fallback` covers a move with no type — the old shape rendered an empty
 * parenthesis there.
 */
// i18n-keys: booking:pricing.baseRate.light.label, booking:pricing.baseRate.regular.label
// i18n-keys: booking:pricing.baseRate.premium.label, booking:pricing.baseRate.fallback.label
export function baseRateLabel(t: TFunction, moveType: unknown): string {
  const type = asType(moveType)
  return t(`booking:pricing.baseRate.${type ?? 'fallback'}.label`)
}

/** `baseRateLabel` with the route distance appended. Same argument, same shape. */
// i18n-keys: booking:pricing.baseRateWithDistance.light.label, booking:pricing.baseRateWithDistance.regular.label
// i18n-keys: booking:pricing.baseRateWithDistance.premium.label, booking:pricing.baseRateWithDistance.fallback.label
export function baseRateWithDistanceLabel(
  t: TFunction,
  moveType: unknown,
  distance: string
): string {
  const type = asType(moveType)
  return t(`booking:pricing.baseRateWithDistance.${type ?? 'fallback'}.label`, { distance })
}

/**
 * "Apartment" / "Storage unit" on its own.
 *
 * Same root cause as `moveTypeLabel`: the detail pages fed their home-type row
 * from a local `formatLabel()`, so the stored slug reached the screen
 * title-cased and in English. `booking:homeType.*.option` already holds the
 * translated word for every storable value.
 */
// i18n-keys: booking:homeType.apartment.option, booking:homeType.house.option
// i18n-keys: booking:homeType.office.option, booking:homeType.storage.option
export function homeTypeLabel(t: TFunction, homeType: unknown): string {
  const home = asHomeType(homeType)
  return home ? t(`booking:homeType.${home}.option`) : t('common:value.notSpecified.empty')
}
