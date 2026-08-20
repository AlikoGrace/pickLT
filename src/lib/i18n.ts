/**
 * i18next instance factory — shared by the client provider and the server helper.
 *
 * There is deliberately no module-level singleton here. A Next.js server process
 * handles requests for many locales concurrently, and a shared mutable instance
 * would leak one request's language into another's render. Every consumer gets
 * its own instance:
 *
 *  - Client: `I18nProvider` (src/app/i18n-provider.tsx) creates one per browser
 *    session, registers `initReactI18next` on it and hands it to
 *    `I18nextProvider`, so `useTranslation()` works in any 'use client'
 *    component.
 *  - Server Components / route handlers: `getTranslations(locale)` in
 *    src/lib/i18n-server.ts creates a throwaway instance per call.
 *
 * THIS MODULE MUST NOT IMPORT `react-i18next`. It did, and the result was that
 * every page in this app returned a 500:
 *
 *     TypeError: (0 , react.createContext) is not a function
 *       at src/lib/i18n.ts
 *       at src/lib/i18n-server.ts
 *       at src/app/layout.tsx
 *
 * react-i18next calls `React.createContext` at module scope, and `createContext`
 * does not exist in the React Server Components runtime. The root layout is a
 * Server Component, it imports `i18n-server.ts`, which imports this file — so a
 * single top-level import of react-i18next here took the whole app down, at
 * runtime only. `tsc --noEmit` and `next lint` both pass on it, which is why it
 * survived. Registering the React plugin is the *provider's* job; the provider
 * is a 'use client' module and may import whatever it likes.
 *
 * Locale resolution is cookie -> Accept-Language -> 'en' (see i18n-config.ts).
 * There is no `[locale]` URL segment (decision D5).
 */

import { createInstance, type i18n as I18nInstance, type InitOptions, type Resource } from 'i18next'
import {
  DEFAULT_LOCALE,
  DEFAULT_NAMESPACE,
  NAMESPACES,
  type Locale,
} from './i18n-config'

export function buildInitOptions(locale: Locale, resources: Resource): InitOptions {
  return {
    lng: locale,
    fallbackLng: DEFAULT_LOCALE,
    supportedLngs: undefined, // resources are preloaded; no runtime negotiation here
    ns: [...NAMESPACES],
    defaultNS: DEFAULT_NAMESPACE,
    fallbackNS: DEFAULT_NAMESPACE,
    resources,

    // Resources are bundled, so init is synchronous and nothing is ever fetched.
    initAsync: false,
    partialBundledLanguages: false,

    // Keys are dotted paths within a namespace: t('booking:step.review.title').
    keySeparator: '.',
    nsSeparator: ':',

    // Plurals come from Intl.PluralRules via the i18next v4 JSON format, which is
    // the only format i18next >= 24 supports (the old `compatibilityJSON` option
    // no longer exists). That is what gives `pl` its 4 CLDR plural categories.
    interpolation: {
      // Left at i18next's default (true): interpolated values are HTML-escaped
      // before they reach React.
      //
      // NOTE for whoever wires up interpolation of free text (names, addresses):
      // React already escapes everything it renders, so escaping twice makes an
      // apostrophe or ampersand surface literally as `&#39;` / `&amp;`. If that
      // shows up, the fix is `escapeValue: false` here — the setting
      // react-i18next itself recommends for React DOM — not a per-call-site hack.
      escapeValue: true,
    },

    returnNull: false,
    returnEmptyString: false,

    // Empty `{}` catalogs are expected until the extraction agents land; don't
    // spam the console in production, but do surface misses in development.
    debug: false,
    saveMissing: false,
  }
}

/**
 * Create an i18next instance bound to `locale`, with no React binding.
 *
 * Safe in every runtime: Server Components, route handlers, the Edge
 * middleware, plain modules and the browser. The client provider builds on
 * `buildInitOptions` above and adds `initReactI18next` itself.
 */
export function createI18nInstance(locale: Locale, resources: Resource): I18nInstance {
  const instance = createInstance()
  // Synchronous: all resources are already in memory, no backend plugin.
  instance.init(buildInitOptions(locale, resources))
  return instance
}

export {
  DEFAULT_LOCALE,
  DEFAULT_NAMESPACE,
  LOCALES,
  LOCALE_COOKIE,
  LOCALE_HEADER,
  LOCALE_NAMES,
  NAMESPACES,
  isLocale,
  negotiateLocale,
  normalizeLocale,
} from './i18n-config'
export type { Locale, Namespace } from './i18n-config'
