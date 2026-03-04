'use client'

import { useMoveSearch, StoredMove, MoveStatus } from '@/context/moveSearch'
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
  StarIcon,
  PhoneIcon,
  LanguageIcon,
  ShieldCheckIcon,
  ClockIcon,
} from '@heroicons/react/24/outline'
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid'
import Image from 'next/image'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'

// ─── Mover info shape from enriched API ──────────────────
interface MoverInfo {
  id: string
  name: string
  phone: string | null
  profilePhoto: string | null
  rating: number
  totalMoves: number
  vehicleType: string | null
  vehicleBrand: string
  vehicleModel: string
  vehicleName: string
  vehiclePlate: string
  vehicleCapacity: string | null
  crewSize: number
  yearsExperience: number
  languages: string[]
  isVerified: boolean
  baseRate: number
}

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

/** Map raw DB status → display MoveStatus */
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

/** Convert raw DB doc → StoredMove shape */
function docToStoredMove(doc: any): StoredMove {
  return {
    id: doc.$id,
    handle: doc.handle ?? '',
    status: mapDbStatus(doc.status ?? ''),
    createdAt: doc.$createdAt ?? '',
    paidAt: doc.paidAt ?? doc.$createdAt ?? '',
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
    contactInfo: doc.contactInfo ?? { fullName: '', phone: '', email: '' },
    coverPhotoId: doc.coverPhotoId ?? null,
    galleryPhotoIds: doc.galleryPhotoIds ?? [],
  }
}

export default function MoveDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const { getMoveByHandle } = useMoveSearch()

  const handle = params.handle as string

  // Try context first
  const contextMove = getMoveByHandle(handle)

  // DB fetch state
  const [dbMove, setDbMove] = useState<StoredMove | null>(null)
  const [moverInfo, setMoverInfo] = useState<MoverInfo | null>(null)
  const [isLoading, setIsLoading] = useState(!contextMove)
  const [error, setError] = useState<string | null>(null)

  const fetchFromDb = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const res = await fetch(`/api/moves/by-handle/${encodeURIComponent(handle)}`)
      if (!res.ok) {
        if (res.status === 404) { setError('not_found'); return }
        setError('fetch_error'); return
      }
      const data = await res.json()
      if (data.move) setDbMove(docToStoredMove(data.move))
      else setError('not_found')
      if (data.mover) setMoverInfo(data.mover)
    } catch {
      setError('fetch_error')
    } finally {
      setIsLoading(false)
    }
  }, [handle])

  // Only fetch from DB if context doesn't have the move
  useEffect(() => {
    if (!contextMove) fetchFromDb()
  }, [contextMove, fetchFromDb])

  const move = contextMove || dbMove

  if (isLoading) {
    return (
      <div className="container py-16 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    )
  }

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
    coverPhotoId,
    galleryPhotoIds,
    createdAt,
  } = move

  const pickupDisplay = pickupStreetAddress || pickupLocation || 'Pickup location'
  const dropoffDisplay = dropoffStreetAddress || 'Drop-off location'

  const galleryImgs = coverPhotoId
    ? [coverPhotoId, ...galleryPhotoIds]
    : galleryPhotoIds

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

          {/* Assigned Mover */}
          {moverInfo && (
            <div className="bg-white dark:bg-neutral-800 rounded-2xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
                Your Mover
              </h3>
              {/* Mover identity */}
              <div className="flex items-center gap-3 mb-4">
                <div className="relative w-12 h-12 rounded-full overflow-hidden bg-neutral-200 dark:bg-neutral-700 flex-shrink-0">
                  {moverInfo.profilePhoto ? (
                    <Image
                      src={moverInfo.profilePhoto}
                      alt={moverInfo.name}
                      fill
                      unoptimized
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-lg font-semibold text-neutral-500">
                      {moverInfo.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                      {moverInfo.name}
                    </p>
                    {moverInfo.isVerified && (
                      <ShieldCheckIcon className="w-4 h-4 text-green-500 flex-shrink-0" title="Verified mover" />
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-sm text-neutral-500 dark:text-neutral-400">
                    <StarIconSolid className="w-3.5 h-3.5 text-amber-400" />
                    <span>{moverInfo.rating.toFixed(1)}</span>
                    <span className="mx-1">&middot;</span>
                    <span>{moverInfo.totalMoves} moves</span>
                  </div>
                </div>
              </div>

              {/* Vehicle info */}
              {moverInfo.vehicleName && (
                <InfoRow icon={TruckIcon} label="Vehicle" value={
                  <>
                    <span>{moverInfo.vehicleName}</span>
                    {moverInfo.vehiclePlate && (
                      <span className="ml-2 text-xs bg-neutral-100 dark:bg-neutral-700 px-2 py-0.5 rounded font-mono">
                        {moverInfo.vehiclePlate}
                      </span>
                    )}
                  </>
                } />
              )}
              {moverInfo.vehicleType && (
                <InfoRow label="Vehicle Type" value={formatLabel(moverInfo.vehicleType)} />
              )}
              {moverInfo.vehicleCapacity && (
                <InfoRow label="Capacity" value={`${moverInfo.vehicleCapacity} kg`} />
              )}

              {/* Crew */}
              <InfoRow icon={UsersIcon} label="Crew Size" value={`${moverInfo.crewSize} (incl. mover)`} />

              {/* Experience */}
              {moverInfo.yearsExperience > 0 && (
                <InfoRow icon={ClockIcon} label="Experience" value={`${moverInfo.yearsExperience} year${moverInfo.yearsExperience !== 1 ? 's' : ''}`} />
              )}

              {/* Languages */}
              {moverInfo.languages.length > 0 && (
                <InfoRow icon={LanguageIcon} label="Languages" value={moverInfo.languages.join(', ')} />
              )}

              {/* Phone */}
              {moverInfo.phone && (
                <InfoRow icon={PhoneIcon} label="Phone" value={moverInfo.phone} />
              )}
            </div>
          )}

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
