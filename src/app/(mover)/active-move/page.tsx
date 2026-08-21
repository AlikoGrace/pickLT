'use client'

import MapboxMap, { RouteInfo } from '@/components/MapboxMap'
import { useAuth } from '@/context/auth'
import { useLocationBroadcast } from '@/hooks/useLocationBroadcast'
import { useMoverLocationPolling } from '@/hooks/useMoverLocationPolling'
import { client, databases } from '@/lib/appwrite'
import { isMoveStartable } from '@/lib/schedule-timing'
import type { RealtimeResponseEvent, Models } from 'appwrite'
import { Query } from 'appwrite'
import ButtonPrimary from '@/shared/ButtonPrimary'
import {
  TruckIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState, useRef } from 'react'
import { getMapboxDirections } from '@/utils/mapbox-directions'
import { formatMoney } from '@/lib/format'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { formatDistanceM } from '@/lib/format'
import { ARRIVAL_GEOFENCE_M } from '@/lib/service-limits'

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || ''
const MOVES_COLLECTION = process.env.NEXT_PUBLIC_COLLECTION_MOVES || ''

interface MoverCoordinates {
  latitude: number
  longitude: number
  heading?: number
}

type MovePhase = 'en_route' | 'arrived_pickup' | 'loading' | 'in_transit' | 'arrived_dropoff' | 'unloading' | 'awaiting_payment' | 'completed'

// Built per render from `t`. A module-scope literal map would freeze at the
// boot language and never follow a language switch.
const buildPhaseLabels = (t: TFunction): Record<MovePhase, { label: string; description: string }> => ({
  en_route: { label: t('track:moverPhase.enRoute.title'), description: t('track:moverPhase.enRoute.subtitle') },
  arrived_pickup: { label: t('track:moverPhase.atPickup.title'), description: t('track:moverPhase.atPickup.subtitle') },
  loading: { label: t('track:moverPhase.loading.title'), description: t('track:moverPhase.loading.subtitle') },
  in_transit: { label: t('track:moverPhase.inTransit.title'), description: t('track:moverPhase.inTransit.subtitle') },
  arrived_dropoff: { label: t('track:moverPhase.atDropoff.title'), description: t('track:moverPhase.atDropoff.subtitle') },
  unloading: { label: t('track:moverPhase.unloading.title'), description: t('track:moverPhase.unloading.subtitle') },
  awaiting_payment: { label: t('track:moverPhase.awaitingPayment.title'), description: t('track:moverPhase.awaitingPayment.subtitle') },
  completed: { label: t('track:moverPhase.completed.title'), description: t('track:moverPhase.completed.subtitle') },
})

const PHASE_ORDER: MovePhase[] = ['en_route', 'arrived_pickup', 'loading', 'in_transit', 'arrived_dropoff', 'unloading', 'awaiting_payment', 'completed']

export default function ActiveMovePage() {
  const { t } = useTranslation()
  const PHASE_LABELS = buildPhaseLabels(t)
  const { user } = useAuth()
  const router = useRouter()

  const [move, setMove] = useState<Record<string, unknown> | null>(null)
  const [phase, setPhase] = useState<MovePhase>('en_route')
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null)
  const [moverCoords, setMoverCoords] = useState<MoverCoordinates | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isConfirmingPayment, setIsConfirmingPayment] = useState(false)
  const [paymentConfirmed, setPaymentConfirmed] = useState(false)
  const [clientConfirmed, setClientConfirmed] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState<number | null>(null)

  // ── Client cancellation banner ────────────────────────────
  const [cancelledByClient, setCancelledByClient] = useState(false)
  const cancelledMoveRef = useRef<Record<string, unknown> | null>(null)
  const cancelTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Clean up cancel timer on unmount
  useEffect(() => {
    return () => {
      if (cancelTimerRef.current) clearTimeout(cancelTimerRef.current)
    }
  }, [])

  const moverProfileId = user?.moverDetails?.profileId || null

  // Broadcast GPS at higher frequency during an active move (every 3 seconds)
  useLocationBroadcast({
    enabled: !!moverProfileId && phase !== 'completed',
    intervalMs: 3_000,
    moveId: (move?.$id as string) || undefined,
  })

  // ── Track own position for the map marker ─────────────────
  // Primary: browser geolocation API (direct, lowest latency)
  const [geoError, setGeoError] = useState<string | null>(null)

  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      console.warn('[ActiveMove] Geolocation API not available')
      setGeoError('not_available')
      return
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setGeoError(null)
        setMoverCoords({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          // Geolocation heading is null when stationary / unavailable.
          heading: pos.coords.heading ?? undefined,
        })
      },
      (err) => {
        console.warn('[ActiveMove] Geolocation error:', err.code, err.message)
        setGeoError(err.message)
      },
      { enableHighAccuracy: true, maximumAge: 5_000, timeout: 15_000 }
    )

    return () => navigator.geolocation.clearWatch(watchId)
  }, [])

  // Fallback: poll own location from DB (what useLocationBroadcast writes)
  // Only activates when direct geolocation fails or hasn't provided data yet
  const { lastLocation: polledLocation } = useMoverLocationPolling({
    moverProfileId: moverProfileId,
    enabled: !!moverProfileId && !moverCoords && phase !== 'completed',
    intervalMs: 3_000,
    onLocationUpdate: useCallback((location: { latitude: number; longitude: number; heading?: number }) => {
      // Only use polled location if direct geo hasn't set coords yet
      setMoverCoords((prev) => {
        if (prev) return prev // Direct geo already working — don't overwrite
        return { latitude: location.latitude, longitude: location.longitude, heading: location.heading }
      })
    }, []),
  })

  // ── Fetch the active move from server API ─────────────────
  // Uses admin SDK to bypass permission issues with relationship fields
  const fetchActiveMove = useCallback(async () => {
    if (!moverProfileId) return
    try {
      const res = await fetch('/api/mover/active-move')
      if (res.ok) {
        const data = await res.json()
        if (data.move) {
          setMove(data.move)
          mapStatusToPhase(data.move.status as string)
        }
      }
    } catch (err) {
      console.error('Failed to fetch active move:', err)
    } finally {
      setIsLoading(false)
    }
  }, [moverProfileId])

  useEffect(() => {
    fetchActiveMove()
  }, [fetchActiveMove])

  // ── Auto-transition mover_accepted → mover_en_route (INSTANT only) ───────
  // For an instant dispatch, opening this page means "I'm on my way". A
  // scheduled move must NEVER auto-start — it waits on its Scheduled page and
  // the mover presses Start Route explicitly once the T-5 window opens
  // (T6 / Problems.docx #6-II; gating shared with job-details via
  // lib/schedule-timing).
  useEffect(() => {
    const moveId = move?.$id as string | undefined
    const status = move?.status as string | undefined
    if (!moveId || status !== 'mover_accepted') return
    if ((move?.moveCategory as string | undefined) === 'scheduled') return
    if (
      !isMoveStartable(
        {
          moveDate: move?.moveDate as string | undefined,
          arrivalWindow: move?.arrivalWindow as string | undefined,
        },
        Date.now(),
      )
    )
      return

    fetch('/api/mover/update-move-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ moveId, status: 'mover_en_route' }),
    }).catch((err) => console.warn('Auto-transition to mover_en_route failed:', err))
  }, [move?.$id, move?.status, move?.moveDate, move?.moveCategory, move?.arrivalWindow])

  // ── Subscribe to move updates ─────────────────────────────
  // Subscribe to the specific move document if we have one,
  // AND to the collection level to catch newly assigned moves
  useEffect(() => {
    if (!DATABASE_ID || !MOVES_COLLECTION) return

    const channels: string[] = []

    // Collection-level subscription catches new moves assigned to this mover
    channels.push(`databases.${DATABASE_ID}.collections.${MOVES_COLLECTION}.documents`)

    const moveId = move?.$id as string | undefined
    // Document-level subscription updates existing move in real time
    if (moveId) {
      channels.push(`databases.${DATABASE_ID}.collections.${MOVES_COLLECTION}.documents.${moveId}`)
    }

    const unsubscribe = client.subscribe<Models.Document>(
      channels,
      (response: RealtimeResponseEvent<Models.Document>) => {
        const doc = response.payload as Models.Document & Record<string, unknown>
        if (!doc) return

        // If we already have a move, only update if it's the same document
        if (moveId && doc.$id === moveId) {
          const status = doc.status as string
          // If the client cancelled, show a notice before clearing
          if (status === 'cancelled_by_client') {
            cancelledMoveRef.current = { ...doc }
            setCancelledByClient(true)
            setMove(null)
            // Auto-dismiss after 6 seconds
            cancelTimerRef.current = setTimeout(() => {
              setCancelledByClient(false)
              cancelledMoveRef.current = null
            }, 6_000)
            return
          }
          // Other cancellations / disputes — clear immediately
          if (['cancelled', 'cancelled_by_mover', 'disputed'].includes(status)) {
            setMove(null)
            return
          }
          setMove(doc)
          mapStatusToPhase(status)
          return
        }

        // If we don't have a move yet, check if this new/updated doc is assigned to us
        if (!moveId) {
          const docMoverProfileId = typeof doc.moverProfileId === 'string'
            ? doc.moverProfileId
            : (doc.moverProfileId as Record<string, string>)?.$id || ''
          const status = doc.status as string
          if (
            docMoverProfileId === moverProfileId &&
            !['completed', 'cancelled', 'cancelled_by_client', 'cancelled_by_mover', 'disputed'].includes(status)
          ) {
            setMove(doc)
            mapStatusToPhase(status)
          }
        }
      }
    )

    return () => unsubscribe()
  }, [move?.$id, moverProfileId])

  const mapStatusToPhase = (status: string) => {
    switch (status) {
      case 'accepted':
      case 'mover_accepted':
      case 'mover_assigned':
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
        setPhase('arrived_dropoff')
        break
      case 'unloading':
        setPhase('unloading')
        break
      case 'awaiting_payment':
        setPhase('awaiting_payment')
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
      unloading: 'unloading',
      awaiting_payment: 'awaiting_payment',
      completed: 'completed',
    }

    try {
      const res = await fetch('/api/mover/update-move-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          moveId: move.$id,
          status: phaseToStatus[nextPhase],
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        alert(err.error || t('errors:move.statusUpdateFailed'))
        return
      }
      setPhase(nextPhase)
    } catch {
      alert(t('errors:move.statusUpdateFailed'))
    } finally {
      setIsUpdating(false)
    }
  }

  // ── Poll payment status when awaiting payment ──────────
  useEffect(() => {
    if (phase !== 'awaiting_payment' || !move?.$id) return
    let cancelled = false
    const poll = async () => {
      try {
        const res = await fetch(`/api/moves/payment-status?moveId=${move.$id}`)
        if (!res.ok) return
        const data = await res.json()
        const p = data.payment
        if (!cancelled && p) {
          setPaymentAmount(p.amount ?? (move.estimatedPrice as number) ?? null)
          setClientConfirmed(!!p.clientConfirmedAt)
          if (p.moverConfirmedAt) setPaymentConfirmed(true)
          if (p.status === 'completed') setPhase('completed')
        }
      } catch { /* ignore */ }
    }
    poll()
    const interval = setInterval(poll, 5_000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [phase, move?.$id, move?.estimatedPrice])

  const handleConfirmPayment = async () => {
    if (!move?.$id) return
    setIsConfirmingPayment(true)
    try {
      const res = await fetch('/api/mover/confirm-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ moveId: move.$id }),
      })
      if (!res.ok) {
        const err = await res.json()
        alert(err.error || t('errors:payment.confirmFailed'))
        return
      }
      const data = await res.json()
      setPaymentConfirmed(true)
      if (data.moveCompleted) setPhase('completed')
    } catch {
      alert(t('errors:payment.confirmFailed'))
    } finally {
      setIsConfirmingPayment(false)
    }
  }

  // Only whether a next phase exists — the button no longer names it. The CTA
  // used to be `"Mark as: {{phase}}"` with a translated phase noun in the slot,
  // which cannot be made grammatical (de/pl case, tr suffix harmony, fr/it
  // article); the mover app settled the same question by replacing its twin
  // with a generic "Update status", and this is that copy.
  const hasNextPhase = Boolean(PHASE_ORDER[PHASE_ORDER.indexOf(phase) + 1])

  const pickupCoords = useMemo(
    () => move?.pickupLatitude && move?.pickupLongitude
      ? { latitude: move.pickupLatitude as number, longitude: move.pickupLongitude as number }
      : undefined,
    [move?.pickupLatitude, move?.pickupLongitude]
  )
  const dropoffCoords = useMemo(
    () => move?.dropoffLatitude && move?.dropoffLongitude
      ? { latitude: move.dropoffLatitude as number, longitude: move.dropoffLongitude as number }
      : undefined,
    [move?.dropoffLatitude, move?.dropoffLongitude]
  )

  // ── 100m proximity detection for "Arrived at Pickup" ───
  const distanceToPickup = useMemo(() => {
    if (!moverCoords || !pickupCoords) return null
    const dLat = pickupCoords.latitude - moverCoords.latitude
    const dLng = pickupCoords.longitude - moverCoords.longitude
    return Math.sqrt(dLat * dLat + dLng * dLng) * 111_000 // approx meters
  }, [moverCoords, pickupCoords])

  const isNearPickup = distanceToPickup !== null && distanceToPickup <= ARRIVAL_GEOFENCE_M

  // ── Real ETA via Mapbox Directions ─────────────────────
  const [moverEtaMinutes, setMoverEtaMinutes] = useState(0)
  const [moverDistanceKm, setMoverDistanceKm] = useState(0)
  const lastDirectionsCalc = useRef<number>(0)

  useEffect(() => {
    if (!moverCoords || !pickupCoords || phase !== 'en_route') return
    const now = Date.now()
    if (now - lastDirectionsCalc.current < 15_000) return
    lastDirectionsCalc.current = now

    getMapboxDirections(
      moverCoords.latitude,
      moverCoords.longitude,
      pickupCoords.latitude,
      pickupCoords.longitude
    ).then((result) => {
      if (result) {
        setMoverDistanceKm(result.distanceMeters / 1000)
        setMoverEtaMinutes(Math.max(1, Math.ceil(result.durationSeconds / 60)))
      }
    })
  }, [moverCoords, pickupCoords, phase])

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
        {/* Client-cancelled banner */}
        {cancelledByClient && (
          <div className="w-full max-w-md animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="rounded-2xl border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20 p-5 shadow-lg space-y-3">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                <ExclamationTriangleIcon className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <h2 className="text-lg font-semibold text-red-700 dark:text-red-300">{t('web:mover.activeMove.cancelledByClient.title')}</h2>
              <p className="text-sm text-red-600 dark:text-red-400">
                {t('moves:notify.cancelledByClient.body')}
                {cancelledMoveRef.current?.pickupLocation ? (
                  <>
                    <br />
                    <span className="text-xs text-red-500 dark:text-red-400">
                      {String(cancelledMoveRef.current.pickupLocation).split(',')[0]} → {String(cancelledMoveRef.current.dropoffLocation ?? '').split(',')[0]}
                    </span>
                  </>
                ) : null}
              </p>
              <button
                onClick={() => {
                  setCancelledByClient(false)
                  cancelledMoveRef.current = null
                  if (cancelTimerRef.current) clearTimeout(cancelTimerRef.current)
                }}
                className="mt-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700"
              >
                {t('common:action.dismiss.cta')}
              </button>
            </div>
          </div>
        )}

        {/* Normal empty state (shown after dismiss or when no cancel happened) */}
        {!cancelledByClient && (
          <>
            <TruckIcon className="h-12 w-12 text-neutral-400" />
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">{t('web:mover.activeMove.empty.title')}</h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              {t('web:mover.activeMove.empty.subtitle')}
            </p>
            <ButtonPrimary href="/available-moves">{t('web:mover.browseAvailable.cta')}</ButtonPrimary>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="relative h-screen">
      {/* Full-screen Map with pickup, dropoff & mover markers */}
      <div className="absolute inset-0">
        <MapboxMap
          pickupCoordinates={pickupCoords}
          dropoffCoordinates={dropoffCoords}
          moverCoordinates={moverCoords || undefined}
          showRoute={true}
          showUserLocation={false}
          onRouteCalculated={handleRouteCalculated}
          className="w-full h-full !rounded-none"
        />
      </div>

      {/* Top bar — Phase indicator */}
      <div className="absolute top-0 left-0 right-0 z-40 p-4 pointer-events-none">
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
              {phase === 'en_route' && moverEtaMinutes > 0 && (
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-neutral-900 dark:text-white">
                    {moverDistanceKm >= 1
                      ? `${moverDistanceKm.toFixed(1)} km`
                      : `${Math.round(moverDistanceKm * 1000)} m`}
                  </p>
                  <p className="text-[10px] text-neutral-500">
                    {t('web:mover.activeMove.etaToPickup.label', { minutes: moverEtaMinutes })}
                  </p>
                </div>
              )}
              {routeInfo && phase !== 'completed' && phase !== 'en_route' && (
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-neutral-900 dark:text-white">
                    {routeInfo.distance >= 1000
                      ? `${(routeInfo.distance / 1000).toFixed(1)} km`
                      : `${Math.round(routeInfo.distance)} m`}
                  </p>
                  <p className="text-[10px] text-neutral-500">
                    {t('common:unit.approxMinutes.label', { minutes: Math.ceil(routeInfo.duration / 60) })}
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
                  {(move.pickupLocation as string)?.split(',')[0] || t('booking:field.pickup.label')}
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                  {(move.dropoffLocation as string)?.split(',')[0] || t('booking:field.dropoff.label')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom panel — Action button */}
      <div className="absolute bottom-28 lg:bottom-0 left-0 right-0 z-40 p-4 pb-6 pointer-events-none">
        <div className="mx-auto max-w-lg pointer-events-auto space-y-3">
          {/* Proximity hint when en_route and not yet near pickup */}
          {phase === 'en_route' && !isNearPickup && distanceToPickup !== null && (
            <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3 flex items-center gap-2">
              <ExclamationTriangleIcon className="h-5 w-5 text-amber-500 shrink-0" />
              <p className="text-xs text-amber-700 dark:text-amber-300">
                {t('web:mover.activeMove.proximity.helper', {
                  radius: formatDistanceM(ARRIVAL_GEOFENCE_M),
                  distance: formatDistanceM(distanceToPickup),
                })}
              </p>
            </div>
          )}
          {/* Normal phase advancement (NOT during awaiting_payment or completed) */}
          {phase !== 'completed' && phase !== 'awaiting_payment' && hasNextPhase && (
            <ButtonPrimary
              onClick={advancePhase}
              disabled={isUpdating || (phase === 'en_route' && !isNearPickup)}
              className="w-full shadow-lg boder border-black"
            >
              {isUpdating
                ? t('common:state.updating.label')
                : t('web:mover.activeMove.advance.cta')}
            </ButtonPrimary>
          )}

          {/* Awaiting payment — mover confirms receipt */}
          {phase === 'awaiting_payment' && (
            <div className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 p-4 space-y-3 shadow-lg">
              <div className="text-center space-y-1">
                <p className="text-sm font-semibold text-neutral-900 dark:text-white">
                  {t('booking:payment.confirmation.title')}
                </p>
                {paymentAmount && (
                  <p className="text-2xl font-bold text-primary-600">
                     {formatMoney(paymentAmount, { compact: true })}
                  </p>
                )}
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  {t('booking:payment.moverConfirm.helper')}
                </p>
              </div>

              {/* Status indicators */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-600 dark:text-neutral-300">{t('booking:payment.clientConfirmed.label')}</span>
                  {clientConfirmed ? (
                    <span className="flex items-center gap-1 text-green-600"><CheckCircleIcon className="h-4 w-4" /> {t('common:answer.yes.label')}</span>
                  ) : (
                    <span className="flex items-center gap-1 text-amber-500"><ArrowPathIcon className="h-4 w-4 animate-spin" /> {t('common:state.waiting.label')}</span>
                  )}
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-600 dark:text-neutral-300">{t('booking:payment.yourConfirmation.label')}</span>
                  {paymentConfirmed ? (
                    <span className="flex items-center gap-1 text-green-600"><CheckCircleIcon className="h-4 w-4" /> {t('common:state.confirmed.label')}</span>
                  ) : (
                    <span className="text-neutral-400">{t('moves:status.pending.label')}</span>
                  )}
                </div>
              </div>

              {!paymentConfirmed ? (
                <ButtonPrimary
                  onClick={handleConfirmPayment}
                  disabled={isConfirmingPayment}
                  className="w-full"
                >
                  {isConfirmingPayment ? t('booking:payment.confirming.cta') : t('booking:payment.moverConfirm.cta')}
                </ButtonPrimary>
              ) : !clientConfirmed ? (
                <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3 text-center">
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    {t('booking:payment.awaitingClient.label')}
                  </p>
                </div>
              ) : null}
            </div>
          )}

          {phase === 'completed' && (
            <ButtonPrimary href="/dashboard" className="w-full shadow-lg">
              {t('web:mover.backToDashboard.cta')}
            </ButtonPrimary>
          )}
        </div>
      </div>
    </div>
  )
}
