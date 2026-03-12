'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  MapIcon,
  ListBulletIcon,
  MapPinIcon,
  ClockIcon,
  TruckIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  CubeIcon,
  UsersIcon,
} from '@heroicons/react/24/outline'
import MoverMapboxMap from '@/components/MoverMapboxMap'
import { Badge } from '@/shared/Badge'
import Image from 'next/image'
import Link from 'next/link'

const APPWRITE_ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || ''
const PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || ''
const BUCKET_MOVE_PHOTOS = process.env.NEXT_PUBLIC_BUCKET_MOVE_PHOTOS || ''

const getPhotoUrl = (fileIdOrUrl: string): string => {
  if (!fileIdOrUrl) return ''
  if (fileIdOrUrl.startsWith('http://') || fileIdOrUrl.startsWith('https://')) return fileIdOrUrl
  if (!APPWRITE_ENDPOINT || !PROJECT_ID || !BUCKET_MOVE_PHOTOS) return ''
  return `${APPWRITE_ENDPOINT}/storage/buckets/${BUCKET_MOVE_PHOTOS}/files/${fileIdOrUrl}/view?project=${PROJECT_ID}`
}

interface NearbyMove {
  id: string
  handle: string
  moveType: string | null
  moveCategory: string
  status: string
  pickupLocation: string | null
  pickupStreetAddress: string | null
  pickupLatitude: number | null
  pickupLongitude: number | null
  pickupFloorLevel: string | null
  pickupElevator: boolean
  dropoffLocation: string | null
  dropoffStreetAddress: string | null
  dropoffLatitude: number | null
  dropoffLongitude: number | null
  dropoffFloorLevel: string | null
  dropoffElevator: boolean
  homeType: string | null
  totalItemCount: number
  estimatedPrice: number | null
  additionalServices: string[]
  crewSize: string | null
  vehicleType: string | null
  moveDate: string | null
  arrivalWindow: string | null
  routeDistanceMeters: number | null
  routeDurationSeconds: number | null
  coverPhotoId: string | null
  galleryPhotoIds: string[]
  packingServiceLevel: string | null
  paymentMethod: string | null
  createdAt: string
  distanceFromMover: number
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
    return new Date(dateStr).toLocaleDateString('en-GB', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return dateStr
  }
}

const AvailableMovesPage = () => {
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map')
  const [selectedMove, setSelectedMove] = useState<NearbyMove | null>(null)
  const [moves, setMoves] = useState<NearbyMove[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [moverCoords, setMoverCoords] = useState<{ latitude: number; longitude: number } | null>(null)
  const [geoError, setGeoError] = useState(false)

  // Track mover's own position
  useEffect(() => {
    if (!navigator.geolocation) {
      setGeoError(true)
      setIsLoading(false)
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setMoverCoords({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        })
      },
      () => {
        setGeoError(true)
        setIsLoading(false)
      },
      { enableHighAccuracy: true, maximumAge: 30_000, timeout: 15_000 }
    )

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

  const fetchMoves = useCallback(async () => {
    if (!moverCoords) return
    try {
      setIsLoading(true)
      setError(null)
      const res = await fetch(
        `/api/mover/nearby-moves?lat=${moverCoords.latitude}&lng=${moverCoords.longitude}`
      )
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || 'Failed to fetch moves')
      }
      const data = await res.json()
      setMoves(data.moves || [])
    } catch (err) {
      console.error('Failed to fetch nearby moves:', err)
      setError(err instanceof Error ? err.message : 'Failed to load moves')
    } finally {
      setIsLoading(false)
    }
  }, [moverCoords])

  // Fetch on mount and when coords change, poll every 30s
  useEffect(() => {
    if (!moverCoords) return
    fetchMoves()
    const interval = setInterval(fetchMoves, 30_000)
    return () => clearInterval(interval)
  }, [fetchMoves, moverCoords])

  const mapMarkers = moves
    .filter((m) => m.pickupLatitude != null && m.pickupLongitude != null)
    .map((m) => ({
      id: m.id,
      lat: m.pickupLatitude!,
      lng: m.pickupLongitude!,
      price: m.estimatedPrice || 0,
      isSelected: selectedMove?.id === m.id,
    }))

  const pickupDisplay = (m: NearbyMove) =>
    m.pickupStreetAddress || m.pickupLocation || 'Pickup'
  const dropoffDisplay = (m: NearbyMove) =>
    m.dropoffStreetAddress || m.dropoffLocation || 'Drop-off'

  // Geo error state
  if (geoError) {
    return (
      <div className="h-[calc(100vh-64px)] lg:h-screen flex flex-col items-center justify-center p-6">
        <MapPinIcon className="w-12 h-12 text-amber-500 mb-4" />
        <p className="text-neutral-900 dark:text-neutral-100 font-semibold mb-2">
          Location access required
        </p>
        <p className="text-neutral-500 dark:text-neutral-400 text-sm text-center mb-4">
          Please enable location services to see available moves near you.
        </p>
      </div>
    )
  }

  // Loading state
  if (isLoading && moves.length === 0) {
    return (
      <div className="h-[calc(100vh-64px)] lg:h-screen flex flex-col items-center justify-center">
        <ArrowPathIcon className="w-8 h-8 text-primary-500 animate-spin mb-4" />
        <p className="text-neutral-600 dark:text-neutral-400 font-medium">
          Finding available moves near you...
        </p>
      </div>
    )
  }

  // Error state
  if (error && moves.length === 0) {
    return (
      <div className="h-[calc(100vh-64px)] lg:h-screen flex flex-col items-center justify-center p-6">
        <ExclamationTriangleIcon className="w-12 h-12 text-amber-500 mb-4" />
        <p className="text-neutral-900 dark:text-neutral-100 font-semibold mb-2">
          Unable to load moves
        </p>
        <p className="text-neutral-500 dark:text-neutral-400 text-sm text-center mb-4">
          {error}
        </p>
        <button
          onClick={fetchMoves}
          className="px-4 py-2 bg-primary-600 text-white rounded-full text-sm font-medium hover:bg-primary-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-64px)] lg:h-screen flex flex-col">
      {/* Header */}
      <div className="p-4 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-700">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
              Available Moves
            </h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              {moves.length} move{moves.length !== 1 ? 's' : ''} within 30 km
              {isLoading && (
                <ArrowPathIcon className="w-3 h-3 inline ml-1 animate-spin" />
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchMoves}
              disabled={isLoading}
              className="p-2 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors disabled:opacity-50"
              title="Refresh"
            >
              <ArrowPathIcon
                className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`}
              />
            </button>
            <div className="flex items-center bg-neutral-100 dark:bg-neutral-800 rounded-full p-1">
              <button
                onClick={() => setViewMode('map')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  viewMode === 'map'
                    ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-sm'
                    : 'text-neutral-500 dark:text-neutral-400'
                }`}
              >
                <MapIcon className="w-4 h-4" />
                Map
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  viewMode === 'list'
                    ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-sm'
                    : 'text-neutral-500 dark:text-neutral-400'
                }`}
              >
                <ListBulletIcon className="w-4 h-4" />
                List
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Empty state */}
      {moves.length === 0 && !isLoading && (
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <TruckIcon className="w-16 h-16 text-neutral-300 dark:text-neutral-600 mb-4" />
          <p className="text-neutral-900 dark:text-neutral-100 font-semibold mb-1">
            No moves available
          </p>
          <p className="text-neutral-500 dark:text-neutral-400 text-sm text-center">
            No scheduled moves within 30 km right now. We check automatically every 30 seconds.
          </p>
        </div>
      )}

      {/* Content */}
      {moves.length > 0 && (
        <div className="flex-1 relative overflow-hidden">
          {viewMode === 'map' ? (
            <div className="h-full relative">
              <MoverMapboxMap
                markers={mapMarkers}
                selectedMarkerId={selectedMove?.id}
                onMarkerClick={(id) => {
                  const move = moves.find((m) => m.id === id)
                  setSelectedMove((prev) =>
                    prev?.id === id ? null : move || null
                  )
                }}
                defaultCenter={
                  moverCoords
                    ? { lat: moverCoords.latitude, lng: moverCoords.longitude }
                    : { lat: 52.52, lng: 13.405 }
                }
                defaultZoom={12}
                moverCoordinates={moverCoords || undefined}
              />

              {/* Floating MoveCard tooltip when a marker is tapped */}
              {selectedMove && (
                <div className="absolute bottom-4 left-4 right-4 z-20 max-w-md mx-auto">
                  <Link
                    href={`/job-details/${selectedMove.handle}`}
                    className="block bg-white dark:bg-neutral-800 rounded-2xl shadow-xl overflow-hidden border border-neutral-200 dark:border-neutral-700 hover:shadow-2xl transition-shadow"
                  >
                    {/* Photo strip */}
                    <div className="relative h-32 bg-neutral-100 dark:bg-neutral-700 flex items-center justify-center">
                      {selectedMove.coverPhotoId ? (
                        <Image
                          src={getPhotoUrl(selectedMove.coverPhotoId)}
                          alt="Move photo"
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      ) : (
                        <TruckIcon className="h-12 w-12 text-neutral-400" />
                      )}
                      <Badge color="yellow" className="absolute top-2 left-2 text-xs">
                        {formatLabel(selectedMove.moveType)} Move
                      </Badge>
                      <span className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full">
                        {selectedMove.distanceFromMover.toFixed(1)} km away
                      </span>
                    </div>
                    {/* Content */}
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                            {pickupDisplay(selectedMove).split(',')[0]} &rarr;{' '}
                            {dropoffDisplay(selectedMove).split(',')[0]}
                          </h3>
                          <p className="text-sm text-neutral-500 dark:text-neutral-400">
                            {formatDate(selectedMove.moveDate)} &middot;{' '}
                            {formatLabel(selectedMove.arrivalWindow)}
                          </p>
                        </div>
                        <span className="text-xl font-bold text-neutral-900 dark:text-neutral-100 ml-3 shrink-0">
                          &euro;{(selectedMove.estimatedPrice || 0).toFixed(0)}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <span className="text-xs px-2 py-0.5 bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 rounded-full">
                          {selectedMove.totalItemCount} items
                        </span>
                        <span className="text-xs px-2 py-0.5 bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 rounded-full">
                          {selectedMove.crewSize || '—'} movers
                        </span>
                        {selectedMove.vehicleType && (
                          <span className="text-xs px-2 py-0.5 bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 rounded-full">
                            {formatLabel(selectedMove.vehicleType)}
                          </span>
                        )}
                        {selectedMove.pickupElevator && (
                          <span className="text-xs px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full">
                            Elevator
                          </span>
                        )}
                      </div>
                      <p className="mt-2 text-xs text-primary-600 dark:text-primary-400 font-medium">
                        Tap to view details &rarr;
                      </p>
                    </div>
                  </Link>
                </div>
              )}
            </div>
          ) : (
            /* List View */
            <div className="h-full overflow-y-auto p-4 pb-24 lg:pb-4 space-y-4">
              {moves.map((move) => (
                <Link
                  key={move.id}
                  href={`/job-details/${move.handle}`}
                  className="block bg-white dark:bg-neutral-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                >
                  {/* Card Header */}
                  <div className="relative h-32 bg-neutral-100 dark:bg-neutral-700 flex items-center justify-center overflow-hidden">
                    {move.coverPhotoId ? (
                      <Image
                        src={getPhotoUrl(move.coverPhotoId)}
                        alt="Move"
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <TruckIcon className="h-16 w-16 text-neutral-400" />
                    )}
                    <Badge color="yellow" className="absolute top-3 left-3 z-10">
                      {formatLabel(move.homeType)} &middot; {formatLabel(move.moveType)}
                    </Badge>
                    <span className="absolute top-3 right-3 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full z-10">
                      {move.distanceFromMover.toFixed(1)} km away
                    </span>
                  </div>

                  <div className="p-4">
                    {/* Header row */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">
                          {formatDate(move.moveDate)} &middot;{' '}
                          {formatLabel(move.arrivalWindow)}
                        </p>
                        <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                          {pickupDisplay(move).split(',')[0]} &rarr;{' '}
                          {dropoffDisplay(move).split(',')[0]}
                        </h3>
                      </div>
                      <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 ml-3 shrink-0">
                        &euro;{(move.estimatedPrice || 0).toFixed(0)}
                      </p>
                    </div>

                    {/* Route details */}
                    <div className="space-y-2 mb-4">
                      <div className="flex items-start gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-green-500 mt-1.5 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
                            {pickupDisplay(move)}
                          </p>
                          {move.pickupFloorLevel && (
                            <p className="text-xs text-neutral-500 dark:text-neutral-400">
                              Floor {move.pickupFloorLevel}
                              {move.pickupElevator ? ' · Elevator' : ''}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="w-px h-3 bg-neutral-300 dark:bg-neutral-600 ml-1" />
                      <div className="flex items-start gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500 mt-1.5 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
                            {dropoffDisplay(move)}
                          </p>
                          {move.dropoffFloorLevel && (
                            <p className="text-xs text-neutral-500 dark:text-neutral-400">
                              Floor {move.dropoffFloorLevel}
                              {move.dropoffElevator ? ' · Elevator' : ''}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Info pills */}
                    <div className="flex flex-wrap gap-2 mb-3">
                      <span className="text-xs px-2.5 py-1 bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 rounded-full flex items-center gap-1">
                        <CubeIcon className="w-3 h-3" />
                        {move.totalItemCount} items
                      </span>
                      <span className="text-xs px-2.5 py-1 bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 rounded-full flex items-center gap-1">
                        <UsersIcon className="w-3 h-3" />
                        {move.crewSize || '—'} movers
                      </span>
                      {move.vehicleType && (
                        <span className="text-xs px-2.5 py-1 bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 rounded-full flex items-center gap-1">
                          <TruckIcon className="w-3 h-3" />
                          {formatLabel(move.vehicleType)}
                        </span>
                      )}
                      {move.pickupElevator && (
                        <span className="text-xs px-2.5 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full">
                          Elevator
                        </span>
                      )}
                      {move.additionalServices.length > 0 && (
                        <span className="text-xs px-2.5 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full">
                          +{move.additionalServices.length} services
                        </span>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-3 border-t border-neutral-100 dark:border-neutral-700">
                      <div className="flex items-center gap-4 text-sm text-neutral-500 dark:text-neutral-400">
                        {move.routeDistanceMeters != null && (
                          <span className="flex items-center gap-1">
                            <MapPinIcon className="w-4 h-4" />
                            {move.routeDistanceMeters >= 1000
                              ? `${(move.routeDistanceMeters / 1000).toFixed(1)} km`
                              : `${Math.round(move.routeDistanceMeters)} m`}
                          </span>
                        )}
                        {move.routeDurationSeconds != null && (
                          <span className="flex items-center gap-1">
                            <ClockIcon className="w-4 h-4" />
                            {move.routeDurationSeconds >= 3600
                              ? `${Math.floor(move.routeDurationSeconds / 3600)}h ${Math.ceil((move.routeDurationSeconds % 3600) / 60)}min`
                              : `${Math.ceil(move.routeDurationSeconds / 60)} min`}
                          </span>
                        )}
                      </div>
                      <span className="text-sm font-medium text-primary-600 dark:text-primary-400">
                        View details &rarr;
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default AvailableMovesPage
