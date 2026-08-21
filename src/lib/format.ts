/**
 * The formatting layer: money, dates, numbers.
 *
 * Before this module there were **five mutually inconsistent euro formatters**
 * and zero uses of `Intl.NumberFormat` in the entire product:
 *
 *   `€${n.toFixed(2)}`            → €1234.50   (no grouping, symbol leading)
 *   hand-rolled `\B(?=(\d{3})+…)` → €1,234.50  (en-US grouping, always)
 *   `${n.toFixed(2)} €`           → 1234.56 €  (correct in no locale at all)
 *
 * All three are wrong outside `en-*`. German writes `1.234,56 €`, French
 * `1 234,56 €`, Dutch `€ 1.234,56` — the decimal mark, the group mark, the
 * symbol's side and the space around it all move. That is not something a
 * translation catalog can express, and it is not worth eight hand-maintained
 * tables either: `Intl` already knows the answer for all eight locales and
 * needs no translator.
 *
 * ## Rules
 *
 * 1. **Never format money, a date or a grouped number by hand.** Call one of
 *    the functions below. If one is missing, add it here.
 * 2. **Resolve the locale at call time.** Every function takes an optional
 *    explicit locale and otherwise reads `getLocale()` *inside the call*. A
 *    module-level `const fmt = new Intl.NumberFormat(getLocale())` freezes the
 *    boot language and survives a language switch — the same hazard as a
 *    module-scope label map.
 * 3. **Format last, interpolate after.** Catalog convention §3.4: pass an
 *    already-formatted string into `t()`, never a raw number with an inline
 *    format specifier.
 * 4. **Never parse a formatted string back.** These outputs are labels. The
 *    value is the number. (`lib/dac7.ts`'s XML `amount()` is deliberately not
 *    routed through here — a machine-readable payload must stay
 *    locale-independent.)
 *
 *
 * ## Next.js: the server side
 *
 * `getActiveLocale()` is browser-only by design (see `i18n-runtime.ts`) — a
 * module-level "current locale" in a server process would leak one request's
 * language into another's render. So in a **Server Component or a route
 * handler you must pass `locale` explicitly**:
 *
 *     const locale = await getRequestLocale()
 *     formatMoney(total, { locale })
 *
 * In a `'use client'` component the default is correct and re-reads on every
 * render, so a language switch takes effect immediately.
 * Formatters are memoised per (locale, options) because constructing an
 * `Intl.NumberFormat` is the expensive part and a price list rebuilds one per
 * row otherwise.
 */

import { getActiveLocale as getLocale } from './i18n-runtime'

/**
 * The platform currency. Every price in the product is euro-denominated
 * (the Stripe boundary pins `currency: 'eur'`), so
 * this is a constant rather than a parameter — but it is *named*, so the day a
 * second currency appears there is one place to thread it through.
 */
export const PLATFORM_CURRENCY = 'EUR'

/** Anything a formatter can be handed. `null`/`undefined`/NaN render as a dash. */
export type Amount = number | null | undefined

/** What a formatter renders when there is no number to render. */
export const EMPTY_VALUE = '—'

function isRenderable(value: Amount): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

// ── Formatter cache ──────────────────────────────────────────────────────────

const numberFormatters = new Map<string, Intl.NumberFormat>()
const dateFormatters = new Map<string, Intl.DateTimeFormat>()

function numberFormatter(locale: string, options: Intl.NumberFormatOptions): Intl.NumberFormat {
  const key = `${locale}|${JSON.stringify(options)}`
  let fmt = numberFormatters.get(key)
  if (!fmt) {
    fmt = new Intl.NumberFormat(locale, options)
    numberFormatters.set(key, fmt)
  }
  return fmt
}

function dateFormatter(locale: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = `${locale}|${JSON.stringify(options)}`
  let fmt = dateFormatters.get(key)
  if (!fmt) {
    fmt = new Intl.DateTimeFormat(locale, options)
    dateFormatters.set(key, fmt)
  }
  return fmt
}

// ── Money ────────────────────────────────────────────────────────────────────

export interface MoneyOptions {
  /** Override the active locale. Omit in app code; used by tests and by the
   *  server-message layer, which formats for the *recipient's* locale. */
  locale?: string
  /** Drop the decimals when the amount is whole — for compact card labels. */
  compact?: boolean
  /** What to render for a null/NaN amount. Defaults to an em dash. */
  fallback?: string
}

/**
 * The one euro formatter.
 *
 *   formatMoney(1234.56)          // de → "1.234,56 €"   fr → "1 234,56 €"
 *   formatMoney(1234.56)          // en → "€1,234.56"    nl → "€ 1.234,56"
 *   formatMoney(1200, {compact:true}) // de → "1.200 €"
 *   formatMoney(null)             // "—"
 */
export function formatMoney(amount: Amount, options: MoneyOptions = {}): string {
  if (!isRenderable(amount)) return options.fallback ?? EMPTY_VALUE
  const locale = options.locale ?? getLocale()
  const whole = options.compact && Number.isInteger(amount)
  return numberFormatter(locale, {
    style: 'currency',
    currency: PLATFORM_CURRENCY,
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  }).format(amount)
}

/**
 * Money with no decimals at all, whatever the amount — the "€1,234" shape a few
 * summary tiles use. Still locale-correct about grouping and symbol placement.
 */
export function formatMoneyRounded(amount: Amount, options: MoneyOptions = {}): string {
  if (!isRenderable(amount)) return options.fallback ?? EMPTY_VALUE
  const locale = options.locale ?? getLocale()
  return numberFormatter(locale, {
    style: 'currency',
    currency: PLATFORM_CURRENCY,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * A per-unit rate: `€0,45/km` in German, `€0.45/km` in English.
 *
 * The unit suffix is *not* translated — `km`, `week` and `person` come from
 * the pricing config's own unit vocabulary. Only the number is localised.
 */
export function formatMoneyPerUnit(amount: Amount, unit: string, options: MoneyOptions = {}): string {
  const money = formatMoney(amount, options)
  return money === (options.fallback ?? EMPTY_VALUE) ? money : `${money}/${unit}`
}

// ── Plain numbers ────────────────────────────────────────────────────────────

export interface NumberOptions {
  locale?: string
  minimumFractionDigits?: number
  maximumFractionDigits?: number
  fallback?: string
}

/** Grouped decimal number: `1.234,5` in de, `1,234.5` in en. */
export function formatNumber(value: Amount, options: NumberOptions = {}): string {
  if (!isRenderable(value)) return options.fallback ?? EMPTY_VALUE
  const { locale, fallback: _fallback, ...rest } = options
  return numberFormatter(locale ?? getLocale(), rest).format(value)
}

/**
 * A distance in kilometres. The `km` symbol is SI and identical in all eight
 * locales; `Intl`'s `unit` style additionally gets the spacing right.
 */
export function formatDistanceKm(km: Amount, options: NumberOptions = {}): string {
  if (!isRenderable(km)) return options.fallback ?? EMPTY_VALUE
  return numberFormatter(options.locale ?? getLocale(), {
    style: 'unit',
    unit: 'kilometer',
    unitDisplay: 'short',
    maximumFractionDigits: options.maximumFractionDigits ?? 1,
  }).format(km)
}

/**
 * The cubic-metre symbol.
 *
 * `Intl` cannot format this one: ECMA-402's sanctioned unit list has
 * `kilometer`, `megabyte` and `liter` but stops short of `cubic-meter`, so the
 * symbol is appended here instead of by the engine. It is still appended in
 * exactly **one** place, and the number still goes through the locale
 * formatter — which is the half a catalog value gets wrong. `"{{n}} m³"` typed
 * into eight JSON files renders `12.5 m³` to a German reader who must see
 * `12,5 m³`.
 */
const VOLUME_UNIT_M3 = 'm³'

/** A volume in cubic metres: `15 m³` in en, `12,5 m³` in de. */
export function formatVolumeM3(value: Amount, options: NumberOptions = {}): string {
  if (!isRenderable(value)) return options.fallback ?? EMPTY_VALUE
  const text = formatNumber(value, { maximumFractionDigits: 1, ...options })
  return `${text} ${VOLUME_UNIT_M3}`
}

/**
 * A closed volume range: `10–25 m³`.
 *
 * The separator is **not** a hyphen typed by hand — `Intl.NumberFormat`'s
 * `formatRange` knows that most European locales want an en dash and Spanish,
 * Italian and Dutch want a plain hyphen. Older engines (Hermes ships a partial
 * ECMA-402) may not implement it, so a joined fallback keeps the call site
 * total rather than throwing on a phone.
 */
export function formatVolumeRangeM3(
  min: number,
  max: number,
  options: NumberOptions = {},
): string {
  const locale = options.locale ?? getLocale()
  const fmt = numberFormatter(locale, { maximumFractionDigits: 1 })
  let range: string
  try {
    range = fmt.formatRange(min, max)
  } catch {
    range = `${fmt.format(min)}–${fmt.format(max)}`
  }
  return `${range} ${VOLUME_UNIT_M3}`
}

/**
 * An open-ended volume floor: `25+ m³`.
 *
 * `+` is a mathematical sign, not a word, and reads the same in all eight
 * markets — but the number in front of it is data and is formatted.
 */
export function formatVolumeAtLeastM3(min: Amount, options: NumberOptions = {}): string {
  if (!isRenderable(min)) return options.fallback ?? EMPTY_VALUE
  return `${formatNumber(min, { maximumFractionDigits: 1, ...options })}+ ${VOLUME_UNIT_M3}`
}

/** A mass in kilograms: `120 kg` in en, `120 kg` in de with the locale's own digits. */
export function formatWeightKg(value: Amount, options: NumberOptions = {}): string {
  if (!isRenderable(value)) return options.fallback ?? EMPTY_VALUE
  return numberFormatter(options.locale ?? getLocale(), {
    style: 'unit',
    unit: 'kilogram',
    unitDisplay: 'short',
    maximumFractionDigits: options.maximumFractionDigits ?? 0,
  }).format(value)
}

/**
 * An upload ceiling in megabytes: `10 MB` — and `10 Mo` in French, which is
 * the reason this is not a catalog literal. Eight translators cannot be
 * expected to know CLDR's byte-unit abbreviations, and seven of them
 * copied `10MB` verbatim.
 */
export function formatFileSizeMb(megabytes: Amount, options: NumberOptions = {}): string {
  if (!isRenderable(megabytes)) return options.fallback ?? EMPTY_VALUE
  return numberFormatter(options.locale ?? getLocale(), {
    style: 'unit',
    unit: 'megabyte',
    unitDisplay: 'short',
    maximumFractionDigits: options.maximumFractionDigits ?? 0,
  }).format(megabytes)
}

/**
 * A short duration in seconds: `12s` in en, `12 Sek.` in de, `12sn` in tr.
 *
 * The bare `s` suffix is English abbreviation, not a symbol — German, Polish
 * and Turkish all write it differently, and `{{count}}s` in the catalog gave
 * all three the English one.
 */
export function formatSeconds(
  value: Amount,
  options: NumberOptions & { unitDisplay?: 'narrow' | 'short' | 'long' } = {},
): string {
  if (!isRenderable(value)) return options.fallback ?? EMPTY_VALUE
  return numberFormatter(options.locale ?? getLocale(), {
    style: 'unit',
    unit: 'second',
    unitDisplay: options.unitDisplay ?? 'narrow',
    maximumFractionDigits: options.maximumFractionDigits ?? 0,
  }).format(value)
}

/**
 * A distance in metres — the geofence radius and the last few hundred metres
 * of an approach, where kilometres would read as `0.1 km`.
 */
export function formatDistanceM(meters: Amount, options: NumberOptions = {}): string {
  if (!isRenderable(meters)) return options.fallback ?? EMPTY_VALUE
  return numberFormatter(options.locale ?? getLocale(), {
    style: 'unit',
    unit: 'meter',
    unitDisplay: 'short',
    maximumFractionDigits: options.maximumFractionDigits ?? 0,
  }).format(meters)
}

/** A percentage from a *rate* (0.19 → "19 %" in de, "19%" in en). */
export function formatPercent(rate: Amount, options: NumberOptions = {}): string {
  if (!isRenderable(rate)) return options.fallback ?? EMPTY_VALUE
  return numberFormatter(options.locale ?? getLocale(), {
    style: 'percent',
    maximumFractionDigits: options.maximumFractionDigits ?? 2,
  }).format(rate)
}

// ── Dates ────────────────────────────────────────────────────────────────────

export type DateInput = Date | string | number | null | undefined

function toDate(value: DateInput): Date | null {
  if (value === null || value === undefined) return null
  const d = value instanceof Date ? value : new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

export interface DateOptions extends Intl.DateTimeFormatOptions {
  locale?: string
  fallback?: string
}

/** Arbitrary `Intl.DateTimeFormat` options, locale-resolved at call time. */
export function formatDateWith(value: DateInput, options: DateOptions = {}): string {
  const date = toDate(value)
  if (!date) return options.fallback ?? EMPTY_VALUE
  const { locale, fallback: _fallback, ...rest } = options
  return dateFormatter(locale ?? getLocale(), rest).format(date)
}

/** `Wed, 12 Mar 2026` in en-GB order, `Mi., 12. März 2026` in de. */
export function formatDate(value: DateInput, options: DateOptions = {}): string {
  return formatDateWith(value, { day: 'numeric', month: 'short', year: 'numeric', ...options })
}

/** Weekday + day + month, no year — the booking-wizard chip format. */
export function formatDayMonth(value: DateInput, options: DateOptions = {}): string {
  return formatDateWith(value, { weekday: 'short', month: 'short', day: 'numeric', ...options })
}

/** `12 March 2026` / `12. März 2026`. */
export function formatDateLong(value: DateInput, options: DateOptions = {}): string {
  return formatDateWith(value, { day: 'numeric', month: 'long', year: 'numeric', ...options })
}

/** Time of day, in the locale's own 12/24-hour convention. */
export function formatTime(value: DateInput, options: DateOptions = {}): string {
  return formatDateWith(value, { hour: '2-digit', minute: '2-digit', ...options })
}

/**
 * A range of times of day: `8:00 AM – 12:00 PM` in en, `08:00–12:00 Uhr` in
 * de, `08:00 – 12:00` in fr.
 *
 * This exists because `booking:arrivalWindow.*` shipped `Morning (8am-12pm)`
 * and **all seven translators independently rewrote it to a 24-hour clock** —
 * no European market reads am/pm — so the same three time ranges lived in
 * eight catalogs and disagreed about their own format. The hours are a
 * business constant; the clock convention, the separator and the trailing
 * `Uhr` are the engine's job.
 *
 * `formatRange` is absent from partial ECMA-402 builds, so a joined fallback
 * keeps the call site total.
 */
export function formatTimeRange(start: DateInput, end: DateInput, options: DateOptions = {}): string {
  const from = toDate(start)
  const to = toDate(end)
  if (!from || !to) return options.fallback ?? EMPTY_VALUE
  const { locale, fallback: _fallback, ...rest } = options
  const fmt = dateFormatter(locale ?? getLocale(), { hour: '2-digit', minute: '2-digit', ...rest })
  try {
    return fmt.formatRange(from, to)
  } catch {
    return `${fmt.format(from)}–${fmt.format(to)}`
  }
}

/** Date and time together. */
export function formatDateTime(value: DateInput, options: DateOptions = {}): string {
  return formatDateWith(value, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...options,
  })
}

/** `March 2026` / `März 2026` — tax statement and card-expiry periods. */
export function formatMonthYear(value: DateInput, options: DateOptions = {}): string {
  return formatDateWith(value, { month: 'long', year: 'numeric', ...options })
}

// ── Month and weekday names ──────────────────────────────────────────────────
//
// There were four hardcoded English month arrays and one hardcoded weekday
// array in the tree. None of them needs to exist, and none of them should be
// put in the catalog: `Intl` already has month and weekday names for every
// locale, in the right case and the right abbreviation style, and it will not
// drift from the dates rendered next to it.

/**
 * The twelve month names, index 0 = January.
 *
 * A fixed UTC day-15 anchor avoids the timezone edge where the 1st of a month
 * lands in the previous month for a negative-offset viewer.
 */
export function monthNames(
  style: 'long' | 'short' = 'long',
  locale: string = getLocale(),
): string[] {
  const fmt = dateFormatter(locale, { month: style, timeZone: 'UTC' })
  return Array.from({ length: 12 }, (_, m) => fmt.format(Date.UTC(2021, m, 15)))
}

/**
 * Weekday names starting on **Monday**, index 0 = Monday.
 *
 * Monday-first is deliberate: the calendar grid is Monday-first for every
 * market we operate in. 2021-03-01 was a Monday.
 */
export function weekdayNames(
  style: 'long' | 'short' | 'narrow' = 'short',
  locale: string = getLocale(),
): string[] {
  const fmt = dateFormatter(locale, { weekday: style, timeZone: 'UTC' })
  return Array.from({ length: 7 }, (_, d) => fmt.format(Date.UTC(2021, 2, 1 + d)))
}

// ── Regions ──────────────────────────────────────────────────────────────────

/**
 * An ISO-3166 alpha-2 country code as a name in the active locale.
 *
 * Replaces a hand-maintained 35-entry English map in `lib/card-details.ts`.
 * Putting those 35 names in the catalog would have been 280 translations of
 * something `Intl` already knows.
 */
export function regionName(code: string | null | undefined, locale: string = getLocale()): string {
  if (!code) return ''
  const upper = code.toUpperCase()
  try {
    return new Intl.DisplayNames([locale], { type: 'region', fallback: 'code' }).of(upper) ?? upper
  } catch {
    // `Intl.DisplayNames` is absent on some older Hermes builds.
    return upper
  }
}

/**
 * A BCP-47 language tag as a language name in the active locale.
 *
 * Sibling of `regionName` above, and for the same reason: the mover onboarding
 * form offers ten spoken languages, and hand-typing them in the catalog would
 * have been 80 translations of something `Intl` already knows.
 */
export function languageName(code: string | null | undefined, locale: string = getLocale()): string {
  if (!code) return ''
  try {
    return new Intl.DisplayNames([locale], { type: 'language', fallback: 'code' }).of(code) ?? code
  } catch {
    // `Intl.DisplayNames` is absent on some older Hermes builds.
    return code
  }
}
