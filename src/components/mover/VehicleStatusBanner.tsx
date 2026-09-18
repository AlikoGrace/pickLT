'use client'

import {
  ClockIcon,
  ExclamationTriangleIcon,
  TruckIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline'
import clsx from 'clsx'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'

import { STATE_KEY, vehicleActionFor } from '@/lib/vehicle-labels'
import { RESTRICTED_VEHICLE_STATES, type VehicleServiceState } from '@/lib/vehicle-service'

interface Props {
  state: VehicleServiceState
  /** From the current `vehicles` row, shown in the rejected state. */
  rejectionReason?: string | null
  className?: string
}

/** Where each restoring action lives. `confirm` is handled by the modal, so it links to the status page. */
export function vehicleActionHref(state: VehicleServiceState): string {
  switch (vehicleActionFor(state)) {
    case 'add':
      return '/vehicle/setup?mode=add'
    case 'resubmit':
      return '/vehicle/setup?mode=resubmit'
    default:
      return '/vehicle'
  }
}

/**
 * The dashboard banner for every non-ready vehicle state (spec §10 — the
 * dashboard always shows what action restores service). Sits under the KYC
 * banner in the mover layout; renders nothing when the driver is ready.
 */
export default function VehicleStatusBanner({ state, rejectionReason, className }: Props) {
  const { t } = useTranslation()
  if (!RESTRICTED_VEHICLE_STATES.has(state)) return null

  const key = STATE_KEY[state]
  const action = vehicleActionFor(state)
  const tone =
    state === 'VEHICLE_REJECTED'
      ? 'red'
      : state === 'RENTAL_DAILY_CONFIRMATION_REQUIRED'
        ? 'blue'
        : action === 'add'
          ? 'orange'
          : 'amber'
  const Icon =
    tone === 'red' ? XCircleIcon : tone === 'blue' ? TruckIcon : tone === 'orange' ? ExclamationTriangleIcon : ClockIcon

  // i18n-keys: web:mover.vehicle.state.ownPendingVehicle.title, web:mover.vehicle.state.ownVehicleReview.title,
  // web:mover.vehicle.state.rentalPendingVehicle.title, web:mover.vehicle.state.rentalVehicleReview.title,
  // web:mover.vehicle.state.rentalChangePending.title, web:mover.vehicle.state.rentalDailyConfirmationRequired.title,
  // web:mover.vehicle.state.vehicleRejected.title
  const title = t(`web:mover.vehicle.state.${key}.title`)
  // i18n-keys: web:mover.vehicle.state.ownPendingVehicle.body, web:mover.vehicle.state.ownVehicleReview.body,
  // web:mover.vehicle.state.rentalPendingVehicle.body, web:mover.vehicle.state.rentalVehicleReview.body,
  // web:mover.vehicle.state.rentalChangePending.body, web:mover.vehicle.state.rentalDailyConfirmationRequired.body,
  // web:mover.vehicle.state.vehicleRejected.body
  const body = t(`web:mover.vehicle.state.${key}.body`)
  // i18n-keys: web:mover.vehicle.action.add.cta, web:mover.vehicle.action.resubmit.cta,
  // web:mover.vehicle.action.confirmToday.cta, web:mover.vehicle.action.view.cta
  const cta = t(`web:mover.vehicle.action.${action === 'confirm' ? 'confirmToday' : action ?? 'view'}.cta`)

  return (
    <div
      className={clsx(
        'border-b px-4 py-3',
        tone === 'red' && 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950',
        tone === 'orange' && 'border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950',
        tone === 'amber' && 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950',
        tone === 'blue' && 'border-primary-200 bg-primary-50 dark:border-primary-800 dark:bg-primary-950',
        className,
      )}
    >
      <div className="mx-auto flex max-w-3xl items-start gap-3">
        <Icon
          className={clsx(
            'mt-0.5 h-5 w-5 flex-shrink-0',
            tone === 'red' && 'text-red-500',
            tone === 'orange' && 'text-orange-500',
            tone === 'amber' && 'text-amber-500',
            tone === 'blue' && 'text-primary-600',
          )}
        />
        <div className="min-w-0 flex-1">
          <p
            className={clsx(
              'text-sm font-semibold',
              tone === 'red' && 'text-red-800 dark:text-red-200',
              tone === 'orange' && 'text-orange-800 dark:text-orange-200',
              tone === 'amber' && 'text-amber-800 dark:text-amber-200',
              tone === 'blue' && 'text-primary-800 dark:text-primary-200',
            )}
          >
            {title}
          </p>
          <p
            className={clsx(
              'text-sm',
              tone === 'red' && 'text-red-700 dark:text-red-300',
              tone === 'orange' && 'text-orange-700 dark:text-orange-300',
              tone === 'amber' && 'text-amber-700 dark:text-amber-300',
              tone === 'blue' && 'text-primary-700 dark:text-primary-300',
            )}
          >
            {body}
            {state === 'VEHICLE_REJECTED' && rejectionReason && (
              <>
                {' '}
                <span className="font-medium">
                  {t('web:mover.vehicle.rejectionReason.label')}: {rejectionReason}
                </span>
              </>
            )}
          </p>
        </div>
        <Link
          href={vehicleActionHref(state)}
          className="flex-shrink-0 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-neutral-800 shadow-sm ring-1 ring-neutral-200 transition hover:bg-neutral-50 dark:bg-neutral-800 dark:text-neutral-100 dark:ring-neutral-700 dark:hover:bg-neutral-700"
        >
          {cta}
        </Link>
      </div>
    </div>
  )
}
