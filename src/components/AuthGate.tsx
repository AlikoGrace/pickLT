'use client'

import { useAuth } from '@/context/auth'
import { useMoveSearch } from '@/context/moveSearch'
import { useMoveStatePersistence } from '@/hooks/useMoveStatePersistence'
import { useRouter } from 'next/navigation'
import { useEffect, ReactNode, useCallback } from 'react'

interface AuthGateProps {
  children: ReactNode
  /** The path to redirect back to after authentication */
  redirectBack: string
  /** Optional fallback shown while loading auth state */
  fallback?: ReactNode
}

/**
 * Wraps pages that require authentication.
 * If user is not authenticated, saves the current move state to sessionStorage
 * and redirects to login. After login, the state is restored.
 */
export function AuthGate({ children, redirectBack, fallback }: AuthGateProps) {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  const moveSearch = useMoveSearch()
  const { saveState } = useMoveStatePersistence()

  const handleRedirectToLogin = useCallback(() => {
    // Save all current move search state
    const stateToSave: Record<string, unknown> = {
      pickupLocation: moveSearch.pickupLocation,
      dropoffLocation: moveSearch.dropoffLocation,
      pickupCoordinates: moveSearch.pickupCoordinates,
      dropoffCoordinates: moveSearch.dropoffCoordinates,
      moveDate: moveSearch.moveDate,
      moveType: moveSearch.moveType,
      isInstantMove: moveSearch.isInstantMove,
      homeType: moveSearch.homeType,
      floorLevel: moveSearch.floorLevel,
      elevatorAvailable: moveSearch.elevatorAvailable,
      parkingSituation: moveSearch.parkingSituation,
      pickupStreetAddress: moveSearch.pickupStreetAddress,
      pickupApartmentUnit: moveSearch.pickupApartmentUnit,
      dropoffStreetAddress: moveSearch.dropoffStreetAddress,
      dropoffApartmentUnit: moveSearch.dropoffApartmentUnit,
      dropoffFloorLevel: moveSearch.dropoffFloorLevel,
      dropoffElevatorAvailable: moveSearch.dropoffElevatorAvailable,
      dropoffParkingSituation: moveSearch.dropoffParkingSituation,
      inventory: moveSearch.inventory,
      customItems: moveSearch.customItems,
      packingServiceLevel: moveSearch.packingServiceLevel,
      packingMaterials: moveSearch.packingMaterials,
      arrivalWindow: moveSearch.arrivalWindow,
      crewSize: moveSearch.crewSize,
      vehicleType: moveSearch.vehicleType,
      additionalServices: moveSearch.additionalServices,
      storageWeeks: moveSearch.storageWeeks,
      coverPhoto: moveSearch.coverPhoto,
      galleryPhotos: moveSearch.galleryPhotos,
      contactInfo: moveSearch.contactInfo,
    }

    saveState(stateToSave, redirectBack)
    router.push(`/login?redirect=${encodeURIComponent(redirectBack)}`)
  }, [moveSearch, redirectBack, router, saveState])

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      handleRedirectToLogin()
    }
  }, [isLoading, isAuthenticated, handleRedirectToLogin])

  if (isLoading) {
    return (
      fallback || (
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-neutral-300 border-t-primary-600" />
            <p className="mt-3 text-sm text-neutral-500">Loading...</p>
          </div>
        </div>
      )
    )
  }

  if (!isAuthenticated) {
    return (
      fallback || (
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-neutral-300 border-t-primary-600" />
            <p className="mt-3 text-sm text-neutral-500">Redirecting to sign in...</p>
          </div>
        </div>
      )
    )
  }

  return <>{children}</>
}
