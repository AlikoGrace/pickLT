'use client'

/**
 * The language switcher.
 *
 * Replaces the Chisfis template's `CurrLangDropdown`, whose language list came
 * from `src/data/navigation.ts` and whose entries all linked to `#` — it looked
 * like a switcher and did nothing. Its currency tab was equally inert.
 *
 * How switching works (decision D5 — no `[locale]` URL segment):
 *
 *   1. write the `picklt_locale` cookie from the browser,
 *   2. `router.refresh()`.
 *
 * The refresh re-runs the root layout on the server, which calls
 * `resolveLocale()` — reading that same cookie — and passes the new locale plus
 * its resources back down to `I18nProvider`, which folds them into the live
 * i18next instance and calls `changeLanguage`. react-i18next then re-renders
 * every subscribed component. No `window.location.reload()`, so client state
 * (an open booking wizard, a half-filled form) survives the switch.
 *
 * The cookie is written here rather than through a route handler because the
 * middleware sets it `httpOnly: false` precisely so this can be one line
 * instead of a network round trip. It is a display preference, not a
 * credential.
 *
 * The names in the menu are endonyms from `LOCALE_NAMES` — "Deutsch", never
 * "German". A user who cannot read the current UI language can still find their
 * own. They are deliberately NOT translation keys: a language's own name is the
 * same string in all eight catalogs.
 */

import {
  DEFAULT_LOCALE,
  LOCALES,
  LOCALE_COOKIE,
  LOCALE_COOKIE_MAX_AGE,
  LOCALE_NAMES,
  isLocale,
  type Locale,
} from '@/lib/i18n-config'
import { CloseButton, Popover, PopoverButton, PopoverPanel, PopoverPanelProps } from '@headlessui/react'
import { CheckIcon, GlobeAltIcon } from '@heroicons/react/24/outline'
import { ChevronDownIcon } from '@heroicons/react/24/solid'
import clsx from 'clsx'
import { useRouter } from 'next/navigation'
import { FC, useTransition } from 'react'
import { useTranslation } from 'react-i18next'

/**
 * `defaultValue` rather than a key added to `src/locales/en/common.json`: the
 * shared catalogs here are written by `sync-locales` from pickltmobile (D6), so
 * a key invented in this repo would be reported as an orphan and overwritten on
 * the next sync. When the extraction wave adds `common.language.*` upstream,
 * these fall through to it automatically and the defaults become dead weight
 * that can be deleted.
 */
function useLabels() {
  const { t } = useTranslation('common')
  return {
    title: t('common:language.label', { defaultValue: 'Language' }),
    choose: t('common:language.choose', { defaultValue: 'Choose a language' }),
  }
}

/**
 * The active locale, taken from the provider's instance rather than from a
 * prop. The provider is initialised from the server-resolved locale, so this
 * agrees with `<html lang>` during SSR and after every switch — and no caller
 * has to thread a `locale` prop through a header it does not otherwise own.
 */
function useActiveLocale(): Locale {
  const { i18n } = useTranslation('common')
  const lng = i18n.resolvedLanguage ?? i18n.language
  return isLocale(lng) ? lng : DEFAULT_LOCALE
}

interface Props {
  className?: string
  panelAnchor?: PopoverPanelProps['anchor']
  panelClassName?: PopoverPanelProps['className']
}

const LanguageDropdown: FC<Props> = ({
  className,
  panelAnchor = { to: 'bottom end', gap: 16 },
  panelClassName = 'w-64',
}) => {
  const router = useRouter()
  const locale = useActiveLocale()
  const labels = useLabels()
  // The refresh is a server round trip; `isPending` keeps the menu from looking
  // frozen on a slow connection without introducing a spinner of its own.
  const [isPending, startTransition] = useTransition()

  const select = (next: Locale) => {
    if (next === locale) return
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=${LOCALE_COOKIE_MAX_AGE}; samesite=lax`
    // D8: mirror the choice onto the user document so server-generated push
    // notifications and the tax PDF come out in this language too. Fire and
    // forget, and never awaited — the cookie above is what the user is about to
    // see, and it must not wait on (or be undone by) a round trip. Signed-out
    // visitors get a 204 from the route; nothing here needs to know.
    void fetch('/api/user/locale', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locale: next }),
    }).catch(() => {})
    startTransition(() => router.refresh())
  }

  return (
    <Popover className={clsx('group', className)}>
      <PopoverButton
        aria-label={labels.choose}
        className="-m-2.5 flex items-center gap-x-1 p-2.5 text-sm font-medium text-neutral-600 group-hover:text-neutral-950 focus:outline-hidden focus-visible:outline-hidden dark:text-neutral-200 dark:group-hover:text-neutral-100"
      >
        <GlobeAltIcon className="size-5" />
        <span className="hidden sm:inline">{LOCALE_NAMES[locale]}</span>
        <ChevronDownIcon className="size-4 group-data-open:rotate-180" aria-hidden="true" />
      </PopoverButton>

      <PopoverPanel
        anchor={panelAnchor}
        transition
        className={clsx(
          'z-40 rounded-3xl bg-white p-4 shadow-lg ring-1 ring-black/5 transition duration-200 ease-in-out data-closed:translate-y-1 data-closed:opacity-0 dark:bg-neutral-800',
          isPending && 'pointer-events-none opacity-70',
          panelClassName
        )}
      >
        <p className="px-2.5 pb-2 text-xs font-semibold tracking-wide text-neutral-500 uppercase dark:text-neutral-400">
          {labels.title}
        </p>
        <div className="flex flex-col">
          {LOCALES.map((code) => (
            <CloseButton
              as="button"
              key={code}
              type="button"
              lang={code}
              onClick={() => select(code)}
              aria-current={code === locale ? 'true' : undefined}
              className={clsx(
                'flex items-center justify-between rounded-lg px-2.5 py-2 text-start text-sm transition duration-150 ease-in-out hover:bg-neutral-100 focus:outline-hidden dark:hover:bg-neutral-700',
                code === locale ? 'font-medium text-neutral-900 dark:text-neutral-100' : 'text-neutral-700 opacity-90 dark:text-neutral-300'
              )}
            >
              {LOCALE_NAMES[code]}
              {code === locale && <CheckIcon className="size-4" aria-hidden="true" />}
            </CloseButton>
          ))}
        </div>
      </PopoverPanel>
    </Popover>
  )
}

export default LanguageDropdown
