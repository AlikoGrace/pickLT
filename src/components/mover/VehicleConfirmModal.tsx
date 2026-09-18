'use client'

import { TruckIcon } from '@heroicons/react/24/outline'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { confirmVehicleSame } from '@/lib/vehicle-client'

interface Props {
  open: boolean
  /** Post-move re-confirmation (server flag, master D12) vs. the service-day login check. */
  postMove: boolean
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
export default function VehicleConfirmModal({ open, postMove, vehicleLabel, plate, onConfirmed }: Props) {
  const { t } = useTranslation()
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (!open) return null
  const source = postMove ? 'post_move' : 'login'

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
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-neutral-800">
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
              <p className="mt-0.5 font-mono text-sm tracking-wider text-neutral-600 dark:text-neutral-300">{plate}</p>
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
