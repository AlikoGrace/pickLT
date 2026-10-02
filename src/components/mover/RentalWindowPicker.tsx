'use client'

import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { formatDateTime } from '@/lib/format'
import { isoToLocalDateTime, localDateTimeToIso } from '@/lib/rental-time'
import {
  MAX_RENTAL_HOURS,
  RENTAL_DURATION_PRESETS_HOURS,
  resolveRentalWindow,
  type RentalWindowInput,
} from '@/lib/vehicle-service'

/**
 * The rental period input (plan wave-2026-10/1 R1): one tap on a duration chip
 * (4 h · 8 h · 1 day · 2 days · 3 days · 1 week), or a custom end date & time,
 * plus the optional rental company. Shows the resolved "Rented until …" live
 * from the SAME `resolveRentalWindow` the server runs, so what the driver reads
 * is what will be stored. Controlled: the parent owns the `RentalWindowInput`.
 */

interface Props {
  value: RentalWindowInput
  onChange: (next: RentalWindowInput) => void
  /** `Date.now()` by default; injected so the preview and the validation agree. */
  nowMs?: number
  disabled?: boolean
}

export const CUSTOM_PRESET = 'custom'

/** Chip label for a preset: `4 h`, `1 day`, `2 days`, `1 week`. */
export function presetLabel(t: (key: string, opts?: Record<string, unknown>) => string, hours: number): string {
  // i18n-keys: booking:vehicle.rental.preset.hours, booking:vehicle.rental.preset.oneDay,
  // booking:vehicle.rental.preset.days, booking:vehicle.rental.preset.week
  if (hours === 168) return t('booking:vehicle.rental.preset.week')
  if (hours === 24) return t('booking:vehicle.rental.preset.oneDay')
  if (hours % 24 === 0) return t('booking:vehicle.rental.preset.days', { count: hours / 24 })
  return t('booking:vehicle.rental.preset.hours', { count: hours })
}

const inputClass =
  'w-full rounded-xl border border-neutral-200 bg-transparent px-4 py-2.5 outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 dark:border-neutral-700'

export default function RentalWindowPicker({ value, onChange, nowMs, disabled }: Props) {
  const { t } = useTranslation()
  const now = nowMs ?? Date.now()
  const customSelected = value.endAt != null
  const selectedHours = customSelected ? null : Number(value.hours)

  const resolved = useMemo(() => resolveRentalWindow(value, now), [value, now])

  const minLocal = isoToLocalDateTime(new Date(now + 60 * 60 * 1000).toISOString())
  const maxLocal = isoToLocalDateTime(new Date(now + MAX_RENTAL_HOURS * 60 * 60 * 1000).toISOString())

  return (
    <div className="space-y-4 rounded-xl border border-neutral-200 p-4 dark:border-neutral-700">
      <div>
        <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{t('booking:vehicle.rental.window.label')}</p>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">{t('booking:vehicle.rental.duration.label')}</p>
      </div>

      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t('booking:vehicle.rental.duration.label')}>
        {RENTAL_DURATION_PRESETS_HOURS.map((hours) => {
          const active = selectedHours === hours
          return (
            <button
              key={hours}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={disabled}
              onClick={() => onChange({ ...value, hours, endAt: null })}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                active
                  ? 'bg-primary-600 text-white'
                  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-600'
              } disabled:opacity-50`}
            >
              {presetLabel(t, hours)}
            </button>
          )
        })}
        <button
          type="button"
          role="radio"
          aria-checked={customSelected}
          disabled={disabled}
          onClick={() => onChange({ ...value, hours: null, endAt: value.endAt ?? new Date(now + 24 * 60 * 60 * 1000).toISOString() })}
          className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
            customSelected
              ? 'bg-primary-600 text-white'
              : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-600'
          } disabled:opacity-50`}
        >
          {t('booking:vehicle.rental.preset.custom')}
        </button>
      </div>

      {customSelected && (
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
            {t('web:mover.vehicle.window.custom.label')}
          </label>
          <input
            type="datetime-local"
            value={isoToLocalDateTime(value.endAt)}
            min={minLocal}
            max={maxLocal}
            disabled={disabled}
            onChange={(e) => onChange({ ...value, hours: null, endAt: localDateTimeToIso(e.target.value) ?? '' })}
            className={inputClass}
          />
        </div>
      )}

      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
          {t('booking:vehicle.rental.provider.label')}
        </label>
        <input
          type="text"
          value={value.provider ?? ''}
          maxLength={120}
          disabled={disabled}
          onChange={(e) => onChange({ ...value, provider: e.target.value })}
          className={inputClass}
        />
      </div>

      <div className="rounded-xl bg-neutral-50 p-3 text-sm dark:bg-neutral-700/50">
        <p className="text-xs text-neutral-500 dark:text-neutral-400">{t('booking:vehicle.rental.startNow.label')}</p>
        {resolved.ok ? (
          <p className="font-medium text-neutral-900 dark:text-neutral-100">
            {t('web:mover.vehicle.window.until.label', { time: formatDateTime(resolved.window.endAt) })}
          </p>
        ) : (
          // i18n-keys: errors:vehicle.rentalWindowRequired, errors:vehicle.rentalWindowInvalid, errors:vehicle.rentalWindowTooLong
          <p className="text-red-600 dark:text-red-400">{t(`errors:${resolved.codes[0]}`)}</p>
        )}
        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{t('booking:vehicle.rental.maxHint.helper')}</p>
      </div>
    </div>
  )
}
