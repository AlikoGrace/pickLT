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

interface MoveCardProps {
  className?: string
  data: StoredMove
  size?: 'default' | 'small'
}

// Helper to format labels
const formatLabel = (value: string | null | undefined): string => {
  if (!value) return 'Not specified'
  return value
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return 'Not selected'
  try {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-GB', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })
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

const getStatusLabel = (status: StoredMove['status']): string => {
  switch (status) {
    case 'completed':
      return 'Completed'
    case 'in_progress':
      return 'In Progress'
    case 'pending':
      return 'Pending'
    case 'cancelled':
      return 'Cancelled'
    default:
      return 'Unknown'
  }
}

const MoveCard: FC<MoveCardProps> = ({ size = 'default', className = '', data }) => {
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
    coverPhoto,
    galleryPhotos,
  } = data

  const listingHref = `/move-details/${handle}`

  // Create gallery images array for slider
  const galleryImgs = coverPhoto 
    ? [coverPhoto, ...galleryPhotos] 
    : galleryPhotos.length > 0 
      ? galleryPhotos 
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
          {getStatusLabel(status)}
        </Badge>
      </div>
    )
  }

  const renderContent = () => {
    const pickupDisplay = pickupStreetAddress || pickupLocation || 'Pickup'
    const dropoffDisplay = dropoffStreetAddress || 'Drop-off'
    const title = `${pickupDisplay.split(',')[0]} → ${dropoffDisplay.split(',')[0]}`

    return (
      <div className={clsx(size === 'default' ? 'mt-3 gap-y-3' : 'mt-2 gap-y-2', 'flex flex-col')}>
        <div className="flex flex-col gap-y-2">
          <span className="text-sm text-neutral-500 dark:text-neutral-400">
            {formatLabel(moveType)} Move · {formatDate(moveDate)}
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
            <span className="text-base font-semibold">€{totalPrice.toFixed(2)}</span>
          </div>
          <span className="text-sm text-neutral-500 dark:text-neutral-400">
            {inventoryCount} items · {crewSize ? `${crewSize} movers` : formatLabel(vehicleType)}
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
