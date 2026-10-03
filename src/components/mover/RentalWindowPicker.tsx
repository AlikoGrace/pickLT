'use client'

import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { formatDateTime } from '@/lib/format'
import { durationToHours, hoursToDuration, isoToLocalDateTime, localDateTimeToIso, type DurationUnit } from '@/lib/rental-time'
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
  const hasHours = !customSelected && value.hours != null && String(value.hours).trim() !== '' && selectedHours! > 0
  const typedHours = hasHours && !RENTAL_DURATION_PRESETS_HOURS.includes(selectedHours!)
  // "Enter a duration": a typed amount in hours or days for rentals the chips don't cover.
  const [durationOpen, setDurationOpen] = useState(typedHours)
  const initialDuration = hoursToDuration(typedHours ? selectedHours : null)
  const [amount, setAmount] = useState(initialDuration.amount)
  const [unit, setUnit] = useState<DurationUnit>(initialDuration.unit)
  const durationActive = !customSelected && (durationOpen || typedHours)

  function applyDuration(nextAmount: string, nextUnit: DurationUnit) {
    setAmount(nextAmount)
    setUnit(nextUnit)
    // An empty or zero entry clears the window so validation says "required", not a stale chip's end.
    onChange({ ...value, hours: durationToHours(nextAmount, nextUnit), endAt: null })
  }

  const resolved = useMemo(() => resolveRentalWindow(value, now), [value, now])

  const minLocal = isoToLocalDateTime(new Date(now + 60 * 60 * 1000).toISOString())
  const maxLocal = isoToLocalDateTime(new Date(now + MAX_RENTAL_HOURS * 60 * 60 * 1000).toISOString())

  return (
    <div className="space-y-4 rounded-xl border border-neutral-200 p-3 sm:p-4 dark:border-neutral-700">
      <div>
        <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{t('booking:vehicle.rental.window.label')}</p>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">{t('booking:vehicle.rental.duration.label')}</p>
      </div>

      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t('booking:vehicle.rental.duration.label')}>
        {RENTAL_DURATION_PRESETS_HOURS.map((hours) => {
          // A typed 24 h is still "Enter a duration" while that field is open — one lit chip only.
          const active = !durationActive && selectedHours === hours
          return (
            <button
              key={hours}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={disabled}
              onClick={() => {
                setDurationOpen(false)
                onChange({ ...value, hours, endAt: null })
              }}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors max-sm:min-h-10 ${
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
          aria-checked={durationActive}
          disabled={disabled}
          onClick={() => {
            setDurationOpen(true)
            applyDuration(amount, unit)
          }}
          className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors max-sm:min-h-10 ${
            durationActive
              ? 'bg-primary-600 text-white'
              : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-600'
          } disabled:opacity-50`}
        >
          {typedHours ? presetLabel(t, selectedHours!) : t('booking:vehicle.rental.preset.duration')}
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={customSelected}
          disabled={disabled}
          onClick={() => {
            setDurationOpen(false)
            onChange({ ...value, hours: null, endAt: value.endAt ?? new Date(now + 24 * 60 * 60 * 1000).toISOString() })
          }}
          className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors max-sm:min-h-10 ${
            customSelected
              ? 'bg-primary-600 text-white'
              : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-600'
          } disabled:opacity-50`}
        >
          {t('booking:vehicle.rental.preset.custom')}
        </button>
      </div>

      {durationActive && (
        <div className="flex items-end gap-2">
          <div className="min-w-0 flex-1">
            <label htmlFor="rental-duration" className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              {t('booking:vehicle.rental.customDuration.label')}
            </label>
            <input
              id="rental-duration"
              type="text"
              inputMode="decimal"
              value={amount}
              disabled={disabled}
              placeholder={t('booking:vehicle.rental.customDuration.placeholder')}
              onChange={(e) => applyDuration(e.target.value.replace(/[^0-9.,]/g, ''), unit)}
              className={inputClass}
            />
          </div>
          <div className="flex shrink-0 rounded-full border border-neutral-200 p-0.5 dark:border-neutral-700" role="radiogroup">
            {(['hours', 'days'] as const).map((u) => (
              // i18n-keys: booking:vehicle.rental.unit.hours.label, booking:vehicle.rental.unit.days.label
              <button
                key={u}
                type="button"
                role="radio"
                aria-checked={unit === u}
                disabled={disabled}
                onClick={() => applyDuration(amount, u)}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors max-sm:min-h-10 ${
                  unit === u ? 'bg-primary-600 text-white' : 'text-neutral-700 dark:text-neutral-200'
                } disabled:opacity-50`}
              >
                {t(`booking:vehicle.rental.unit.${u}.label`)}
              </button>
            ))}
          </div>
        </div>
      )}

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
            className={`${inputClass} min-w-0 max-w-full appearance-none`}
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
