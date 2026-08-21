/**
 * Display labels for the **stored enum slugs** on a move row.
 *
 * Every function here replaces a call to a local `formatLabel()` — a helper
 * each page defined for itself that did nothing but split the slug on `_` and
 * title-case the words. That is not a translation strategy: the slug never
 * reached the catalog, so `parkingSituation = 'at_building'` rendered
 * **"At Building"** on the German, Polish and Turkish detail pages exactly as
 * it did on the English one. It is the same defect that `lib/move-subtitle.ts`
 * documents for `moveType` and `homeType`, and this module closes the rest of
 * it.
 *
 * Three rules hold throughout:
 *
 * 1. **The slug is a wire value, never a word.** It is looked up, never
 *    humanised. Where a slug segment carries `_`, the key segment is written
 *    out in an explicit map rather than derived, so that renaming a slug cannot
 *    silently rename a key (same argument as `pickltmobile/lib/wizard-options.ts`).
 *
 * 2. **Slugs from the sibling apps resolve too.** `pickltmobile` writes
 *    `driveway`/`street`/`lot`/`none` into the same `parkingSituation` column
 *    this app fills with `at_building`/`nearby`/`no_parking`, and `floor_1`
 *    where this app writes `"1"`. A mover reading a move booked on the phone
 *    must see words, not a raw slug, so both vocabularies are accepted.
 *
 * 3. **An unrecognised value renders as itself**, not as title-cased English. A
 *    row written by some future build should show *something*, but it must not
 *    masquerade as a translated string.
 *
 * `t` is threaded in as an argument rather than captured at module scope: a
 * module-level label map would freeze at the boot language and never follow a
 * language switch.
 */

import type { TFunction } from 'i18next'

import { formatTime, formatTimeRange } from './format'
import { ARRIVAL_WINDOW_HOURS, type ArrivalWindowSlug } from './service-limits'
import { getActiveLocale } from './i18n-runtime'

const notSpecified = (t: TFunction) => t('common:value.notSpecified.empty')

// ─── Arrival window ───────────────────────────────────────────────────────────

/**
 * `arrivalWindow` is **not a closed enum**, which is why title-casing it was
 * doubly wrong. Three different writers fill the column:
 *
 * - the booking wizard (`add-listing/5`) stores a **clock time**, `"08:00"`;
 * - the reschedule dialog (`move-details`) stores a named window,
 *   `morning` / `afternoon` / `evening`;
 * - `checkout` stores the literal `'now'` for an instant move.
 *
 * `formatLabel` left `"08:00"` alone (no underscore to split) and turned
 * `now` into the English word "Now" on every locale. The time is **data** and
 * goes through the locale formatter — a clock pattern must never be frozen
 * into a catalog value (conventions §3.4) — while the three named windows and
 * `now` are words and come from the catalog.
 *
 * The named windows used to carry their hours **inside the translated value**:
 * `"Morning (8am-12pm)"`. All seven translators independently converted that to
 * a 24-hour clock, because no European market reads am/pm — so one time pattern
 * lived in eight catalogs and disagreed with itself about its own format, and
 * moving a window by an hour meant re-translating. The hours are now
 * `ARRIVAL_WINDOW_HOURS` in `lib/service-limits.ts`, the clock convention is
 * `formatTimeRange`'s decision, and the catalog holds only the word.
 */
// i18n-keys: booking:arrivalWindow.morning.label, booking:arrivalWindow.afternoon.label
// i18n-keys: booking:arrivalWindow.evening.label, booking:arrivalWindow.withRange.label
// i18n-keys: booking:timing.now.label
export function arrivalWindowLabel(t: TFunction, value: string | null | undefined): string {
  if (!value) return notSpecified(t)
  const raw = value.trim()

  if (raw === 'now') return t('booking:timing.now.label')
  if (raw === 'morning' || raw === 'afternoon' || raw === 'evening') {
    return arrivalWindowOptionLabel(t, raw)
  }

  // "HH:MM" — a time of day, formatted for the locale rather than translated.
  // Anchored to an arbitrary date because `formatTime` takes a Date and only
  // the clock fields are read back out.
  const time = /^(\d{1,2}):(\d{2})$/.exec(raw)
  if (time) {
    const hours = Number(time[1])
    const minutes = Number(time[2])
    if (hours < 24 && minutes < 60) {
      const date = new Date(2000, 0, 1, hours, minutes)
      return formatTime(date, { hour: '2-digit', minute: '2-digit' })
    }
  }

  return raw
}

/**
 * A named arrival window as it is offered to the user: the word plus the hours
 * it covers, `Morning (8:00 AM – 12:00 PM)` / `Vormittag (08:00–12:00 Uhr)`.
 *
 * The parentheses are the catalog's (`arrivalWindow.withRange.label`); the
 * clock inside them is `Intl`'s.
 */
// i18n-keys: booking:arrivalWindow.morning.label, booking:arrivalWindow.afternoon.label
// i18n-keys: booking:arrivalWindow.evening.label, booking:arrivalWindow.withRange.label
export function arrivalWindowOptionLabel(
  t: TFunction,
  slug: ArrivalWindowSlug,
  locale?: string,
): string {
  const [from, to] = ARRIVAL_WINDOW_HOURS[slug]
  return t('booking:arrivalWindow.withRange.label', {
    window: t(`booking:arrivalWindow.${slug}.label`),
    // `locale` is optional for the same reason as `joinLabels`': a client
    // component lets the formatter read the active locale, while a server
    // render — which has no active locale — must pass the recipient's.
    range: formatTimeRange(new Date(2000, 0, 1, from), new Date(2000, 0, 1, to), { locale }),
  })
}

// ─── Vehicle type ─────────────────────────────────────────────────────────────

const VEHICLE_KEY: Record<string, string> = {
  small_van: 'smallVan',
  medium_truck: 'mediumTruck',
  large_truck: 'largeTruck',
  multiple: 'multiple',
}

/** `VehicleType` in `context/moveSearch.tsx`; the mover profile writes the same four. */
// i18n-keys: booking:vehicle.smallVan.label, booking:vehicle.mediumTruck.label
// i18n-keys: booking:vehicle.largeTruck.label, booking:vehicle.multiple.label
export function vehicleTypeLabel(t: TFunction, value: string | null | undefined): string {
  if (!value) return notSpecified(t)
  const key = VEHICLE_KEY[value.trim()]
  return key ? t(`booking:vehicle.${key}.label`) : value.trim()
}

// ─── Packing service level ────────────────────────────────────────────────────

const PACKING_LEVELS = ['none', 'partial', 'full', 'unpacking'] as const

/** `PackingServiceLevel`, PRD Appendix B. */
// i18n-keys: booking:packingLevel.none.option, booking:packingLevel.partial.option
// i18n-keys: booking:packingLevel.full.option, booking:packingLevel.unpacking.option
export function packingLevelLabel(t: TFunction, value: string | null | undefined): string {
  if (!value) return notSpecified(t)
  const raw = value.trim()
  return (PACKING_LEVELS as readonly string[]).includes(raw)
    ? t(`booking:packingLevel.${raw}.option`)
    : raw
}

// ─── Payment method ───────────────────────────────────────────────────────────

/**
 * Four storable values across the two `PaymentMethod` unions —
 * `checkout/PayWith.tsx` offers cash/card/paypal, `context/moveSearch.tsx`
 * additionally carries `bank_transfer`. Each already had a translated key; they
 * simply live in three different places, which is why the map is explicit.
 */
const PAYMENT_METHOD_KEY: Record<string, string> = {
  cash: 'booking:payment.method.cash.label',
  card: 'booking:payment.method.card.label',
  paypal: 'common:payment.method.payPal.label',
  bank_transfer: 'booking:payment.bankTransfer.label',
}

// i18n-keys: booking:payment.method.cash.label, booking:payment.method.card.label
// i18n-keys: common:payment.method.payPal.label, booking:payment.bankTransfer.label
export function paymentMethodLabel(t: TFunction, value: string | null | undefined): string {
  if (!value) return notSpecified(t)
  const raw = value.trim()
  const key = PAYMENT_METHOD_KEY[raw.toLowerCase()]
  return key ? t(key) : raw
}

// ─── Parking ──────────────────────────────────────────────────────────────────

/**
 * Pickup parking. This app's picker (`add-listing/1`) writes three values; the
 * RN apps write four of their own into the same column (see rule 2 above), and
 * all seven already have translated keys under `booking:parking.*`.
 */
const PARKING_KEY: Record<string, string> = {
  // This app.
  at_building: 'atBuilding',
  nearby: 'nearby',
  no_parking: 'noParking',
  // pickltmobile / pickltmover (`lib/wizard-options.ts`, PARKING_OPTION_VALUES).
  driveway: 'driveway',
  street: 'street',
  lot: 'lot',
  none: 'none',
}

// i18n-keys: booking:parking.atBuilding.label, booking:parking.nearby.label
// i18n-keys: booking:parking.noParking.label, booking:parking.driveway.option
// i18n-keys: booking:parking.street.option, booking:parking.lot.option
// i18n-keys: booking:parking.none.option
export function parkingLabel(t: TFunction, value: string | null | undefined): string {
  if (!value) return notSpecified(t)
  const raw = value.trim().toLowerCase()
  const key = PARKING_KEY[raw]
  if (!key) return value.trim()
  // The three web values were authored as `.label`, the four mobile ones as
  // `.option`. Both are live and translated; neither family is a superset of
  // the other, so the suffix is part of the mapping rather than a guess.
  const suffix = raw === 'at_building' || raw === 'nearby' || raw === 'no_parking' ? 'label' : 'option'
  return t(`booking:parking.${key}.${suffix}`)
}

/**
 * Drop-off parking is a **different five-value list** from pickup's
 * (`DropoffParkingKey`, `add-listing/3`) and has its own translated family,
 * `booking:dropoffParking.*`. Sharing pickup's resolver would have silently
 * mislabelled every drop-off row.
 */
const DROPOFF_PARKING_KEY: Record<string, string> = {
  directly_in_front: 'directlyInFront',
  limited: 'limited',
  street_only: 'streetOnly',
  underground: 'underground',
  loading_zone: 'loadingZone',
}

// i18n-keys: booking:dropoffParking.directlyInFront.label, booking:dropoffParking.limited.label
// i18n-keys: booking:dropoffParking.streetOnly.label, booking:dropoffParking.underground.label
// i18n-keys: booking:dropoffParking.loadingZone.label
export function dropoffParkingLabel(t: TFunction, value: string | null | undefined): string {
  if (!value) return notSpecified(t)
  const raw = value.trim().toLowerCase()
  const key = DROPOFF_PARKING_KEY[raw]
  if (key) return t(`booking:dropoffParking.${key}.label`)
  // A drop-off row written by the RN apps, or by this app before the two
  // parking lists diverged, carries a pickup-vocabulary slug. Fall through
  // rather than showing the caller a bare slug.
  if (PARKING_KEY[raw]) return parkingLabel(t, value)
  return value.trim()
}

// ─── Floor level ──────────────────────────────────────────────────────────────

/**
 * A floor is an **ordinal**, not a member of an enumeration, so it comes from
 * the formatter and not from a key per storey (glossary §5). i18next's
 * `ordinal: true` selects the right form from
 * `booking:floorLevel.numbered.label_ordinal_*` — the family whose inert
 * categories were pruned earlier, so German/Spanish/Italian/Polish/Dutch/
 * Turkish carry only `_other` and English carries all four. This is the same
 * call the floor pickers in `add-listing/1` and `add-listing/3` already make,
 * which is what makes the detail page echo the words the user picked.
 *
 * The ground floor is the one storey that is a word rather than a number, in
 * every language we ship, and it keeps its own key.
 *
 * Accepts `"1"`..`"12"` (this app's picker), `ground`, and the RN apps'
 * `floor_1`..`floor_5plus` slugs.
 */
const RN_FLOOR_SLUG: Record<string, string> = {
  floor_1: '1',
  floor_2: '2',
  floor_3: '3',
  floor_4: '4',
}

// i18n-keys: booking:floorLevel.ground.label, booking:floorLevel.numbered.label
// i18n-keys: booking:floorLevel.floor5plus.option
export function floorLevelLabel(t: TFunction, value: string | null | undefined): string {
  if (!value) return notSpecified(t)
  const raw = value.trim().toLowerCase()

  // '0' is the ground floor in every market we serve, and the RN instant flow
  // writes it as a "not collected" placeholder.
  if (raw === 'ground' || raw === '0') return t('booking:floorLevel.ground.label')

  // `floor_5plus` is an open range ("5th+"), not an ordinal — it cannot go
  // through the formatter and keeps the picker's own key.
  if (raw === 'floor_5plus') return t('booking:floorLevel.floor5plus.option')

  const normalised = RN_FLOOR_SLUG[raw] ?? raw
  if (/^\d{1,2}$/.test(normalised)) {
    const n = Number(normalised)
    if (n > 0) return t('booking:floorLevel.numbered.label', { count: n, ordinal: true })
  }

  return value.trim()
}

// ─── Flexibility ──────────────────────────────────────────────────────────────

const FLEXIBILITY_KEY: Record<string, string> = {
  flexible_1hr: 'flexible1hr',
  not_flexible: 'notFlexible',
}

/** `FlexibilityOption`, written by `add-listing/5`. */
// i18n-keys: booking:flexibility.flexible1hr.label, booking:flexibility.notFlexible.label
export function flexibilityLabel(t: TFunction, value: string | null | undefined): string {
  if (!value) return notSpecified(t)
  const key = FLEXIBILITY_KEY[value.trim().toLowerCase()]
  return key ? t(`booking:flexibility.${key}.label`) : value.trim()
}

// ─── Additional services ──────────────────────────────────────────────────────

const SERVICE_KEY: Record<string, string> = {
  furniture_disassembly: 'furnitureDisassembly',
  furniture_assembly: 'furnitureAssembly',
  tv_mount_remove: 'tvMountRemove',
  appliance_disconnect: 'applianceDisconnect',
  appliance_connect: 'applianceConnect',
  disposal_entsorgung: 'disposal',
  moveout_cleaning: 'moveoutCleaning',
  temporary_storage: 'temporaryStorage',
}

/** `AdditionalService`, PRD §7.7. Eight values, all already translated. */
// i18n-keys: booking:services.furnitureDisassembly.option, booking:services.furnitureAssembly.option
// i18n-keys: booking:services.tvMountRemove.option, booking:services.applianceDisconnect.option
// i18n-keys: booking:services.applianceConnect.option, booking:services.disposal.option
// i18n-keys: booking:services.moveoutCleaning.option, booking:services.temporaryStorage.option
export function additionalServiceLabel(t: TFunction, value: string): string {
  const key = SERVICE_KEY[value.trim().toLowerCase()]
  return key ? t(`booking:services.${key}.option`) : value.trim()
}

// ─── Packing materials ────────────────────────────────────────────────────────

const MATERIAL_KEY: Record<string, string> = {
  moving_boxes: 'movingBoxes',
  wardrobe_boxes: 'wardrobeBoxes',
  bubble_wrap: 'bubbleWrap',
  packing_paper: 'packingPaper',
  packing_tape: 'packingTape',
  mattress_covers: 'mattressCovers',
  tv_protection: 'tvProtection',
  dish_inserts: 'dishInserts',
  furniture_blankets: 'furnitureBlankets',
}

/**
 * `PackingMaterial`, PRD Appendix B — the one list here that had **no** key
 * family at all. `booking:packingMaterials` held only a section label and a
 * "{{count}} selected" summary, so the two detail pages that print the
 * materials by name had nothing to print but the title-cased slug.
 *
 * The nine keys are minted under `booking:packingMaterials.*.option`, matching
 * the `.option` suffix the sibling `booking:services.*` list already uses for
 * exactly this — a picked item echoed back on a summary screen.
 *
 * A custom material (PRD: "add additional packing materials by name") is
 * user-typed free text with no slug, so it falls through and renders as
 * itself. That is correct: it is the user's own words, and translating them is
 * neither possible nor wanted.
 */
// i18n-keys: booking:packingMaterials.movingBoxes.option, booking:packingMaterials.wardrobeBoxes.option
// i18n-keys: booking:packingMaterials.bubbleWrap.option, booking:packingMaterials.packingPaper.option
// i18n-keys: booking:packingMaterials.packingTape.option, booking:packingMaterials.mattressCovers.option
// i18n-keys: booking:packingMaterials.tvProtection.option, booking:packingMaterials.dishInserts.option
// i18n-keys: booking:packingMaterials.furnitureBlankets.option
export function packingMaterialLabel(t: TFunction, value: string): string {
  const key = MATERIAL_KEY[value.trim().toLowerCase()]
  return key ? t(`booking:packingMaterials.${key}.option`) : value.trim()
}

// ─── List joining ─────────────────────────────────────────────────────────────

/**
 * Joins translated list items.
 *
 * `Intl.ListFormat` rather than `', '`: a conjunction list is punctuated
 * differently per language, and hard-coding the comma bakes an English
 * typographic rule into every locale. Falls back to the comma where the runtime
 * has no `ListFormat` (older Hermes on the RN side — harmless to guard here
 * too, and it keeps the helper copy-safe).
 */
export function joinLabels(items: string[], locale?: string): string {
  if (items.length === 0) return ''
  try {
    const resolved = locale ?? getActiveLocale()
    return new Intl.ListFormat(resolved, { style: 'long', type: 'conjunction' }).format(items)
  } catch {
    return items.join(', ')
  }
}
