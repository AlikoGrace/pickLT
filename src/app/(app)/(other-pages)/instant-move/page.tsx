'use client'

import MapboxMap, { RouteInfo } from '@/components/MapboxMap'
import MapLocationPicker, { PickedLocation } from '@/components/MapLocationPicker'
import { useMoveSearch, Coordinates } from '@/context/moveSearch'
import { useMoverLocationPolling } from '@/hooks/useMoverLocationPolling'
import { client } from '@/lib/appwrite'
import type { RealtimeResponseEvent, Models } from 'appwrite'
import ButtonPrimary from '@/shared/ButtonPrimary'
import ButtonSecondary from '@/shared/ButtonSecondary'
import Logo from '@/shared/Logo'
import Avatar from '@/shared/Avatar'
import {
  Call02Icon,
  Cancel01Icon,
  CheckmarkCircle02Icon,
  DeliveryTruck01Icon,
  Message01Icon,
  StarIcon,
  UserMultiple02Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState, useRef } from 'react'
import { getMapboxDirections } from '@/utils/mapbox-directions'

// ─── Types ──────────────────────────────────────────────
interface MoverInfo {
  id: string
  name: string
  phone: string | null
  profilePhoto: string | null
  rating: number
  totalMoves: number
  vehicleType: string
  vehicleBrand: string
  vehicleModel: string
  vehicleName: string
  vehiclePlate: string
  crewSize: number
  maxWeight: number
  yearsExperience: number
  languages: string[]
  isVerified: boolean
  baseRate: number
  currentLatitude: number | null
  currentLongitude: number | null
}

interface MoveData {
  $id: string
  handle: string | null
  status: string
  pickupLocation: string | null
  pickupLatitude: number | null
  pickupLongitude: number | null
  dropoffLocation: string | null
  dropoffLatitude: number | null
  dropoffLongitude: number | null
  estimatedPrice: number | null
  totalItemCount: number | null
  coverPhotoId: string | null
  galleryPhotoIds: string[]
  routeDistanceMeters: number | null
  routeDurationSeconds: number | null
  moverProfileId: string | null
}

type MovePhase = 'mover_arriving' | 'mover_arrived' | 'loading' | 'in_transit' | 'arrived'

// ─── Helpers ────────────────────────────────────────────
const formatDistance = (meters: number): string => {
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`
  return `${Math.round(meters)} m`
}

const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.ceil((seconds % 3600) / 60)
  if (hours > 0) return `${hours}h ${minutes}min`
  return `${minutes} min`
}

const InstantMovePage = () => {
  const router = useRouter()
  const { reset } = useMoveSearch()

  // ─── State: move & mover data from DB ─────────────────
  const [moveData, setMoveData] = useState<MoveData | null>(null)
  const [mover, setMover] = useState<MoverInfo | null>(null)
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const moveIdRef = useRef<string | null>(null)

  // ─── Fetch move + mover from database on mount ───────
  useEffect(() => {
    const activeMoveId = sessionStorage.getItem('activeMoveId')
    if (!activeMoveId) {
      router.push('/instant-move/select-mover')
      return
    }
    moveIdRef.current = activeMoveId

    const fetchMoveData = async () => {
      try {
        const res = await fetch(`/api/moves/${activeMoveId}/full`)
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err.error || 'Failed to load move data')
        }
        const data = await res.json()
        setMoveData(data.move as MoveData)
        setMover(data.mover as MoverInfo)
        console.log(data)
      } catch (err) {
        console.error('Failed to fetch move data:', err)
        setLoadError(err instanceof Error ? err.message : 'Failed to load move')
      } finally {
        setIsLoadingData(false)
      }
    }

    fetchMoveData()
  }, [router])

  // Derive coordinates from the move data (from DB) — memoized to prevent
  // new object references from triggering MapboxMap re-renders
  const pickupCoordinates = useMemo<Coordinates | null>(() => {
    if (moveData?.pickupLatitude && moveData?.pickupLongitude) {
      return { latitude: moveData.pickupLatitude, longitude: moveData.pickupLongitude }
    }
    return null
  }, [moveData?.pickupLatitude, moveData?.pickupLongitude])

  const dropoffCoordinates = useMemo<Coordinates | null>(() => {
    if (moveData?.dropoffLatitude && moveData?.dropoffLongitude) {
      return { latitude: moveData.dropoffLatitude, longitude: moveData.dropoffLongitude }
    }
    return null
  }, [moveData?.dropoffLatitude, moveData?.dropoffLongitude])

  // ─── Location picker state ────────────────────────────
  const [locationPickerOpen, setLocationPickerOpen] = useState(false)
  const [editingLocationType, setEditingLocationType] = useState<'pickup' | 'dropoff'>('pickup')

  const handleEditLocation = useCallback((type: 'pickup' | 'dropoff') => {
    setEditingLocationType(type)
    setLocationPickerOpen(true)
  }, [])

  const handleLocationPicked = useCallback((location: { fullAddress: string; coordinates: Coordinates }) => {
    setLocationPickerOpen(false)
  }, [])

  // ─── Phase / route / ETA state ────────────────────────
  const [phase, setPhase] = useState<MovePhase>('mover_arriving')
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null)
  const [moverEtaMinutes, setMoverEtaMinutes] = useState(0)
  const [moverDistanceKm, setMoverDistanceKm] = useState(0)
  const [moverCoords, setMoverCoords] = useState<Coordinates | null>(null)

  // ─── Waiting for mover acceptance ─────────────────────
  const waitingForAcceptance = moveData
    ? ['pending', 'mover_assigned'].includes(moveData.status)
    : false

  // Initialize mover position from their profile data (currentLatitude/currentLongitude)
  // so the marker appears immediately while polling catches up
  useEffect(() => {
    if (mover?.currentLatitude && mover?.currentLongitude && !moverCoords) {
      setMoverCoords({
        latitude: mover.currentLatitude,
        longitude: mover.currentLongitude,
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mover?.currentLatitude, mover?.currentLongitude])

  // Map initial status from DB move to phase
  useEffect(() => {
    if (!moveData) return
    const status = moveData.status
    switch (status) {
      case 'mover_assigned':
      case 'pending':
        // Still waiting - don't change phase
        break
      case 'mover_accepted':
      case 'mover_en_route':
        setPhase('mover_arriving')
        break
      case 'mover_arrived':
        setPhase('mover_arrived')
        break
      case 'loading':
        setPhase('loading')
        break
      case 'in_transit':
        setPhase('in_transit')
        break
      case 'arrived_destination':
      case 'unloading':
      case 'completed':
        setPhase('arrived')
        break
    }
  }, [moveData])

  // ─── Poll mover GPS every 3 seconds from DB ──────────
  // Only poll once mover has accepted (not while waiting)
  const { lastLocation } = useMoverLocationPolling({
    moverProfileId: mover?.id || null,
    enabled: !!mover && !waitingForAcceptance,
    intervalMs: 3000,
    onLocationUpdate: useCallback((location: { latitude: number; longitude: number }) => {
      setMoverCoords({
        latitude: location.latitude,
        longitude: location.longitude,
      })
    }, []),
  })

  // ─── Real ETA via Mapbox Directions ───────────────────
  const lastDirectionsCalc = useRef<number>(0)

  useEffect(() => {
    if (!lastLocation || !pickupCoordinates || phase !== 'mover_arriving') return
    const now = Date.now()
    if (now - lastDirectionsCalc.current < 15_000) return // Throttle to 15 seconds
    lastDirectionsCalc.current = now

    getMapboxDirections(
      lastLocation.latitude,
      lastLocation.longitude,
      pickupCoordinates.latitude,
      pickupCoordinates.longitude
    ).then((result) => {
      if (result) {
        setMoverDistanceKm(result.distanceMeters / 1000)
        setMoverEtaMinutes(Math.max(1, Math.ceil(result.durationSeconds / 60)))
      }
    })
  }, [lastLocation, pickupCoordinates, phase])

  const handleRouteCalculated = useCallback((info: RouteInfo) => {
    setRouteInfo(info)
  }, [])

  // ─── Realtime subscription for move status changes ────
  useEffect(() => {
    const moveId = moveIdRef.current
    const dbId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID
    const movesColl = process.env.NEXT_PUBLIC_COLLECTION_MOVES
    const moveReqColl = process.env.NEXT_PUBLIC_COLLECTION_MOVE_REQUESTS

    if (!moveId || !dbId) return

    const channels: string[] = []
    if (movesColl) channels.push(`databases.${dbId}.collections.${movesColl}.documents.${moveId}`)
    if (moveReqColl) channels.push(`databases.${dbId}.collections.${moveReqColl}.documents`)

    if (channels.length === 0) return

    const unsubscribe = client.subscribe<Models.Document>(
      channels,
      (response: RealtimeResponseEvent<Models.Document>) => {
        const doc = response.payload as Models.Document & Record<string, unknown>
        if (!doc) return

        if (doc.$collectionId === movesColl) {
          setMoveData((prev) => prev ? { ...prev, ...doc, moverProfileId: prev.moverProfileId } as MoveData : prev)
          const status = doc.status as string
          switch (status) {
            case 'mover_accepted':
            case 'mover_en_route':
              setPhase('mover_arriving')
              // Re-fetch move data to get mover details now that mover accepted
              if (moveId) {
                fetch(`/api/moves/${moveId}/full`)
                  .then((res) => res.json())
                  .then((data) => {
                    if (data.mover) setMover(data.mover as MoverInfo)
                    if (data.move) setMoveData(data.move as MoveData)
                  })
                  .catch(() => {})
              }
              break
            case 'mover_arrived':
              setPhase('mover_arrived')
              break
            case 'loading':
              setPhase('loading')
              break
            case 'in_transit':
              setPhase('in_transit')
              break
            case 'arrived_destination':
            case 'unloading':
            case 'completed':
              setPhase('arrived')
              break
            case 'cancelled_by_mover':
              alert('The mover has cancelled. Searching for another mover...')
              router.push('/instant-move/select-mover')
              break
          }
        }

        if (doc.$collectionId === moveReqColl) {
          const docMoveId = typeof doc.moveId === 'string' ? doc.moveId : (doc.moveId as Record<string, string>)?.$id
          if (docMoveId === moveId) {
            const status = doc.status as string
            if (status === 'declined' || status === 'expired') {
              // Store the declined mover ID to exclude from future selections
              const declinedMoverId = typeof doc.moverProfileId === 'string'
                ? doc.moverProfileId
                : (doc.moverProfileId as Record<string, string>)?.$id || ''
              if (declinedMoverId) {
                const existing = JSON.parse(sessionStorage.getItem('declinedMoverIds') || '[]') as string[]
                if (!existing.includes(declinedMoverId)) {
                  existing.push(declinedMoverId)
                  sessionStorage.setItem('declinedMoverIds', JSON.stringify(existing))
                }
              }
              sessionStorage.removeItem('activeMoveId')
              sessionStorage.removeItem('activeMoveRequestId')
              router.push('/instant-move/select-mover')
            }
          }
        }
      }
    )

    return () => unsubscribe()
  }, [router])

  // Set mover at pickup when arrived
  useEffect(() => {
    if (phase === 'mover_arrived' && pickupCoordinates) {
      setMoverCoords(pickupCoordinates)
    }
  }, [phase, pickupCoordinates])

  // ─── Cancel confirmation ──────────────────────────────
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const confirmCancel = () => setShowCancelConfirm(true)

  const handleCancel = () => {
    sessionStorage.removeItem('selectedMover')
    sessionStorage.removeItem('activeMoveId')
    sessionStorage.removeItem('activeMoveRequestId')
    reset()
    router.push('/')
  }

  const handleCallMover = () => {
    if (mover?.phone) {
      window.open(`tel:${mover.phone}`)
    } else {
      alert('Mover phone number not available')
    }
  }

  const handleMessageMover = () => {
    alert('Chat feature coming soon!')
  }

  const initials = mover?.name
    ? mover.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  const estimatedPrice = moveData?.estimatedPrice || 0
  const itemCount = moveData?.totalItemCount || 0
  const pickupDisplay = moveData?.pickupLocation || 'Pickup location'
  const dropoffDisplay = moveData?.dropoffLocation || 'Drop-off location'

  const renderMoverCard = () => {
    // Show waiting state while mover hasn't accepted yet
    if (waitingForAcceptance) {
      return (
        <div className="rounded-2xl border border-neutral-200 bg-white/95 backdrop-blur-sm dark:border-neutral-700 dark:bg-neutral-800/95 overflow-hidden shadow-lg">
          <div className="p-6 flex flex-col items-center text-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
            </div>
            <div>
              <p className="text-sm font-semibold text-neutral-900 dark:text-white">Waiting for mover to accept</p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                Your request has been sent. The mover will respond shortly.
              </p>
            </div>
          </div>
        </div>
      )
    }

    if (!mover) return null
    return (
      <div className="rounded-2xl border border-neutral-200 bg-white/95 backdrop-blur-sm dark:border-neutral-700 dark:bg-neutral-800/95 overflow-hidden shadow-lg">
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-700">
          <div className="flex items-start gap-3">
            <div className="relative shrink-0">
              <div className="w-12 h-12 rounded-full bg-neutral-200 dark:bg-neutral-700 overflow-hidden">
                <Avatar
                  src={mover.profilePhoto || undefined}
                  initials={!mover.profilePhoto ? initials : undefined}
                  className="size-12 bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300"
                />
              </div>
              {mover.isVerified && (
                <div className="absolute -bottom-0.5 -right-0.5 bg-white dark:bg-neutral-800 rounded-full p-0.5">
                  <HugeiconsIcon icon={CheckmarkCircle02Icon} size={14} strokeWidth={1.5} className="text-green-500" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">{mover.name}</h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                <HugeiconsIcon icon={StarIcon} size={12} strokeWidth={1.5} className="text-amber-500 fill-current" />
                <span className="text-xs font-medium text-neutral-900 dark:text-white">{mover.rating}</span>
                <span className="text-xs text-neutral-500 dark:text-neutral-400">· {mover.totalMoves} moves</span>
              </div>
            </div>
            {phase === 'mover_arriving' && (
              <div className="text-right shrink-0">
                <p className="text-lg font-semibold text-neutral-900 dark:text-white">{moverEtaMinutes} min</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">{moverDistanceKm.toFixed(1)} km away</p>
              </div>
            )}
            {phase === 'mover_arrived' && (
              <div className="text-right shrink-0">
                <p className="text-lg font-semibold text-primary-600">€{estimatedPrice}</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">Total price</p>
              </div>
            )}
          </div>
        </div>

        {phase === 'mover_arrived' && (
          <div className="px-4 py-3 bg-neutral-50 dark:bg-neutral-800/50 border-b border-neutral-200 dark:border-neutral-700">
            <div className="flex items-center gap-2">
              <HugeiconsIcon icon={CheckmarkCircle02Icon} size={20} strokeWidth={1.5} className="text-green-500 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-neutral-900 dark:text-white">Your mover has arrived!</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">Meet them at the pickup location</p>
              </div>
            </div>
          </div>
        )}

        <div className="p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-neutral-100 dark:bg-neutral-700 flex items-center justify-center shrink-0">
            <HugeiconsIcon icon={DeliveryTruck01Icon} size={18} strokeWidth={1.5} className="text-neutral-600 dark:text-neutral-300" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-neutral-900 dark:text-white">{mover.vehicleName}</p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">{mover.vehiclePlate}</p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
            <HugeiconsIcon icon={UserMultiple02Icon} size={14} strokeWidth={1.5} />
            <span>{mover.crewSize} mover{mover.crewSize > 1 ? 's' : ''}</span>
          </div>
        </div>

        {itemCount > 0 && (
          <div className="px-4 pb-3">
            <div className="flex items-center gap-3 p-2 bg-neutral-50 dark:bg-neutral-700/50 rounded-xl">
              <div className="w-12 h-12 rounded-lg bg-neutral-200 dark:bg-neutral-600 flex items-center justify-center">
                <HugeiconsIcon icon={DeliveryTruck01Icon} size={20} strokeWidth={1.5} className="text-neutral-500" />
              </div>
              <div className="text-sm">
                <p className="font-medium text-neutral-900 dark:text-white">{itemCount} items</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">Ready for pickup</p>
              </div>
            </div>
          </div>
        )}

        <div className="px-4 pb-4 flex gap-2">
          <ButtonSecondary onClick={handleCallMover} className="flex-1 !py-2">
            <HugeiconsIcon icon={Call02Icon} size={16} strokeWidth={1.5} className="mr-1.5" />
            Call
          </ButtonSecondary>
          <ButtonSecondary onClick={handleMessageMover} className="flex-1 !py-2">
            <HugeiconsIcon icon={Message01Icon} size={16} strokeWidth={1.5} className="mr-1.5" />
            Message
          </ButtonSecondary>
        </div>
      </div>
    )
  }

  const renderLocationSummary = () => (
    <div className="rounded-2xl border border-neutral-200 bg-white/95 backdrop-blur-sm p-3 dark:border-neutral-700 dark:bg-neutral-800/95 shadow-lg">
      <div className="flex items-center gap-3">
        <div className="flex flex-col items-center">
          <div className="w-2 h-2 rounded-full bg-neutral-900 dark:bg-white" />
          <div className="w-px h-6 bg-neutral-300 dark:bg-neutral-600" />
          <div className="w-2 h-2 rounded-full border-2 border-neutral-900 dark:border-white" />
        </div>
        <div className="flex-1 min-w-0 space-y-2">
          <div>
            <p className="text-[10px] text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Pickup</p>
            <p className="text-xs font-medium text-neutral-900 dark:text-white truncate">{pickupDisplay}</p>
          </div>
          <div>
            <p className="text-[10px] text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Drop-off</p>
            <p className="text-xs font-medium text-neutral-900 dark:text-white truncate">{dropoffDisplay}</p>
          </div>
        </div>
        {routeInfo && (
          <div className="shrink-0 text-right">
            <p className="text-sm font-semibold text-neutral-900 dark:text-white">{formatDistance(routeInfo.distance)}</p>
            <p className="text-[10px] text-neutral-500 dark:text-neutral-400">{formatDuration(routeInfo.duration)}</p>
          </div>
        )}
      </div>
    </div>
  )

  if (isLoadingData) {
    return (
      <div className="fixed inset-0 bg-white dark:bg-neutral-900 flex items-center justify-center p-4">
        <div className="text-center">
          <Logo className="w-24 mx-auto mb-6" />
          <p className="text-neutral-500 dark:text-neutral-400">Loading move details...</p>
        </div>
      </div>
    )
  }

  if (loadError || !moveData || !mover) {
    return (
      <div className="fixed inset-0 bg-white dark:bg-neutral-900 flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <Logo className="w-24 mx-auto mb-6" />
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
            {loadError || 'Move data not found'}
          </h2>
          <p className="text-neutral-500 dark:text-neutral-400 mb-6">Could not load move details from the server.</p>
          <ButtonPrimary href="/" className="w-full">Go home</ButtonPrimary>
        </div>
      </div>
    )
  }

  if (!pickupCoordinates || !dropoffCoordinates) {
    return (
      <div className="fixed inset-0 bg-white dark:bg-neutral-900 flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <Logo className="w-24 mx-auto mb-6" />
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">Missing location details</h2>
          <p className="text-neutral-500 dark:text-neutral-400 mb-6">Please select your pickup and drop-off locations to continue.</p>
          <ButtonPrimary href="/move-choice" className="w-full">Go back</ButtonPrimary>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-40 bg-neutral-100 dark:bg-neutral-900">
      <div className="absolute inset-0">
        <MapboxMap
          pickupCoordinates={pickupCoordinates || undefined}
          dropoffCoordinates={dropoffCoordinates || undefined}
          moverCoordinates={moverCoords || undefined}
          showRoute={true}
          onRouteCalculated={handleRouteCalculated}
          className="w-full h-full"
        />
      </div>

      <div className="absolute top-0 left-0 right-0 z-10 p-4 pt-4 pointer-events-none">
        <div className="mx-auto max-w-lg flex items-start gap-3">
          <div className="flex-1 pointer-events-auto">{renderLocationSummary()}</div>
          {/* <button
            onClick={confirmCancel}
            className="pointer-events-auto p-2.5 bg-white/95 dark:bg-neutral-800/95 backdrop-blur-sm hover:bg-white dark:hover:bg-neutral-800 rounded-full shadow-lg border border-neutral-200 dark:border-neutral-700 transition"
          >
            <HugeiconsIcon icon={Cancel01Icon} size={20} strokeWidth={1.5} className="text-neutral-700 dark:text-neutral-300" />
          </button> */}
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 z-10 p-4 pb-4 pointer-events-none">
        <div className="mx-auto max-w-lg space-y-3 pb-2 pointer-events-auto">
          {renderMoverCard()}
          {phase !== 'mover_arrived' ? (
            <ButtonSecondary onClick={confirmCancel} className="w-full shadow-lg">Cancel move</ButtonSecondary>
          ) : (
            <ButtonPrimary
              href={`/checkout?moveId=${moveData.$id}&distance=${routeInfo?.distance || moveData.routeDistanceMeters || 15000}&duration=${routeInfo?.duration || moveData.routeDurationSeconds || 1800}&price=${estimatedPrice}`}
              className="w-full shadow-lg"
            >
              Proceed to checkout · €{estimatedPrice}
            </ButtonPrimary>
          )}
        </div>
      </div>

      {showCancelConfirm && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl dark:bg-neutral-800">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
              <HugeiconsIcon icon={Cancel01Icon} size={24} strokeWidth={1.5} className="text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">Cancel this move?</h3>
            <p className="mt-1.5 text-sm text-neutral-500 dark:text-neutral-400">
              Your mover is already on the way. Are you sure you want to cancel? This action cannot be undone.
            </p>
            <div className="mt-6 flex gap-3">
              <ButtonSecondary onClick={() => setShowCancelConfirm(false)} className="flex-1">Keep move</ButtonSecondary>
              <button
                type="button"
                onClick={handleCancel}
                className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 active:scale-[.98]"
              >
                Yes, cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <MapLocationPicker
        open={locationPickerOpen}
        onClose={() => setLocationPickerOpen(false)}
        onSelect={handleLocationPicked}
        initialCoordinates={editingLocationType === 'pickup' ? pickupCoordinates : dropoffCoordinates}
        label={editingLocationType === 'pickup' ? 'Edit pickup location' : 'Edit drop-off location'}
      />
    </div>
  )
}

export default InstantMovePage
