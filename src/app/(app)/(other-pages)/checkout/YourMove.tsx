'use client'

import { useMoveSearch } from '@/context/moveSearch'
import {
  Calendar03Icon,
  Clock01Icon,
  DeliveryTruck01Icon,
  Edit02Icon,
  FlashIcon,
  Location01Icon,
  Route01Icon,
  UserIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import Link from 'next/link'
import { formatDateWith } from '@/lib/format'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { arrivalWindowLabel } from '@/lib/enum-labels'

const formatDate = (dateStr: string | null, t: TFunction) => {
  if (!dateStr) return t('common:value.notSelected.empty')
  try {
    const date = new Date(dateStr)
    return formatDateWith(date, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  } catch {
    return dateStr
  }
}

// Helper to format distance
const formatDistance = (meters: number): string => {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} km`
  }
  return `${Math.round(meters)} m`
}

// Helper to format duration
const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.ceil((seconds % 3600) / 60)
  
  if (hours > 0) {
    return `${hours}h ${minutes}min`
  }
  return `${minutes} min`
}

interface YourMoveProps {
  routeDistance?: number // in meters
  routeDuration?: number // in seconds
}

const YourMove = ({ routeDistance, routeDuration }: YourMoveProps) => {
  const { t } = useTranslation()
  const {
    isInstantMove,
    moveDate,
    arrivalWindow,
    pickupStreetAddress,
    pickupLocation,
    pickupApartmentUnit,
    floorLevel,
    dropoffStreetAddress,
    dropoffLocation,
    dropoffApartmentUnit,
    dropoffFloorLevel,
    contactInfo,
    inventory,
    customItems,
  } = useMoveSearch()

  const inventoryCount = Object.values(inventory).reduce((sum, qty) => sum + qty, 0) + customItems.length

  const addressWithUnit = (address: string | null | undefined, unit: string | null | undefined) => {
    const base = address || t('common:value.notSpecified.empty')
    return unit ? t('booking:address.withUnit.label', { address: base, unit }) : base
  }

  // For instant move, don't show edit links (move is already in progress)
  const EditIcon = ({ show = true }: { show?: boolean }) =>
    show ? (
      <HugeiconsIcon
        icon={Edit02Icon}
        size={20}
        strokeWidth={1.5}
        className="text-neutral-400 dark:text-neutral-500"
      />
    ) : null

  return (
    <div>
      <h3 className="text-2xl font-semibold">{t('web:checkout.yourMove.title')}</h3>
      
      {/* Instant Move Badge */}
      {isInstantMove && (
        <div className="mt-4 flex items-center gap-2 rounded-full bg-neutral-100 dark:bg-neutral-800 px-3 py-1.5 w-fit">
          <HugeiconsIcon
            icon={FlashIcon}
            size={16}
            strokeWidth={1.5}
            className="text-neutral-700 dark:text-neutral-300"
          />
          <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            {t('booking:category.instant.label')}
          </span>
        </div>
      )}

      <div className="z-10 mt-6 flex flex-col divide-y divide-neutral-200 overflow-hidden rounded-3xl border border-neutral-200 dark:divide-neutral-700 dark:border-neutral-700">
        {/* Move Date & Time - Only show for scheduled moves */}
        {!isInstantMove && (
          <Link
            href="/add-listing/6"
            className="flex flex-1 justify-between gap-x-5 p-5 text-start hover:bg-neutral-50 focus-visible:outline-hidden dark:hover:bg-neutral-800"
          >
            <div className="flex items-start gap-4">
              <div className="mt-1 shrink-0">
                <HugeiconsIcon
                  icon={Calendar03Icon}
                  size={22}
                  strokeWidth={1.5}
                  className="text-neutral-400"
                />
              </div>
              <div className="flex flex-col">
                <span className="text-sm text-neutral-400">{t('booking:field.moveDateTime.label')}</span>
                <span className="mt-1 text-base font-semibold text-neutral-900 dark:text-white">
                  {formatDate(moveDate, t)}
                </span>
                <span className="text-sm text-neutral-500 dark:text-neutral-400">
                  {t('booking:field.arrivalWindow.value.label', { window: arrivalWindowLabel(t, arrivalWindow) })}
                </span>
              </div>
            </div>
            <EditIcon />
          </Link>
        )}

        {/* Instant Move - Now */}
        {isInstantMove && (
          <div className="flex flex-1 justify-between gap-x-5 p-5 text-start">
            <div className="flex items-start gap-4">
              <div className="mt-1 shrink-0">
                <HugeiconsIcon
                  icon={Clock01Icon}
                  size={22}
                  strokeWidth={1.5}
                  className="text-neutral-400"
                />
              </div>
              <div className="flex flex-col">
                <span className="text-sm text-neutral-400">{t('booking:timing.title')}</span>
                <span className="mt-1 text-base font-semibold text-neutral-900 dark:text-white">
                  {t('booking:timing.now.label')}
                </span>
                <span className="text-sm text-neutral-500 dark:text-neutral-400">
                  {t('track:phase.moverEnRoute.title')}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Route Info - Only show for instant moves with coordinates */}
        {isInstantMove && (routeDistance || routeDuration) && (
          <div className="flex flex-1 justify-between gap-x-5 p-5 text-start bg-neutral-50 dark:bg-neutral-800/50">
            <div className="flex items-start gap-4">
              <div className="mt-1 shrink-0">
                <HugeiconsIcon
                  icon={Route01Icon}
                  size={22}
                  strokeWidth={1.5}
                  className="text-neutral-400"
                />
              </div>
              <div className="flex flex-col">
                <span className="text-sm text-neutral-400">{t('booking:route.title')}</span>
                <div className="mt-1 flex items-center gap-3">
                  {routeDistance && (
                    <span className="text-base font-semibold text-neutral-900 dark:text-white">
                      {formatDistance(routeDistance)}
                    </span>
                  )}
                  {routeDistance && routeDuration && (
                    <span className="text-neutral-300 dark:text-neutral-600">•</span>
                  )}
                  {routeDuration && (
                    <span className="text-sm text-neutral-500 dark:text-neutral-400">
                      {t('booking:route.driveTime.label', { duration: formatDuration(routeDuration) })}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Pickup Location */}
        {isInstantMove ? (
          <div className="flex flex-1 justify-between gap-x-5 p-5 text-start">
            <div className="flex items-start gap-4">
              <div className="mt-1 shrink-0">
                <HugeiconsIcon
                  icon={Location01Icon}
                  size={22}
                  strokeWidth={1.5}
                  className="text-neutral-400"
                />
              </div>
              <div className="flex flex-col">
                <span className="text-sm text-neutral-400">{t('booking:field.pickup.label')}</span>
                <span className="mt-1 text-base font-semibold text-neutral-900 dark:text-white">
                  {addressWithUnit(pickupStreetAddress || pickupLocation, pickupApartmentUnit)}
                </span>
                {floorLevel && (
                  <span className="text-sm text-neutral-500 dark:text-neutral-400">
                    {t('track:address.floor.label', { floor: floorLevel })}
                  </span>
                )}
              </div>
            </div>
          </div>
        ) : (
          <Link
            href="/add-listing/2"
            className="flex flex-1 justify-between gap-x-5 p-5 text-start hover:bg-neutral-50 focus-visible:outline-hidden dark:hover:bg-neutral-800"
          >
            <div className="flex items-start gap-4">
              <div className="mt-1 shrink-0">
                <HugeiconsIcon
                  icon={Location01Icon}
                  size={22}
                  strokeWidth={1.5}
                  className="text-neutral-400"
                />
              </div>
              <div className="flex flex-col">
                <span className="text-sm text-neutral-400">{t('track:address.pickup.title')}</span>
                <span className="mt-1 text-base font-semibold text-neutral-900 dark:text-white">
                  {addressWithUnit(pickupStreetAddress || pickupLocation, pickupApartmentUnit)}
                </span>
                <span className="text-sm text-neutral-500 dark:text-neutral-400">
                  {t('track:address.floor.label', { floor: floorLevel || t('common:value.notAvailable.label') })}
                </span>
              </div>
            </div>
            <EditIcon />
          </Link>
        )}

        {/* Drop-off Location */}
        {isInstantMove ? (
          <div className="flex flex-1 justify-between gap-x-5 p-5 text-start">
            <div className="flex items-start gap-4">
              <div className="mt-1 shrink-0">
                <HugeiconsIcon
                  icon={Location01Icon}
                  size={22}
                  strokeWidth={1.5}
                  className="text-neutral-400"
                />
              </div>
              <div className="flex flex-col">
                <span className="text-sm text-neutral-400">{t('booking:field.dropoff.label')}</span>
                <span className="mt-1 text-base font-semibold text-neutral-900 dark:text-white">
                  {addressWithUnit(dropoffStreetAddress || dropoffLocation, dropoffApartmentUnit)}
                </span>
                {dropoffFloorLevel && (
                  <span className="text-sm text-neutral-500 dark:text-neutral-400">
                    {t('track:address.floor.label', { floor: dropoffFloorLevel })}
                  </span>
                )}
              </div>
            </div>
          </div>
        ) : (
          <Link
            href="/add-listing/3"
            className="flex flex-1 justify-between gap-x-5 p-5 text-start hover:bg-neutral-50 focus-visible:outline-hidden dark:hover:bg-neutral-800"
          >
            <div className="flex items-start gap-4">
              <div className="mt-1 shrink-0">
                <HugeiconsIcon
                  icon={Location01Icon}
                  size={22}
                  strokeWidth={1.5}
                  className="text-neutral-400"
                />
              </div>
              <div className="flex flex-col">
                <span className="text-sm text-neutral-400">{t('track:address.dropoff.title')}</span>
                <span className="mt-1 text-base font-semibold text-neutral-900 dark:text-white">
                  {addressWithUnit(dropoffStreetAddress || dropoffLocation, dropoffApartmentUnit)}
                </span>
                <span className="text-sm text-neutral-500 dark:text-neutral-400">
                  {t('track:address.floor.label', { floor: dropoffFloorLevel || t('common:value.notAvailable.label') })}
                </span>
              </div>
            </div>
            <EditIcon />
          </Link>
        )}

        {/* Items Count */}
        {inventoryCount > 0 && (
          isInstantMove ? (
            <div className="flex flex-1 justify-between gap-x-5 p-5 text-start">
              <div className="flex items-start gap-4">
                <div className="mt-1 shrink-0">
                  <HugeiconsIcon
                    icon={DeliveryTruck01Icon}
                    size={22}
                    strokeWidth={1.5}
                    className="text-neutral-400"
                  />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm text-neutral-400">{t('booking:inventory.itemsToMove.title')}</span>
                  <span className="mt-1 text-base font-semibold text-neutral-900 dark:text-white">
                    {t('moves:itemCount', { count: inventoryCount })}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <Link
              href="/add-listing/4"
              className="flex flex-1 justify-between gap-x-5 p-5 text-start hover:bg-neutral-50 focus-visible:outline-hidden dark:hover:bg-neutral-800"
            >
              <div className="flex items-start gap-4">
                <div className="mt-1 shrink-0">
                  <HugeiconsIcon
                    icon={DeliveryTruck01Icon}
                    size={22}
                    strokeWidth={1.5}
                    className="text-neutral-400"
                  />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm text-neutral-400">{t('booking:inventory.itemsToMove.title')}</span>
                  <span className="mt-1 text-base font-semibold text-neutral-900 dark:text-white">
                    {t('moves:itemCount', { count: inventoryCount })}
                  </span>
                </div>
              </div>
              <EditIcon />
            </Link>
          )
        )}

        {/* Contact - Only show for scheduled moves or if contact info is provided */}
        {(!isInstantMove || contactInfo.fullName) && (
          isInstantMove ? (
            <div className="flex flex-1 justify-between gap-x-5 p-5 text-start">
              <div className="flex items-start gap-4">
                <div className="mt-1 shrink-0">
                  <HugeiconsIcon
                    icon={UserIcon}
                    size={22}
                    strokeWidth={1.5}
                    className="text-neutral-400"
                  />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm text-neutral-400">{t('booking:contact.title')}</span>
                  <span className="mt-1 text-base font-semibold text-neutral-900 dark:text-white">
                    {contactInfo.fullName || t('common:value.notProvided.empty')}
                  </span>
                  <span className="text-sm text-neutral-500 dark:text-neutral-400">
                    {contactInfo.phoneNumber || t('common:value.noPhone.empty')}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <Link
              href="/add-listing/9"
              className="flex flex-1 justify-between gap-x-5 p-5 text-start hover:bg-neutral-50 focus-visible:outline-hidden dark:hover:bg-neutral-800"
            >
              <div className="flex items-start gap-4">
                <div className="mt-1 shrink-0">
                  <HugeiconsIcon
                    icon={UserIcon}
                    size={22}
                    strokeWidth={1.5}
                    className="text-neutral-400"
                  />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm text-neutral-400">{t('booking:contact.title')}</span>
                  <span className="mt-1 text-base font-semibold text-neutral-900 dark:text-white">
                    {contactInfo.fullName || t('common:value.notProvided.empty')}
                  </span>
                  <span className="text-sm text-neutral-500 dark:text-neutral-400">
                    {t('booking:contact.emailPhone.label', {
                      email: contactInfo.email || t('common:value.noEmail.empty'),
                      phone: contactInfo.phoneNumber || t('common:value.noPhone.empty'),
                    })}
                  </span>
                </div>
              </div>
              <EditIcon />
            </Link>
          )
        )}
      </div>

      {!isInstantMove && (
        <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
          {t('web:checkout.editHint.helper')}
        </p>
      )}

      {/* Hidden fields for form data */}
      <input type="hidden" name="isInstantMove" value={isInstantMove ? 'true' : 'false'} />
      <input type="hidden" name="moveDate" value={moveDate || ''} />
      <input type="hidden" name="pickupAddress" value={pickupStreetAddress || pickupLocation || ''} />
      <input type="hidden" name="dropoffAddress" value={dropoffStreetAddress || dropoffLocation || ''} />
      <input type="hidden" name="contactName" value={contactInfo.fullName || ''} />
      <input type="hidden" name="contactEmail" value={contactInfo.email || ''} />
      <input type="hidden" name="contactPhone" value={contactInfo.phoneNumber || ''} />
      {routeDistance && <input type="hidden" name="routeDistance" value={routeDistance} />}
      {routeDuration && <input type="hidden" name="routeDuration" value={routeDuration} />}
    </div>
  )
}

export default YourMove
