'use client'

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
  ClockIcon,
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
  pickupAccessNotes: string
  pickupHaltverbot: boolean
  dropoffLocation: string
  dropoffStreetAddress: string
  dropoffApartmentUnit: string
  dropoffFloorLevel: string | null
  dropoffHaltverbot: boolean
  homeType: string | null
  floorLevel: string | null
  elevatorAvailable: boolean
  dropoffElevatorAvailable: boolean
  parkingSituation: string | null
  dropoffParkingSituation: string | null
  packingServiceLevel: string | null
  packingMaterials: string[]
  packingNotes: string
  additionalServices: string[]
  storageWeeks: number
  disposalItems: string
  crewSize: string | null
  vehicleType: string | null
  arrivalWindow: string | null
  flexibility: string | null
  inventoryCount: number
  inventoryItems: string | null
  customItems: string[]
  contactInfo: { fullName: string; phoneNumber: string; email: string; notesForMovers: string } | null
  coverPhotoId: string | null
  galleryPhotoIds: string[]
  routeDistanceMeters: number | null
  routeDurationSeconds: number | null
  paymentMethod: string | null
  isBusinessMove: boolean
  companyName: string
  vatId: string
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
    pickupAccessNotes: doc.pickupAccessNotes ?? '',
    pickupHaltverbot: doc.pickupHaltverbot ?? false,
    dropoffLocation: doc.dropoffLocation ?? '',
    dropoffStreetAddress: doc.dropoffStreetAddress ?? doc.dropoffLocation ?? '',
    dropoffApartmentUnit: doc.dropoffApartmentUnit ?? '',
    dropoffFloorLevel: doc.dropoffFloorLevel ?? null,
    dropoffHaltverbot: doc.dropoffHaltverbot ?? false,
    homeType: doc.homeType ?? null,
    floorLevel: doc.pickupFloorLevel ?? null,
    elevatorAvailable: doc.pickupElevator ?? false,
    dropoffElevatorAvailable: doc.dropoffElevator ?? false,
    parkingSituation: doc.pickupParking ?? null,
    dropoffParkingSituation: doc.dropoffParking ?? null,
    packingServiceLevel: doc.packingServiceLevel ?? null,
    packingMaterials: doc.packingMaterials ?? [],
    packingNotes: doc.packingNotes ?? '',
    additionalServices: doc.additionalServices ?? [],
    storageWeeks: doc.storageWeeks ?? 0,
    disposalItems: doc.disposalItems ?? '',
    crewSize: doc.crewSize ?? null,
    vehicleType: doc.vehicleType ?? null,
    arrivalWindow: doc.arrivalWindow ?? null,
    flexibility: doc.flexibility ?? null,
    inventoryCount: doc.totalItemCount ?? 0,
    inventoryItems: doc.inventoryItems ?? null,
    customItems: doc.customItems ?? [],
    contactInfo: {
      fullName: doc.contactFullName ?? '',
      phoneNumber: doc.contactPhone ?? '',
      email: doc.contactEmail ?? '',
      notesForMovers: doc.contactNotes ?? '',
    },
    coverPhotoId: doc.coverPhotoId ?? null,
    galleryPhotoIds: doc.galleryPhotoIds ?? [],
    routeDistanceMeters: doc.routeDistanceMeters ?? null,
    routeDurationSeconds: doc.routeDurationSeconds ?? null,
    paymentMethod: doc.paymentMethod ?? null,
    isBusinessMove: doc.isBusinessMove ?? false,
    companyName: doc.companyName ?? '',
    vatId: doc.vatId ?? '',
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
    pickupAccessNotes, pickupHaltverbot,
    dropoffStreetAddress, dropoffApartmentUnit, dropoffFloorLevel,
    dropoffHaltverbot,
    homeType, floorLevel, elevatorAvailable, dropoffElevatorAvailable,
    parkingSituation, dropoffParkingSituation,
    packingServiceLevel, packingMaterials, packingNotes,
    additionalServices, storageWeeks, disposalItems,
    crewSize, vehicleType, arrivalWindow, flexibility, inventoryCount,
    inventoryItems, customItems,
    contactInfo, totalPrice, bookingCode,
    coverPhotoId, galleryPhotoIds, createdAt,
    routeDistanceMeters, routeDurationSeconds, paymentMethod,
    isBusinessMove, companyName, vatId,
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
    <div className="pb-24 lg:pb-32 pt-4 lg:pt-8">
      {/* Back link */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 mb-6"
      >
        <ArrowLeftIcon className="w-4 h-4" />
        Back to Dashboard
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
          <p className="text-sm text-neutral-500 dark:text-neutral-400">Earnings</p>
          <p className="text-3xl font-bold text-green-600 dark:text-green-400">
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
              unoptimized
              className="object-cover"
            />
          </div>
          {galleryImgs.slice(1, 5).map((img, i) => (
            <div key={i} className="hidden sm:block relative aspect-[4/3]">
              <Image
                src={img}
                alt={`Move photo ${i + 2}`}
                fill
                unoptimized
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
                  {pickupAccessNotes && (
                    <p className="text-sm text-neutral-500">Access notes: {pickupAccessNotes}</p>
                  )}
                  {pickupHaltverbot && (
                    <p className="text-sm text-amber-600 dark:text-amber-400">Haltverbot (no-parking zone) requested</p>
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
                  {dropoffHaltverbot && (
                    <p className="text-sm text-amber-600 dark:text-amber-400">Haltverbot (no-parking zone) requested</p>
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
            <InfoRow icon={CubeIcon} label="Items" value={(() => {
              let parsedInventory: Record<string, number> = {}
              try { if (inventoryItems) parsedInventory = JSON.parse(inventoryItems) } catch {}
              const entries = Object.entries(parsedInventory).filter(([, qty]) => qty > 0)
              let parsedCustom: { name: string; quantity: number }[] = []
              try { parsedCustom = customItems.map((c) => JSON.parse(c)).filter((c) => c.name) } catch {}
              if (entries.length === 0 && parsedCustom.length === 0) return `${inventoryCount} items`
              return (
                <ul className="list-disc list-inside text-sm space-y-0.5">
                  {entries.map(([name, qty]) => (
                    <li key={name}>{formatLabel(name)} &times; {qty}</li>
                  ))}
                  {parsedCustom.map((item, i) => (
                    <li key={`custom-${i}`}>{item.name} &times; {item.quantity}</li>
                  ))}
                </ul>
              )
            })()} />
            <InfoRow icon={TruckIcon} label="Vehicle" value={formatLabel(vehicleType)} />
            <InfoRow icon={UsersIcon} label="Crew" value={crewSize ? `${crewSize} movers` : 'Standard'} />
            {arrivalWindow && (
              <InfoRow icon={CalendarIcon} label="Arrival Window" value={formatLabel(arrivalWindow)} />
            )}
            {flexibility && (
              <InfoRow icon={ClockIcon} label="Flexibility" value={formatLabel(flexibility)} />
            )}
            {routeDistanceMeters != null && routeDistanceMeters > 0 && (
              <InfoRow icon={MapPinIcon} label="Distance" value={`${(routeDistanceMeters / 1000).toFixed(1)} km`} />
            )}
            {routeDurationSeconds != null && routeDurationSeconds > 0 && (
              <InfoRow icon={ClockIcon} label="Est. Duration" value={`${Math.round(routeDurationSeconds / 60)} min`} />
            )}
          </div>

          {/* Services */}
          {(packingServiceLevel || additionalServices.length > 0 || storageWeeks > 0 || disposalItems) && (
            <div className="bg-white dark:bg-neutral-800 rounded-2xl p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
                Services
              </h2>
              {packingServiceLevel && (
                <InfoRow label="Packing Service" value={formatLabel(packingServiceLevel)} />
              )}
              {packingMaterials.length > 0 && (
                <InfoRow label="Packing Materials" value={packingMaterials.map(formatLabel).join(', ')} />
              )}
              {packingNotes && (
                <InfoRow label="Packing Notes" value={packingNotes} />
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
              {disposalItems && (
                <InfoRow label="Disposal Items" value={disposalItems} />
              )}
            </div>
          )}
        </div>

        {/* Right sidebar - Summary & Contact */}
        <div className="space-y-6">
          {/* Earnings Summary */}
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
                <span className="font-semibold text-neutral-900 dark:text-neutral-100">Earnings</span>
                <span className="font-bold text-green-600 dark:text-green-400">&euro;{totalPrice.toFixed(2)}</span>
              </div>
              {paymentMethod && (
                <div className="flex justify-between mt-2">
                  <span className="text-neutral-500 dark:text-neutral-400">Payment</span>
                  <span className="font-medium text-neutral-900 dark:text-neutral-100">{formatLabel(paymentMethod)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Client Contact Info */}
          {contactInfo && (contactInfo.fullName || contactInfo.email || contactInfo.phoneNumber) && (
            <div className="bg-white dark:bg-neutral-800 rounded-2xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
                Client Contact
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
              {contactInfo.notesForMovers && (
                <InfoRow label="Notes for Movers" value={contactInfo.notesForMovers} />
              )}
            </div>
          )}

          {/* Business Info */}
          {isBusinessMove && (
            <div className="bg-white dark:bg-neutral-800 rounded-2xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
                Business Details
              </h3>
              {companyName && <InfoRow label="Company" value={companyName} />}
              {vatId && <InfoRow label="VAT ID" value={vatId} />}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
