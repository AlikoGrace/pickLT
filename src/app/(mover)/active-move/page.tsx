'use client'

import MapboxMap, { RouteInfo } from '@/components/MapboxMap'
import { useAuth } from '@/context/auth'
import { useLocationBroadcast } from '@/hooks/useLocationBroadcast'
import { client, databases } from '@/lib/appwrite'
import type { RealtimeResponseEvent, Models } from 'appwrite'
import { Query } from 'appwrite'
import ButtonPrimary from '@/shared/ButtonPrimary'
import {
  TruckIcon,
  CheckCircleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || ''
const MOVES_COLLECTION = process.env.NEXT_PUBLIC_COLLECTION_MOVES || ''

interface MoverCoordinates {
  latitude: number
  longitude: number
}

type MovePhase = 'en_route' | 'arrived_pickup' | 'loading' | 'in_transit' | 'arrived_dropoff' | 'completed'

const PHASE_LABELS: Record<MovePhase, { label: string; description: string }> = {
  en_route: { label: 'En Route to Pickup', description: 'Head to the pickup location' },
  arrived_pickup: { label: 'At Pickup', description: 'You have arrived. Start loading items.' },
  loading: { label: 'Loading', description: 'Loading items onto your vehicle' },
  in_transit: { label: 'In Transit', description: 'Driving to the drop-off location' },
  arrived_dropoff: { label: 'At Drop-off', description: 'You have arrived at the destination' },
  completed: { label: 'Completed', description: 'Move completed successfully!' },
}

const PHASE_ORDER: MovePhase[] = ['en_route', 'arrived_pickup', 'loading', 'in_transit', 'arrived_dropoff', 'completed']

export default function ActiveMovePage() {
  const { user } = useAuth()
  const router = useRouter()

  const [move, setMove] = useState<Record<string, unknown> | null>(null)
  const [phase, setPhase] = useState<MovePhase>('en_route')
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null)
  const [moverCoords, setMoverCoords] = useState<MoverCoordinates | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const moverProfileId = user?.moverDetails?.profileId || null

  // Broadcast GPS at higher frequency during an active move (every 5 seconds)
  useLocationBroadcast({
    enabled: !!moverProfileId && phase !== 'completed',
    intervalMs: 5_000,
    moveId: (move?.$id as string) || undefined,
  })

  // Track own position for the map marker
  useEffect(() => {
    if (!navigator.geolocation) return
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setMoverCoords({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        })
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 5_000, timeout: 15_000 }
    )
    return () => navigator.geolocation.clearWatch(watchId)
  }, [])

  // ── Fetch the active move from API ────────────────────────
  useEffect(() => {
    if (!moverProfileId || !DATABASE_ID || !MOVES_COLLECTION) return

    const fetchActiveMove = async () => {
      try {
        const res = await databases.listDocuments(
          DATABASE_ID,
          MOVES_COLLECTION,
          [
            Query.equal('moverProfileId', moverProfileId),
            Query.notEqual('status', 'completed'),
            Query.notEqual('status', 'cancelled_by_client'),
            Query.notEqual('status', 'cancelled_by_mover'),
            Query.orderDesc('$createdAt'),
            Query.limit(1),
          ]
        )

        if (res.total > 0) {
          const doc = res.documents[0] as Models.Document & Record<string, unknown>
          setMove(doc)
          mapStatusToPhase(doc.status as string)
        }
      } catch (err) {
        console.error('Failed to fetch active move:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchActiveMove()
  }, [moverProfileId])

  // ── Subscribe to move updates ─────────────────────────────
  useEffect(() => {
    const moveId = move?.$id as string | undefined
    if (!moveId || !DATABASE_ID || !MOVES_COLLECTION) return

    const channel = `databases.${DATABASE_ID}.collections.${MOVES_COLLECTION}.documents.${moveId}`
    const unsubscribe = client.subscribe<Models.Document>(
      channel,
      (response: RealtimeResponseEvent<Models.Document>) => {
        const doc = response.payload as Models.Document & Record<string, unknown>
        if (doc) {
          setMove(doc)
          mapStatusToPhase(doc.status as string)
        }
      }
    )

    return () => unsubscribe()
  }, [move?.$id])

  const mapStatusToPhase = (status: string) => {
    switch (status) {
      case 'mover_accepted':
      case 'mover_en_route':
        setPhase('en_route')
        break
      case 'mover_arrived':
        setPhase('arrived_pickup')
        break
      case 'loading':
        setPhase('loading')
        break
      case 'in_transit':
        setPhase('in_transit')
        break
      case 'arrived_destination':
      case 'unloading':
        setPhase('arrived_dropoff')
        break
      case 'completed':
        setPhase('completed')
        break
    }
  }

  const handleRouteCalculated = useCallback((info: RouteInfo) => {
    setRouteInfo(info)
  }, [])

  // ── Update move status via API ────────────────────────────
  const advancePhase = async () => {
    if (!move?.$id) return
    setIsUpdating(true)

    const currentIdx = PHASE_ORDER.indexOf(phase)
    const nextPhase = PHASE_ORDER[currentIdx + 1]
    if (!nextPhase) return

    // Map phase → Appwrite move status
    const phaseToStatus: Record<MovePhase, string> = {
      en_route: 'mover_en_route',
      arrived_pickup: 'mover_arrived',
      loading: 'loading',
      in_transit: 'in_transit',
      arrived_dropoff: 'arrived_destination',
      completed: 'completed',
    }

    try {
      await fetch('/api/mover/update-move-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          moveId: move.$id,
          status: phaseToStatus[nextPhase],
        }),
      })
      setPhase(nextPhase)
    } catch {
      alert('Failed to update status')
    } finally {
      setIsUpdating(false)
    }
  }

  const nextPhaseLabel = PHASE_ORDER[PHASE_ORDER.indexOf(phase) + 1]
    ? PHASE_LABELS[PHASE_ORDER[PHASE_ORDER.indexOf(phase) + 1]].label
    : null

  const pickupCoords = move?.pickupLatitude && move?.pickupLongitude
    ? { latitude: move.pickupLatitude as number, longitude: move.pickupLongitude as number }
    : undefined
  const dropoffCoords = move?.dropoffLatitude && move?.dropoffLongitude
    ? { latitude: move.dropoffLatitude as number, longitude: move.dropoffLongitude as number }
    : undefined

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <ArrowPathIcon className="h-8 w-8 animate-spin text-primary-500" />
      </div>
    )
  }

  if (!move) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-4 p-4 text-center">
        <TruckIcon className="h-12 w-12 text-neutral-400" />
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">No active move</h2>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Accept a move request to start tracking here.
        </p>
        <ButtonPrimary href="/available-moves">Browse available moves</ButtonPrimary>
      </div>
    )
  }

  return (
    <div className="relative h-[calc(100vh-64px)] lg:h-[calc(100vh-0px)]">
      {/* Full-screen Map with pickup, dropoff & mover markers */}
      <div className="absolute inset-0">
        <MapboxMap
          pickupCoordinates={pickupCoords}
          dropoffCoordinates={dropoffCoords}
          moverCoordinates={moverCoords || undefined}
          showRoute={true}
          onRouteCalculated={handleRouteCalculated}
          className="w-full h-full !rounded-none"
        />
      </div>

      {/* Top bar — Phase indicator */}
      <div className="absolute top-0 left-0 right-0 z-10 p-4 pointer-events-none">
        <div className="mx-auto max-w-lg pointer-events-auto">
          <div className="rounded-2xl bg-white/95 backdrop-blur-sm border border-neutral-200 dark:border-neutral-700 dark:bg-neutral-800/95 shadow-lg p-4">
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                phase === 'completed'
                  ? 'bg-green-100 dark:bg-green-900/30'
                  : 'bg-primary-100 dark:bg-primary-900/30'
              }`}>
                {phase === 'completed' ? (
                  <CheckCircleIcon className="h-5 w-5 text-green-600" />
                ) : (
                  <TruckIcon className="h-5 w-5 text-primary-600" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-neutral-900 dark:text-white">
                  {PHASE_LABELS[phase].label}
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  {PHASE_LABELS[phase].description}
                </p>
              </div>
              {routeInfo && phase !== 'completed' && (
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-neutral-900 dark:text-white">
                    {routeInfo.distance >= 1000
                      ? `${(routeInfo.distance / 1000).toFixed(1)} km`
                      : `${Math.round(routeInfo.distance)} m`}
                  </p>
                  <p className="text-[10px] text-neutral-500">
                    ~{Math.ceil(routeInfo.duration / 60)} min
                  </p>
                </div>
              )}
            </div>

            {/* Route info */}
            <div className="mt-3 flex items-center gap-3">
              <div className="flex flex-col items-center">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <div className="w-px h-4 bg-neutral-300 dark:bg-neutral-600" />
                <div className="w-2 h-2 rounded-full bg-red-500" />
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <p className="text-xs text-neutral-900 dark:text-white truncate">
                  {(move.pickupLocation as string)?.split(',')[0] || 'Pickup'}
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                  {(move.dropoffLocation as string)?.split(',')[0] || 'Drop-off'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom panel — Action button */}
      <div className="absolute bottom-0 left-0 right-0 z-10 p-4 pb-6 pointer-events-none">
        <div className="mx-auto max-w-lg pointer-events-auto space-y-3">
          {phase !== 'completed' && nextPhaseLabel && (
            <ButtonPrimary
              onClick={advancePhase}
              disabled={isUpdating}
              className="w-full shadow-lg"
            >
              {isUpdating ? 'Updating...' : `Mark as: ${nextPhaseLabel}`}
            </ButtonPrimary>
          )}
          {phase === 'completed' && (
            <ButtonPrimary href="/dashboard" className="w-full shadow-lg">
              Back to Dashboard
            </ButtonPrimary>
          )}
        </div>
      </div>
    </div>
  )
}
