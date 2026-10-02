'use client'

import { useTranslation } from 'react-i18next'

import { countryFlag, localizedCountryName } from '@/lib/countryCode'
import { isCountryLive, SUPPORTED_COUNTRIES, type SupportedCountry } from '@/lib/supportedCountries'

/**
 * The client's country picker (plan wave-2026-10/4 C3/C7): the shared supported
 * list, localized names, live markets first. A non-live choice is allowed in
 * the control (so the person can see their country is known) but the caller
 * blocks on it and shows `common:country.notAvailable` — use `countryBlocked`.
 */

export const COUNTRY_OPTIONS: readonly SupportedCountry[] = [...SUPPORTED_COUNTRIES].sort(
  (a, b) => Number(b.live) - Number(a.live),
)

/** True when the chosen code is one PickLT does not sell in yet. */
export function countryBlocked(code: string | null | undefined): boolean {
  return !!code && !isCountryLive(SUPPORTED_COUNTRIES, code)
}

interface Props {
  id?: string
  value: string
  onChange: (code: string) => void
  required?: boolean
  disabled?: boolean
  className?: string
  /** Show the "not available in {{country}} yet" notice under the control for a non-live choice. Default on. */
  showNotice?: boolean
}

export default function CountrySelect({ id, value, onChange, required, disabled, className, showNotice = true }: Props) {
  const { t, i18n } = useTranslation()
  const locale = i18n.resolvedLanguage ?? i18n.language
  const blocked = countryBlocked(value)
  return (
    <div>
      <select
        id={id}
        value={value}
        required={required}
        aria-required={required || undefined}
        aria-invalid={blocked || undefined}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={
          className ??
          'w-full min-w-0 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-base text-neutral-900 sm:text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white'
        }
      >
        <option value="">{t('common:country.select.label')}</option>
        {COUNTRY_OPTIONS.map((c) => (
          <option key={c.code} value={c.code}>
            {countryFlag(c.code)} {localizedCountryName(c.code, locale)}
          </option>
        ))}
      </select>
      {showNotice && blocked && (
        <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-800 dark:bg-amber-900/20">
          <p className="font-medium text-amber-800 dark:text-amber-200">{t('common:country.notAvailable.title')}</p>
          <p className="text-amber-700 dark:text-amber-300">
            {t('common:country.notAvailable.body', { country: localizedCountryName(value, locale) })}
          </p>
        </div>
      )}
    </div>
  )
}
