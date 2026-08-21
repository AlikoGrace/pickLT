/**
 * i18n constants + locale negotiation. Pure — no catalog imports, no React, no
 * Node built-ins — so this module is safe to import from the Edge middleware,
 * from Server Components and from 'use client' components alike.
 *
 * Decisions this file encodes (see .agent/plans/i18n/0.master.md):
 *  - D1: exactly 8 locales, all Latin script, all LTR (so no `dir` attribute).
 *  - D4: i18next, not next-intl.
 *  - D5: no `[locale]` route segment — the locale lives in a cookie, falling
 *        back to the Accept-Language header, falling back to `en`.
 */

export const LOCALES = ['de', 'en', 'fr', 'es', 'it', 'pl', 'nl', 'tr'] as const

export type Locale = (typeof LOCALES)[number]

export const DEFAULT_LOCALE: Locale = 'en'

/** Cookie the language picker writes. Shared name across all four PickLT apps. */
export const LOCALE_COOKIE = 'picklt_locale'

/** Request header the middleware stamps so the root layout can read the negotiated locale. */
export const LOCALE_HEADER = 'x-picklt-locale'

export const LOCALE_COOKIE_MAX_AGE = 365 * 24 * 60 * 60 // 1 year, in seconds

/**
 * Namespaces. The first eleven are shared byte-for-byte with the other PickLT
 * repos via the `sync-locales` script (D6); `web` is copy specific to the pickLT web client.
 */
export const NAMESPACES = [
  'common',
  'auth',
  'profile',
  'booking',
  'track',
  'moves',
  'errors',
  'legal',
  'inventory',
  'notifications',
  'tax',
  'web',
] as const

export type Namespace = (typeof NAMESPACES)[number]

export const DEFAULT_NAMESPACE: Namespace = 'common'

/** Endonyms — each language named in itself, never in English. */
export const LOCALE_NAMES: Record<Locale, string> = {
  de: 'Deutsch',
  en: 'English',
  fr: 'Français',
  es: 'Español',
  it: 'Italiano',
  pl: 'Polski',
  nl: 'Nederlands',
  tr: 'Türkçe',
}

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value)
}

/**
 * Coerce anything locale-ish ('de-AT', 'DE', 'de_AT') to a supported locale.
 * Returns null when there is no match, so callers can fall through.
 */
export function normalizeLocale(value: string | null | undefined): Locale | null {
  if (!value) return null
  const base = value.trim().toLowerCase().replace('_', '-').split('-')[0]
  return isLocale(base) ? base : null
}

/**
 * Parse an Accept-Language header and return the best supported match.
 * Honours q-values; ignores '*'. Returns null when nothing matches.
 */
export function localeFromAcceptLanguage(header: string | null | undefined): Locale | null {
  if (!header) return null

  const candidates = header
    .split(',')
    .map((part) => {
      const [tag, ...params] = part.trim().split(';')
      const q = params
        .map((p) => p.trim())
        .find((p) => p.startsWith('q='))
        ?.slice(2)
      const quality = q === undefined ? 1 : Number.parseFloat(q)
      return { tag: tag.trim(), quality: Number.isFinite(quality) ? quality : 0 }
    })
    .filter((c) => c.tag && c.tag !== '*' && c.quality > 0)
    .sort((a, b) => b.quality - a.quality)

  for (const candidate of candidates) {
    const match = normalizeLocale(candidate.tag)
    if (match) return match
  }
  return null
}

/**
 * The whole negotiation, in one place: cookie -> Accept-Language -> `en`.
 * Used by the middleware and by the root layout.
 */
export function negotiateLocale(
  cookieValue: string | null | undefined,
  acceptLanguage: string | null | undefined,
): Locale {
  return (
    normalizeLocale(cookieValue) ?? localeFromAcceptLanguage(acceptLanguage) ?? DEFAULT_LOCALE
  )
}
