'use client'

import {
  ChevronDownIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  TruckIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline'
import clsx from 'clsx'
import Link from 'next/link'
import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { formatDateTime } from '@/lib/format'
import { formatRemaining } from '@/lib/rental-time'
import { STATE_KEY, USE_OWN_ADD_HREF, vehicleActionFor, vehicleSummaryLine } from '@/lib/vehicle-labels'
import { RESTRICTED_VEHICLE_STATES, type VehicleServiceState } from '@/lib/vehicle-service'

interface Props {
  state: VehicleServiceState
  /** From the current `vehicles` row, shown in the rejected state. */
  rejectionReason?: string | null
  /** Milliseconds left in the rental window in service (plan wave-2026-10/1 R9); null without a window. */
  rentalRemainingMs?: number | null
  /** End of that window, for the ready card's "You receive moves until …". */
  rentalEndAt?: string | null
  /** The current row — or, after an expiry (R4), the expired rental — for "Brand Model · PLATE". */
  vehicle?: { brand?: string | null; model?: string | null; registrationNumber?: string | null } | null
  /** Dashboard only: a ready driver sees the vehicle in service as a green card (mover app parity). */
  showCurrentWhenReady?: boolean
  /**
   * RENTAL_EXPIRED: the verified own vehicle, if any. "Use my own vehicle"
   * then opens the status page (which switches to it); without one it opens
   * the add form with "Own vehicle" pre-picked (mover-app parity).
   */
  ownedVehicleId?: string | null
  className?: string
}

/** A ready rental shows its countdown from this much time before the end (§7). */
export const COUNTDOWN_FROM_MS = 24 * 60 * 60 * 1000

/** Where each restoring action lives. `confirm` is handled by the modal, so it links to the status page. */
export function vehicleActionHref(state: VehicleServiceState): string {
  switch (vehicleActionFor(state)) {
    case 'add':
      return '/vehicle/setup?mode=add'
    case 'resubmit':
      return '/vehicle/setup?mode=resubmit'
    case 'renew':
      return '/vehicle/setup?mode=renew'
    default:
      return '/vehicle'
  }
}

/**
 * The dashboard banner for every non-ready vehicle state (spec §10 — the
 * dashboard always shows what action restores service). Sits under the KYC
 * banner in the mover layout; renders nothing when the driver is ready,
 * unless `showCurrentWhenReady` asks for the green "vehicle in service" card.
 *
 * Collapsed by default (owner 2026-10-03): icon, title, one summary line (time
 * left on a rental, else "Brand Model · PLATE") and a chevron; the header
 * toggles the body. The action button stays visible either way.
 */
export default function VehicleStatusBanner({
  state,
  rejectionReason,
  rentalRemainingMs,
  rentalEndAt,
  vehicle,
  showCurrentWhenReady = false,
  ownedVehicleId,
  className,
}: Props) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  const bodyId = useId()
  // A ready rental inside its last day: a countdown with "Extend" (R9), not a restriction.
  const countdown =
    (state === 'RENTAL_ACTIVE' || state === 'RENTAL_EXPIRING') &&
    rentalRemainingMs != null &&
    rentalRemainingMs > 0 &&
    rentalRemainingMs <= COUNTDOWN_FROM_MS
  const vehicleLine = vehicleSummaryLine(vehicle)
  const chevron = (
    <ChevronDownIcon
      aria-hidden="true"
      className={clsx('mt-0.5 h-5 w-5 flex-shrink-0 text-neutral-500 transition-transform dark:text-neutral-400', expanded && 'rotate-180')}
    />
  )
  const headerClass =
    'flex min-w-0 flex-1 items-start gap-3 rounded-lg text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 max-sm:basis-full'
  const ctaClass =
    'flex-shrink-0 rounded-full bg-white px-3 py-1.5 text-xs font-semibold max-sm:ml-8 max-sm:inline-flex max-sm:min-h-10 max-sm:items-center text-neutral-800 shadow-sm ring-1 ring-neutral-200 transition hover:bg-neutral-50 dark:bg-neutral-800 dark:text-neutral-100 dark:ring-neutral-700 dark:hover:bg-neutral-700'

  if (!RESTRICTED_VEHICLE_STATES.has(state) && !countdown) {
    if (!showCurrentWhenReady || !vehicle || !vehicleLine) return null
    // Ready: the vehicle in service. A windowed rental names its end; a legacy rental its confirmation.
    const readyLine =
      state === 'RENTAL_ACTIVE' && rentalEndAt
        ? t('booking:vehicle.rental.broadcastsUntil.label', { time: formatDateTime(rentalEndAt) })
        : state === 'RENTAL_VERIFIED_TODAY'
          ? t('web:mover.vehicle.state.rentalVerifiedToday.title')
          : null
    const name = [vehicle.brand, vehicle.model].filter(Boolean).join(' ')
    return (
      <div className={clsx('border-b border-green-200 bg-green-50 px-4 py-3 dark:border-green-800 dark:bg-green-950', className)}>
        <div className="mx-auto flex max-w-3xl flex-wrap items-start gap-x-3 gap-y-2 sm:flex-nowrap">
          <button
            type="button"
            aria-expanded={expanded}
            aria-controls={bodyId}
            onClick={() => setExpanded((v) => !v)}
            className={headerClass}
          >
            <TruckIcon className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600 dark:text-green-400" />
            <span id={bodyId} className="min-w-0 flex-1">
              {expanded ? (
                <>
                  <span className="block text-xs text-green-700 dark:text-green-300">{t('booking:vehicle.rental.inService.label')}</span>
                  {name && <span className="block text-sm font-semibold text-green-900 dark:text-green-100">{name}</span>}
                  {vehicle.registrationNumber && (
                    <span className="block font-mono text-sm tracking-wider break-all text-green-900 dark:text-green-100">
                      {vehicle.registrationNumber}
                    </span>
                  )}
                </>
              ) : (
                <span className="block truncate text-sm font-semibold text-green-900 dark:text-green-100">{vehicleLine}</span>
              )}
              {readyLine && (
                <span className={clsx('block text-sm text-green-700 dark:text-green-300', !expanded && 'truncate')}>{readyLine}</span>
              )}
            </span>
            {chevron}
          </button>
          <Link href="/vehicle" className={ctaClass}>
            {t('web:mover.vehicle.action.view.cta')}
          </Link>
        </div>
      </div>
    )
  }

  const key = STATE_KEY[state]
  const action = countdown ? 'extend' : vehicleActionFor(state)
  const tone =
    state === 'VEHICLE_REJECTED'
      ? 'red'
      : state === 'RENTAL_DAILY_CONFIRMATION_REQUIRED' || countdown
        ? 'blue'
        : action === 'add'
          ? 'orange'
          : 'amber'
  const Icon =
    tone === 'red' ? XCircleIcon : tone === 'blue' ? TruckIcon : tone === 'orange' ? ExclamationTriangleIcon : ClockIcon

  // i18n-keys: web:mover.vehicle.state.ownPendingVehicle.title, web:mover.vehicle.state.ownVehicleReview.title,
  // web:mover.vehicle.state.rentalPendingVehicle.title, web:mover.vehicle.state.rentalVehicleReview.title,
  // web:mover.vehicle.state.rentalChangePending.title, web:mover.vehicle.state.rentalDailyConfirmationRequired.title,
  // web:mover.vehicle.state.rentalExpiring.title, web:mover.vehicle.state.rentalExpired.title,
  // web:mover.vehicle.state.vehicleRejected.title
  const title = countdown ? t('booking:vehicle.rental.expiring.title') : t(`web:mover.vehicle.state.${key}.title`)
  // i18n-keys: web:mover.vehicle.state.ownPendingVehicle.body, web:mover.vehicle.state.ownVehicleReview.body,
  // web:mover.vehicle.state.rentalPendingVehicle.body, web:mover.vehicle.state.rentalVehicleReview.body,
  // web:mover.vehicle.state.rentalChangePending.body, web:mover.vehicle.state.rentalDailyConfirmationRequired.body,
  // web:mover.vehicle.state.rentalExpiring.body, web:mover.vehicle.state.rentalExpired.body,
  // web:mover.vehicle.state.vehicleRejected.body
  const body = countdown
    ? t('web:mover.vehicle.banner.countdown.label', { time: formatRemaining(rentalRemainingMs) })
    : t(`web:mover.vehicle.state.${key}.body`)
  // Collapsed: the one fact that matters — time left, else which vehicle.
  const summaryLine = countdown ? t('booking:vehicle.rental.remaining.label', { time: formatRemaining(rentalRemainingMs) }) : vehicleLine
  // i18n-keys: web:mover.vehicle.action.add.cta, web:mover.vehicle.action.resubmit.cta,
  // web:mover.vehicle.action.confirmToday.cta, web:mover.vehicle.action.renew.cta, web:mover.vehicle.action.view.cta
  const cta =
    action === 'extend'
      ? t('booking:vehicle.rental.extend.cta')
      : t(`web:mover.vehicle.action.${action === 'confirm' ? 'confirmToday' : action ?? 'view'}.cta`)

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
      <div className="mx-auto flex max-w-3xl flex-wrap items-start gap-x-3 gap-y-2 sm:flex-nowrap">
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={bodyId}
          onClick={() => setExpanded((v) => !v)}
          className={headerClass}
        >
          <Icon
            className={clsx(
              'mt-0.5 h-5 w-5 flex-shrink-0',
              tone === 'red' && 'text-red-500',
              tone === 'orange' && 'text-orange-500',
              tone === 'amber' && 'text-amber-500',
              tone === 'blue' && 'text-primary-600',
            )}
          />
          <span id={bodyId} className="min-w-0 flex-1">
            <span
              className={clsx(
                'block text-sm font-semibold',
                tone === 'red' && 'text-red-800 dark:text-red-200',
                tone === 'orange' && 'text-orange-800 dark:text-orange-200',
                tone === 'amber' && 'text-amber-800 dark:text-amber-200',
                tone === 'blue' && 'text-primary-800 dark:text-primary-200',
              )}
            >
              {title}
            </span>
            <span
              className={clsx(
                'block text-sm',
                !expanded && 'truncate',
                tone === 'red' && 'text-red-700 dark:text-red-300',
                tone === 'orange' && 'text-orange-700 dark:text-orange-300',
                tone === 'amber' && 'text-amber-700 dark:text-amber-300',
                tone === 'blue' && 'text-primary-700 dark:text-primary-300',
              )}
            >
              {expanded ? (
                <>
                  {body}
                  {state === 'VEHICLE_REJECTED' && rejectionReason && (
                    <>
                      {' '}
                      <span className="font-medium">
                        {t('web:mover.vehicle.rejectionReason.label')}: {rejectionReason}
                      </span>
                    </>
                  )}
                  {vehicleLine && <span className="mt-0.5 block font-semibold">{vehicleLine}</span>}
                </>
              ) : (
                summaryLine
              )}
            </span>
          </span>
          {chevron}
        </button>
        {/* The button stays visible collapsed or not (owner 2026-10-03); only the text folds away. */}
        <Link
          href={countdown ? '/vehicle/setup?mode=renew' : vehicleActionHref(state)}
          className={ctaClass}
        >
          {cta}
        </Link>
        {state === 'RENTAL_EXPIRED' && (
          <Link href={ownedVehicleId ? '/vehicle' : USE_OWN_ADD_HREF} className={ctaClass}>
            {t('booking:vehicle.rental.useOwn.cta')}
          </Link>
        )}
      </div>
    </div>
  )
}
