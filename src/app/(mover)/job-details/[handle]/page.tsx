'use client'

import { Badge } from '@/shared/Badge'
import GallerySlider from '@/components/GallerySlider'
import { SectionHeading, SectionSubheading } from '@/components/listings/SectionHeading'
import { Divider } from '@/shared/divider'
import { DescriptionDetails, DescriptionList, DescriptionTerm } from '@/shared/description-list'
import {
  MapPinIcon,
  CalendarIcon,
  TruckIcon,
  UsersIcon,
  CubeIcon,
  ArrowLeftIcon,
  HomeIcon,
  CheckCircleIcon,
  ClockIcon,
  PhoneIcon,
  EnvelopeIcon,
} from '@heroicons/react/24/outline'
import Image from 'next/image'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'

const APPWRITE_ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || ''
const PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || ''
const BUCKET_MOVE_PHOTOS = process.env.NEXT_PUBLIC_BUCKET_MOVE_PHOTOS || ''

const getPhotoUrl = (fileIdOrUrl: string): string => {
  if (!fileIdOrUrl) return ''
  if (fileIdOrUrl.startsWith('http://') || fileIdOrUrl.startsWith('https://')) return fileIdOrUrl
  if (!APPWRITE_ENDPOINT || !PROJECT_ID || !BUCKET_MOVE_PHOTOS) return ''
  return `${APPWRITE_ENDPOINT}/storage/buckets/${BUCKET_MOVE_PHOTOS}/files/${fileIdOrUrl}/view?project=${PROJECT_ID}`
}

type MoveStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled'

interface MoveData {
  id: string
  handle: string
  status: MoveStatus
  createdAt: string
  totalPrice: number
  bookingCode: string
  moveType: string | null
  moveDate: string | null
  pickupLocation: string
  pickupStreetAddress: string
  pickupApartmentUnit: string
  dropoffStreetAddress: string
  dropoffApartmentUnit: string
  dropoffFloorLevel: string | null
  homeType: string | null
  floorLevel: string | null
  elevatorAvailable: boolean
  dropoffElevatorAvailable: boolean
  parkingSituation: string | null
  dropoffParkingSituation: string | null
  packingServiceLevel: string | null
  additionalServices: string[]
  storageWeeks: number
  crewSize: string | null
  vehicleType: string | null
  arrivalWindow: string | null
  inventoryCount: number
  contactInfo: { fullName?: string; phone?: string; phoneNumber?: string; email?: string } | null
  coverPhotoId: string | null
  galleryPhotoIds: string[]
  routeDistanceMeters?: number | null
  routeDurationSeconds?: number | null
}

// ─── Helpers ────────────────────────────────────────────
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

const getStatusBadgeColor = (status: MoveStatus): 'green' | 'yellow' | 'red' | 'blue' => {
  switch (status) {
    case 'completed': return 'green'
    case 'in_progress': return 'blue'
    case 'pending': return 'yellow'
    case 'cancelled': return 'red'
    default: return 'yellow'
  }
}

const getStatusLabel = (status: MoveStatus): string => {
  switch (status) {
    case 'completed': return 'Completed'
    case 'in_progress': return 'In Progress'
    case 'pending': return 'Pending'
    case 'cancelled': return 'Cancelled'
    default: return 'Unknown'
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

function mapDbStatus(dbStatus: string): MoveStatus {
  if (['draft', 'pending_payment', 'paid', 'mover_assigned'].includes(dbStatus)) return 'pending'
  if (
    ['mover_accepted', 'mover_en_route', 'mover_arrived', 'loading', 'in_transit',
     'arrived_destination', 'unloading', 'awaiting_payment'].includes(dbStatus)
  ) return 'in_progress'
  if (dbStatus === 'completed') return 'completed'
  if (['cancelled', 'cancelled_by_client', 'cancelled_by_mover', 'disputed'].includes(dbStatus))
    return 'cancelled'
  return 'pending'
}

function docToMoveData(doc: any): MoveData {
  return {
    id: doc.$id,
    handle: doc.handle ?? '',
    status: mapDbStatus(doc.status ?? ''),
    createdAt: doc.$createdAt ?? '',
    totalPrice: doc.estimatedPrice ?? 0,
    bookingCode: doc.handle ?? '',
    moveType: doc.moveType ?? doc.systemMoveType ?? null,
    moveDate: doc.moveDate ?? null,
    pickupLocation: doc.pickupLocation ?? '',
    pickupStreetAddress: doc.pickupStreetAddress ?? doc.pickupLocation ?? '',
    pickupApartmentUnit: doc.pickupApartmentUnit ?? '',
    dropoffStreetAddress: doc.dropoffStreetAddress ?? doc.dropoffLocation ?? '',
    dropoffApartmentUnit: doc.dropoffApartmentUnit ?? '',
    dropoffFloorLevel: doc.dropoffFloorLevel ?? null,
    homeType: doc.homeType ?? null,
    floorLevel: doc.floorLevel ?? null,
    elevatorAvailable: doc.elevatorAvailable ?? false,
    dropoffElevatorAvailable: doc.dropoffElevatorAvailable ?? false,
    parkingSituation: doc.parkingSituation ?? null,
    dropoffParkingSituation: doc.dropoffParkingSituation ?? null,
    packingServiceLevel: doc.packingServiceLevel ?? null,
    additionalServices: doc.additionalServices ?? [],
    storageWeeks: doc.storageWeeks ?? 0,
    crewSize: doc.crewSize ?? null,
    vehicleType: doc.vehicleType ?? null,
    arrivalWindow: doc.arrivalWindow ?? null,
    inventoryCount: doc.totalItemCount ?? 0,
    contactInfo: doc.contactInfo ?? null,
    coverPhotoId: doc.coverPhotoId ?? null,
    galleryPhotoIds: doc.galleryPhotoIds ?? [],
    routeDistanceMeters: doc.routeDistanceMeters ?? null,
    routeDurationSeconds: doc.routeDurationSeconds ?? null,
  }
}


export default function MoverMoveDetailsPage() {
  const params = useParams()
  const handle = params.handle as string

  const [move, setMove] = useState<MoveData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMove = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const res = await fetch(`/api/moves/by-handle/${encodeURIComponent(handle)}`)
      if (!res.ok) {
        setError(res.status === 404 ? 'not_found' : 'fetch_error')
        return
      }
      const data = await res.json()
      console.log('Fetched move data:', data.move)
      if (data.move) setMove(docToMoveData(data.move))
      else setError('not_found')
    } catch {
      setError('fetch_error')
    } finally {
      setIsLoading(false)
    }
  }, [handle])

  useEffect(() => { fetchMove() }, [fetchMove])

  if (isLoading) {
    return (
      <div className="py-16 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    )
  }

  if (!move) {
    return (
      <div className="py-16">
        <div className="flex flex-col items-center justify-center text-center space-y-4 max-w-md mx-auto">
          <TruckIcon className="w-16 h-16 text-neutral-300" />
          <h2 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
            Move not found
          </h2>
          <p className="text-neutral-500 dark:text-neutral-400">
            This move may have been removed or the link is invalid.
          </p>
          <Link
            href="/dashboard"
            className="mt-4 inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 font-medium"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  const {
    status, moveType, moveDate,
    pickupStreetAddress, pickupLocation, pickupApartmentUnit,
    dropoffStreetAddress, dropoffApartmentUnit, dropoffFloorLevel,
    homeType, floorLevel, elevatorAvailable, dropoffElevatorAvailable,
    parkingSituation, dropoffParkingSituation,
    packingServiceLevel, additionalServices, storageWeeks,
    crewSize, vehicleType, arrivalWindow, inventoryCount,
    contactInfo, totalPrice, bookingCode,
    coverPhotoId, galleryPhotoIds, createdAt,
  } = move

  const pickupDisplay = pickupStreetAddress || pickupLocation || 'Pickup location'
  const dropoffDisplay = dropoffStreetAddress || 'Drop-off location'

  const galleryImgs: string[] = []
  if (coverPhotoId) {
    const url = getPhotoUrl(coverPhotoId)
    if (url) galleryImgs.push(url)
  }
  if (galleryPhotoIds.length > 0) {
    galleryPhotoIds.forEach((id) => {
      const url = getPhotoUrl(id)
      if (url) galleryImgs.push(url)
    })
  }

  return (
    <div>
      {/* GALLERY HEADER */}
      {galleryImgs.length > 0 ? (
        <div className="relative rounded-2xl overflow-hidden">
          <GallerySlider
            galleryImgs={galleryImgs}
            ratioClass="aspect-w-16 aspect-h-9"
            href="#"
            imageClass="rounded-none"
            galleryClass="rounded-none"
            navigation={galleryImgs.length > 1}
          />
          <div className="absolute top-3 right-3 z-10 bg-black/50 backdrop-blur-sm text-white text-xs px-2.5 py-1 rounded-full">
            {galleryImgs.length} photo{galleryImgs.length !== 1 ? 's' : ''}
          </div>
        </div>
      ) : (
        <div className="relative h-64 bg-neutral-100 dark:bg-neutral-800 rounded-2xl flex items-center justify-center">
          <TruckIcon className="h-24 w-24 text-neutral-400" />
        </div>
      )}

      {/* Back link */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 mt-6"
      >
        <ArrowLeftIcon className="w-4 h-4" />
        Back to Dashboard
      </Link>

      {/* MAIN */}
      <main className="relative z-[1] mt-10 flex flex-col gap-8 lg:flex-row xl:gap-10">
        {/* CONTENT */}
        <div className="flex w-full flex-col gap-y-8 lg:w-3/5 xl:w-[64%] xl:gap-y-10">
          {/* Header Section */}
          <div className="listingSection__wrap">
            <div className="flex items-center gap-x-3 mb-4">
              <Badge color={getStatusBadgeColor(status)} className="text-sm">
                {getStatusLabel(status)}
              </Badge>
              <span className="text-sm text-neutral-500">#{bookingCode}</span>
            </div>
            <h1 className="text-2xl font-semibold sm:text-3xl lg:text-4xl">
              {pickupDisplay.split(',')[0]} &rarr; {dropoffDisplay.split(',')[0]}
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

          {/* Addresses Section */}
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

          {/* Services & Details Section */}
          <div className="listingSection__wrap">
            <SectionHeading>Services &amp; Details</SectionHeading>
            <SectionSubheading>What&apos;s included in this move</SectionSubheading>
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
              <div className="flex items-start gap-x-3">
                <HomeIcon className="h-6 w-6 text-neutral-500 shrink-0" />
                <div>
                  <span className="font-medium">Home Type</span>
                  <p className="text-sm text-neutral-500">{formatLabel(homeType)}</p>
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

          {/* Contact Section */}
          {contactInfo && (contactInfo.fullName || contactInfo.email || contactInfo.phoneNumber) && (
            <div className="listingSection__wrap">
              <SectionHeading>Client Contact</SectionHeading>
              <div className="space-y-4">
                {contactInfo.fullName && (
                  <div className="flex items-center gap-x-3">
                    <UsersIcon className="h-5 w-5 text-neutral-500" />
                    <span>{contactInfo.fullName}</span>
                  </div>
                )}
                {contactInfo.phoneNumber && (
                  <div className="flex items-center gap-x-3">
                    <PhoneIcon className="h-5 w-5 text-neutral-500" />
                    <span>{contactInfo.phoneNumber}</span>
                  </div>
                )}
                {contactInfo.email && (
                  <div className="flex items-center gap-x-3">
                    <EnvelopeIcon className="h-5 w-5 text-neutral-500" />
                    <span>{contactInfo.email}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* SIDEBAR */}
        <div className="grow">
          <div className="sticky top-5">
            <div className="listingSection__wrap sm:shadow-xl">
              {/* EARNINGS */}
              <div className="flex flex-col gap-y-2">
                <span className="text-sm text-neutral-500">Earnings</span>
                <span className="text-3xl font-semibold text-green-600 dark:text-green-400">&euro;{totalPrice.toFixed(2)}</span>
              </div>

              <Divider />

              <DescriptionList>
                <DescriptionTerm>Booking Code</DescriptionTerm>
                <DescriptionDetails className="sm:text-right font-mono">#{bookingCode}</DescriptionDetails>
                <DescriptionTerm>Status</DescriptionTerm>
                <DescriptionDetails className="sm:text-right">
                  <Badge color={getStatusBadgeColor(status)}>{getStatusLabel(status)}</Badge>
                </DescriptionDetails>
                <DescriptionTerm>Created</DescriptionTerm>
                <DescriptionDetails className="sm:text-right">
                  {new Date(createdAt).toLocaleDateString('en-GB', { month: 'short', day: 'numeric', year: 'numeric' })}
                </DescriptionDetails>
                <DescriptionTerm>Move Date</DescriptionTerm>
                <DescriptionDetails className="sm:text-right">{formatDate(moveDate)}</DescriptionDetails>
              </DescriptionList>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
