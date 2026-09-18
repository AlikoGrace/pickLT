'use client'

import { CheckCircleIcon, ChevronLeftIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import VehicleForm from '@/components/mover/VehicleForm'
import { useAuth } from '@/context/auth'
import type { VehicleDoc } from '@/lib/types'
import { fetchVehicleOverview, type SubmitVehiclePayload } from '@/lib/vehicle-client'

type Mode = 'add' | 'change' | 'resubmit'

const SOURCES: SubmitVehiclePayload['source'][] = ['registration', 'settings', 'login', 'post_move']

/**
 * `/vehicle/setup?mode=add|change|resubmit&source=…` — the form, prefilled on
 * resubmit from the current (rejected / pending) vehicle. `source` names the
 * audit trail's origin: the daily modal passes `login` / `post_move`, which
 * also records a `change_requested` event (master §6.1).
 */
function VehicleSetupInner() {
  const { t } = useTranslation()
  const router = useRouter()
  const params = useSearchParams()
  const { user, refreshProfile } = useAuth()

  const modeParam = params.get('mode')
  const mode: Mode = modeParam === 'change' || modeParam === 'resubmit' ? modeParam : 'add'
  const sourceParam = params.get('source')
  const source: SubmitVehiclePayload['source'] =
    sourceParam && (SOURCES as string[]).includes(sourceParam) ? (sourceParam as SubmitVehiclePayload['source']) : 'settings'

  const [prefill, setPrefill] = useState<VehicleDoc | null>(null)
  const [loading, setLoading] = useState(mode === 'resubmit')
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (mode !== 'resubmit') return
    let cancelled = false
    fetchVehicleOverview()
      .then((d) => {
        if (cancelled) return
        // Only a pending/rejected vehicle can be resubmitted in place; anything
        // else falls through to a fresh submission.
        const v = d.vehicle
        setPrefill(v && (v.status === 'rejected' || v.status === 'pending_review') ? v : null)
      })
      .catch(() => {
        if (!cancelled) setPrefill(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [mode])

  const effectiveMode: Mode = mode === 'resubmit' && !prefill ? 'add' : mode

  if (done) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-4">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
            <CheckCircleIcon className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
            {t('web:mover.vehicle.submitted.success')}
          </h2>
          <p className="mt-2 text-neutral-500 dark:text-neutral-400">{t('web:mover.vehicle.state.ownVehicleReview.body')}</p>
          <Link href="/vehicle" className="mt-6 inline-block rounded-full bg-primary-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-primary-700">
            {t('web:mover.vehicle.action.view.cta')}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl p-4 pb-24 lg:p-6 lg:pb-6">
      <Link href="/vehicle" className="mb-4 inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200">
        <ChevronLeftIcon className="h-4 w-4" />
        {t('common:action.back.cta')}
      </Link>
      <div className="mb-6">
        {/* i18n-keys: web:mover.vehicle.setup.add.title, web:mover.vehicle.setup.change.title, web:mover.vehicle.setup.resubmit.title */}
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
          {t(`web:mover.vehicle.setup.${effectiveMode}.title`)}
        </h1>
        <p className="text-neutral-500 dark:text-neutral-400">{t('web:mover.vehicle.setup.subtitle')}</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
        </div>
      ) : (
        <div className="rounded-2xl bg-white p-6 shadow-sm dark:bg-neutral-800">
          <VehicleForm
            mode={effectiveMode}
            source={source}
            initialOwnership={user?.moverDetails?.vehicleOwnership === 'rented' ? 'rented' : 'owned'}
            prefill={effectiveMode === 'resubmit' ? prefill : null}
            note={
              effectiveMode === 'change' ? (
                <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
                  {t('web:mover.vehicle.setup.changeNote')}
                </p>
              ) : effectiveMode === 'resubmit' && prefill?.rejectionReason ? (
                <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">
                  {t('web:mover.vehicle.setup.resubmitNote', { reason: prefill.rejectionReason })}
                </p>
              ) : null
            }
            onSuccess={async () => {
              await refreshProfile()
              setDone(true)
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
