'use client'

/**
 * Mounts an i18next instance into React context so every 'use client' component
 * below it can call `useTranslation()` / render `<Trans>`.
 *
 * The instance is created in the browser from resources the server passed down —
 * only the active locale plus the `en` fallback, never all 8 — so the client
 * bundle never carries catalogs it cannot use. Do not import
 * `@/lib/i18n-catalog` from client code; that would defeat this.
 */

import { buildInitOptions } from '@/lib/i18n'
import { clearI18nInstance, registerI18nInstance } from '@/lib/i18n-runtime'
import type { Locale } from '@/lib/i18n-config'
import type { Resource, ResourceKey, ResourceLanguage } from 'i18next'
import { createInstance } from 'i18next'
import { I18nextProvider, initReactI18next } from 'react-i18next'
import { useEffect, useState } from 'react'

export default function I18nProvider({
  locale,
  resources,
  children,
}: {
  locale: Locale
  resources: Resource
  children: React.ReactNode
}) {
  // One instance per browser session; `useState` initialiser so it survives
  // re-renders and is never re-created on the server.
  const [instance] = useState(() => {
    // `initReactI18next` is registered HERE and nowhere else. It touches
    // `React.createContext` at import time, which does not exist in the React
    // Server Components runtime — importing it from the shared factory in
    // `@/lib/i18n` made the root layout, and therefore every page, throw a 500.
    // This module is 'use client', so it is the correct and only home for it.
    const i18n = createInstance()
    i18n.use(initReactI18next)
    i18n.init(buildInitOptions(locale, resources))
    return i18n
  })

  // Hand the same instance to `@/lib/i18n-runtime` so non-component modules
  // (error mappers, label builders) resolve against the language the user is
  // actually looking at. `useState`'s initialiser already ran, so this is
  // registered before any effect below can fire; the layout effect ordering
  // only matters for code that translates during render, which by definition
  // is a component and uses the hook instead.
  useEffect(() => {
    registerI18nInstance(instance)
    return () => clearI18nInstance()
  }, [instance])

  // The language picker sets the cookie then calls router.refresh(), which
  // re-runs the server layout and hands us new props. Fold those into the
  // existing instance rather than tearing it down.
  useEffect(() => {
    for (const [lng, namespaces] of Object.entries(resources) as [
      string,
      ResourceLanguage,
    ][]) {
      for (const [ns, bundle] of Object.entries(namespaces) as [string, ResourceKey][]) {
        instance.addResourceBundle(lng, ns, bundle, true, true)
      }
    }
    if (instance.language !== locale) {
      void instance.changeLanguage(locale)
    }
  }, [instance, locale, resources])

  return <I18nextProvider i18n={instance}>{children}</I18nextProvider>
}
