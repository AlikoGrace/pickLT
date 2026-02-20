'use client'

import MapboxMap, { RouteInfo } from '@/components/MapboxMap'
import { useMoveSearch, Coordinates } from '@/context/moveSearch'
import { useMoverTracking } from '@/hooks/useMoverTracking'
import ButtonPrimary from '@/shared/ButtonPrimary'
import ButtonSecondary from '@/shared/ButtonSecondary'
import Logo from '@/shared/Logo'
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
import { useCallback, useEffect, useState } from 'react'

// Mover type from selection page
interface SelectedMover {
  id: string
  name: string
  photo: string
  rating: number
  totalMoves: number
  vehicleType: string
  vehicleName: string
  vehiclePlate: string
  crewSize: number
  maxWeight: number
  yearsExperience: number
  languages: string[]
  responseTime: number
  baseRate: number
  isVerified: boolean
  price: number
  estimatedArrival: number
  distanceKm: number
  routeDistance?: number
  routeDuration?: number
}

// Fallback mover data if none selected
const DEFAULT_MOVER: SelectedMover = {
  id: 'mover-001',
  name: 'Michael Schmidt',
  photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=faces',
  rating: 4.9,
  totalMoves: 1247,
  vehicleType: 'medium_van',
  vehicleName: 'Mercedes Sprinter',
  vehiclePlate: 'B-MS 4721',
  crewSize: 2,
  maxWeight: 1200,
  yearsExperience: 8,
  languages: ['German', 'English'],
  responseTime: 12,
  baseRate: 2.20,
  isVerified: true,
  price: 89,
  estimatedArrival: 12,
  distanceKm: 2.4,
}

type MovePhase = 'mover_arriving' | 'mover_arrived' | 'loading' | 'in_transit' | 'arrived'

// Helper functions for formatting
const formatDistance = (meters: number): string => {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} km`
  }
  return `${Math.round(meters)} m`
}

const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.ceil((seconds % 3600) / 60)
  
  if (hours > 0) {
    return `${hours}h ${minutes}min`
  }
  return `${minutes} min`
}

const InstantMovePage = () => {
  const router = useRouter()
  const {
    pickupLocation,
    dropoffLocation,
    pickupCoordinates,
    dropoffCoordinates,
    coverPhoto,
    inventory,
    customItems,
  } = useMoveSearch()

  // Load selected mover from sessionStorage
  const [selectedMover, setSelectedMover] = useState<SelectedMover | null>(null)
  
  useEffect(() => {
    const stored = sessionStorage.getItem('selectedMover')
    if (stored) {
      try {
        setSelectedMover(JSON.parse(stored))
      } catch {
        setSelectedMover(DEFAULT_MOVER)
      }
    } else {
      // Redirect back if no mover selected
      router.push('/instant-move/select-mover')
    }
  }, [router])

  // Get the mover to display (selected or default)
  const mover = selectedMover || DEFAULT_MOVER

  const [phase, setPhase] = useState<MovePhase>('mover_arriving')
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null)
  const [moverEtaMinutes, setMoverEtaMinutes] = useState(12)
  const [moverDistanceKm, setMoverDistanceKm] = useState(2.4)

  // Calculate mover starting position (offset from pickup)
  const [moverCoords, setMoverCoords] = useState<Coordinates | null>(null)

  // Initialize mover position and ETA from selected mover data
  useEffect(() => {
    if (selectedMover) {
      setMoverEtaMinutes(selectedMover.estimatedArrival)
      setMoverDistanceKm(selectedMover.distanceKm || 2.4)
    }
  }, [selectedMover])

  // Initialize mover position when pickup coordinates are available
  useEffect(() => {
    if (pickupCoordinates && !moverCoords) {
      setMoverCoords({
        latitude: pickupCoordinates.latitude + 0.015,
        longitude: pickupCoordinates.longitude - 0.02,
      })
    }
  }, [pickupCoordinates, moverCoords])

  // ─── Real-time GPS Tracking via Appwrite Realtime ────────
  const { lastLocation, isConnected: isTrackingConnected } = useMoverTracking({
    moverProfileId: selectedMover?.id || null,
    enabled: phase === 'mover_arriving' || phase === 'in_transit',
    onLocationUpdate: useCallback((location: { latitude: number; longitude: number }) => {
      // Update mover coordinates from real-time data
      setMoverCoords({
        latitude: location.latitude,
        longitude: location.longitude,
      })
    }, []),
  })

  // Update ETA when real-time location changes
  useEffect(() => {
    if (lastLocation && pickupCoordinates && phase === 'mover_arriving') {
      // Calculate approximate distance from mover to pickup
      const dLat = pickupCoordinates.latitude - lastLocation.latitude
      const dLng = pickupCoordinates.longitude - lastLocation.longitude
      const approxKm = Math.sqrt(dLat * dLat + dLng * dLng) * 111 // rough km
      setMoverDistanceKm(Math.max(0, approxKm))
      // Estimate ETA: ~3 min per km in city
      setMoverEtaMinutes(Math.max(1, Math.round(approxKm * 3)))

      // If very close, mark as arrived
      if (approxKm < 0.05) {
        setPhase('mover_arrived')
      }
    }
  }, [lastLocation, pickupCoordinates, phase])

  // Handle route calculation callback
  const handleRouteCalculated = useCallback((info: RouteInfo) => {
    setRouteInfo(info)
  }, [])

  // Fallback: Simulate mover approaching pickup (only when real-time not connected)
  useEffect(() => {
    if (phase === 'mover_arriving' && pickupCoordinates && moverCoords && !isTrackingConnected) {
      const interval = setInterval(() => {
        setMoverEtaMinutes((prev) => {
          if (prev <= 1) {
            clearInterval(interval)
            setPhase('mover_arrived')
            return 0
          }
          return prev - 1
        })
        setMoverDistanceKm((prev) => Math.max(0, prev - 0.2))
        
        // Move the mover closer to pickup
        setMoverCoords((prev) => {
          if (!prev || !pickupCoordinates) return prev
          return {
            latitude: prev.latitude + (pickupCoordinates.latitude - prev.latitude) * 0.15,
            longitude: prev.longitude + (pickupCoordinates.longitude - prev.longitude) * 0.15,
          }
        })
      }, 3000)
      return () => clearInterval(interval)
    }
  }, [phase, pickupCoordinates, moverCoords, isTrackingConnected])

  // Set mover at pickup when arrived
  useEffect(() => {
    if (phase === 'mover_arrived' && pickupCoordinates) {
      setMoverCoords(pickupCoordinates)
    }
  }, [phase, pickupCoordinates])

  const handleCancel = () => {
    sessionStorage.removeItem('selectedMover')
    router.push('/move-choice')
  }

  const handleCallMover = () => {
    // In production, this would use the actual mover's phone
    window.open('tel:+491701234567')
  }

  const handleMessageMover = () => {
    alert('Chat feature coming soon!')
  }

  // Get the total items count
  const inventoryCount = Object.values(inventory).reduce((sum, qty) => sum + qty, 0) + customItems.length

  const renderMoverCard = () => (
    <div className="rounded-2xl border border-neutral-200 bg-white/95 backdrop-blur-sm dark:border-neutral-700 dark:bg-neutral-800/95 overflow-hidden shadow-lg">
      {/* Mover Header */}
      <div className="p-4 border-b border-neutral-200 dark:border-neutral-700">
        <div className="flex items-start gap-3">
          <div className="relative shrink-0">
            <div className="w-12 h-12 rounded-full bg-neutral-200 dark:bg-neutral-700 overflow-hidden">
              <Image
                src={mover.photo}
                alt={mover.name}
                width={48}
                height={48}
                className="w-full h-full object-cover"
              />
            </div>
            {mover.isVerified && (
              <div className="absolute -bottom-0.5 -right-0.5 bg-white dark:bg-neutral-800 rounded-full p-0.5">
                <HugeiconsIcon
                  icon={CheckmarkCircle02Icon}
                  size={14}
                  strokeWidth={1.5}
                  className="text-green-500"
                />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
              {mover.name}
            </h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <HugeiconsIcon
                icon={StarIcon}
                size={12}
                strokeWidth={1.5}
                className="text-amber-500 fill-current"
              />
              <span className="text-xs font-medium text-neutral-900 dark:text-white">
                {mover.rating}
              </span>
              <span className="text-xs text-neutral-500 dark:text-neutral-400">
                · {mover.totalMoves} moves
              </span>
            </div>
          </div>
          {/* ETA Badge */}
          {phase === 'mover_arriving' && (
            <div className="text-right shrink-0">
              <p className="text-lg font-semibold text-neutral-900 dark:text-white">
                {moverEtaMinutes} min
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {moverDistanceKm.toFixed(1)} km away
              </p>
            </div>
          )}
          {/* Price Badge when arrived */}
          {phase === 'mover_arrived' && (
            <div className="text-right shrink-0">
              <p className="text-lg font-semibold text-primary-600">
                €{mover.price}
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Total price
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Arrived Banner */}
      {phase === 'mover_arrived' && (
        <div className="px-4 py-3 bg-neutral-50 dark:bg-neutral-800/50 border-b border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center gap-2">
            <HugeiconsIcon
              icon={CheckmarkCircle02Icon}
              size={20}
              strokeWidth={1.5}
              className="text-green-500 shrink-0"
            />
            <div>
              <p className="text-sm font-semibold text-neutral-900 dark:text-white">
                Your mover has arrived!
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Meet them at the pickup location
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Vehicle & Crew Info */}
      <div className="p-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-neutral-100 dark:bg-neutral-700 flex items-center justify-center shrink-0">
          <HugeiconsIcon
            icon={DeliveryTruck01Icon}
            size={18}
            strokeWidth={1.5}
            className="text-neutral-600 dark:text-neutral-300"
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-neutral-900 dark:text-white">
            {mover.vehicleName}
          </p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            {mover.vehiclePlate}
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
          <HugeiconsIcon icon={UserMultiple02Icon} size={14} strokeWidth={1.5} />
          <span>{mover.crewSize} mover{mover.crewSize > 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Items Preview if cover photo exists */}
      {coverPhoto && (
        <div className="px-4 pb-3">
          <div className="flex items-center gap-3 p-2 bg-neutral-50 dark:bg-neutral-700/50 rounded-xl">
            <Image
              src={coverPhoto}
              alt="Items to move"
              width={48}
              height={48}
              className="w-12 h-12 rounded-lg object-cover"
            />
            <div className="text-sm">
              <p className="font-medium text-neutral-900 dark:text-white">{inventoryCount} items</p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">Ready for pickup</p>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
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
            <p className="text-xs font-medium text-neutral-900 dark:text-white truncate">
              {pickupLocation || 'Select pickup location'}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Drop-off</p>
            <p className="text-xs font-medium text-neutral-900 dark:text-white truncate">
              {dropoffLocation || 'Select drop-off location'}
            </p>
          </div>
        </div>
        {/* Route info badge */}
        {routeInfo && (
          <div className="shrink-0 text-right">
            <p className="text-sm font-semibold text-neutral-900 dark:text-white">
              {formatDistance(routeInfo.distance)}
            </p>
            <p className="text-[10px] text-neutral-500 dark:text-neutral-400">
              {formatDuration(routeInfo.duration)}
            </p>
          </div>
        )}
      </div>
    </div>
  )

  // Check if we have valid coordinates
  const hasValidCoordinates = pickupCoordinates && dropoffCoordinates

  // Show loading state if mover not loaded yet
  if (!selectedMover) {
    return (
      <div className="fixed inset-0 bg-white dark:bg-neutral-900 flex items-center justify-center p-4">
        <div className="text-center">
          <Logo className="w-24 mx-auto mb-6" />
          <p className="text-neutral-500 dark:text-neutral-400">Loading...</p>
        </div>
      </div>
    )
  }

  // Show error state if no coordinates are available
  if (!hasValidCoordinates) {
    return (
      <div className="fixed inset-0 bg-white dark:bg-neutral-900 flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <Logo className="w-24 mx-auto mb-6" />
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
            Missing location details
          </h2>
          <p className="text-neutral-500 dark:text-neutral-400 mb-6">
            Please select your pickup and drop-off locations to continue.
          </p>
          <ButtonPrimary href="/move-choice" className="w-full">
            Go back
          </ButtonPrimary>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-neutral-100 dark:bg-neutral-900">
      {/* Full-screen Map */}
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

      {/* Top Bar - Location Summary & Close Button */}
      <div className="absolute top-0 left-0 right-0 z-10 p-4 pt-safe pointer-events-none">
        <div className="mx-auto max-w-lg flex items-start gap-3">
          <div className="flex-1 pointer-events-auto">
            {renderLocationSummary()}
          </div>
          <button
            onClick={handleCancel}
            className="pointer-events-auto p-2.5 bg-white/95 dark:bg-neutral-800/95 backdrop-blur-sm hover:bg-white dark:hover:bg-neutral-800 rounded-full shadow-lg border border-neutral-200 dark:border-neutral-700 transition"
          >
            <HugeiconsIcon
              icon={Cancel01Icon}
              size={20}
              strokeWidth={1.5}
              className="text-neutral-700 dark:text-neutral-300"
            />
          </button>
        </div>
      </div>

      {/* Bottom Panel - Mover Card & Actions */}
      <div className="absolute bottom-0 left-0 right-0 z-10 p-4 pb-safe pointer-events-none">
        <div className="mx-auto max-w-lg space-y-3 pointer-events-auto">
          {renderMoverCard()}
          
          {/* Action Button */}
          {phase !== 'mover_arrived' ? (
            <ButtonSecondary onClick={handleCancel} className="w-full shadow-lg">
              Cancel move
            </ButtonSecondary>
          ) : (
            <ButtonPrimary 
              href={`/checkout?distance=${routeInfo?.distance || selectedMover.routeDistance || 15000}&duration=${routeInfo?.duration || selectedMover.routeDuration || 1800}&price=${mover.price}`} 
              className="w-full shadow-lg"
            >
              Proceed to checkout · €{mover.price}
            </ButtonPrimary>
          )}
        </div>
      </div>
    </div>
  )
}

export default InstantMovePage
