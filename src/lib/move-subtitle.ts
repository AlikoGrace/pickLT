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

type MoveType = (typeof MOVE_TYPES)[number]
type MoveCategory = (typeof MOVE_CATEGORIES)[number]

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
