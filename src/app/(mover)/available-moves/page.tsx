'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  MapIcon,
  ListBulletIcon,
  MapPinIcon,
  ClockIcon,
  TruckIcon,
  XMarkIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'
import MoverMapboxMap from '@/components/MoverMapboxMap'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Badge } from '@/shared/Badge'
import Image from 'next/image'

const APPWRITE_ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || ''
const PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || ''
const BUCKET_MOVE_PHOTOS = process.env.NEXT_PUBLIC_BUCKET_MOVE_PHOTOS || ''

const getPhotoUrl = (fileId: string): string => {
  if (!fileId || !APPWRITE_ENDPOINT || !PROJECT_ID || !BUCKET_MOVE_PHOTOS) return ''
  return `${APPWRITE_ENDPOINT}/storage/buckets/${BUCKET_MOVE_PHOTOS}/files/${fileId}/view?project=${PROJECT_ID}`
}

interface AvailableMove {
  id: string
  requestId: string
  pickup: string
  pickupAddress: string
  dropoff: string
  dropoffAddress: string
  distance: string
  estimatedTime: string
  price: number
  moveType: string
  homeType: string
  items: string[]
  itemCount: number
  crewSize: string
  requestedTime: string
  clientName: string
  lat: number
  lng: number
  hasElevator: boolean
  dropoffHasElevator: boolean
  floor: string
  dropoffFloor: string
  additionalServices: string[]
  notes: string
  coverPhotoId: string | null
  galleryPhotoIds: string[]
}

// Helper: format distance
const formatDistance = (meters: number | null): string => {
  if (!meters) return '—'
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`
  return `${Math.round(meters)} m`
}

// Helper: format duration
const formatDuration = (seconds: number | null): string => {
  if (!seconds) return '—'
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.ceil((seconds % 3600) / 60)
  if (hours > 0) return `${hours}h ${minutes}min`
  return `${minutes} min`
}

// Helper: format relative time
const formatRelativeTime = (dateStr: string): string => {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = date.getTime() - now.getTime()
  const diffHours = Math.abs(diffMs) / (1000 * 60 * 60)

  if (diffHours < 1) return 'Just now'
  if (diffHours < 24) {
    const isToday = date.toDateString() === now.toDateString()
    const time = date.toLocaleTimeString('en-DE', { hour: '2-digit', minute: '2-digit' })
    return isToday ? `Today, ${time}` : `Tomorrow, ${time}`
  }
  return date.toLocaleDateString('en-DE', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const AvailableMovesPage = () => {
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map')
  const [selectedMove, setSelectedMove] = useState<AvailableMove | null>(null)
  const [hoveredMoveId, setHoveredMoveId] = useState<string | null>(null)
  const [moves, setMoves] = useState<AvailableMove[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [acceptingId, setAcceptingId] = useState<string | null>(null)
  const [moverCoords, setMoverCoords] = useState<{ latitude: number; longitude: number } | null>(null)

  // Track mover's own position
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

  const fetchMoves = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const res = await fetch('/api/mover/available-moves')
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || 'Failed to fetch moves')
      }
      const data = await res.json()

      // Transform API response into the shape the UI expects
      const transformed: AvailableMove[] = (data.moves || []).map((item: Record<string, unknown>) => {
        const move = item.move as Record<string, unknown> | undefined
        if (!move) return null

        const pickupLoc = (move.pickupLocation as string) || ''
        const dropoffLoc = (move.dropoffLocation as string) || ''
        const pickupShort = pickupLoc.split(',')[0]?.trim() || 'Pickup'
        const dropoffShort = dropoffLoc.split(',')[0]?.trim() || 'Dropoff'

        return {
          id: move.id as string,
          requestId: item.requestId as string,
          pickup: pickupShort,
          pickupAddress: (move.pickupStreetAddress as string) || pickupLoc,
          dropoff: dropoffShort,
          dropoffAddress: (move.dropoffStreetAddress as string) || dropoffLoc,
          distance: formatDistance(move.routeDistanceMeters as number | null),
          estimatedTime: formatDuration(move.routeDurationSeconds as number | null),
          price: (move.estimatedPrice as number) || 0,
          moveType: (move.moveType as string) || 'Light',
          homeType: (move.homeType as string) || 'Apartment',
          items: ((move.additionalServices as string[]) || []),
          itemCount: (move.totalItemCount as number) || 0,
          crewSize: (move.crewSize as string) || '1',
          requestedTime: formatRelativeTime((move.moveDate as string) || (move.createdAt as string) || new Date().toISOString()),
          clientName: 'Client',
          lat: (move.pickupLatitude as number) || 52.52,
          lng: (move.pickupLongitude as number) || 13.405,
          hasElevator: (move.pickupElevator as boolean) || false,
          dropoffHasElevator: (move.dropoffElevator as boolean) || false,
          floor: (move.pickupFloorLevel as string) || 'Ground',
          dropoffFloor: (move.dropoffFloorLevel as string) || 'Ground',
          additionalServices: (move.additionalServices as string[]) || [],
          notes: (move.contactNotes as string) || '',
          coverPhotoId: (move.coverPhotoId as string) || null,
          galleryPhotoIds: (move.galleryPhotoIds as string[]) || [],
        }
      }).filter(Boolean) as AvailableMove[]

      setMoves(transformed)
    } catch (err) {
      console.error('Failed to fetch available moves:', err)
      setError(err instanceof Error ? err.message : 'Failed to load moves')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMoves()
    // Poll every 30 seconds for new moves
    const interval = setInterval(fetchMoves, 30000)
    return () => clearInterval(interval)
  }, [fetchMoves])

  const handleAcceptMove = async (move: AvailableMove) => {
    try {
      setAcceptingId(move.id)
      // Call the updatemovestatus cloud function or a dedicated API route
      const res = await fetch('/api/mover/accept-move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: move.requestId, moveId: move.id }),
      })
      if (res.ok) {
        // Remove from list and close modal
        setMoves((prev) => prev.filter((m) => m.id !== move.id))
        setSelectedMove(null)
      } else {
        const errData = await res.json().catch(() => ({}))
        alert(errData.error || 'Failed to accept move. Please try again.')
      }
    } catch {
      alert('Network error. Please try again.')
    } finally {
      setAcceptingId(null)
    }
  }

  const mapMarkers = moves.map((move) => ({
    id: move.id,
    lat: move.lat,
    lng: move.lng,
    price: move.price,
    isSelected: selectedMove?.id === move.id,
  }))

  // Loading state
  if (isLoading && moves.length === 0) {
    return (
      <div className="h-[calc(100vh-64px)] lg:h-screen flex flex-col items-center justify-center">
        <ArrowPathIcon className="w-8 h-8 text-primary-500 animate-spin mb-4" />
        <p className="text-neutral-600 dark:text-neutral-400 font-medium">Finding available moves...</p>
      </div>
    )
  }

  // Error state
  if (error && moves.length === 0) {
    return (
      <div className="h-[calc(100vh-64px)] lg:h-screen flex flex-col items-center justify-center p-6">
        <ExclamationTriangleIcon className="w-12 h-12 text-amber-500 mb-4" />
        <p className="text-neutral-900 dark:text-neutral-100 font-semibold mb-2">Unable to load moves</p>
        <p className="text-neutral-500 dark:text-neutral-400 text-sm text-center mb-4">{error}</p>
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
              {moves.length} move{moves.length !== 1 ? 's' : ''} near you
              {isLoading && <ArrowPathIcon className="w-3 h-3 inline ml-1 animate-spin" />}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchMoves}
              disabled={isLoading}
              className="p-2 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors disabled:opacity-50"
              title="Refresh"
            >
              <ArrowPathIcon className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
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
          <p className="text-neutral-900 dark:text-neutral-100 font-semibold mb-1">No moves available</p>
          <p className="text-neutral-500 dark:text-neutral-400 text-sm text-center">
            New move requests will appear here. We check for new moves automatically.
          </p>
        </div>
      )}

      {/* Content */}
      {moves.length > 0 && (
      <div className="flex-1 relative overflow-hidden">
        {viewMode === 'map' ? (
          <div className="h-full relative">
            {/* Mapbox Map */}
            <MoverMapboxMap
              markers={mapMarkers}
              selectedMarkerId={selectedMove?.id}
              onMarkerClick={(id) => {
                const move = moves.find((m) => m.id === id)
                setSelectedMove(move || null)
              }}
              onMarkerHover={setHoveredMoveId}
              defaultCenter={{ lat: 52.52, lng: 13.405 }}
              defaultZoom={12}
              moverCoordinates={moverCoords || undefined}
            />
          </div>
        ) : (
          /* List View */
          <div className="h-full overflow-y-auto p-4 pb-24 lg:pb-4 space-y-4">
            {moves.map((move) => (
              <div
                key={move.id}
                className="bg-white dark:bg-neutral-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
              >
                {/* Card Header */}
                <div className="relative h-32 bg-gradient-to-br from-primary-50 to-primary-100 dark:from-neutral-700 dark:to-neutral-800 flex items-center justify-center overflow-hidden">
                  {move.coverPhotoId ? (
                    <Image src={getPhotoUrl(move.coverPhotoId)} alt="Move" fill className="object-cover" />
                  ) : (
                    <TruckIcon className="h-16 w-16 text-primary-200 dark:text-neutral-600" />
                  )}
                  <Badge color="yellow" className="absolute top-3 left-3 z-10">
                    {move.homeType} · {move.moveType}
                  </Badge>
                </div>

                <div className="p-4">
                  {/* Header row */}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400 mb-1">
                        <ClockIcon className="w-4 h-4" />
                        <span>{move.requestedTime}</span>
                        <span>·</span>
                        <span>{move.clientName}</span>
                      </div>
                      <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                        {move.pickup} → {move.dropoff}
                      </h3>
                    </div>
                    <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                      €{move.price}
                    </p>
                  </div>

                  {/* Route details */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-start gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-green-500 mt-1.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                          {move.pickup}
                        </p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                          {move.pickupAddress}
                        </p>
                      </div>
                    </div>
                    <div className="w-px h-3 bg-neutral-300 dark:bg-neutral-600 ml-1" />
                    <div className="flex items-start gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500 mt-1.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                          {move.dropoff}
                        </p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                          {move.dropoffAddress}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Move info */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="text-xs px-2.5 py-1 bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 rounded-full">
                      {move.itemCount} items
                    </span>
                    <span className="text-xs px-2.5 py-1 bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 rounded-full">
                      {move.crewSize} movers
                    </span>
                    {move.hasElevator && (
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
                      <span className="flex items-center gap-1">
                        <MapPinIcon className="w-4 h-4" />
                        {move.distance}
                      </span>
                      <span className="flex items-center gap-1">
                        <ClockIcon className="w-4 h-4" />
                        {move.estimatedTime}
                      </span>
                    </div>
                    <button
                      onClick={() => handleAcceptMove(move)}
                      disabled={acceptingId === move.id}
                      className="px-5 py-2 bg-primary-600 text-white rounded-full text-sm font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {acceptingId === move.id ? 'Accepting...' : 'Accept Move'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      )}

      {/* Selected Move Detail Modal */}
      {selectedMove && viewMode === 'map' && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-neutral-800 rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="relative h-48 bg-gradient-to-br from-primary-50 to-primary-100 dark:from-neutral-700 dark:to-neutral-800 flex items-center justify-center overflow-hidden">
              {selectedMove.coverPhotoId ? (
                <Image src={getPhotoUrl(selectedMove.coverPhotoId)} alt="Move" fill className="object-cover" />
              ) : (
                <TruckIcon className="h-16 w-16 text-primary-200 dark:text-neutral-600" />
              )}
              <Badge color="yellow" className="absolute top-3 left-3 z-10">
                {selectedMove.homeType} · {selectedMove.moveType}
              </Badge>
              {selectedMove.galleryPhotoIds.length > 0 && (
                <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-sm text-white text-xs px-2 py-0.5 rounded-full z-10">
                  {selectedMove.galleryPhotoIds.length + (selectedMove.coverPhotoId ? 1 : 0)} photos
                </div>
              )}
              <button
                onClick={() => setSelectedMove(null)}
                className="absolute top-3 right-3 p-2 bg-white/80 dark:bg-neutral-800/80 hover:bg-white dark:hover:bg-neutral-700 rounded-full transition-colors z-10"
              >
                <XMarkIcon className="w-5 h-5 text-neutral-600 dark:text-neutral-300" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-8rem)]">
              {/* Price and time */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400">
                  <ClockIcon className="w-5 h-5" />
                  <span>{selectedMove.requestedTime}</span>
                </div>
                <p className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">
                  €{selectedMove.price}
                </p>
              </div>

              <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">
                Requested by {selectedMove.clientName}
              </p>

              {/* Route */}
              <div className="space-y-3 mb-6">
                <div className="flex items-start gap-3">
                  <div className="w-3 h-3 rounded-full bg-green-500 mt-1 shrink-0" />
                  <div>
                    <p className="font-semibold text-neutral-900 dark:text-neutral-100">
                      {selectedMove.pickup}
                    </p>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      {selectedMove.pickupAddress}
                    </p>
                    <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
                      Floor {selectedMove.floor} · {selectedMove.hasElevator ? 'Elevator available' : 'No elevator'}
                    </p>
                  </div>
                </div>
                <div className="w-px h-6 bg-neutral-300 dark:bg-neutral-600 ml-1.5" />
                <div className="flex items-start gap-3">
                  <div className="w-3 h-3 rounded-full bg-red-500 mt-1 shrink-0" />
                  <div>
                    <p className="font-semibold text-neutral-900 dark:text-neutral-100">
                      {selectedMove.dropoff}
                    </p>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      {selectedMove.dropoffAddress}
                    </p>
                    <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
                      Floor {selectedMove.dropoffFloor} · {selectedMove.dropoffHasElevator ? 'Elevator available' : 'No elevator'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Move details */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-2">
                  Move Details
                </h4>
                <div className="flex flex-wrap gap-2">
                  <span className="text-sm px-3 py-1 bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 rounded-full">
                    {selectedMove.itemCount} items
                  </span>
                  <span className="text-sm px-3 py-1 bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 rounded-full">
                    {selectedMove.crewSize} movers needed
                  </span>
                </div>
              </div>

              {/* Items */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-2">
                  Items to Move
                </h4>
                <div className="flex flex-wrap gap-2">
                  {selectedMove.items.map((item, index) => (
                    <span
                      key={index}
                      className="text-sm px-3 py-1 bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 rounded-full"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>

              {/* Additional services */}
              {selectedMove.additionalServices.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-2">
                    Additional Services
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedMove.additionalServices.map((service, index) => (
                      <span
                        key={index}
                        className="text-sm px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full"
                      >
                        {service}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {selectedMove.notes && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-2">
                    Notes from Client
                  </h4>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 bg-neutral-50 dark:bg-neutral-700/50 rounded-xl p-3">
                    {selectedMove.notes}
                  </p>
                </div>
              )}

              {/* Distance and time */}
              <div className="flex items-center gap-4 mb-6 text-neutral-500 dark:text-neutral-400">
                <div className="flex items-center gap-2">
                  <TruckIcon className="w-5 h-5" />
                  <span>{selectedMove.distance}</span>
                </div>
                <div className="flex items-center gap-2">
                  <ClockIcon className="w-5 h-5" />
                  <span>{selectedMove.estimatedTime}</span>
                </div>
              </div>

              <ButtonPrimary
                onClick={() => handleAcceptMove(selectedMove)}
                className="w-full"
                disabled={acceptingId === selectedMove.id}
              >
                {acceptingId === selectedMove.id ? 'Accepting...' : 'Accept This Move'}
              </ButtonPrimary>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AvailableMovesPage
