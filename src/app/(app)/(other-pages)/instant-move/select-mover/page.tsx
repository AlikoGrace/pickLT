'use client'

import { useMoveSearch, Coordinates } from '@/context/moveSearch'
import ButtonPrimary from '@/shared/ButtonPrimary'
import ButtonSecondary from '@/shared/ButtonSecondary'
import {
  ArrowLeft02Icon,
  CheckmarkCircle02Icon,
  DeliveryTruck01Icon,
  Loading03Icon,
  Route01Icon,
  StarIcon,
  UserMultiple02Icon,
  WeightScale01Icon,
  Alert02Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useMemo } from 'react'

// Mover types - matches API response from /api/movers/nearby
interface Mover {
  $id: string
  userId: string
  businessName?: string
  fullName?: string
  profilePhoto?: string
  profilePhotoUrl?: string
  rating?: number
  totalCompletedMoves?: number
  vehicleType?: string
  vehicleMake?: string
  vehicleModel?: string
  vehiclePlateNumber?: string
  crewSize?: number
  maxCarryWeight?: number
  yearsExperience?: number
  languages?: string[]
  isVerified?: boolean
  verificationStatus?: string
  currentLatitude?: number
  currentLongitude?: number
  distanceKm?: number
  baseRatePerKm?: number
}

// Vehicle type labels
const VEHICLE_LABELS: Record<string, string> = {
  small_van: 'Small Van',
  medium_van: 'Medium Van',
  large_van: 'Large Van',
  truck: 'Truck',
  car: 'Car',
}

// Vehicle capacity descriptions
const VEHICLE_CAPACITY: Record<string, string> = {
  small_van: 'Studio / 1 room',
  medium_van: '1-2 bedrooms',
  large_van: '2-3 bedrooms',
  truck: '3+ bedrooms',
  car: 'Few small items',
}

// Helper functions
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

const SelectMoverPage = () => {
  const router = useRouter()
  const {
    pickupLocation,
    dropoffLocation,
    pickupCoordinates,
    dropoffCoordinates,
    inventory,
    customItems,
    coverPhoto,
    galleryPhotos,
  } = useMoveSearch()

  const [isLoading, setIsLoading] = useState(true)
  const [selectedMover, setSelectedMover] = useState<string | null>(null)
  const [routeDistance, setRouteDistance] = useState<number | null>(null)
  const [routeDuration, setRouteDuration] = useState<number | null>(null)
  const [apiMovers, setApiMovers] = useState<Mover[]>([])
  const [fetchError, setFetchError] = useState<string | null>(null)

  const inventoryCount = Object.values(inventory).reduce((sum, qty) => sum + qty, 0) + customItems.length
  const photoCount = (coverPhoto ? 1 : 0) + galleryPhotos.length

  // Calculate route distance using Mapbox Directions API
  useEffect(() => {
    const calculateRoute = async () => {
      if (!pickupCoordinates || !dropoffCoordinates) {
        setRouteDistance(15000) // 15km fallback
        setRouteDuration(1800)
        return
      }

      try {
        const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN
        if (!mapboxToken) {
          setRouteDistance(15000)
          setRouteDuration(1800)
          return
        }

        const response = await fetch(
          `https://api.mapbox.com/directions/v5/mapbox/driving/${pickupCoordinates.longitude},${pickupCoordinates.latitude};${dropoffCoordinates.longitude},${dropoffCoordinates.latitude}?overview=false&access_token=${mapboxToken}`
        )

        if (response.ok) {
          const data = await response.json()
          if (data.routes && data.routes.length > 0) {
            setRouteDistance(data.routes[0].distance)
            setRouteDuration(data.routes[0].duration)
          }
        }
      } catch (error) {
        console.error('Failed to calculate route:', error)
        setRouteDistance(15000)
        setRouteDuration(1800)
      }
    }

    calculateRoute()
  }, [pickupCoordinates, dropoffCoordinates])

  // Fetch nearby movers from API
  useEffect(() => {
    const fetchMovers = async () => {
      try {
        setFetchError(null)
        const lat = pickupCoordinates?.latitude || 52.52
        const lng = pickupCoordinates?.longitude || 13.405

        const res = await fetch(`/api/movers/nearby?lat=${lat}&lng=${lng}&radiusKm=25`)
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}))
          throw new Error(errData.error || 'Failed to fetch movers')
        }
        const data = await res.json()
        setApiMovers(data.movers || [])
      } catch (err) {
        console.error('Failed to fetch nearby movers:', err)
        setFetchError(err instanceof Error ? err.message : 'Failed to find movers')
      } finally {
        setIsLoading(false)
      }
    }

    // Small delay for better UX
    const timer = setTimeout(fetchMovers, 1000)
    return () => clearTimeout(timer)
  }, [pickupCoordinates])

  // Calculate prices for each mover
  const moversWithPrices = useMemo(() => {
    if (!routeDistance || apiMovers.length === 0) return []

    const distanceKm = routeDistance / 1000

    return apiMovers.map((mover) => {
      const baseRate = mover.baseRatePerKm || 2.0
      const crewSize = mover.crewSize || 1
      const vehicleType = mover.vehicleType || 'small_van'

      // Base calculation: distance * rate
      let price = distanceKm * baseRate

      // Add base fee
      const baseFee = 25

      // Add crew surcharge (€10 per additional crew member)
      const crewSurcharge = (crewSize - 1) * 10

      // Add item-based fee
      const itemFeePerItem = vehicleType === 'truck' ? 2 :
                            vehicleType === 'large_van' ? 2.5 :
                            vehicleType === 'medium_van' ? 3 : 3.5
      const itemsFee = inventoryCount * itemFeePerItem

      // Total price
      const totalPrice = Math.round(baseFee + price + crewSurcharge + itemsFee)

      // Estimated arrival from distance
      const estimatedArrival = mover.distanceKm
        ? Math.max(5, Math.round(mover.distanceKm * 3))
        : 15

      return {
        id: mover.$id,
        name: mover.businessName || mover.fullName || 'Mover',
        profilePhoto: mover.profilePhotoUrl || mover.profilePhoto || '',
        rating: mover.rating || 0,
        totalMoves: mover.totalCompletedMoves || 0,
        vehicleType,
        vehicleName: [mover.vehicleMake, mover.vehicleModel].filter(Boolean).join(' ') || VEHICLE_LABELS[vehicleType] || 'Vehicle',
        vehiclePlate: mover.vehiclePlateNumber || '',
        crewSize,
        maxWeight: mover.maxCarryWeight || 500,
        yearsExperience: mover.yearsExperience || 0,
        languages: mover.languages || ['German'],
        isVerified: mover.verificationStatus === 'verified',
        price: totalPrice,
        estimatedArrival,
        distanceKm: mover.distanceKm || distanceKm,
        currentLatitude: mover.currentLatitude || null,
        currentLongitude: mover.currentLongitude || null,
      }
    }).sort((a, b) => a.price - b.price) // Sort by price
  }, [routeDistance, inventoryCount, apiMovers])

  const handleSelectMover = (moverId: string) => {
    setSelectedMover(moverId)
  }

  const handleConfirmMover = () => {
    if (!selectedMover) return

    const mover = moversWithPrices.find((m) => m.id === selectedMover)
    if (!mover) return

    // Store selected mover in sessionStorage
    sessionStorage.setItem('selectedMover', JSON.stringify({
      ...mover,
      routeDistance,
      routeDuration,
    }))

    // Navigate to the instant-move page with the map
    router.push('/instant-move')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white dark:bg-neutral-900 flex flex-col items-center justify-center">
        <HugeiconsIcon
          icon={Loading03Icon}
          size={48}
          strokeWidth={1.5}
          className="text-primary-600 animate-spin mb-4"
        />
        <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-2">
          Finding available movers...
        </h2>
        <p className="text-neutral-500 dark:text-neutral-400 text-center max-w-sm">
          We&apos;re searching for verified movers near your pickup location
        </p>
      </div>
    )
  }

  // Error or no movers found
  if (fetchError || moversWithPrices.length === 0) {
    return (
      <div className="min-h-screen bg-white dark:bg-neutral-900 flex flex-col items-center justify-center p-6">
        <HugeiconsIcon
          icon={Alert02Icon}
          size={48}
          strokeWidth={1.5}
          className="text-amber-500 mb-4"
        />
        <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-2">
          {fetchError ? 'Unable to find movers' : 'No movers available'}
        </h2>
        <p className="text-neutral-500 dark:text-neutral-400 text-center max-w-sm mb-6">
          {fetchError || 'No verified movers are currently online near your location. Please try again in a few minutes.'}
        </p>
        <div className="flex gap-3">
          <ButtonSecondary href="/instant-move/photos">
            Go Back
          </ButtonSecondary>
          <ButtonPrimary onClick={() => window.location.reload()}>
            Try Again
          </ButtonPrimary>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
        <div className="container">
          <div className="flex items-center justify-between h-16">
            <Link
              href="/instant-move/photos"
              className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
            >
              <HugeiconsIcon icon={ArrowLeft02Icon} size={20} strokeWidth={1.5} />
              <span className="text-sm font-medium">Back</span>
            </Link>
            <div className="text-center">
              <p className="text-sm font-medium text-neutral-900 dark:text-white">
                Select Mover
              </p>
              <p className="text-xs text-neutral-500">Step 4 of 4</p>
            </div>
            <div className="w-16" />
          </div>
        </div>
      </div>

      <div className="container max-w-4xl py-6 pb-32">
        {/* Move Summary Card */}
        <div className="rounded-2xl bg-white dark:bg-neutral-800 shadow-sm p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex-1">
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">From</p>
              <p className="text-sm font-medium text-neutral-900 dark:text-white line-clamp-1">
                {pickupLocation?.split(',')[0] || 'Pickup location'}
              </p>
            </div>
            <div className="px-4">
              <HugeiconsIcon
                icon={Route01Icon}
                size={20}
                strokeWidth={1.5}
                className="text-neutral-400"
              />
            </div>
            <div className="flex-1 text-right">
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">To</p>
              <p className="text-sm font-medium text-neutral-900 dark:text-white line-clamp-1">
                {dropoffLocation?.split(',')[0] || 'Drop-off location'}
              </p>
            </div>
          </div>
          <div className="flex items-center justify-center gap-4 pt-3 border-t border-neutral-100 dark:border-neutral-700">
            {routeDistance && (
              <span className="text-sm text-neutral-600 dark:text-neutral-300">
                {formatDistance(routeDistance)}
              </span>
            )}
            {routeDistance && routeDuration && (
              <span className="text-neutral-300 dark:text-neutral-600">•</span>
            )}
            {routeDuration && (
              <span className="text-sm text-neutral-600 dark:text-neutral-300">
                ~{formatDuration(routeDuration)}
              </span>
            )}
            <span className="text-neutral-300 dark:text-neutral-600">•</span>
            <span className="text-sm text-neutral-600 dark:text-neutral-300">
              {inventoryCount} items
            </span>
            <span className="text-neutral-300 dark:text-neutral-600">•</span>
            <span className="text-sm text-neutral-600 dark:text-neutral-300">
              {photoCount} photos
            </span>
          </div>
        </div>

        {/* Movers List */}
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
          Available movers ({moversWithPrices.length})
        </h2>

        <div className="space-y-4">
          {moversWithPrices.map((mover) => (
            <div
              key={mover.id}
              onClick={() => handleSelectMover(mover.id)}
              className={`
                rounded-2xl bg-white dark:bg-neutral-800 shadow-sm p-4 cursor-pointer transition-all
                ${selectedMover === mover.id 
                  ? 'ring-2 ring-primary-500 border-transparent' 
                  : 'border border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600'
                }
              `}
            >
              <div className="flex items-start gap-4">
                {/* Mover Photo */}
                <div className="relative shrink-0">
                  {mover.profilePhoto ? (
                    <Image
                      src={mover.profilePhoto}
                      alt={mover.name}
                      width={64}
                      height={64}
                      className="rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                      <span className="text-xl font-bold text-primary-600 dark:text-primary-400">
                        {mover.name.charAt(0)}
                      </span>
                    </div>
                  )}
                  {mover.isVerified && (
                    <div className="absolute -bottom-1 -right-1 bg-white dark:bg-neutral-800 rounded-full p-0.5">
                      <HugeiconsIcon
                        icon={CheckmarkCircle02Icon}
                        size={18}
                        strokeWidth={1.5}
                        className="text-green-500"
                      />
                    </div>
                  )}
                </div>

                {/* Mover Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-neutral-900 dark:text-white">
                      {mover.name}
                    </h3>
                  </div>
                  
                  {/* Rating & Experience */}
                  <div className="flex items-center gap-3 text-sm text-neutral-500 dark:text-neutral-400 mb-2">
                    {mover.rating > 0 && (
                      <>
                        <span className="flex items-center gap-1">
                          <HugeiconsIcon icon={StarIcon} size={14} strokeWidth={1.5} className="text-amber-500" />
                          {mover.rating.toFixed(1)}
                        </span>
                        <span>•</span>
                      </>
                    )}
                    <span>{mover.totalMoves} move{mover.totalMoves !== 1 ? 's' : ''}</span>
                    {mover.yearsExperience > 0 && (
                      <>
                        <span>•</span>
                        <span>{mover.yearsExperience}y exp</span>
                      </>
                    )}
                  </div>

                  {/* Vehicle Info */}
                  <div className="flex items-center gap-2 text-sm">
                    <HugeiconsIcon 
                      icon={DeliveryTruck01Icon} 
                      size={16} 
                      strokeWidth={1.5} 
                      className="text-neutral-400"
                    />
                    <span className="text-neutral-700 dark:text-neutral-300">
                      {mover.vehicleName}
                    </span>
                    <span className="text-xs bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 px-2 py-0.5 rounded-full">
                      {VEHICLE_LABELS[mover.vehicleType] || mover.vehicleType}
                    </span>
                  </div>

                  {/* Capacity & Crew */}
                  <div className="flex items-center gap-4 mt-2 text-xs text-neutral-500 dark:text-neutral-400">
                    <span className="flex items-center gap-1">
                      <HugeiconsIcon icon={WeightScale01Icon} size={14} strokeWidth={1.5} />
                      {mover.maxWeight}kg max
                    </span>
                    <span className="flex items-center gap-1">
                      <HugeiconsIcon icon={UserMultiple02Icon} size={14} strokeWidth={1.5} />
                      {mover.crewSize} mover{mover.crewSize > 1 ? 's' : ''}
                    </span>
                    <span className="text-neutral-400">
                      {VEHICLE_CAPACITY[mover.vehicleType] || ''}
                    </span>
                  </div>
                </div>

                {/* Price & ETA */}
                <div className="text-right shrink-0">
                  <p className="text-xl font-bold text-neutral-900 dark:text-white">
                    €{mover.price}
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                    ~{mover.estimatedArrival} min away
                  </p>
                </div>
              </div>

              {/* Selection Indicator */}
              {selectedMover === mover.id && (
                <div className="mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-700">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-primary-600 dark:text-primary-400 font-medium">
                      Selected
                    </span>
                    <span className="text-neutral-500 dark:text-neutral-400">
                      Languages: {mover.languages.join(', ')}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Pricing Info */}
        <div className="mt-6 rounded-xl bg-neutral-100 dark:bg-neutral-800/50 p-4">
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            <strong>How pricing works:</strong> Prices include base fee, distance ({routeDistance ? formatDistance(routeDistance) : '—'}), 
            crew size, vehicle capacity, and handling for {inventoryCount} items. 
            Final price may vary based on actual conditions.
          </p>
        </div>
      </div>

      {/* Fixed Bottom Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 p-4">
        <div className="container max-w-3xl mx-auto flex gap-3">
          <ButtonSecondary
            href="/instant-move/photos"
            className="flex-1"
          >
            Back
          </ButtonSecondary>
          <ButtonPrimary
            onClick={handleConfirmMover}
            className="flex-1"
            disabled={!selectedMover}
          >
            {selectedMover 
              ? `Confirm · €${moversWithPrices.find(m => m.id === selectedMover)?.price || 0}`
              : 'Select a mover'
            }
          </ButtonPrimary>
        </div>
      </div>
    </div>
  )
}

export default SelectMoverPage
