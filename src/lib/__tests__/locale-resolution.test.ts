/**
 * Locale resolution, in the three places it has to work.
 *
 * The rule (decision D5) is one function — `negotiateLocale()` — and everything
 * else defers to it: `src/middleware.ts` calls it to stamp `x-picklt-locale`,
 * `resolveLocale()` in `i18n-server.ts` calls it for Server Components and
 * route handlers, and the root layout hands the result to `I18nProvider` for
 * the client. There is no `[locale]` URL segment anywhere in the chain.
 *
 * What this file pins:
 *   - the negotiation itself (cookie > Accept-Language > 'en'), including the
 *     region-stripping and q-value cases that a hand-rolled parser gets wrong;
 *   - the plain-module `t()` in `i18n-runtime.ts`, and specifically its refusal
 *     to invent an ambient server locale;
 *   - the synchronous server helper, which is what non-request-scoped server
 *     code is supposed to use instead.
 *
 * The Server Component path (`resolveLocale()`) and the React path
 * (`I18nProvider`) are not exercised here: this repo's vitest setup is
 * node-environment and scoped to pure `src/lib` modules by deliberate choice
 * (see vitest.config.ts), and both of those need a Next request scope or a DOM.
 * They are covered by the manual verification recorded in the handover, and
 * both reduce to the two things this file does pin: `negotiateLocale()` for the
 * decision and `createI18nInstance()` for the lookup.
 */

import { beforeEach, describe, expect, it } from 'vitest'
import { createI18nInstance } from '../i18n'
import {
  DEFAULT_LOCALE,
  LOCALES,
  LOCALE_COOKIE,
  LOCALE_HEADER,
  LOCALE_NAMES,
  isLocale,
  localeFromAcceptLanguage,
  negotiateLocale,
  normalizeLocale,
} from '../i18n-config'
import { clearI18nInstance, getActiveLocale, registerI18nInstance, t } from '../i18n-runtime'
import { getTranslationsForLocale } from '../i18n-server'

describe('config', () => {
  it('declares the eight D1 locales and an endonym for each', () => {
    expect([...LOCALES]).toEqual(['de', 'en', 'fr', 'es', 'it', 'pl', 'nl', 'tr'])
    for (const l of LOCALES) expect(LOCALE_NAMES[l]).toBeTruthy()
    // Endonyms, not English names — a user who cannot read the current UI
    // language has to be able to find their own.
    expect(LOCALE_NAMES.de).toBe('Deutsch')
    expect(LOCALE_NAMES.tr).toBe('Türkçe')
  })

  it('uses the same cookie and header names across the PickLT apps', () => {
    expect(LOCALE_COOKIE).toBe('picklt_locale')
    expect(LOCALE_HEADER).toBe('x-picklt-locale')
  })
})

describe('normalizeLocale', () => {
  it('strips region and case', () => {
    expect(normalizeLocale('de-AT')).toBe('de')
    expect(normalizeLocale('DE')).toBe('de')
    expect(normalizeLocale('de_AT')).toBe('de')
    expect(normalizeLocale('  fr-CA ')).toBe('fr')
  })

  it('returns null for anything unsupported, so callers can fall through', () => {
    expect(normalizeLocale('ar')).toBeNull()
    expect(normalizeLocale('')).toBeNull()
    expect(normalizeLocale(undefined)).toBeNull()
    expect(normalizeLocale('not-a-locale')).toBeNull()
  })

  it('does not accept a cookie value smuggled in from elsewhere', () => {
    expect(isLocale('en; Path=/')).toBe(false)
    expect(normalizeLocale('en; Path=/')).toBeNull()
  })
})

describe('localeFromAcceptLanguage', () => {
  it('honours q-values rather than header order', () => {
    expect(localeFromAcceptLanguage('en;q=0.5,de;q=0.9')).toBe('de')
  })

  it('takes the highest-quality *supported* tag', () => {
    // 'ja' is not in D1, so it is skipped rather than defaulting the whole header.
    expect(localeFromAcceptLanguage('ja,pl;q=0.8,en;q=0.3')).toBe('pl')
  })

  it('ignores the wildcard and zero-quality entries', () => {
    expect(localeFromAcceptLanguage('*')).toBeNull()
    expect(localeFromAcceptLanguage('de;q=0')).toBeNull()
  })

  it('returns null when nothing matches', () => {
    expect(localeFromAcceptLanguage('ar,zh-CN')).toBeNull()
    expect(localeFromAcceptLanguage(null)).toBeNull()
  })
})

describe('negotiateLocale', () => {
  it('prefers the cookie over the header — an explicit choice wins', () => {
    expect(negotiateLocale('pl', 'de-DE,de;q=0.9')).toBe('pl')
  })

  it('falls back to the header when the cookie is absent or junk', () => {
    expect(negotiateLocale(null, 'de-DE,de;q=0.9')).toBe('de')
    expect(negotiateLocale('klingon', 'it-IT')).toBe('it')
  })

  it('falls back to en when neither says anything usable', () => {
    expect(negotiateLocale(null, null)).toBe(DEFAULT_LOCALE)
    expect(negotiateLocale('', 'ar')).toBe(DEFAULT_LOCALE)
  })
})

describe('server: getTranslationsForLocale', () => {
  it('returns an instance bound to the requested locale', () => {
    const { t: tr, locale } = getTranslationsForLocale('pl')
    expect(locale).toBe('pl')
    // This used to assert the key resolved to itself, because the catalogs
    // were empty. They are populated now, so it can assert the stronger
    // thing it always meant to: the instance resolves real copy, in the
    // language it was asked for.
    //
    // Note the `.cta` — a key's last segment names the string's role
    // (conventions §2), so the key is `action.cancel.cta`. Asking for
    // `action.cancel` reaches the object above the leaf, not a string.
    expect(tr('common:action.cancel.cta')).toBe('Anuluj')
  })

  it('gives every call its own instance, so concurrent requests cannot mix', () => {
    const a = getTranslationsForLocale('de')
    const b = getTranslationsForLocale('tr')
    expect(a.i18n.language).toBe('de')
    expect(b.i18n.language).toBe('tr')
    expect(a.i18n).not.toBe(b.i18n)
  })
})

describe('plain modules: i18n-runtime', () => {
  beforeEach(() => clearI18nInstance())

  it('defaults to en and never invents an ambient server locale', () => {
    // The whole point: a module-level "current language" is safe in a browser
    // and a cross-request leak in a Next server process. Server-side callers
    // must pass a locale to i18n-server instead.
    expect(getActiveLocale()).toBe(DEFAULT_LOCALE)
    expect(t('common:action.cancel')).toBe('action.cancel')
  })

  it('ignores registration outside a browser', () => {
    registerI18nInstance(createI18nInstance('de', { de: {} }))
    expect(getActiveLocale()).toBe(DEFAULT_LOCALE)
  })

  it('follows the registered instance when there is a window', () => {
    const original = globalThis.window
    // @ts-expect-error — minimal browser stand-in; i18n-runtime only checks for
    // the existence of `window`, which is exactly the condition being tested.
    globalThis.window = {}
    try {
      clearI18nInstance()
      const instance = createI18nInstance('de', {
        de: { common: { action: { cancel: 'Abbrechen' } } },
      })
      registerI18nInstance(instance)
      expect(getActiveLocale()).toBe('de')
      expect(t('common:action.cancel')).toBe('Abbrechen')

      // And it tracks the switcher: changeLanguage on the same instance moves
      // the plain-module `t()` with it, because `t` re-reads the instance on
      // every call rather than closing over a bound function.
      instance.addResourceBundle('tr', 'common', { action: { cancel: 'İptal' } }, true, true)
      void instance.changeLanguage('tr')
      expect(getActiveLocale()).toBe('tr')
      expect(t('common:action.cancel')).toBe('İptal')
    } finally {
      clearI18nInstance()
      if (original === undefined) {
        // @ts-expect-error — restoring the node environment
        delete globalThis.window
      } else {
        globalThis.window = original
      }
    }
  })
})
