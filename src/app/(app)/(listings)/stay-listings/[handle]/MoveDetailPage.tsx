'use client'

import { StoredMove, useMoveSearch } from '@/context/moveSearch'
import { Badge } from '@/shared/Badge'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { DescriptionDetails, DescriptionList, DescriptionTerm } from '@/shared/description-list'
import { Divider } from '@/shared/divider'
import { SectionHeading, SectionSubheading } from '@/components/listings/SectionHeading'
import HeaderGallery from '@/components/listings/HeaderGallery'
import {
  HomeIcon,
  MapPinIcon,
  TruckIcon,
  UsersIcon,
  CalendarIcon,
  CubeIcon,
  PhoneIcon,
  EnvelopeIcon,
  CheckCircleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline'
import Image from 'next/image'
import { FC, Fragment, useEffect, useState } from 'react'

interface MoveDetailPageProps {
  handle: string
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

const MoveDetailPage: FC<MoveDetailPageProps> = ({ handle }) => {
  const { getMoveByHandle, updateMoveStatus } = useMoveSearch()
  const [move, setMove] = useState<StoredMove | undefined>(undefined)

  useEffect(() => {
    const foundMove = getMoveByHandle(handle)
    setMove(foundMove)
  }, [handle, getMoveByHandle])

  if (!move) {
    return null
  }

  const {
    status,
    moveType,
    moveDate,
    pickupLocation,
    pickupStreetAddress,
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
    coverPhotoId,
    galleryPhotoIds,
    totalPrice,
    bookingCode,
    paidAt,
    createdAt,
  } = move

  // Build gallery images
  const galleryImgs = coverPhotoId 
    ? [coverPhotoId, ...galleryPhotoIds] 
    : galleryPhotoIds.length > 0 
      ? galleryPhotoIds 
      : []

  const pickupDisplay = pickupStreetAddress || pickupLocation || 'Pickup location'
  const dropoffDisplay = dropoffStreetAddress || 'Drop-off location'

  const renderSectionHeader = () => {
    return (
      <div className="listingSection__wrap">
        <div className="flex items-center gap-x-3 mb-4">
          <Badge color={getStatusBadgeColor(status)} className="text-sm">
            {getStatusLabel(status)}
          </Badge>
          <span className="text-sm text-neutral-500">Booking: {bookingCode}</span>
        </div>
        <h1 className="text-2xl font-semibold sm:text-3xl lg:text-4xl">
          {pickupDisplay.split(',')[0]} → {dropoffDisplay.split(',')[0]}
        </h1>
        <div className="mt-4 flex flex-wrap items-center gap-4 text-neutral-500 dark:text-neutral-400">
          <div className="flex items-center gap-x-2">
            <TruckIcon className="size-5" />
            <span>{formatLabel(moveType)} Move</span>
          </div>
          <div className="flex items-center gap-x-2">
            <CalendarIcon className="size-5" />
            <span>{formatDate(moveDate)}</span>
          </div>
          <div className="flex items-center gap-x-2">
            <CubeIcon className="size-5" />
            <span>{inventoryCount} items</span>
          </div>
          <div className="flex items-center gap-x-2">
            <UsersIcon className="size-5" />
            <span>{crewSize ? `${crewSize} movers` : 'Crew TBD'}</span>
          </div>
        </div>
      </div>
    )
  }

  const renderSectionAddresses = () => {
    return (
      <div className="listingSection__wrap">
        <SectionHeading>Move Addresses</SectionHeading>
        <div className="grid gap-6 md:grid-cols-2">
          {/* Pickup Address */}
          <div className="rounded-2xl border border-neutral-200 p-5 dark:border-neutral-700">
            <div className="flex items-center gap-x-2 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900/30">
                <HomeIcon className="h-5 w-5 text-primary-600" />
              </div>
              <span className="font-semibold">Pickup Location</span>
            </div>
            <p className="text-neutral-700 dark:text-neutral-300">{pickupDisplay}</p>
            {pickupApartmentUnit && (
              <p className="text-sm text-neutral-500 mt-1">Unit: {pickupApartmentUnit}</p>
            )}
            <div className="mt-3 space-y-1 text-sm text-neutral-500">
              <p>Home type: {formatLabel(homeType)}</p>
              <p>Floor: {formatLabel(floorLevel)}</p>
              <p>Elevator: {elevatorAvailable ? 'Yes' : 'No'}</p>
              <p>Parking: {formatLabel(parkingSituation)}</p>
            </div>
          </div>

          {/* Drop-off Address */}
          <div className="rounded-2xl border border-neutral-200 p-5 dark:border-neutral-700">
            <div className="flex items-center gap-x-2 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                <MapPinIcon className="h-5 w-5 text-green-600" />
              </div>
              <span className="font-semibold">Drop-off Location</span>
            </div>
            <p className="text-neutral-700 dark:text-neutral-300">{dropoffDisplay}</p>
            {dropoffApartmentUnit && (
              <p className="text-sm text-neutral-500 mt-1">Unit: {dropoffApartmentUnit}</p>
            )}
            <div className="mt-3 space-y-1 text-sm text-neutral-500">
              <p>Floor: {formatLabel(dropoffFloorLevel)}</p>
              <p>Elevator: {dropoffElevatorAvailable ? 'Yes' : 'No'}</p>
              <p>Parking: {formatLabel(dropoffParkingSituation)}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderSectionServices = () => {
    return (
      <div className="listingSection__wrap">
        <SectionHeading>Services & Details</SectionHeading>
        <SectionSubheading>What&apos;s included in your move</SectionSubheading>
        <Divider className="w-14!" />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="flex items-start gap-x-3">
            <TruckIcon className="h-6 w-6 text-neutral-500 shrink-0" />
            <div>
              <span className="font-medium">Vehicle</span>
              <p className="text-sm text-neutral-500">{formatLabel(vehicleType)}</p>
            </div>
          </div>
          <div className="flex items-start gap-x-3">
            <UsersIcon className="h-6 w-6 text-neutral-500 shrink-0" />
            <div>
              <span className="font-medium">Crew Size</span>
              <p className="text-sm text-neutral-500">{crewSize ? `${crewSize} movers` : 'Not specified'}</p>
            </div>
          </div>
          <div className="flex items-start gap-x-3">
            <ClockIcon className="h-6 w-6 text-neutral-500 shrink-0" />
            <div>
              <span className="font-medium">Arrival Window</span>
              <p className="text-sm text-neutral-500">{formatLabel(arrivalWindow)}</p>
            </div>
          </div>
          <div className="flex items-start gap-x-3">
            <CubeIcon className="h-6 w-6 text-neutral-500 shrink-0" />
            <div>
              <span className="font-medium">Packing Service</span>
              <p className="text-sm text-neutral-500">{formatLabel(packingServiceLevel)}</p>
            </div>
          </div>
          {storageWeeks > 0 && (
            <div className="flex items-start gap-x-3">
              <HomeIcon className="h-6 w-6 text-neutral-500 shrink-0" />
              <div>
                <span className="font-medium">Storage</span>
                <p className="text-sm text-neutral-500">{storageWeeks} weeks</p>
              </div>
            </div>
          )}
        </div>

        {additionalServices.length > 0 && (
          <>
            <Divider className="w-14!" />
            <div>
              <span className="font-medium">Additional Services</span>
              <div className="mt-3 flex flex-wrap gap-2">
                {additionalServices.map((service) => (
                  <span
                    key={service}
                    className="inline-flex items-center gap-x-1 rounded-full bg-neutral-100 px-3 py-1 text-sm dark:bg-neutral-800"
                  >
                    <CheckCircleIcon className="h-4 w-4 text-green-500" />
                    {formatLabel(service)}
                  </span>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    )
  }

  const renderSectionContact = () => {
    return (
      <div className="listingSection__wrap">
        <SectionHeading>Contact Information</SectionHeading>
        <div className="space-y-4">
          <div className="flex items-center gap-x-3">
            <UsersIcon className="h-5 w-5 text-neutral-500" />
            <span>{contactInfo.fullName || 'Not provided'}</span>
          </div>
          <div className="flex items-center gap-x-3">
            <PhoneIcon className="h-5 w-5 text-neutral-500" />
            <span>{contactInfo.phoneNumber || 'Not provided'}</span>
          </div>
          <div className="flex items-center gap-x-3">
            <EnvelopeIcon className="h-5 w-5 text-neutral-500" />
            <span>{contactInfo.email || 'Not provided'}</span>
          </div>
          {contactInfo.notesForMovers && (
            <div className="mt-4 rounded-xl bg-neutral-50 p-4 dark:bg-neutral-800">
              <span className="font-medium">Notes for Movers:</span>
              <p className="mt-2 text-neutral-600 dark:text-neutral-400">{contactInfo.notesForMovers}</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  const renderSidebarPrice = () => {
    return (
      <div className="listingSection__wrap sm:shadow-xl">
        {/* PRICE */}
        <div className="flex flex-col gap-y-2">
          <span className="text-sm text-neutral-500">Total Paid</span>
          <span className="text-3xl font-semibold text-primary-600">€{totalPrice.toFixed(2)}</span>
        </div>

        <Divider />

        <DescriptionList>
          <DescriptionTerm>Booking Code</DescriptionTerm>
          <DescriptionDetails className="sm:text-right font-mono">{bookingCode}</DescriptionDetails>
          <DescriptionTerm>Paid On</DescriptionTerm>
          <DescriptionDetails className="sm:text-right">
            {new Date(paidAt).toLocaleDateString('en-GB', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </DescriptionDetails>
          <DescriptionTerm>Move Date</DescriptionTerm>
          <DescriptionDetails className="sm:text-right">{formatDate(moveDate)}</DescriptionDetails>
          <DescriptionTerm>Status</DescriptionTerm>
          <DescriptionDetails className="sm:text-right">
            <Badge color={getStatusBadgeColor(status)}>{getStatusLabel(status)}</Badge>
          </DescriptionDetails>
        </DescriptionList>

        {status === 'pending' && (
          <>
            <Divider />
            <ButtonPrimary className="w-full" onClick={() => updateMoveStatus(move.id, 'cancelled')}>
              Cancel Move
            </ButtonPrimary>
          </>
        )}
      </div>
    )
  }

  return (
    <div>
      {/* HEADER */}
      {galleryImgs.length > 0 ? (
        <HeaderGallery images={galleryImgs} />
      ) : (
        <div className="relative h-64 bg-neutral-100 dark:bg-neutral-800 rounded-2xl flex items-center justify-center">
          <TruckIcon className="h-24 w-24 text-neutral-400" />
        </div>
      )}

      {/* MAIN */}
      <main className="relative z-[1] mt-10 flex flex-col gap-8 lg:flex-row xl:gap-10">
        {/* CONTENT */}
        <div className="flex w-full flex-col gap-y-8 lg:w-3/5 xl:w-[64%] xl:gap-y-10">
          {renderSectionHeader()}
          {renderSectionAddresses()}
          {renderSectionServices()}
          {renderSectionContact()}
        </div>

        {/* SIDEBAR */}
        <div className="grow">
          <div className="sticky top-5">{renderSidebarPrice()}</div>
        </div>
      </main>
    </div>
  )
}

export default MoveDetailPage
