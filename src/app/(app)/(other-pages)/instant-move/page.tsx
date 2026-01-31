'use client'

import MapboxMap, { MapCoordinates } from '@/components/MapboxMap'
import { useMoveSearch } from '@/context/moveSearch'
import ButtonPrimary from '@/shared/ButtonPrimary'
import ButtonSecondary from '@/shared/ButtonSecondary'
import Logo from '@/shared/Logo'
import {
  Call02Icon,
  Cancel01Icon,
  CheckmarkCircle02Icon,
  DeliveryTruck01Icon,
  Location01Icon,
  Message01Icon,
  StarIcon,
  Time01Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

// Dummy mover data
const DUMMY_MOVER = {
  id: 'mover-001',
  name: 'Michael Schmidt',
  photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=faces',
  rating: 4.9,
  totalMoves: 1247,
  vehicleType: 'Mercedes Sprinter',
  vehiclePlate: 'B-MS 4721',
  crewSize: 2,
  crewMembers: ['Michael Schmidt', 'Thomas Weber'],
  etaMinutes: 12,
  phone: '+49 170 1234567',
  yearsExperience: 8,
  languages: ['German', 'English'],
  specializations: ['Furniture', 'Fragile items', 'Piano'],
}

// Default coordinates for demo (Berlin area)
const DEFAULT_PICKUP: MapCoordinates = { latitude: 52.52, longitude: 13.405 }
const DEFAULT_DROPOFF: MapCoordinates = { latitude: 52.48, longitude: 13.45 }

type SearchPhase = 'searching' | 'found' | 'arriving' | 'arrived'

const InstantMovePage = () => {
  const router = useRouter()
  const {
    pickupLocation,
    dropoffLocation,
    pickupCoordinates: contextPickupCoords,
    dropoffCoordinates: contextDropoffCoords,
  } = useMoveSearch()

  const [phase, setPhase] = useState<SearchPhase>('searching')
  const [searchProgress, setSearchProgress] = useState(0)
  const [etaMinutes, setEtaMinutes] = useState(DUMMY_MOVER.etaMinutes)
  const [moverDistance, setMoverDistance] = useState(2.4)

  // Use context coordinates or defaults
  const pickupCoords = contextPickupCoords || DEFAULT_PICKUP
  const dropoffCoords = contextDropoffCoords || DEFAULT_DROPOFF

  // Calculate mover position based on progress (interpolate between a start point and pickup)
  const [moverCoords, setMoverCoords] = useState<MapCoordinates>({
    latitude: pickupCoords.latitude + 0.02,
    longitude: pickupCoords.longitude - 0.03,
  })

  // Simulate search progress
  useEffect(() => {
    if (phase === 'searching') {
      const interval = setInterval(() => {
        setSearchProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval)
            setPhase('found')
            return 100
          }
          return prev + Math.random() * 15
        })
      }, 500)
      return () => clearInterval(interval)
    }
  }, [phase])

  // Simulate mover approaching
  useEffect(() => {
    if (phase === 'found' || phase === 'arriving') {
      const interval = setInterval(() => {
        setEtaMinutes((prev) => {
          if (prev <= 1) {
            clearInterval(interval)
            setPhase('arrived')
            return 0
          }
          return prev - 1
        })
        setMoverDistance((prev) => Math.max(0, prev - 0.2))
        
        // Move the mover closer to pickup
        setMoverCoords((prev) => ({
          latitude: prev.latitude + (pickupCoords.latitude - prev.latitude) * 0.15,
          longitude: prev.longitude + (pickupCoords.longitude - prev.longitude) * 0.15,
        }))
      }, 3000)
      return () => clearInterval(interval)
    }
  }, [phase, pickupCoords])

  // Auto transition to arriving phase
  useEffect(() => {
    if (phase === 'found') {
      const timeout = setTimeout(() => setPhase('arriving'), 2000)
      return () => clearTimeout(timeout)
    }
  }, [phase])

  // Set mover at pickup when arrived
  useEffect(() => {
    if (phase === 'arrived') {
      setMoverCoords(pickupCoords)
    }
  }, [phase, pickupCoords])

  const handleCancel = () => {
    router.push('/move-choice')
  }

  const handleCallMover = () => {
    window.open(`tel:${DUMMY_MOVER.phone}`)
  }

  const handleMessageMover = () => {
    alert('Chat feature coming soon!')
  }

  const renderSearchingPhase = () => (
    <div className="flex flex-col items-center justify-center py-16">
      {/* Logo */}
      <div className="mb-8">
        <Logo className="w-24 sm:w-28" />
      </div>

      {/* Animated search indicator */}
      <div className="relative w-20 h-20 mb-8">
        <div className="absolute inset-0 rounded-full border-2 border-neutral-200 dark:border-neutral-700" />
        <div 
          className="absolute inset-0 rounded-full border-2 border-neutral-900 border-t-transparent dark:border-white animate-spin"
          style={{ animationDuration: '1s' }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <HugeiconsIcon
            icon={DeliveryTruck01Icon}
            size={28}
            strokeWidth={1.5}
            className="text-neutral-700 dark:text-neutral-200"
          />
        </div>
      </div>
      
      <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-2">
        Finding your mover...
      </h2>
      <p className="text-neutral-500 dark:text-neutral-400 text-center mb-8">
        Looking for available movers near you
      </p>

      {/* Progress bar */}
      <div className="w-full max-w-xs mb-8">
        <div className="h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-neutral-900 dark:bg-white transition-all duration-300 ease-out"
            style={{ width: `${Math.min(searchProgress, 100)}%` }}
          />
        </div>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 text-center mt-3">
          {Math.round(Math.min(searchProgress, 100))}%
        </p>
      </div>

      <ButtonSecondary onClick={handleCancel}>
        Cancel search
      </ButtonSecondary>
    </div>
  )

  const renderMoverCard = () => (
    <div className="rounded-2xl border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-800 overflow-hidden">
      {/* Mover Header */}
      <div className="p-5 border-b border-neutral-200 dark:border-neutral-700">
        <div className="flex items-start gap-4">
          <div className="relative shrink-0">
            <div className="w-14 h-14 rounded-full bg-neutral-200 dark:bg-neutral-700 overflow-hidden">
              <Image
                src={DUMMY_MOVER.photo}
                alt={DUMMY_MOVER.name}
                width={56}
                height={56}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-neutral-900 dark:text-white">
              {DUMMY_MOVER.name}
            </h3>
            <div className="flex items-center gap-1.5 mt-1">
              <HugeiconsIcon
                icon={StarIcon}
                size={14}
                strokeWidth={1.5}
                className="text-neutral-900 dark:text-white fill-current"
              />
              <span className="text-sm font-medium text-neutral-900 dark:text-white">
                {DUMMY_MOVER.rating}
              </span>
              <span className="text-sm text-neutral-500 dark:text-neutral-400">
                · {DUMMY_MOVER.totalMoves} moves
              </span>
            </div>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
              {DUMMY_MOVER.yearsExperience} years experience
            </p>
          </div>
        </div>
      </div>

      {/* ETA Section */}
      {phase !== 'arrived' && (
        <div className="px-5 py-4 bg-neutral-50 dark:bg-neutral-800/50 border-b border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                {phase === 'found' ? 'Mover found!' : 'Arriving in'}
              </p>
              <p className="text-2xl font-semibold text-neutral-900 dark:text-white mt-0.5">
                {etaMinutes} min
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Distance</p>
              <p className="text-lg font-medium text-neutral-900 dark:text-white mt-0.5">
                {moverDistance.toFixed(1)} km
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Arrived Banner */}
      {phase === 'arrived' && (
        <div className="px-5 py-4 bg-neutral-50 dark:bg-neutral-800/50 border-b border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center gap-3">
            <HugeiconsIcon
              icon={CheckmarkCircle02Icon}
              size={24}
              strokeWidth={1.5}
              className="text-neutral-900 dark:text-white shrink-0"
            />
            <div>
              <p className="text-base font-semibold text-neutral-900 dark:text-white">
                Your mover has arrived!
              </p>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                They&apos;re waiting at your pickup location
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Vehicle & Crew Info */}
      <div className="p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-700 flex items-center justify-center shrink-0">
            <HugeiconsIcon
              icon={DeliveryTruck01Icon}
              size={20}
              strokeWidth={1.5}
              className="text-neutral-600 dark:text-neutral-300"
            />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-neutral-900 dark:text-white">
              {DUMMY_MOVER.vehicleType}
            </p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              {DUMMY_MOVER.vehiclePlate}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-700 flex items-center justify-center shrink-0">
            <span className="text-sm font-semibold text-neutral-600 dark:text-neutral-300">
              {DUMMY_MOVER.crewSize}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-neutral-900 dark:text-white">
              Crew members
            </p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 truncate">
              {DUMMY_MOVER.crewMembers.join(', ')}
            </p>
          </div>
        </div>

        {/* Specializations */}
        <div className="flex flex-wrap gap-2 pt-1">
          {DUMMY_MOVER.specializations.map((spec) => (
            <span
              key={spec}
              className="px-2.5 py-1 text-xs font-medium bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 rounded-full"
            >
              {spec}
            </span>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="p-5 pt-0 flex gap-3">
        <ButtonSecondary onClick={handleCallMover} className="flex-1">
          <HugeiconsIcon icon={Call02Icon} size={18} strokeWidth={1.5} className="mr-2" />
          Call
        </ButtonSecondary>
        <ButtonSecondary onClick={handleMessageMover} className="flex-1">
          <HugeiconsIcon icon={Message01Icon} size={18} strokeWidth={1.5} className="mr-2" />
          Message
        </ButtonSecondary>
      </div>
    </div>
  )

  const renderMap = () => (
    <div className="relative h-64 sm:h-72 md:h-80 rounded-2xl overflow-hidden mb-5">
      <MapboxMap
        pickupCoordinates={pickupCoords}
        dropoffCoordinates={dropoffCoords}
        moverCoordinates={phase !== 'searching' ? moverCoords : undefined}
        showRoute={true}
        className="w-full h-full"
      />
    </div>
  )

  const renderLocationSummary = () => (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-800 mb-5">
      <div className="flex items-center gap-3">
        <div className="flex flex-col items-center">
          <div className="w-2.5 h-2.5 rounded-full bg-neutral-900 dark:bg-white" />
          <div className="w-px h-8 bg-neutral-300 dark:bg-neutral-600" />
          <div className="w-2.5 h-2.5 rounded-full border-2 border-neutral-900 dark:border-white" />
        </div>
        <div className="flex-1 min-w-0 space-y-3">
          <div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">Pickup</p>
            <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">
              {pickupLocation || 'Berlin, Germany'}
            </p>
          </div>
          <div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">Drop-off</p>
            <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">
              {dropoffLocation || 'Munich, Germany'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-900">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-700">
        <div className="mx-auto max-w-3xl px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-base font-semibold text-neutral-900 dark:text-white">
              {phase === 'searching' ? 'Finding mover...' : 
               phase === 'arrived' ? 'Mover arrived!' : 'Your mover is on the way'}
            </h1>
            <button
              onClick={handleCancel}
              className="p-2 -mr-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition"
            >
              <HugeiconsIcon
                icon={Cancel01Icon}
                size={20}
                strokeWidth={1.5}
                className="text-neutral-500"
              />
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-5">
        {phase === 'searching' ? (
          renderSearchingPhase()
        ) : (
          <>
            {renderMap()}
            {renderLocationSummary()}
            {renderMoverCard()}
            
            {/* Cancel/Complete Actions */}
            <div className="mt-5">
              {phase !== 'arrived' ? (
                <ButtonSecondary onClick={handleCancel} className="w-full">
                  Cancel move
                </ButtonSecondary>
              ) : (
                <ButtonPrimary href="/checkout" className="w-full">
                  Proceed to checkout
                </ButtonPrimary>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default InstantMovePage
