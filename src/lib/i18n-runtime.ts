/**
 * `t()` for modules that are not React components.
 *
 * There are a lot of these: error mappers, label builders, validators,
 * formatters — code that produces user-facing text but has no hooks and no
 * provider above it. `useTranslation()` is unavailable there by construction,
 * and that is the specific reason this project chose i18next over next-intl
 * (master plan, D4).
 *
 * ---------------------------------------------------------------------------
 * THE BOUNDARY — read this before using it
 * ---------------------------------------------------------------------------
 *
 * A module-level "current language" is safe in a browser (one tab, one user,
 * one locale) and actively dangerous in a Next.js server process (one process,
 * many concurrent requests, many locales — a shared mutable instance would leak
 * one request's language into another's render). So the two sides differ:
 *
 *   Browser        `t()` resolves against the instance `I18nProvider` created
 *                  for this session and registered here on mount. It tracks the
 *                  language switcher automatically.
 *
 *   Server         `t()` deliberately does NOT consult any ambient state. It
 *                  falls back to an empty `en` instance, which returns the key
 *                  itself. Server-side non-component code must instead take the
 *                  locale explicitly:
 *
 *                      import { getTranslationsForLocale } from '@/lib/i18n-server'
 *                      const { t } = getTranslationsForLocale(locale)   // sync
 *                      const { t } = await getTranslations()            // request-scoped
 *
 * A shared module that runs on both sides should accept a `t` (or a locale) as
 * an argument rather than importing this one. That keeps it testable and makes
 * the locale visible at the call site instead of implied by the environment.
 *
 * This module imports no catalog on purpose. Importing `@/lib/i18n-catalog`
 * here would drag all eight locales into any client bundle that touches a
 * label helper.
 */

import type { TFunction, TOptions, i18n as I18nInstance } from 'i18next'
import { createI18nInstance } from './i18n'
import { DEFAULT_LOCALE, type Locale } from './i18n-config'

let active: I18nInstance | null = null
let fallback: I18nInstance | null = null

/** Empty `en` instance. Created once, lazily; every key resolves to itself. */
function getFallback(): I18nInstance {
  if (!fallback) {
    fallback = createI18nInstance(DEFAULT_LOCALE, { [DEFAULT_LOCALE]: {} })
  }
  return fallback
}

/**
 * Called by `I18nProvider` on mount. A no-op on the server — see the boundary
 * note above; there is no such thing as "the" instance during SSR.
 */
export function registerI18nInstance(instance: I18nInstance): void {
  if (typeof window === 'undefined') return
  active = instance
}

/** Test/teardown hook. */
export function clearI18nInstance(): void {
  active = null
}

/** The instance `t()` below resolves against. */
export function getI18nInstance(): I18nInstance {
  return active ?? getFallback()
}

/**
 * The active locale as far as non-component code is concerned. `en` on the
 * server and before the provider mounts.
 */
export function getActiveLocale(): Locale {
  const lng = getI18nInstance().resolvedLanguage ?? getI18nInstance().language
  return (lng as Locale) ?? DEFAULT_LOCALE
}

/**
 * Namespaced translation: `t('errors:payment.cardDeclined')`.
 *
 * Not a re-exported bound `t` — it re-reads `getI18nInstance()` on every call,
 * so a module that imports it before the provider mounts still sees the right
 * instance afterwards.
 */
export const t: TFunction = ((key: string, options?: TOptions) =>
  getI18nInstance().t(key, options)) as unknown as TFunction

/** A `t` pinned to one namespace, mirroring `useTranslation('booking').t`. */
export function getFixedT(ns: string): TFunction {
  return ((key: string, options?: TOptions) =>
    getI18nInstance().t(key, { ns, ...options })) as unknown as TFunction
}
