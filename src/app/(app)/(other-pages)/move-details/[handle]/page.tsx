'use client'

import { useMoveSearch, StoredMove } from '@/context/moveSearch'
import { Badge } from '@/shared/Badge'
import {
  MapPinIcon,
  CalendarIcon,
  TruckIcon,
  UsersIcon,
  CubeIcon,
  ArrowLeftIcon,
  HomeIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline'
import Image from 'next/image'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'

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
      weekday: 'long',
      year: 'numeric',
      month: 'long',
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

const InfoRow = ({ label, value, icon: Icon }: { label: string; value: React.ReactNode; icon?: React.ComponentType<{ className?: string }> }) => (
  <div className="flex items-start gap-3 py-3 border-b border-neutral-100 dark:border-neutral-800 last:border-0">
    {Icon && (
      <div className="mt-0.5 w-5 h-5 text-neutral-400 flex-shrink-0">
        <Icon className="w-5 h-5" />
      </div>
    )}
    <div className="flex-1">
      <p className="text-sm text-neutral-500 dark:text-neutral-400">{label}</p>
      <p className="font-medium text-neutral-900 dark:text-neutral-100">{value}</p>
    </div>
  </div>
)

export default function MoveDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const { getMoveByHandle } = useMoveSearch()

  const handle = params.handle as string
  const move = getMoveByHandle(handle)

  if (!move) {
    return (
      <div className="container py-16">
        <div className="flex flex-col items-center justify-center text-center space-y-4">
          <TruckIcon className="w-16 h-16 text-neutral-300" />
          <h2 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
            Move not found
          </h2>
          <p className="text-neutral-500 dark:text-neutral-400">
            This move may have been removed or the link is invalid.
          </p>
          <Link
            href="/account-savelists"
            className="mt-4 inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 font-medium"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            Back to My Moves
          </Link>
        </div>
      </div>
    )
  }

  const {
    status,
    moveType,
    moveDate,
    pickupStreetAddress,
    pickupLocation,
    pickupApartmentUnit,
    dropoffStreetAddress,
    dropoffApartmentUnit,
    dropoffFloorLevel,
    homeType,
    floorLevel,
    elevatorAvailable,
    dropoffElevatorAvailable,
    parkingSituation,
    dropoffParkingSituation,
    packingServiceLevel,
    additionalServices,
    storageWeeks,
    crewSize,
    vehicleType,
    arrivalWindow,
    inventoryCount,
    contactInfo,
    totalPrice,
    bookingCode,
    coverPhoto,
    galleryPhotos,
    createdAt,
  } = move

  const pickupDisplay = pickupStreetAddress || pickupLocation || 'Pickup location'
  const dropoffDisplay = dropoffStreetAddress || 'Drop-off location'

  const galleryImgs = coverPhoto
    ? [coverPhoto, ...galleryPhotos]
    : galleryPhotos

  return (
    <div className="container pb-24 lg:pb-32 pt-8 lg:pt-12">
      {/* Back link */}
      <Link
        href="/account-savelists"
        className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 mb-6"
      >
        <ArrowLeftIcon className="w-4 h-4" />
        Back to My Moves
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-8">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <Badge color={getStatusBadgeColor(status)}>
              {getStatusLabel(status)}
            </Badge>
            <span className="text-sm text-neutral-500 dark:text-neutral-400">
              #{bookingCode}
            </span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-semibold text-neutral-900 dark:text-neutral-100">
            {pickupDisplay.split(',')[0]} &rarr; {dropoffDisplay.split(',')[0]}
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-1">
            {formatLabel(moveType)} Move &middot; {formatDate(moveDate)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">Total</p>
          <p className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">
            &euro;{totalPrice.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Gallery */}
      {galleryImgs.length > 0 && (
        <div className="grid grid-cols-4 gap-2 rounded-2xl overflow-hidden mb-10">
          <div className="col-span-4 sm:col-span-2 sm:row-span-2 relative aspect-[4/3]">
            <Image
              src={galleryImgs[0]}
              alt="Move photo"
              fill
              className="object-cover"
            />
          </div>
          {galleryImgs.slice(1, 5).map((img, i) => (
            <div key={i} className="hidden sm:block relative aspect-[4/3]">
              <Image
                src={img}
                alt={`Move photo ${i + 2}`}
                fill
                className="object-cover"
              />
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left column - Details */}
        <div className="lg:col-span-2 space-y-8">
          {/* Locations */}
          <div className="bg-white dark:bg-neutral-800 rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
              Locations
            </h2>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="mt-1 w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                  <MapPinIcon className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">Pickup</p>
                  <p className="font-medium text-neutral-900 dark:text-neutral-100">
                    {pickupDisplay}
                  </p>
                  {pickupApartmentUnit && (
                    <p className="text-sm text-neutral-500">Apt/Unit: {pickupApartmentUnit}</p>
                  )}
                  {floorLevel && (
                    <p className="text-sm text-neutral-500">Floor: {formatLabel(floorLevel)}</p>
                  )}
                  {elevatorAvailable && (
                    <p className="text-sm text-green-600 flex items-center gap-1">
                      <CheckCircleIcon className="w-3.5 h-3.5" /> Elevator available
                    </p>
                  )}
                  {parkingSituation && (
                    <p className="text-sm text-neutral-500">Parking: {formatLabel(parkingSituation)}</p>
                  )}
                </div>
              </div>

              <div className="ml-4 border-l-2 border-dashed border-neutral-200 dark:border-neutral-700 h-4" />

              <div className="flex items-start gap-3">
                <div className="mt-1 w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                  <MapPinIcon className="w-4 h-4 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">Drop-off</p>
                  <p className="font-medium text-neutral-900 dark:text-neutral-100">
                    {dropoffDisplay}
                  </p>
                  {dropoffApartmentUnit && (
                    <p className="text-sm text-neutral-500">Apt/Unit: {dropoffApartmentUnit}</p>
                  )}
                  {dropoffFloorLevel && (
                    <p className="text-sm text-neutral-500">Floor: {formatLabel(dropoffFloorLevel)}</p>
                  )}
                  {dropoffElevatorAvailable && (
                    <p className="text-sm text-green-600 flex items-center gap-1">
                      <CheckCircleIcon className="w-3.5 h-3.5" /> Elevator available
                    </p>
                  )}
                  {dropoffParkingSituation && (
                    <p className="text-sm text-neutral-500">Parking: {formatLabel(dropoffParkingSituation)}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Move Details */}
          <div className="bg-white dark:bg-neutral-800 rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
              Move Details
            </h2>
            <InfoRow icon={TruckIcon} label="Move Type" value={formatLabel(moveType)} />
            <InfoRow icon={CalendarIcon} label="Move Date" value={formatDate(moveDate)} />
            <InfoRow icon={HomeIcon} label="Home Type" value={formatLabel(homeType)} />
            <InfoRow icon={CubeIcon} label="Items" value={`${inventoryCount} items`} />
            <InfoRow icon={TruckIcon} label="Vehicle" value={formatLabel(vehicleType)} />
            <InfoRow icon={UsersIcon} label="Crew" value={crewSize ? `${crewSize} movers` : 'Standard'} />
            {arrivalWindow && (
              <InfoRow icon={CalendarIcon} label="Arrival Window" value={formatLabel(arrivalWindow)} />
            )}
          </div>

          {/* Services */}
          {(packingServiceLevel || additionalServices.length > 0 || storageWeeks > 0) && (
            <div className="bg-white dark:bg-neutral-800 rounded-2xl p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
                Services
              </h2>
              {packingServiceLevel && (
                <InfoRow label="Packing Service" value={formatLabel(packingServiceLevel)} />
              )}
              {additionalServices.length > 0 && (
                <InfoRow
                  label="Additional Services"
                  value={additionalServices.map(formatLabel).join(', ')}
                />
              )}
              {storageWeeks > 0 && (
                <InfoRow label="Storage" value={`${storageWeeks} weeks`} />
              )}
            </div>
          )}
        </div>

        {/* Right sidebar - Summary & Contact */}
        <div className="space-y-6">
          {/* Price Summary */}
          <div className="bg-white dark:bg-neutral-800 rounded-2xl p-6 shadow-sm sticky top-24">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
              Summary
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-neutral-500 dark:text-neutral-400">Booking Code</span>
                <span className="font-medium text-neutral-900 dark:text-neutral-100">#{bookingCode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500 dark:text-neutral-400">Status</span>
                <Badge color={getStatusBadgeColor(status)} className="text-xs">
                  {getStatusLabel(status)}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500 dark:text-neutral-400">Created</span>
                <span className="font-medium text-neutral-900 dark:text-neutral-100">
                  {new Date(createdAt).toLocaleDateString('en-GB', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
              <div className="my-4 border-t border-neutral-100 dark:border-neutral-700" />
              <div className="flex justify-between text-base">
                <span className="font-semibold text-neutral-900 dark:text-neutral-100">Total</span>
                <span className="font-bold text-neutral-900 dark:text-neutral-100">&euro;{totalPrice.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Contact Info */}
          {contactInfo && (contactInfo.fullName || contactInfo.email || contactInfo.phoneNumber) && (
            <div className="bg-white dark:bg-neutral-800 rounded-2xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
                Contact
              </h3>
              {contactInfo.fullName && (
                <InfoRow label="Name" value={contactInfo.fullName} />
              )}
              {contactInfo.email && (
                <InfoRow label="Email" value={contactInfo.email} />
              )}
              {contactInfo.phoneNumber && (
                <InfoRow label="Phone" value={contactInfo.phoneNumber} />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
