/**
 * Server-side translation, without React context.
 *
 * For Server Components and API route handlers. `useTranslation()` needs the
 * React provider tree, which route handlers do not have and Server Components
 * cannot subscribe to — so those call sites use this instead.
 *
 * Intended pattern (NOT yet applied to existing call sites — string extraction
 * is a separate workstream; this only makes the helper available):
 *
 *   // Server Component
 *   import { getTranslations } from '@/lib/i18n-server'
 *   export default async function Page() {
 *     const { t } = await getTranslations()          // locale from cookie/header
 *     return <h1>{t('web:dashboard.title')}</h1>
 *   }
 *
 *   // Route handler — the ~200 user-facing strings under src/app/api/** go here.
 *   import { getTranslations, resolveLocale } from '@/lib/i18n-server'
 *   export async function POST(req: NextRequest) {
 *     const { t } = await getTranslations(await resolveLocale())
 *     if (!body.moveId) {
 *       return NextResponse.json({ error: t('errors:move.missingId') }, { status: 400 })
 *     }
 *   }
 *
 * `resolveLocale()` reads `cookies()`/`headers()`, so it only works inside a
 * request scope. Anything outside one (a cron job, an Appwrite function callback,
 * a background task) must pass an explicit locale — read it off the user document
 * (decision D8) and call `getTranslations('de')` directly.
 *
 * Reading cookies/headers opts the calling route into dynamic rendering. That is
 * already true of every route here because the middleware runs on all of them.
 */

import { cookies, headers } from 'next/headers'
import type { TFunction, i18n as I18nInstance } from 'i18next'
import { createI18nInstance } from './i18n'
import { getResources } from './i18n-catalog'
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  LOCALE_HEADER,
  negotiateLocale,
  normalizeLocale,
  type Locale,
} from './i18n-config'

/**
 * The request's locale: the `picklt_locale` cookie, else the locale the
 * middleware negotiated and stamped on `x-picklt-locale`, else Accept-Language,
 * else `en`. Never throws — an out-of-scope call falls back to `en`.
 */
export async function resolveLocale(): Promise<Locale> {
  try {
    const [cookieStore, headerList] = await Promise.all([cookies(), headers()])
    return (
      normalizeLocale(cookieStore.get(LOCALE_COOKIE)?.value) ??
      normalizeLocale(headerList.get(LOCALE_HEADER)) ??
      negotiateLocale(null, headerList.get('accept-language'))
    )
  } catch {
    return DEFAULT_LOCALE
  }
}

export interface ServerTranslation {
  t: TFunction
  i18n: I18nInstance
  locale: Locale
}

/**
 * Translations for `locale`, or for the current request when omitted.
 *
 * A fresh i18next instance per call — cheap (resources are already in memory,
 * init is synchronous) and, more importantly, concurrency-safe: one server
 * process serves many locales at once and must not share mutable language state.
 */
export async function getTranslations(locale?: Locale): Promise<ServerTranslation> {
  const resolved = locale ?? (await resolveLocale())
  const instance = createI18nInstance(resolved, getResources(resolved))
  return { t: instance.t.bind(instance) as TFunction, i18n: instance, locale: resolved }
}

/** Synchronous variant for callers that already know the locale. */
export function getTranslationsForLocale(locale: Locale): ServerTranslation {
  const instance = createI18nInstance(locale, getResources(locale))
  return { t: instance.t.bind(instance) as TFunction, i18n: instance, locale }
}
