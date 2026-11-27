'use client'

/**
 * Cookie banner and settings (plan legal/6.web-cleanup.md, W3).
 *
 * Bottom of the page, not blocking it. First visit (or a new consent version):
 * one paragraph, a link to /privacy and two buttons of equal weight. The
 * footer's "Cookie settings" link reopens it with a switch per category.
 *
 * The choice gates browser Sentry in `src/instrumentation-client.ts`, which
 * reads the cookie at page load. "Accept all" also starts Sentry right away;
 * withdrawing consent takes effect on the next page load (Sentry cannot be
 * cleanly torn down in a running page).
 */

import * as Sentry from '@sentry/nextjs'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'

import { consentCookieString, monitoringAllowed, needsPrompt, parseConsent } from '@/lib/cookie-consent'
import { sentryOptions } from '@/lib/sentry-options'
import { Button } from '@/shared/Button'
import { Switch, SwitchField } from '@/shared/switch'
import { Description, Label } from '@/shared/fieldset'

/** Fired by the footer link to reopen the banner in settings mode. */
export const OPEN_COOKIE_SETTINGS_EVENT = 'picklt:cookie-settings'

type Mode = 'hidden' | 'banner' | 'settings'

function saveChoice(monitoring: boolean) {
  document.cookie = consentCookieString(monitoring)
  if (monitoring && !Sentry.getClient()) Sentry.init(sentryOptions())
}

export default function CookieConsent() {
  const { t } = useTranslation()
  // Rendered only after mount: the cookie is read in the browser, so the server
  // HTML never disagrees with the first client render.
  const [mode, setMode] = useState<Mode>('hidden')
  const [monitoring, setMonitoring] = useState(false)

  useEffect(() => {
    if (needsPrompt(document.cookie)) setMode('banner')
    const open = () => {
      setMonitoring(monitoringAllowed(document.cookie))
      setMode('settings')
    }
    window.addEventListener(OPEN_COOKIE_SETTINGS_EVENT, open)
    return () => window.removeEventListener(OPEN_COOKIE_SETTINGS_EVENT, open)
  }, [])

  const choose = useCallback((value: boolean) => {
    saveChoice(value)
    setMonitoring(value)
    setMode('hidden')
  }, [])

  if (mode === 'hidden') return null

  // A visitor who already chose can close settings without changing anything.
  const canClose = mode === 'settings' && parseConsent(document.cookie) !== null

  return (
    <section
      role="region"
      aria-label={t('web:cookies.title')}
      className="fixed inset-x-0 bottom-0 z-50 p-4 sm:p-6"
    >
      <div className="mx-auto max-w-3xl rounded-2xl border border-neutral-200 bg-white p-5 shadow-xl sm:p-6 dark:border-neutral-700 dark:bg-neutral-800">
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">{t('web:cookies.title')}</h2>
          {canClose && (
            <button
              type="button"
              onClick={() => setMode('hidden')}
              className="text-sm text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
            >
              {t('web:cookies.close')}
            </button>
          )}
        </div>
        <p className="mt-2 text-sm/6 text-neutral-600 dark:text-neutral-300">
          <Trans
            i18nKey="web:cookies.text"
            components={[<Link key="privacy" href="/privacy" className="text-primary-600 underline hover:no-underline" />]}
          />
        </p>

        {mode === 'settings' && (
          <div className="mt-5 space-y-5 border-t border-neutral-200 pt-5 dark:border-neutral-700">
            <SwitchField disabled>
              <Label>{t('web:cookies.necessary.title')}</Label>
              <Description>{t('web:cookies.necessary.description')}</Description>
              <Switch checked disabled name="necessary" />
            </SwitchField>
            <SwitchField>
              <Label>{t('web:cookies.monitoring.title')}</Label>
              <Description>{t('web:cookies.monitoring.description')}</Description>
              <Switch checked={monitoring} onChange={setMonitoring} name="monitoring" />
            </SwitchField>
          </div>
        )}

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
          {mode === 'settings' && (
            <Button outline onClick={() => choose(monitoring)}>
              {t('web:cookies.save')}
            </Button>
          )}
          {/* Equal weight on purpose: same variant for both choices. */}
          <Button outline onClick={() => choose(false)}>
            {t('web:cookies.onlyNecessary')}
          </Button>
          <Button outline onClick={() => choose(true)}>
            {t('web:cookies.acceptAll')}
          </Button>
        </div>
      </div>
    </section>
  )
}

/** Footer link that reopens the banner with the per-category switches. */
export function CookieSettingsLink({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      className={className}
      onClick={() => window.dispatchEvent(new Event(OPEN_COOKIE_SETTINGS_EVENT))}
    >
      {children}
    </button>
  )
}
