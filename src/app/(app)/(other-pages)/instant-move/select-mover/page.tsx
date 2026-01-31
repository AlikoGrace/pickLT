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
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useMemo } from 'react'

// Mover types
interface Mover {
  id: string
  name: string
  photo: string
  rating: number
  totalMoves: number
  vehicleType: 'small_van' | 'medium_van' | 'large_van' | 'truck'
  vehicleName: string
  vehiclePlate: string
  crewSize: number
  maxWeight: number // kg
  yearsExperience: number
  languages: string[]
  responseTime: number // minutes
  baseRate: number // per km
  isVerified: boolean
  isFavorite?: boolean
}

// Generate dummy movers - in production, this would come from an API
const AVAILABLE_MOVERS: Mover[] = [
  {
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
  },
  {
    id: 'mover-002',
    name: 'Thomas Weber',
    photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&crop=faces',
    rating: 4.7,
    totalMoves: 892,
    vehicleType: 'small_van',
    vehicleName: 'VW Transporter',
    vehiclePlate: 'B-TW 1523',
    crewSize: 1,
    maxWeight: 800,
    yearsExperience: 5,
    languages: ['German'],
    responseTime: 8,
    baseRate: 1.80,
    isVerified: true,
  },
  {
    id: 'mover-003',
    name: 'Andreas Müller',
    photo: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&crop=faces',
    rating: 4.8,
    totalMoves: 2156,
    vehicleType: 'large_van',
    vehicleName: 'MAN TGE',
    vehiclePlate: 'B-AM 8834',
    crewSize: 2,
    maxWeight: 1800,
    yearsExperience: 12,
    languages: ['German', 'English', 'Polish'],
    responseTime: 18,
    baseRate: 2.80,
    isVerified: true,
    isFavorite: true,
  },
  {
    id: 'mover-004',
    name: 'Stefan Becker',
    photo: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&h=200&fit=crop&crop=faces',
    rating: 4.6,
    totalMoves: 534,
    vehicleType: 'truck',
    vehicleName: 'IVECO Daily',
    vehiclePlate: 'B-SB 2290',
    crewSize: 3,
    maxWeight: 3500,
    yearsExperience: 7,
    languages: ['German', 'Turkish'],
    responseTime: 25,
    baseRate: 3.50,
    isVerified: true,
  },
  {
    id: 'mover-005',
    name: 'Klaus Fischer',
    photo: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&h=200&fit=crop&crop=faces',
    rating: 4.5,
    totalMoves: 321,
    vehicleType: 'small_van',
    vehicleName: 'Ford Transit Connect',
    vehiclePlate: 'B-KF 6671',
    crewSize: 1,
    maxWeight: 600,
    yearsExperience: 3,
    languages: ['German', 'English'],
    responseTime: 5,
    baseRate: 1.50,
    isVerified: false,
  },
]

// Vehicle type labels
const VEHICLE_LABELS: Record<string, string> = {
  small_van: 'Small Van',
  medium_van: 'Medium Van',
  large_van: 'Large Van',
  truck: 'Truck',
}

// Vehicle capacity descriptions
const VEHICLE_CAPACITY: Record<string, string> = {
  small_van: 'Studio / 1 room',
  medium_van: '1-2 bedrooms',
  large_van: '2-3 bedrooms',
  truck: '3+ bedrooms',
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

  const inventoryCount = Object.values(inventory).reduce((sum, qty) => sum + qty, 0) + customItems.length
  const photoCount = (coverPhoto ? 1 : 0) + galleryPhotos.length

  // Calculate route distance using Mapbox Directions API
  useEffect(() => {
    const calculateRoute = async () => {
      if (!pickupCoordinates || !dropoffCoordinates) {
        // Use dummy distance if no coordinates
        setRouteDistance(15000) // 15km
        setRouteDuration(1800) // 30 min
        setIsLoading(false)
        return
      }

      try {
        const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN
        if (!mapboxToken) {
          setRouteDistance(15000)
          setRouteDuration(1800)
          setIsLoading(false)
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

      setIsLoading(false)
    }

    // Simulate loading for better UX
    const timer = setTimeout(calculateRoute, 1500)
    return () => clearTimeout(timer)
  }, [pickupCoordinates, dropoffCoordinates])

  // Calculate prices for each mover
  const moversWithPrices = useMemo(() => {
    if (!routeDistance) return []

    const distanceKm = routeDistance / 1000

    return AVAILABLE_MOVERS.map((mover) => {
      // Base calculation: distance * rate
      let price = distanceKm * mover.baseRate

      // Add base fee
      const baseFee = 25

      // Add crew surcharge (€10 per additional crew member)
      const crewSurcharge = (mover.crewSize - 1) * 10

      // Add item-based fee (larger vehicles handle more items more efficiently)
      const itemFeePerItem = mover.vehicleType === 'truck' ? 2 : 
                            mover.vehicleType === 'large_van' ? 2.5 :
                            mover.vehicleType === 'medium_van' ? 3 : 3.5
      const itemsFee = inventoryCount * itemFeePerItem

      // Total price
      const totalPrice = Math.round(baseFee + price + crewSurcharge + itemsFee)

      // Estimated arrival time
      const estimatedArrival = mover.responseTime

      return {
        ...mover,
        price: totalPrice,
        estimatedArrival,
        distanceKm,
      }
    }).sort((a, b) => a.price - b.price) // Sort by price (cheapest first)
  }, [routeDistance, inventoryCount])

  const handleSelectMover = (moverId: string) => {
    setSelectedMover(moverId)
  }

  const handleConfirmMover = () => {
    if (!selectedMover) return

    const mover = moversWithPrices.find((m) => m.id === selectedMover)
    if (!mover) return

    // Store selected mover in sessionStorage (or could add to context)
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
          We&apos;re calculating routes and finding the best movers for your move
        </p>
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

      <div className="container py-6 pb-32">
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
                  <Image
                    src={mover.photo}
                    alt={mover.name}
                    width={64}
                    height={64}
                    className="rounded-full object-cover"
                  />
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
                    {mover.isFavorite && (
                      <span className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full">
                        Popular
                      </span>
                    )}
                  </div>
                  
                  {/* Rating & Experience */}
                  <div className="flex items-center gap-3 text-sm text-neutral-500 dark:text-neutral-400 mb-2">
                    <span className="flex items-center gap-1">
                      <HugeiconsIcon icon={StarIcon} size={14} strokeWidth={1.5} className="text-amber-500" />
                      {mover.rating}
                    </span>
                    <span>•</span>
                    <span>{mover.totalMoves} moves</span>
                    <span>•</span>
                    <span>{mover.yearsExperience}y exp</span>
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
                      {VEHICLE_LABELS[mover.vehicleType]}
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
                      {VEHICLE_CAPACITY[mover.vehicleType]}
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
        <div className="container flex gap-3">
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
