'use client'

import {
  ArrowPathIcon,
  CheckCircleIcon,
  ClockIcon,
  PhotoIcon,
  PlusIcon,
  TruckIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useAuth } from '@/context/auth'
import { vehicleTypeLabel } from '@/lib/enum-labels'
import { formatDateTime, formatVolumeM3 } from '@/lib/format'
import { fetchVehicleOverview, type VehicleOverview } from '@/lib/vehicle-client'
import { STATE_KEY, vehicleEventLabel, vehicleOwnershipLabel, vehicleStatusLabel } from '@/lib/vehicle-labels'
import { vehicleServiceState } from '@/lib/vehicle-service'

/**
 * `/vehicle` — the driver's vehicle: current record, status (with the
 * rejection reason), the three evidence photos and the audit history
 * (spec §10/§16). The action that restores service is the primary button.
 */
export default function VehiclePage() {
  const { t } = useTranslation()
  const { refreshProfile } = useAuth()
  const [data, setData] = useState<VehicleOverview | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setData(await fetchVehicleOverview())
    } catch (err) {
      setError(err instanceof Error ? err.message : t('web:mover.vehicle.loadFailed.error'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    load()
    // The profile in the auth context may be behind the server after a
    // confirmation / submission elsewhere; a refresh keeps the layout in step.
    refreshProfile()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const vehicle = data?.vehicle ?? null
  const profile = data?.profile ?? null
  const state = profile ? vehicleServiceState(profile, vehicle, Date.now()) : null

  const statusTone =
    vehicle?.status === 'verified'
      ? 'text-green-600 dark:text-green-400'
      : vehicle?.status === 'rejected'
        ? 'text-red-600 dark:text-red-400'
        : 'text-amber-600 dark:text-amber-400'
  const StatusIcon =
    vehicle?.status === 'verified' ? CheckCircleIcon : vehicle?.status === 'rejected' ? XCircleIcon : ClockIcon

  return (
    <div className="mx-auto max-w-3xl p-4 pb-24 lg:p-6 lg:pb-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{t('web:mover.vehicle.title')}</h1>
        <p className="text-neutral-500 dark:text-neutral-400">{t('web:mover.vehicle.subtitle')}</p>
      </div>

      {error && (
        <div className="mb-4 flex items-center justify-between rounded-xl bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
          <span>{error}</span>
          <button type="button" onClick={load} className="font-medium underline">
            {t('common:action.retry.cta')}
          </button>
        </div>
      )}

      {loading && !data ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
        </div>
      ) : (
        <>
          {/* State card */}
          {state && (
            <div className="mb-6 rounded-2xl bg-white p-5 shadow-sm dark:bg-neutral-800">
              {/* i18n-keys: web:mover.vehicle.state.ownVerified.title, web:mover.vehicle.state.rentalVerifiedToday.title,
                  web:mover.vehicle.state.ownPendingVehicle.title, web:mover.vehicle.state.ownVehicleReview.title,
                  web:mover.vehicle.state.rentalPendingVehicle.title, web:mover.vehicle.state.rentalVehicleReview.title,
                  web:mover.vehicle.state.rentalChangePending.title, web:mover.vehicle.state.rentalDailyConfirmationRequired.title,
                  web:mover.vehicle.state.vehicleRejected.title */}
              <p className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                {t(`web:mover.vehicle.state.${STATE_KEY[state]}.title`)}
              </p>
              {/* i18n-keys: web:mover.vehicle.state.ownVerified.body, web:mover.vehicle.state.rentalVerifiedToday.body,
                  web:mover.vehicle.state.ownPendingVehicle.body, web:mover.vehicle.state.ownVehicleReview.body,
                  web:mover.vehicle.state.rentalPendingVehicle.body, web:mover.vehicle.state.rentalVehicleReview.body,
                  web:mover.vehicle.state.rentalChangePending.body, web:mover.vehicle.state.rentalDailyConfirmationRequired.body,
                  web:mover.vehicle.state.vehicleRejected.body */}
              <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
                {t(`web:mover.vehicle.state.${STATE_KEY[state]}.body`)}
              </p>
              {profile?.vehicleOwnership === 'rented' && profile.vehicleConfirmedServiceDate && (
                <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
                  {t('web:mover.vehicle.confirmedFor.label', { date: profile.vehicleConfirmedServiceDate })}
                </p>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                {(state === 'OWN_PENDING_VEHICLE' || state === 'RENTAL_PENDING_VEHICLE') && (
                  <Link href="/vehicle/setup?mode=add" className="inline-flex items-center gap-1.5 rounded-full bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700">
                    <PlusIcon className="h-4 w-4" />
                    {t('web:mover.vehicle.action.add.cta')}
                  </Link>
                )}
                {state === 'VEHICLE_REJECTED' && (
                  <Link href="/vehicle/setup?mode=resubmit" className="inline-flex items-center gap-1.5 rounded-full bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700">
                    <ArrowPathIcon className="h-4 w-4" />
                    {t('web:mover.vehicle.action.resubmit.cta')}
                  </Link>
                )}
                {(state === 'OWN_VERIFIED' || state === 'RENTAL_VERIFIED_TODAY' || state === 'RENTAL_DAILY_CONFIRMATION_REQUIRED') && (
                  <Link href="/vehicle/setup?mode=change" className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-100 dark:border-neutral-600 dark:text-neutral-200 dark:hover:bg-neutral-700">
                    <ArrowPathIcon className="h-4 w-4" />
                    {t('web:mover.vehicle.action.change.cta')}
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* Current vehicle */}
          {vehicle ? (
            <div className="mb-6 rounded-2xl bg-white p-5 shadow-sm dark:bg-neutral-800">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-700">
                  <TruckIcon className="h-5 w-5 text-neutral-600 dark:text-neutral-300" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-neutral-900 dark:text-neutral-100">
                    {[vehicle.brand, vehicle.model, vehicle.year].filter(Boolean).join(' ')}
                  </p>
                  <p className="font-mono text-sm tracking-wider text-neutral-700 dark:text-neutral-200">
                    {vehicle.registrationNumber}
                  </p>
                  <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                    {vehicleTypeLabel(t, vehicle.vehicleType)}
                    {vehicle.capacityM3 != null && ` · ${formatVolumeM3(vehicle.capacityM3)}`}
                    {` · ${vehicleOwnershipLabel(t, vehicle.ownership)}`}
                  </p>
                </div>
                <div className={`flex items-center gap-1 text-sm font-medium ${statusTone}`}>
                  <StatusIcon className="h-5 w-5" />
                  {vehicleStatusLabel(t, vehicle.status)}
                </div>
              </div>

              {vehicle.status === 'rejected' && vehicle.rejectionReason && (
                <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">
                  <span className="font-medium">{t('web:mover.vehicle.rejectionReason.label')}:</span> {vehicle.rejectionReason}
                </p>
              )}

              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-xs uppercase text-neutral-400">{t('web:mover.vehicle.submittedAt.label')}</dt>
                  <dd className="text-neutral-800 dark:text-neutral-200">{formatDateTime(vehicle.submittedAt)}</dd>
                </div>
                {vehicle.verifiedAt && (
                  <div>
                    <dt className="text-xs uppercase text-neutral-400">{t('web:mover.vehicle.verifiedAt.label')}</dt>
                    <dd className="text-neutral-800 dark:text-neutral-200">{formatDateTime(vehicle.verifiedAt)}</dd>
                  </div>
                )}
              </dl>

              <h3 className="mt-5 mb-2 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                {t('booking:vehicle.evidence.title')}
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    ['front', vehicle.frontPlatePhoto, t('web:mover.vehicle.photo.front.a11y')],
                    ['rear', vehicle.rearPlatePhoto, t('web:mover.vehicle.photo.rear.a11y')],
                    ['full', vehicle.fullVehiclePhoto, t('web:mover.vehicle.photo.full.a11y')],
                  ] as const
                ).map(([kind, url, alt]) => (
                  <figure key={kind}>
                    {/* Owner-read files: the session cookie on the Appwrite domain
                        authorises the driver's own <img>; nobody else resolves them. */}
                    {url ? (
                      <img src={url} alt={alt} className="h-24 w-full rounded-lg border border-neutral-200 object-cover dark:border-neutral-700" />
                    ) : (
                      // Backfilled vehicles (D14) carry no photos — a neutral tile, not a broken image.
                      <div className="flex h-24 w-full flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-neutral-300 bg-neutral-50 px-1 text-center text-xs text-neutral-400 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-500">
                        <PhotoIcon className="h-5 w-5" aria-hidden="true" />
                        {t('web:mover.vehicle.photo.none.label')}
                      </div>
                    )}
                    <figcaption className="mt-1 truncate text-xs text-neutral-500 dark:text-neutral-400">{alt}</figcaption>
                  </figure>
                ))}
              </div>
            </div>
          ) : (
            !loading && (
              <div className="mb-6 rounded-2xl bg-white p-5 text-center shadow-sm dark:bg-neutral-800">
                <TruckIcon className="mx-auto mb-2 h-8 w-8 text-neutral-400" />
                <p className="font-semibold text-neutral-900 dark:text-neutral-100">{t('web:mover.vehicle.none.title')}</p>
                <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{t('web:mover.vehicle.none.body')}</p>
              </div>
            )
          )}

          {/* History */}
          <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-neutral-800">
            <h2 className="mb-3 text-base font-semibold text-neutral-900 dark:text-neutral-100">
              {t('web:mover.vehicle.history.title')}
            </h2>
            {data && data.history.length === 0 ? (
              <p className="text-sm text-neutral-500 dark:text-neutral-400">{t('web:mover.vehicle.history.empty')}</p>
            ) : (
              <ul className="divide-y divide-neutral-100 dark:divide-neutral-700">
                {data?.history.map((e) => (
                  <li key={e.$id} className="flex items-start justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                        {vehicleEventLabel(t, e.action)}
                      </p>
                      {e.note && <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">{e.note}</p>}
                    </div>
                    <time dateTime={e.at} className="flex-shrink-0 text-xs text-neutral-500 dark:text-neutral-400">
                      {formatDateTime(e.at)}
                    </time>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  )
}
