'use client'

import { TruckIcon } from '@heroicons/react/24/outline'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { confirmVehicleSame, selectVehicle, VehicleApiError } from '@/lib/vehicle-client'

interface Props {
  open: boolean
  /** Post-move re-confirmation (server flag, master D12) vs. the service-day login check. */
  postMove: boolean
  /**
   * The rental window has ended and nothing took over (plan wave-2026-10/1
   * R4): the sheet offers Rent again / Register another rental / Use my own
   * vehicle instead of SAME / CHANGE.
   */
  expired?: boolean
  /** The verified own vehicle to fall back to, when the driver has one. */
  ownedVehicleId?: string | null
  /** The newest rental row, for "Rent again". */
  rentalVehicleId?: string | null
  /** Current vehicle summary for the prompt, when known. */
  vehicleLabel?: string | null
  plate?: string | null
  /** Called after SAME succeeds so the caller refreshes the profile. */
  onConfirmed: () => Promise<void> | void
}

/**
 * The rental driver's SAME / CHANGE prompt (spec §7–§9). Deliberately
 * non-dismissible: there is no close button, no backdrop click, no Escape —
 * the driver is restricted until they answer, and the answer is the only way
 * out. Shown from the profile's server state, not from navigation, so it
 * survives a reload.
 */
export default function VehicleConfirmModal({
  open,
  postMove,
  expired,
  ownedVehicleId,
  rentalVehicleId,
  vehicleLabel,
  plate,
  onConfirmed,
}: Props) {
  const { t } = useTranslation()
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (!open) return null
  const source = postMove ? 'post_move' : 'login'

  const handleUseOwn = async () => {
    if (!ownedVehicleId) return
    setBusy(true)
    setError('')
    try {
      await selectVehicle(ownedVehicleId)
      await onConfirmed()
    } catch (err) {
      if (err instanceof VehicleApiError && err.fnCode) {
        // i18n-keys: errors:vehicle.notOwnVehicle, errors:vehicle.notVerified, errors:vehicle.notInWindow
        setError(t(`errors:${err.fnCode}`, { defaultValue: err.message }))
      } else {
        setError(err instanceof Error ? err.message : t('web:mover.vehicle.fleet.selectFailed.error'))
      }
    } finally {
      setBusy(false)
    }
  }

  if (expired) {
    const renewHref = `/vehicle/setup?mode=renew${rentalVehicleId ? `&vehicleId=${encodeURIComponent(rentalVehicleId)}` : ''}`
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="vehicle-expired-title"
      >
        <div className="max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-5 shadow-xl sm:p-6 dark:bg-neutral-800">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
            <TruckIcon className="h-6 w-6 text-amber-600 dark:text-amber-400" />
          </div>
          <h3 id="vehicle-expired-title" className="text-center text-xl font-bold text-neutral-900 dark:text-neutral-100">
            {t('booking:vehicle.rental.expired.title')}
          </h3>
          <p className="mt-2 text-center text-sm text-neutral-600 dark:text-neutral-300">
            {t('booking:vehicle.rental.expired.body')}
          </p>
          {(vehicleLabel || plate) && (
            <div className="mt-4 rounded-xl bg-neutral-50 p-3 text-center dark:bg-neutral-700/50">
              {vehicleLabel && <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{vehicleLabel}</p>}
              {plate && <p className="mt-0.5 font-mono text-sm tracking-wider break-all text-neutral-600 dark:text-neutral-300">{plate}</p>}
            </div>
          )}
          {error && <p className="mt-3 text-center text-sm text-red-500">{error}</p>}
          <div className="mt-6 flex flex-col gap-3">
            {rentalVehicleId && (
              <button
                type="button"
                onClick={() => router.push(renewHref)}
                disabled={busy}
                className="w-full rounded-full bg-primary-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:opacity-50"
              >
                {t('booking:vehicle.rental.rentAgain.cta')}
              </button>
            )}
            <button
              type="button"
              onClick={() => router.push('/vehicle/setup?mode=add&ownership=rented')}
              disabled={busy}
              className="w-full rounded-full border border-neutral-200 px-4 py-3 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-100 disabled:opacity-50 dark:border-neutral-600 dark:text-neutral-200 dark:hover:bg-neutral-700"
            >
              {t('booking:vehicle.rental.rentAnother.cta')}
            </button>
            {ownedVehicleId && (
              <button
                type="button"
                onClick={handleUseOwn}
                disabled={busy}
                className="w-full rounded-full border border-neutral-200 px-4 py-3 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-100 disabled:opacity-50 dark:border-neutral-600 dark:text-neutral-200 dark:hover:bg-neutral-700"
              >
                {t('booking:vehicle.rental.useOwn.cta')}
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  const handleSame = async () => {
    setBusy(true)
    setError('')
    try {
      await confirmVehicleSame(source)
      await onConfirmed()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('web:mover.vehicle.confirmFailed.error'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="vehicle-confirm-title"
    >
      <div className="max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-5 shadow-xl sm:p-6 dark:bg-neutral-800">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900/30">
          <TruckIcon className="h-6 w-6 text-primary-600 dark:text-primary-400" />
        </div>
        <h3 id="vehicle-confirm-title" className="text-center text-xl font-bold text-neutral-900 dark:text-neutral-100">
          {t('web:mover.vehicle.confirm.title')}
        </h3>
        <p className="mt-2 text-center text-sm text-neutral-600 dark:text-neutral-300">
          {postMove ? t('web:mover.vehicle.confirm.bodyPostMove') : t('web:mover.vehicle.confirm.body')}
        </p>
        {(vehicleLabel || plate) && (
          <div className="mt-4 rounded-xl bg-neutral-50 p-3 text-center dark:bg-neutral-700/50">
            {vehicleLabel && (
              <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{vehicleLabel}</p>
            )}
            {plate && (
              <p className="mt-0.5 font-mono text-sm tracking-wider break-all text-neutral-600 dark:text-neutral-300">{plate}</p>
            )}
          </div>
        )}
        {error && <p className="mt-3 text-center text-sm text-red-500">{error}</p>}
        <div className="mt-6 flex flex-col gap-3">
          <button
            type="button"
            onClick={handleSame}
            disabled={busy}
            className="w-full rounded-full bg-primary-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:opacity-50"
          >
            {busy ? t('web:mover.vehicle.confirm.confirming.label') : t('web:mover.vehicle.confirm.same.cta')}
          </button>
          <button
            type="button"
            onClick={() => router.push(`/vehicle/setup?mode=change&source=${source}`)}
            disabled={busy}
            className="w-full rounded-full border border-neutral-200 px-4 py-3 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-100 disabled:opacity-50 dark:border-neutral-600 dark:text-neutral-200 dark:hover:bg-neutral-700"
          >
            {t('web:mover.vehicle.confirm.change.cta')}
          </button>
        </div>
        <p className="mt-4 text-center text-xs text-neutral-500 dark:text-neutral-400">
          {t('booking:vehicle.declaration.confirmBody')}
        </p>
      </div>
    </div>
  )
}
