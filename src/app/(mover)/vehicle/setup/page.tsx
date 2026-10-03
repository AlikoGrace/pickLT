'use client'

import { CheckCircleIcon, ChevronLeftIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import RentalRenewForm from '@/components/mover/RentalRenewForm'
import VehicleForm from '@/components/mover/VehicleForm'
import { useAuth } from '@/context/auth'
import { formatDateTime } from '@/lib/format'
import type { VehicleDoc } from '@/lib/types'
import { fetchVehicleOverview, type SubmitVehiclePayload } from '@/lib/vehicle-client'

type Mode = 'add' | 'change' | 'resubmit' | 'renew'

const SOURCES: SubmitVehiclePayload['source'][] = ['registration', 'settings', 'login', 'post_move']

/**
 * `/vehicle/setup?mode=add|change|resubmit|renew&source=…&ownership=…&vehicleId=…`
 * — the form, prefilled on resubmit from the current (rejected / pending)
 * vehicle. `source` names the audit trail's origin: the daily modal passes
 * `login` / `post_move`, which also records a `change_requested` event
 * (master §6.1).
 *
 * Wave 2026-10 (plan `wave-2026-10/1`): `mode=renew` renews a rental — the same
 * row, a new window (R5); `ownership=rented` on `mode=add` registers a rental
 * next to a verified own vehicle without giving it up (R3).
 */
function VehicleSetupInner() {
  const { t } = useTranslation()
  const router = useRouter()
  const params = useSearchParams()
  const { user, refreshProfile } = useAuth()

  const modeParam = params.get('mode')
  const mode: Mode =
    modeParam === 'change' || modeParam === 'resubmit' || modeParam === 'renew' ? modeParam : 'add'
  const sourceParam = params.get('source')
  const source: SubmitVehiclePayload['source'] =
    sourceParam && (SOURCES as string[]).includes(sourceParam) ? (sourceParam as SubmitVehiclePayload['source']) : 'settings'
  const ownershipParam = params.get('ownership')
  const vehicleIdParam = params.get('vehicleId')

  const [prefill, setPrefill] = useState<VehicleDoc | null>(null)
  const [renewTarget, setRenewTarget] = useState<VehicleDoc | null>(null)
  const [ownVerifiedInService, setOwnVerifiedInService] = useState(false)
  const [loading, setLoading] = useState(mode === 'resubmit' || mode === 'renew' || ownershipParam === 'rented')
  const [done, setDone] = useState<null | { renewed?: boolean; endAt?: string }>(null)

  useEffect(() => {
    if (mode !== 'resubmit' && mode !== 'renew' && ownershipParam !== 'rented') return
    let cancelled = false
    fetchVehicleOverview()
      .then((d) => {
        if (cancelled) return
        // Only a pending/rejected vehicle can be resubmitted in place; anything
        // else falls through to a fresh submission.
        const v = d.vehicle
        setPrefill(v && (v.status === 'rejected' || v.status === 'pending_review') ? v : null)
        // Renew: the row named in the URL, else the newest rental on file.
        // The expired rental (R4) counts too: the fleet only keeps the newest rental once retired.
        const rentals = d.expiredRental ? [...d.fleet, d.expiredRental] : d.fleet
        const byId = vehicleIdParam ? rentals.find((f) => f.$id === vehicleIdParam && f.ownership === 'rented') : null
        setRenewTarget(byId ?? d.fleet.find((f) => f.ownership === 'rented') ?? d.expiredRental ?? null)
        setOwnVerifiedInService(
          d.profile.vehicleOwnership !== 'rented' &&
            d.profile.vehicleStatus === 'verified' &&
            d.fleet.some((f) => f.$id === d.profile.currentVehicleId && f.ownership === 'owned'),
        )
      })
      .catch(() => {
        if (!cancelled) {
          setPrefill(null)
          setRenewTarget(null)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [mode, vehicleIdParam, ownershipParam])

  const effectiveMode: Mode = mode === 'resubmit' && !prefill ? 'add' : mode
  const addingRental = effectiveMode === 'add' && ownershipParam === 'rented'
  const initialOwnership = addingRental ? 'rented' : user?.moverDetails?.vehicleOwnership === 'rented' ? 'rented' : 'owned'

  if (done) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-4">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
            <CheckCircleIcon className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
            {done.renewed
              ? t('web:mover.vehicle.renew.doneVerified.success', { time: formatDateTime(done.endAt) })
              : done.renewed === false
                ? t('web:mover.vehicle.renew.doneReview.success')
                : t('web:mover.vehicle.submitted.success')}
          </h2>
          <p className="mt-2 text-neutral-500 dark:text-neutral-400">
            {done.renewed
              ? t('booking:vehicle.rental.broadcastsUntil.label', { time: formatDateTime(done.endAt) })
              : t('web:mover.vehicle.state.ownVehicleReview.body')}
          </p>
          <Link href="/vehicle" className="mt-6 inline-block rounded-full bg-primary-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-primary-700">
            {t('web:mover.vehicle.action.view.cta')}
          </Link>
        </div>
      </div>
    )
  }

  const title =
    effectiveMode === 'renew'
      ? t('web:mover.vehicle.setup.renew.title')
      : addingRental
        ? t('web:mover.vehicle.setup.addRental.title')
        : // i18n-keys: web:mover.vehicle.setup.add.title, web:mover.vehicle.setup.change.title, web:mover.vehicle.setup.resubmit.title
          t(`web:mover.vehicle.setup.${effectiveMode}.title`)

  return (
    <div className="mx-auto max-w-2xl p-4 pb-24 lg:p-6 lg:pb-6">
      <Link href="/vehicle" className="mb-4 inline-flex min-h-10 items-center gap-1 text-sm text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200">
        <ChevronLeftIcon className="h-4 w-4" />
        {t('common:action.back.cta')}
      </Link>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{title}</h1>
        <p className="text-neutral-500 dark:text-neutral-400">
          {effectiveMode === 'renew' ? t('web:mover.vehicle.renew.subtitle') : t('web:mover.vehicle.setup.subtitle')}
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
        </div>
      ) : effectiveMode === 'renew' ? (
        <div className="rounded-2xl bg-white p-4 shadow-sm sm:p-6 dark:bg-neutral-800">
          {renewTarget ? (
            <RentalRenewForm
              vehicle={renewTarget}
              onSuccess={async ({ autoVerified, endAt }) => {
                await refreshProfile()
                setDone({ renewed: autoVerified, endAt })
                router.prefetch('/vehicle')
              }}
            />
          ) : (
            <div className="space-y-4 text-center">
              <p className="text-sm text-neutral-600 dark:text-neutral-300">{t('web:mover.vehicle.renew.noRental.body')}</p>
              <Link href="/vehicle/setup?mode=add&ownership=rented" className="inline-block rounded-full bg-primary-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-primary-700">
                {t('booking:vehicle.rental.rentAnother.cta')}
              </Link>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-2xl bg-white p-4 shadow-sm sm:p-6 dark:bg-neutral-800">
          <VehicleForm
            mode={effectiveMode}
            source={source}
            initialOwnership={initialOwnership}
            lockOwnership={addingRental}
            prefill={effectiveMode === 'resubmit' ? prefill : null}
            note={
              effectiveMode === 'change' ? (
                <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
                  {t('web:mover.vehicle.setup.changeNote')}
                </p>
              ) : addingRental && ownVerifiedInService ? (
                <p className="rounded-xl bg-primary-50 p-3 text-sm text-primary-800 dark:bg-primary-900/20 dark:text-primary-200">
                  {t('web:mover.vehicle.fleet.ownedFallback.helper')}
                </p>
              ) : effectiveMode === 'resubmit' && prefill?.rejectionReason ? (
                <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">
                  {t('web:mover.vehicle.setup.resubmitNote', { reason: prefill.rejectionReason })}
                </p>
              ) : null
            }
            onSuccess={async () => {
              await refreshProfile()
              setDone({})
              router.prefetch('/vehicle')
            }}
          />
        </div>
      )}
    </div>
  )
}

export default function VehicleSetupPage() {
  // `useSearchParams` needs a Suspense boundary for the static shell.
  return (
    <Suspense fallback={null}>
      <VehicleSetupInner />
    </Suspense>
  )
}
