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
import { useCallback, useEffect, useRef, useState } from 'react'
import { client } from '@/lib/appwrite'

const APPWRITE_ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || ''
const PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || ''
const BUCKET_MOVE_PHOTOS = process.env.NEXT_PUBLIC_BUCKET_MOVE_PHOTOS || ''

const getPhotoUrl = (fileIdOrUrl: string): string => {
  if (!fileIdOrUrl) return ''
  if (fileIdOrUrl.startsWith('http://') || fileIdOrUrl.startsWith('https://')) return fileIdOrUrl
  if (!APPWRITE_ENDPOINT || !PROJECT_ID || !BUCKET_MOVE_PHOTOS) return ''
  return `${APPWRITE_ENDPOINT}/storage/buckets/${BUCKET_MOVE_PHOTOS}/files/${fileIdOrUrl}/view?project=${PROJECT_ID}`
}

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
  if (['draft', 'booked', 'pending_payment', 'paid', 'mover_assigned'].includes(dbStatus)) return 'pending'
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
    moveCategory: doc.moveCategory ?? null,
    moveType: doc.moveType ?? doc.systemMoveType ?? null,
    moveDate: doc.moveDate ?? null,
    pickupLocation: doc.pickupLocation ?? '',
    pickupStreetAddress: doc.pickupStreetAddress ?? doc.pickupLocation ?? '',
    pickupApartmentUnit: doc.pickupApartmentUnit ?? '',
    pickupAccessNotes: doc.pickupAccessNotes ?? '',
    dropoffLocation: doc.dropoffLocation ?? '',
    dropoffStreetAddress: doc.dropoffStreetAddress ?? doc.dropoffLocation ?? '',
    dropoffApartmentUnit: doc.dropoffApartmentUnit ?? '',
    dropoffFloorLevel: doc.dropoffFloorLevel ?? null,
    homeType: doc.homeType ?? null,
    floorLevel: doc.pickupFloorLevel ?? null,
    elevatorAvailable: doc.pickupElevator ?? false,
    dropoffElevatorAvailable: doc.dropoffElevator ?? false,
    parkingSituation: doc.pickupParking ?? null,
    dropoffParkingSituation: doc.dropoffParking ?? null,
    pickupHaltverbot: doc.pickupHaltverbot ?? false,
    dropoffHaltverbot: doc.dropoffHaltverbot ?? false,
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
      isBusinessMove: doc.isBusinessMove ?? false,
      companyName: doc.companyName ?? '',
      vatId: doc.vatId ?? '',
    },
    coverPhotoId: doc.coverPhotoId ?? null,
    galleryPhotoIds: doc.galleryPhotoIds ?? [],
    routeDistanceMeters: doc.routeDistanceMeters ?? null,
    routeDurationSeconds: doc.routeDurationSeconds ?? null,
    paymentMethod: doc.paymentMethod ?? null,
    isBusinessMove: doc.isBusinessMove ?? false,
    companyName: doc.companyName ?? '',
    vatId: doc.vatId ?? '',
    estimatedPrice: doc.estimatedPrice ?? null,
    finalPrice: doc.finalPrice ?? null,
  }
}

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || ''
const MOVES_COLLECTION = process.env.NEXT_PUBLIC_COLLECTION_MOVES || ''

// ─── Browser notification helpers ────────────────────────
function showBrowserNotification(title: string, body: string) {
  if (typeof window === 'undefined' || !('Notification' in window)) return
  if (Notification.permission !== 'granted') return
  try {
    new Notification(title, {
      body,
      icon: '/favicon.ico',
      tag: 'picklt-move-details',
      renotify: true,
    } as NotificationOptions)
  } catch { /* mobile fallback */ }
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

  // Scheduled move tracking state
  const [rawStatus, setRawStatus] = useState<string>('')
  const [moveDocId, setMoveDocId] = useState<string | null>(null)
  const [moveCategory, setMoveCategory] = useState<string | null>(null)
  const processedEvents = useRef<Set<string>>(new Set())

  // Reschedule / Cancel state
  const [showReschedule, setShowReschedule] = useState(false)
  const [rescheduleDate, setRescheduleDate] = useState('')
  const [rescheduleWindow, setRescheduleWindow] = useState('')
  const [rescheduleLoading, setRescheduleLoading] = useState(false)
  const [cancelLoading, setCancelLoading] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

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
      if (data.move) {
        setDbMove(docToStoredMove(data.move))
        setRawStatus(data.move.rawStatus ?? data.move.status ?? '')
        setMoveDocId(data.move.$id ?? data.move.id ?? null)
        setMoveCategory(data.move.moveCategory ?? null)
      } else {
        setError('not_found')
      }
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

  // ── Request browser notification permission ───────────────
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  // ── Realtime subscription for move status changes ─────────
  useEffect(() => {
    if (!DATABASE_ID || !MOVES_COLLECTION || !moveDocId) return

    const channel = `databases.${DATABASE_ID}.collections.${MOVES_COLLECTION}.documents.${moveDocId}`
    const unsubscribe = client.subscribe(channel, (event) => {
      const payload = event.payload as Record<string, unknown>
      if (!payload) return

      const eventKey = `${payload.$id}-${payload.status}`
      if (processedEvents.current.has(eventKey)) return
      processedEvents.current.add(eventKey)

      const newStatus = payload.status as string
      setRawStatus(newStatus)
      setDbMove((prev) => prev ? { ...prev, status: mapDbStatus(newStatus) } : prev)

      // Check if a mover got assigned
      const newMoverProfileId =
        typeof payload.moverProfileId === 'string'
          ? payload.moverProfileId
          : (payload.moverProfileId as Record<string, string>)?.$id || null

      // Notify client of key status changes
      if (newStatus === 'mover_accepted' && newMoverProfileId) {
        showBrowserNotification(
          'Mover Accepted Your Move! ✅',
          'A mover has accepted your scheduled move. They will start the route soon.',
        )
        // Re-fetch to get mover info
        fetchFromDb()
      } else if (newStatus === 'mover_en_route') {
        showBrowserNotification(
          'Mover is On the Way! 🚚',
          'Your mover is heading to the pickup location.',
        )
      } else if (newStatus === 'mover_arrived') {
        showBrowserNotification(
          'Mover Has Arrived! 🚛',
          'Your mover has arrived at the pickup location. Please meet them.',
        )
      } else if (newStatus === 'loading') {
        showBrowserNotification(
          'Loading Started 📦',
          'Your mover has started loading your items.',
        )
      } else if (newStatus === 'in_transit') {
        showBrowserNotification(
          'On the Move! 🛣️',
          'Your items are being transported to the destination.',
        )
      } else if (newStatus === 'arrived_destination') {
        showBrowserNotification(
          'Arrived at Destination! 🏠',
          'Your mover has arrived at the drop-off location.',
        )
      } else if (newStatus === 'completed') {
        showBrowserNotification(
          'Move Completed! ✅',
          'Your move has been completed successfully.',
        )
      } else if ((newStatus === 'draft' || newStatus === 'booked') && !newMoverProfileId) {
        showBrowserNotification(
          'Mover Withdrawn',
          'The mover has withdrawn from your move. It is now available for other movers.',
        )
        setMoverInfo(null)
      }
    })

    return () => unsubscribe()
  }, [moveDocId, fetchFromDb])

  const move = contextMove || dbMove

  // Determine if the move is in an active phase (trackable)
  const activeStatuses = ['mover_en_route', 'mover_arrived', 'loading', 'in_transit', 'arrived_destination', 'unloading', 'awaiting_payment']
  const isActiveMove = activeStatuses.includes(rawStatus)
  const hasMoverAssigned = !!moverInfo

  const handleTrackLiveMove = () => {
    if (!moveDocId) return
    sessionStorage.setItem('activeMoveId', moveDocId)
    router.push('/instant-move')
  }

  const canReschedule = ['draft', 'booked'].includes(rawStatus)
  const canCancel = ['draft', 'booked', 'pending_payment', 'paid', 'mover_assigned', 'mover_accepted'].includes(rawStatus)

  const handleReschedule = async () => {
    if (!moveDocId || !rescheduleDate) return
    setRescheduleLoading(true)
    setActionError(null)
    try {
      const res = await fetch('/api/moves/reschedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          moveId: moveDocId,
          moveDate: rescheduleDate,
          arrivalWindow: rescheduleWindow || undefined,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setActionError(data.error || 'Failed to reschedule')
        return
      }
      setShowReschedule(false)
      setRescheduleDate('')
      setRescheduleWindow('')
      fetchFromDb()
    } catch {
      setActionError('Failed to reschedule. Please try again.')
    } finally {
      setRescheduleLoading(false)
    }
  }

  const handleCancel = async () => {
    if (!moveDocId) return
    if (!window.confirm('Are you sure you want to cancel this move? This cannot be undone.')) return
    setCancelLoading(true)
    setActionError(null)
    try {
      const res = await fetch('/api/moves/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ moveId: moveDocId }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setActionError(data.error || 'Failed to cancel')
        return
      }
      fetchFromDb()
    } catch {
      setActionError('Failed to cancel. Please try again.')
    } finally {
      setCancelLoading(false)
    }
  }

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
    pickupAccessNotes,
    pickupHaltverbot,
    dropoffStreetAddress,
    dropoffApartmentUnit,
    dropoffFloorLevel,
    dropoffHaltverbot,
    dropoffLocation,
    homeType,
    floorLevel,
    elevatorAvailable,
    dropoffElevatorAvailable,
    parkingSituation,
    dropoffParkingSituation,
    packingServiceLevel,
    packingMaterials,
    packingNotes,
    additionalServices,
    storageWeeks,
    disposalItems,
    crewSize,
    vehicleType,
    arrivalWindow,
    flexibility,
    inventoryCount,
    inventoryItems,
    customItems,
    contactInfo,
    totalPrice,
    bookingCode,
    coverPhotoId,
    galleryPhotoIds,
    createdAt,
    routeDistanceMeters,
    routeDurationSeconds,
    paymentMethod,
    isBusinessMove,
    companyName,
    vatId,
    estimatedPrice,
    finalPrice,
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
              try { parsedCustom = (customItems ?? []).map((c) => typeof c === 'string' ? JSON.parse(c) : c).filter((c: any) => c.name) } catch {}
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
              {packingMaterials && packingMaterials.length > 0 && (
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
              {paymentMethod && (
                <div className="flex justify-between mt-2">
                  <span className="text-neutral-500 dark:text-neutral-400">Payment</span>
                  <span className="font-medium text-neutral-900 dark:text-neutral-100">{formatLabel(paymentMethod)}</span>
                </div>
              )}
            </div>

            {/* ── Live Tracking / Status Actions ─────────────── */}
            {isActiveMove && hasMoverAssigned && (
              <div className="mt-6">
                <button
                  onClick={handleTrackLiveMove}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-xl transition-colors"
                >
                  <TruckIcon className="w-5 h-5" />
                  Track Live Move
                </button>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 text-center mt-2">
                  Your mover is active — track progress in real time
                </p>
              </div>
            )}

            {/* Mover accepted but not yet en_route */}
            {rawStatus === 'mover_accepted' && hasMoverAssigned && (
              <div className="mt-6 bg-green-50 dark:bg-green-900/20 rounded-xl p-4 border border-green-200 dark:border-green-800">
                <p className="text-sm text-green-700 dark:text-green-300 font-medium">
                  A mover has accepted your move! They will start the route soon.
                </p>
              </div>
            )}

            {/* Waiting for mover assignment */}
            {moveCategory === 'scheduled' && !hasMoverAssigned && ['draft', 'booked', 'paid'].includes(rawStatus) && (
              <div className="mt-6 bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 border border-amber-200 dark:border-amber-800">
                <p className="text-sm text-amber-700 dark:text-amber-300 font-medium">
                  Waiting for a mover to accept your move...
                </p>
              </div>
            )}

            {/* ── Reschedule / Cancel Actions ─────────────── */}
            {(canReschedule || canCancel) && (
              <div className="mt-6 space-y-3">
                {actionError && (
                  <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-3 border border-red-200 dark:border-red-800">
                    <p className="text-sm text-red-700 dark:text-red-300">{actionError}</p>
                  </div>
                )}

                {canReschedule && !showReschedule && (
                  <button
                    onClick={() => setShowReschedule(true)}
                    className="w-full flex items-center justify-center gap-2 bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600 text-neutral-900 dark:text-neutral-100 font-semibold py-3 px-4 rounded-xl transition-colors"
                  >
                    <CalendarIcon className="w-5 h-5" />
                    Reschedule Move
                  </button>
                )}

                {showReschedule && (
                  <div className="bg-neutral-50 dark:bg-neutral-900 rounded-xl p-4 border border-neutral-200 dark:border-neutral-700 space-y-3">
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                      New Date &amp; Time
                      <input
                        type="datetime-local"
                        value={rescheduleDate}
                        onChange={(e) => setRescheduleDate(e.target.value)}
                        min={new Date().toISOString().slice(0, 16)}
                        className="mt-1 block w-full rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                      Arrival Window (optional)
                      <select
                        value={rescheduleWindow}
                        onChange={(e) => setRescheduleWindow(e.target.value)}
                        className="mt-1 block w-full rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-3 py-2 text-sm"
                      >
                        <option value="">Keep current</option>
                        <option value="morning">Morning (8am-12pm)</option>
                        <option value="afternoon">Afternoon (12pm-5pm)</option>
                        <option value="evening">Evening (5pm-9pm)</option>
                      </select>
                    </label>
                    <div className="flex gap-2">
                      <button
                        onClick={handleReschedule}
                        disabled={rescheduleLoading || !rescheduleDate}
                        className="flex-1 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm"
                      >
                        {rescheduleLoading ? 'Saving...' : 'Confirm'}
                      </button>
                      <button
                        onClick={() => { setShowReschedule(false); setActionError(null) }}
                        className="flex-1 bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600 text-neutral-900 dark:text-neutral-100 font-semibold py-2 px-4 rounded-lg transition-colors text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {canCancel && (
                  <button
                    onClick={handleCancel}
                    disabled={cancelLoading}
                    className="w-full flex items-center justify-center gap-2 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 font-semibold py-3 px-4 rounded-xl transition-colors border border-red-200 dark:border-red-800"
                  >
                    {cancelLoading ? 'Cancelling...' : 'Cancel Move'}
                  </button>
                )}
              </div>
            )}
          </div>

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
              <InfoRow icon={UsersIcon} label="Crew Size" value={`${moverInfo.crewSize + 1}`} />

              {/* Experience */}
              {moverInfo.yearsExperience > 0 && (
                <InfoRow icon={ClockIcon} label="Experience" value={`${moverInfo.yearsExperience} year${moverInfo.yearsExperience !== 1 ? 's' : ''}`} />
              )}

              {/* Languages */}
              {moverInfo.languages.length > 0 && (
                <InfoRow icon={LanguageIcon} label="Languages" value={moverInfo.languages.join(', ')} />
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
              {contactInfo.notesForMovers && (
                <InfoRow label="Notes for Movers" value={contactInfo.notesForMovers} />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
