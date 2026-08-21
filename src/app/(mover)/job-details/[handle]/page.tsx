'use client'

import { Badge } from '@/shared/Badge'
import { isMoveStartable } from '@/lib/schedule-timing'
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
  XCircleIcon,
  PlayIcon,
} from '@heroicons/react/24/outline'
import Image from 'next/image'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '@/context/auth'
import { client } from '@/lib/appwrite'
import {
  formatRequestedAt,
  parseInventoryLines,
  useInventoryNames,
} from '@/lib/inventory-labels'
import { formatDateWith, formatMoney } from '@/lib/format'
import { homeTypeLabel, moveSubtitle, moveTypeLabel } from '@/lib/move-subtitle'
import { Trans, useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { additionalServiceLabel, arrivalWindowLabel, dropoffParkingLabel, flexibilityLabel, floorLevelLabel, joinLabels, packingLevelLabel, packingMaterialLabel, parkingLabel, paymentMethodLabel, vehicleTypeLabel } from '@/lib/enum-labels'

const APPWRITE_ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || ''
const PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || ''
const BUCKET_MOVE_PHOTOS = process.env.NEXT_PUBLIC_BUCKET_MOVE_PHOTOS || ''

const getPhotoUrl = (fileIdOrUrl: string): string => {
  if (!fileIdOrUrl) return ''
  if (fileIdOrUrl.startsWith('http://') || fileIdOrUrl.startsWith('https://')) return fileIdOrUrl
  if (!APPWRITE_ENDPOINT || !PROJECT_ID || !BUCKET_MOVE_PHOTOS) return ''
  return `${APPWRITE_ENDPOINT}/storage/buckets/${BUCKET_MOVE_PHOTOS}/files/${fileIdOrUrl}/view?project=${PROJECT_ID}`
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
      tag: 'picklt-job-details',
      renotify: true,
    } as NotificationOptions)
  } catch { /* mobile fallback */ }
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
// `t` is threaded through rather than captured at module scope: a module-level
// formatter would freeze at the boot language and never follow a switch. The
// enum labels on this page come from `lib/enum-labels.ts` for the same reason.
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

const getStatusBadgeColor = (status: MoveStatus): 'green' | 'yellow' | 'red' | 'blue' => {
  switch (status) {
    case 'completed': return 'green'
    case 'in_progress': return 'blue'
    case 'pending': return 'yellow'
    case 'cancelled': return 'red'
    default: return 'yellow'
  }
}

const getStatusLabel = (status: MoveStatus, t: TFunction): string => {
  switch (status) {
    case 'completed': return t('moves:status.completed.label')
    case 'in_progress': return t('moves:status.inProgress.label')
    case 'pending': return t('moves:status.pending.label')
    case 'cancelled': return t('moves:status.cancelled.label')
    default: return t('moves:status.unknown.label')
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
  const { t } = useTranslation()
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const handle = params.handle as string

  const [move, setMove] = useState<MoveData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Scheduled-move action state
  const [rawStatus, setRawStatus] = useState<string>('')
  const [moveCategory, setMoveCategory] = useState<string | null>(null)
  // Admin catalog names, so persisted items render the wording the client saw.
  const inventoryNames = useInventoryNames()
  const [isAssignedMover, setIsAssignedMover] = useState(false)
  const [moveDocId, setMoveDocId] = useState<string | null>(null)
  const [moverProfileId, setMoverProfileId] = useState<string | null>(null)
  const [isAccepting, setIsAccepting] = useState(false)
  const [isWithdrawing, setIsWithdrawing] = useState(false)
  const [isStartingRoute, setIsStartingRoute] = useState(false)
  const [showWithdrawConfirm, setShowWithdrawConfirm] = useState(false)
  const processedEvents = useRef<Set<string>>(new Set())

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
      if (data.move) {
        setMove(docToMoveData(data.move))
        setRawStatus(data.move.rawStatus ?? data.move.status ?? '')
        setMoveCategory(data.move.moveCategory ?? null)
        setIsAssignedMover(data.isAssignedMover ?? false)
        setMoveDocId(data.move.$id ?? data.move.id ?? null)
        setMoverProfileId(data.move.moverProfileId ?? null)
      } else {
        setError('not_found')
      }
    } catch {
      setError('fetch_error')
    } finally {
      setIsLoading(false)
    }
  }, [handle])

  useEffect(() => { fetchMove() }, [fetchMove])

  // ── Request browser notification permission ───────────────
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  // ── Realtime subscription for move document updates ───────
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
      setMove((prev) => prev ? { ...prev, status: mapDbStatus(newStatus) } : prev)

      // Check if another mover got assigned (or we got unassigned)
      const newMoverProfileId =
        typeof payload.moverProfileId === 'string'
          ? payload.moverProfileId
          : (payload.moverProfileId as Record<string, string>)?.$id || null
      setMoverProfileId(newMoverProfileId)

      const myProfileId = user?.moverDetails?.profileId || null
      setIsAssignedMover(!!newMoverProfileId && newMoverProfileId === myProfileId)

      // Notify on key status changes
      if (newStatus === 'cancelled_by_client') {
        showBrowserNotification(
          t('moves:notify.cancelledByClient.title'),
          t('moves:notify.cancelledByClient.body'),
        )
      } else if ((newStatus === 'draft' || newStatus === 'booked') && !newMoverProfileId) {
        showBrowserNotification(
          t('moves:notify.moverWithdrawn.title'),
          t('moves:notify.moverWithdrawn.body'),
        )
      }
    })

    return () => unsubscribe()
  }, [moveDocId, user?.moverDetails?.profileId, t])

  // ── Accept scheduled move ─────────────────────────────────
  const handleAccept = async () => {
    if (!moveDocId) return
    setIsAccepting(true)
    try {
      const res = await fetch('/api/mover/accept-scheduled-move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ moveId: moveDocId }),
      })
      if (!res.ok) {
        const data = await res.json()
        alert(data.error || t('errors:mover.acceptFailed.error'))
        return
      }
      setIsAssignedMover(true)
      setRawStatus('mover_accepted')
      setMoverProfileId(user?.moverDetails?.profileId || null)
      setMove((prev) => prev ? { ...prev, status: mapDbStatus('mover_accepted') } : prev)
    } catch {
      alert(t('errors:mover.acceptRetry'))
    } finally {
      setIsAccepting(false)
    }
  }

  // ── Withdraw from scheduled move ──────────────────────────
  const handleWithdraw = async () => {
    if (!moveDocId) return
    setIsWithdrawing(true)
    try {
      const res = await fetch('/api/mover/withdraw-scheduled-move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ moveId: moveDocId }),
      })
      if (!res.ok) {
        const data = await res.json()
        alert(data.error || t('errors:mover.withdrawFailed'))
        return
      }
      setIsAssignedMover(false)
      setRawStatus('draft')
      setMoverProfileId(null)
      setShowWithdrawConfirm(false)
      setMove((prev) => prev ? { ...prev, status: mapDbStatus('draft') } : prev)
    } catch {
      alert(t('errors:mover.withdrawRetry'))
    } finally {
      setIsWithdrawing(false)
    }
  }

  // ── Start route (mover_accepted → mover_en_route) ────────
  const handleStartRoute = async () => {
    if (!moveDocId) return
    setIsStartingRoute(true)
    try {
      const res = await fetch('/api/mover/update-move-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ moveId: moveDocId, status: 'mover_en_route' }),
      })
      if (!res.ok) {
        const data = await res.json()
        alert(data.error || t('errors:mover.startRouteFailed'))
        return
      }
      // Navigate to active-move page — the move is now active
      router.push('/active-move')
    } catch {
      alert(t('errors:mover.startRouteRetry'))
    } finally {
      setIsStartingRoute(false)
    }
  }

  // ── Derive action button state ────────────────────────────
  const isScheduled = moveCategory === 'scheduled'
  // Instant only when explicitly so — rows predating `moveCategory` are all
  // scheduled, and treating them as instant would hide fields they do carry.
  const isInstant = moveCategory === 'instant'
  const isUnassigned = !moverProfileId
  const canAccept = isScheduled && isUnassigned && ['draft', 'booked', 'paid', 'pending_payment'].includes(rawStatus)
  const canWithdraw = isScheduled && isAssignedMover && ['mover_accepted', 'mover_assigned'].includes(rawStatus)

  // T-5-minute window on moveDate + arrivalWindow (shared with the mobile
  // apps and the active-move auto-transition; T6 parity). Never-block: missing
  // timing data keeps the move startable.
  const startable = isMoveStartable(
    {
      moveDate: move?.moveDate as string | undefined,
      arrivalWindow: move?.arrivalWindow as string | undefined,
    },
    Date.now(),
  )

  const canStartRoute = isScheduled && isAssignedMover && rawStatus === 'mover_accepted' && startable
  const isFutureDateMove = isScheduled && isAssignedMover && rawStatus === 'mover_accepted' && !startable
  const isActivePhase = ['mover_en_route', 'mover_arrived', 'loading', 'in_transit', 'arrived_destination', 'unloading', 'awaiting_payment'].includes(rawStatus)

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
            {t('errors:move.notFound')}
          </h2>
          <p className="text-neutral-500 dark:text-neutral-400">
            {t('web:mover.jobDetails.notFound.subtitle')}
          </p>
          <Link
            href="/dashboard"
            className="mt-4 inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 font-medium"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            {t('web:mover.backToDashboard.cta')}
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

  // Item labels come from the admin catalog, not from humanising the id — the
  // client picked "Sofa (2-seater)", not "Sofa 2seater".
  const inventoryLines = parseInventoryLines(inventoryItems, customItems, inventoryNames)

  const pickupDisplay = pickupStreetAddress || pickupLocation || t('booking:field.pickupLocation.label')
  const dropoffDisplay = dropoffStreetAddress || t('booking:field.dropoffLocation.label')

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
    <div className="p-8 lg:p-24">
      {/* Back link */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 mb-6"
      >
        <ArrowLeftIcon className="w-4 h-4" />
        {t('web:mover.backToDashboard.cta')}
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-8">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <Badge color={getStatusBadgeColor(status)}>
              {getStatusLabel(status, t)}
            </Badge>
            <span className="text-sm text-neutral-500 dark:text-neutral-400">
              #{bookingCode}
            </span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-semibold text-neutral-900 dark:text-neutral-100">
            {pickupDisplay.split(',')[0]} &rarr; {dropoffDisplay.split(',')[0]}
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-1">
            {moveSubtitle(t, moveType, null, formatDate(moveDate, t))}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">{t('web:mover.earnings.label')}</p>
          <p className="text-3xl font-bold text-green-600 dark:text-green-400">
            {formatMoney(totalPrice)}
          </p>
        </div>
      </div>

      {/* Gallery */}
      {galleryImgs.length > 0 && (
        <div className="grid grid-cols-4 gap-2 rounded-2xl overflow-hidden mb-10">
          <div className="col-span-4 sm:col-span-2 sm:row-span-2 relative aspect-[4/3]">
            <Image
              src={galleryImgs[0]}
              alt={t('booking:photos.item.a11y')}
              fill
              unoptimized
              className="object-cover"
            />
          </div>
          {galleryImgs.slice(1, 5).map((img, i) => (
            <div key={i} className="hidden sm:block relative aspect-[4/3]">
              <Image
                src={img}
                alt={t('booking:photos.itemIndexed.a11y', { index: i + 2 })}
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
              {t('booking:locations.title')}
            </h2>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="mt-1 w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                  <MapPinIcon className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">{t('booking:field.pickup.label')}</p>
                  <p className="font-medium text-neutral-900 dark:text-neutral-100">
                    {pickupDisplay}
                  </p>
                  {pickupApartmentUnit && (
                    <p className="text-sm text-neutral-500">{t('booking:field.apartmentUnit.value', { unit: pickupApartmentUnit })}</p>
                  )}
                  {floorLevel && (
                    <p className="text-sm text-neutral-500">{t('booking:field.floor.value', { floor: floorLevelLabel(t, floorLevel) })}</p>
                  )}
                  {elevatorAvailable && (
                    <p className="text-sm text-green-600 flex items-center gap-1">
                      <CheckCircleIcon className="w-3.5 h-3.5" /> {t('booking:field.elevatorAvailable.label')}
                    </p>
                  )}
                  {parkingSituation && (
                    <p className="text-sm text-neutral-500">{t('booking:field.parking.value', { parking: parkingLabel(t, parkingSituation) })}</p>
                  )}
                  {pickupAccessNotes && (
                    <p className="text-sm text-neutral-500">{t('booking:field.accessNotes.value', { notes: pickupAccessNotes })}</p>
                  )}
                  {pickupHaltverbot && (
                    <p className="text-sm text-amber-600 dark:text-amber-400">{t('booking:haltverbot.requested.label')}</p>
                  )}
                </div>
              </div>

              <div className="ml-4 border-l-2 border-dashed border-neutral-200 dark:border-neutral-700 h-4" />

              <div className="flex items-start gap-3">
                <div className="mt-1 w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                  <MapPinIcon className="w-4 h-4 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">{t('booking:field.dropoff.label')}</p>
                  <p className="font-medium text-neutral-900 dark:text-neutral-100">
                    {dropoffDisplay}
                  </p>
                  {dropoffApartmentUnit && (
                    <p className="text-sm text-neutral-500">{t('booking:field.apartmentUnit.value', { unit: dropoffApartmentUnit })}</p>
                  )}
                  {dropoffFloorLevel && (
                    <p className="text-sm text-neutral-500">{t('booking:field.floor.value', { floor: floorLevelLabel(t, dropoffFloorLevel) })}</p>
                  )}
                  {dropoffElevatorAvailable && (
                    <p className="text-sm text-green-600 flex items-center gap-1">
                      <CheckCircleIcon className="w-3.5 h-3.5" /> {t('booking:field.elevatorAvailable.label')}
                    </p>
                  )}
                  {dropoffParkingSituation && (
                    <p className="text-sm text-neutral-500">{t('booking:field.parking.value', { parking: dropoffParkingLabel(t, dropoffParkingSituation) })}</p>
                  )}
                  {dropoffHaltverbot && (
                    <p className="text-sm text-amber-600 dark:text-amber-400">{t('booking:haltverbot.requested.label')}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Move Details */}
          <div className="bg-white dark:bg-neutral-800 rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
              {t('moves:detail.moveDetails.title')}
            </h2>
            <InfoRow icon={TruckIcon} label={t('booking:field.moveType.label')} value={moveTypeLabel(t, moveType)} />
            {/* Instant starts immediately and carries no moveDate — when the job
                was requested is what a mover actually needs to judge it. */}
            {isInstant ? (
              <InfoRow icon={CalendarIcon} label={t('moves:detail.requestedAt.label')} value={formatRequestedAt(createdAt) ?? '—'} />
            ) : (
              <InfoRow icon={CalendarIcon} label={t('booking:field.moveDate.label')} value={formatDate(moveDate, t)} />
            )}
            {/* Home type, vehicle and crew are scheduled-wizard questions — the
                instant client is never asked, so there is nothing to report. */}
            {!isInstant && (
              <InfoRow icon={HomeIcon} label={t('booking:field.homeType.label')} value={homeTypeLabel(t, homeType)} />
            )}
            <InfoRow icon={CubeIcon} label={t('booking:field.items.label')} value={(() => {
              if (inventoryLines.length === 0) return t('moves:itemCount', { count: inventoryCount })
              return (
                <ul className="list-disc list-inside text-sm space-y-0.5">
                  {inventoryLines.map((line, i) => (
                    <li key={`${line.custom ? 'custom' : 'item'}-${i}-${line.label}`}>
                      {t('moves:detail.itemLineReversed.label', { label: line.label, qty: line.quantity })}
                    </li>
                  ))}
                </ul>
              )
            })()} />
            {!isInstant && (
              <InfoRow icon={TruckIcon} label={t('booking:field.vehicle.label')} value={vehicleTypeLabel(t, vehicleType)} />
            )}
            {!isInstant && (
              <InfoRow icon={UsersIcon} label={t('booking:field.crew.label')} value={crewSize ? t('web:mover.crewSize.label', { crew: crewSize }) : t('common:value.standard.label')} />
            )}
            {arrivalWindow && (
              <InfoRow icon={CalendarIcon} label={t('booking:field.arrivalWindow.label')} value={arrivalWindowLabel(t, arrivalWindow)} />
            )}
            {flexibility && (
              <InfoRow icon={ClockIcon} label={t('booking:field.flexibility.label')} value={flexibilityLabel(t, flexibility)} />
            )}
            {routeDistanceMeters != null && routeDistanceMeters > 0 && (
              <InfoRow icon={MapPinIcon} label={t('booking:field.distance.label')} value={`${(routeDistanceMeters / 1000).toFixed(1)} km`} />
            )}
            {routeDurationSeconds != null && routeDurationSeconds > 0 && (
              <InfoRow icon={ClockIcon} label={t('booking:field.estimatedDuration.label')} value={`${Math.round(routeDurationSeconds / 60)} min`} />
            )}
          </div>

          {/* Services */}
          {(packingServiceLevel || additionalServices.length > 0 || storageWeeks > 0 || disposalItems) && (
            <div className="bg-white dark:bg-neutral-800 rounded-2xl p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
                {t('booking:services.title')}
              </h2>
              {packingServiceLevel && (
                <InfoRow label={t('booking:field.packingService.label')} value={packingLevelLabel(t, packingServiceLevel)} />
              )}
              {packingMaterials.length > 0 && (
                <InfoRow label={t('booking:field.packingMaterials.label')} value={joinLabels(packingMaterials.map((v) => packingMaterialLabel(t, v)))} />
              )}
              {packingNotes && (
                <InfoRow label={t('booking:field.packingNotes.label')} value={packingNotes} />
              )}
              {additionalServices.length > 0 && (
                <InfoRow
                  label={t('booking:field.additionalServices.label')}
                  value={joinLabels(additionalServices.map((v) => additionalServiceLabel(t, v)))}
                />
              )}
              {storageWeeks > 0 && (
                <InfoRow label={t('booking:pricing.storage.label')} value={t('booking:storageWeekCount', { count: storageWeeks })} />
              )}
              {disposalItems && (
                <InfoRow label={t('booking:field.disposalItems.label')} value={disposalItems} />
              )}
            </div>
          )}
        </div>

        {/* Right sidebar - Summary & Contact */}
        <div className="space-y-6">
          {/* Earnings Summary */}
          <div className="bg-white dark:bg-neutral-800 rounded-2xl p-6 shadow-sm sticky top-24">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
              {t('moves:summary.title')}
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-neutral-500 dark:text-neutral-400">{t('moves:booking.code.label')}</span>
                <span className="font-medium text-neutral-900 dark:text-neutral-100">#{bookingCode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500 dark:text-neutral-400">{t('moves:detail.status.label')}</span>
                <Badge color={getStatusBadgeColor(status)} className="text-xs">
                  {getStatusLabel(status, t)}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500 dark:text-neutral-400">{t('moves:createdAt.label')}</span>
                <span className="font-medium text-neutral-900 dark:text-neutral-100">
                  {formatDate(createdAt, t)}
                </span>
              </div>
              <div className="my-4 border-t border-neutral-100 dark:border-neutral-700" />
              <div className="flex justify-between text-base">
                <span className="font-semibold text-neutral-900 dark:text-neutral-100">{t('web:mover.earnings.label')}</span>
                <span className="font-bold text-green-600 dark:text-green-400">{formatMoney(totalPrice)}</span>
              </div>
              {paymentMethod && (
                <div className="flex justify-between mt-2">
                  <span className="text-neutral-500 dark:text-neutral-400">{t('booking:payment.section.title')}</span>
                  <span className="font-medium text-neutral-900 dark:text-neutral-100">{paymentMethodLabel(t, paymentMethod)}</span>
                </div>
              )}
            </div>

            {/* ── Action Buttons ─────────────────────────────── */}
            {isScheduled && (
              <div className="mt-6 space-y-3">
                {/* Accept Move */}
                {canAccept && (
                  <button
                    onClick={handleAccept}
                    disabled={isAccepting}
                    className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold py-3 px-4 rounded-xl transition-colors"
                  >
                    <CheckCircleIcon className="w-5 h-5" />
                    {isAccepting ? t('common:state.accepting.label') : t('web:mover.acceptMove.cta')}
                  </button>
                )}

                {/* Start Route (mover_accepted → mover_en_route) */}
                {canStartRoute && (
                  <button
                    onClick={handleStartRoute}
                    disabled={isStartingRoute}
                    className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 px-4 rounded-xl transition-colors"
                  >
                    <PlayIcon className="w-5 h-5" />
                    {isStartingRoute ? t('common:state.starting.label') : t('web:mover.startRoute.cta')}
                  </button>
                )}

                {/* Future-dated move — Start Route not available yet */}
                {isFutureDateMove && (
                  <div className="w-full rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
                    <Trans
                      i18nKey="web:mover.notStartable.body"
                      values={{
                        when:
                          formatDateWith(move?.moveDate as string, {
                            weekday: 'short',
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          }) + (move?.arrivalWindow ? ` · ${move.arrivalWindow}` : ''),
                      }}
                      components={[
                        <span className="font-semibold" key="0" />,
                        <span className="font-semibold" key="1" />,
                      ]}
                    />
                  </div>
                )}

                {/* Go to Active Move */}
                {isAssignedMover && isActivePhase && (
                  <button
                    onClick={() => router.push('/active-move')}
                    className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-xl transition-colors"
                  >
                    <TruckIcon className="w-5 h-5" />
                    {t('web:mover.goToActive.cta')}
                  </button>
                )}

                {/* Withdraw */}
                {canWithdraw && (
                  <>
                    {!showWithdrawConfirm ? (
                      <button
                        onClick={() => setShowWithdrawConfirm(true)}
                        className="w-full flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 font-semibold py-3 px-4 rounded-xl transition-colors border border-red-200 dark:border-red-800"
                      >
                        <XCircleIcon className="w-5 h-5" />
                        {t('web:mover.withdraw.cta')}
                      </button>
                    ) : (
                      <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 border border-red-200 dark:border-red-800">
                        <p className="text-sm text-red-700 dark:text-red-300 mb-3">
                          {t('web:mover.withdrawConfirm.body')}
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={handleWithdraw}
                            disabled={isWithdrawing}
                            className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-semibold py-2 px-3 rounded-lg text-sm transition-colors"
                          >
                            {isWithdrawing ? t('common:state.withdrawing.label') : t('web:mover.withdrawConfirm.cta')}
                          </button>
                          <button
                            onClick={() => setShowWithdrawConfirm(false)}
                            className="flex-1 bg-neutral-200 hover:bg-neutral-300 dark:bg-neutral-700 dark:hover:bg-neutral-600 text-neutral-700 dark:text-neutral-200 font-semibold py-2 px-3 rounded-lg text-sm transition-colors"
                          >
                            {t('common:action.cancel.cta')}
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Status info when assigned but waiting */}
                {isAssignedMover && rawStatus === 'mover_accepted' && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
                    <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">
                      {t('web:mover.accepted.helper')}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Client Contact Info */}
          {contactInfo && (contactInfo.fullName || contactInfo.email || contactInfo.phoneNumber) && (
            <div className="bg-white dark:bg-neutral-800 rounded-2xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
                {t('web:mover.clientContact.title')}
              </h3>
              {contactInfo.fullName && (
                <InfoRow label={t('common:field.name.label')} value={contactInfo.fullName} />
              )}
              {contactInfo.email && (
                <InfoRow label={t('common:field.email.label')} value={contactInfo.email} />
              )}
              {contactInfo.phoneNumber && (
                <InfoRow label={t('common:field.phone.label')} value={contactInfo.phoneNumber} />
              )}
              {contactInfo.notesForMovers && (
                <InfoRow label={t('booking:field.notesForMovers.label')} value={contactInfo.notesForMovers} />
              )}
            </div>
          )}

          {/* Business Info */}
          {isBusinessMove && (
            <div className="bg-white dark:bg-neutral-800 rounded-2xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
                {t('booking:business.title')}
              </h3>
              {companyName && <InfoRow label={t('booking:business.companyName.label')} value={companyName} />}
              {vatId && <InfoRow label={t('booking:business.vatId.label')} value={vatId} />}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
