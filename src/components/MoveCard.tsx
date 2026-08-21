'use client'

import GallerySlider from '@/components/GallerySlider'
import { StoredMove } from '@/context/moveSearch'
import { Badge } from '@/shared/Badge'
import { Location06Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { TruckIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'
import Image from 'next/image'
import Link from 'next/link'
import { FC } from 'react'
import { formatDayMonth, formatMoney } from '@/lib/format'
import { moveSubtitle } from '@/lib/move-subtitle'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'

interface MoveCardProps {
  className?: string
  data: StoredMove
  size?: 'default' | 'small'
}

// `moveType` and `vehicleType` are STORED SLUGS, never labels — look the label
// up in the catalog, never humanise the slug (catalog conventions §5).
const VEHICLE_KEY: Record<string, string> = {
  small_van: 'smallVan',
  medium_truck: 'mediumTruck',
  large_truck: 'largeTruck',
}

const vehicleLabel = (t: TFunction, value: string | null | undefined): string => {
  // i18n-keys: booking:vehicle.smallVan.label, booking:vehicle.mediumTruck.label, booking:vehicle.largeTruck.label, booking:vehicle.multiple.label
  if (!value) return t('common:value.notSpecified.empty')
  const slug = VEHICLE_KEY[value] ?? value
  return t(`booking:vehicle.${slug}.label`)
}

const formatDate = (t: TFunction, dateStr: string | null) => {
  if (!dateStr) return t('common:value.notSelected.empty')
  try {
    const date = new Date(dateStr)
    return formatDayMonth(date)
  } catch {
    return dateStr
  }
}

const getStatusBadgeColor = (status: StoredMove['status']): 'green' | 'yellow' | 'red' | 'blue' => {
  switch (status) {
    case 'completed':
      return 'green'
    case 'in_progress':
      return 'blue'
    case 'pending':
      return 'yellow'
    case 'cancelled':
      return 'red'
    default:
      return 'yellow'
  }
}

const getStatusLabel = (t: TFunction, status: StoredMove['status']): string => {
  switch (status) {
    case 'completed':
      return t('moves:status.completed.label')
    case 'in_progress':
      return t('moves:status.inProgress.label')
    case 'pending':
      return t('moves:status.pending.label')
    case 'cancelled':
      return t('moves:status.cancelled.label')
    default:
      return t('moves:status.unknown.label')
  }
}

const MoveCard: FC<MoveCardProps> = ({ size = 'default', className = '', data }) => {
  const { t } = useTranslation()
  const {
    handle,
    status,
    moveType,
    moveDate,
    pickupStreetAddress,
    pickupLocation,
    dropoffStreetAddress,
    inventoryCount,
    crewSize,
    vehicleType,
    totalPrice,
    coverPhotoId,
    galleryPhotoIds,
  } = data

  const listingHref = `/move-details/${handle}`

  // Create gallery images array for slider — strip mode=admin from Appwrite URLs
  const cleanUrl = (url: string) => url.replace(/[&?]mode=admin/g, '')
  const galleryImgs = coverPhotoId
    ? [cleanUrl(coverPhotoId), ...galleryPhotoIds.map(cleanUrl)]
    : galleryPhotoIds.length > 0
      ? galleryPhotoIds.map(cleanUrl)
      : []

  const renderSliderGallery = () => {
    return (
      <div className="relative w-full">
        {galleryImgs.length > 0 ? (
          <GallerySlider ratioClass="aspect-w-12 aspect-h-11" galleryImgs={galleryImgs} href={listingHref} />
        ) : (
          <Link href={listingHref} className="block">
            <div className="aspect-w-12 aspect-h-11 rounded-2xl overflow-hidden bg-neutral-100 dark:bg-neutral-800">
              <div className="flex items-center justify-center h-full">
                <TruckIcon className="h-16 w-16 text-neutral-400" />
              </div>
            </div>
          </Link>
        )}
        <Badge color={getStatusBadgeColor(status)} className="absolute start-3 top-3">
          {getStatusLabel(t, status)}
        </Badge>
      </div>
    )
  }

  const renderContent = () => {
    const pickupDisplay = pickupStreetAddress || pickupLocation || t('booking:field.pickup.label')
    const dropoffDisplay = dropoffStreetAddress || t('booking:field.dropoff.label')
    const title = `${pickupDisplay.split(',')[0]} → ${dropoffDisplay.split(',')[0]}`

    return (
      <div className={clsx(size === 'default' ? 'mt-3 gap-y-3' : 'mt-2 gap-y-2', 'flex flex-col')}>
        <div className="flex flex-col gap-y-2">
          <span className="text-sm text-neutral-500 dark:text-neutral-400">
            {/* One whole phrase per move type — see `lib/move-subtitle.ts` for
                why the type cannot be interpolated into a frame. */}
            {moveSubtitle(t, moveType, null, moveDate ? formatDate(t, moveDate) : null)}
          </span>
          <div className="flex items-center gap-x-2">
            <h2 className={`text-base font-semibold text-neutral-900 capitalize dark:text-white`}>
              <span className="line-clamp-1">{title}</span>
            </h2>
          </div>
          <div className="flex items-center gap-x-1.5 text-sm text-neutral-500 dark:text-neutral-400">
            {size === 'default' && (
              <HugeiconsIcon
                className="mb-0.5"
                icon={Location06Icon}
                size={16}
                color="currentColor"
                strokeWidth={1.5}
              />
            )}
            <span className="line-clamp-1">{dropoffDisplay}</span>
          </div>
        </div>
        <div className="w-14 border-b border-neutral-100 dark:border-neutral-800"></div>
        <div className="flex items-center justify-between gap-2">
          <div>
            <span className="text-base font-semibold">{formatMoney(totalPrice)}</span>
          </div>
          <span className="text-sm text-neutral-500 dark:text-neutral-400">
            {t('moves:itemCount', { count: inventoryCount })} ·{' '}
            {crewSize ? t('moves:moverCount', { count: Number(crewSize) }) : vehicleLabel(t, vehicleType)}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className={`group relative ${className}`}>
      {renderSliderGallery()}
      <Link href={listingHref}>{renderContent()}</Link>
    </div>
  )
}

export default MoveCard
