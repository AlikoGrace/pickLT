/**
 * Which `language=` Mapbox should be asked for.
 *
 * Every Mapbox endpoint we call — Geocoding v5, Search Box forward/reverse,
 * Directions — takes a `language` parameter and defaults to English. Until now
 * all of them hardcoded `'en'`, so a German user searching for their own street
 * read "Germany" and "Cologne" instead of "Deutschland" and "Köln". No catalog
 * can fix that: it is a request parameter, not a string in our source.
 *
 * ## Resolve at call time, never at module load
 *
 * `mapboxLanguage()` is a *function*, and call sites must invoke it inside the
 * request builder. A `const LANG = mapboxLanguage()` at module scope would
 * freeze whatever language the app booted in, and a user switching language in
 * Settings would keep getting the old one until the next cold start. This is
 * the same hazard the inventory calls "module-scope label maps freeze at
 * import" — it applies to request parameters too.
 *
 * ## The allow-list
 *
 * All eight app locales are accepted by every endpoint we call, so the
 * fallback is currently unreachable. The coverage behind that acceptance is
 * not uniform, and the difference matters when reading a response:
 *
 *   Geocoding v5   `de en es fr it nl pl` are **global coverage** — the
 *                  translated name is almost always present for countries,
 *                  regions and prominent places. `tr` is **limited coverage**:
 *                  the request is still valid and still succeeds, but features
 *                  without a Turkish name come back in the local language
 *                  rather than in English. That is the desired degradation —
 *                  a Turkish user reads "Köln", not "Cologne".
 *   Search Box     Turkish is fully supported alongside the other seven.
 *
 * So the fallback is not about coverage; it is about *recognition*. It exists
 * so that adding a ninth locale to `LOCALES` cannot silently start
 * sending Mapbox a code it does not know — an unrecognised code does not
 * error, it answers in a language we did not ask for or with fields missing.
 * A locale absent from the map below degrades to English instead.
 */

import { getActiveLocale } from './i18n-runtime'
import { DEFAULT_LOCALE, type Locale } from './i18n-config'

/**
 * App locale → Mapbox language code.
 *
 * Deliberately a map and not `SUPPORTED_LOCALES`: the two lists are allowed to
 * diverge, and this file is where that divergence has to be stated. A locale
 * absent from this map is one Mapbox does not support.
 */
const MAPBOX_LANGUAGE_BY_LOCALE: Partial<Record<Locale, string>> = {
  en: 'en',
  de: 'de',
  fr: 'fr',
  es: 'es',
  it: 'it',
  nl: 'nl',
  pl: 'pl',
  tr: 'tr',
}

/** What we send when the active locale is not one Mapbox knows. */
export const MAPBOX_FALLBACK_LANGUAGE = MAPBOX_LANGUAGE_BY_LOCALE[DEFAULT_LOCALE] ?? 'en'

/** Pure form, for tests and for callers that already hold a locale. */
export function toMapboxLanguage(locale: string | null | undefined): string {
  if (!locale) return MAPBOX_FALLBACK_LANGUAGE
  const base = locale.toLowerCase().split(/[-_]/)[0] as Locale
  return MAPBOX_LANGUAGE_BY_LOCALE[base] ?? MAPBOX_FALLBACK_LANGUAGE
}

/** Is this locale one Mapbox will answer in? */
export function isMapboxSupportedLanguage(locale: string | null | undefined): boolean {
  if (!locale) return false
  const base = locale.toLowerCase().split(/[-_]/)[0] as Locale
  return MAPBOX_LANGUAGE_BY_LOCALE[base] !== undefined
}

/**
 * The active language, read fresh on every call. Use this — not a cached
 * constant — everywhere a Mapbox URL is built.
 */
export function mapboxLanguage(): string {
  return toMapboxLanguage(getActiveLocale())
}
