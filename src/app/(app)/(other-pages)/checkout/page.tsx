'use client'

import { AuthGate } from '@/components/AuthGate'
import { useAuth } from '@/context/auth'
import { StoredMove, useMoveSearch } from '@/context/moveSearch'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { DescriptionDetails, DescriptionList, DescriptionTerm } from '@/shared/description-list'
import { Divider } from '@/shared/divider'
import {
  Coins01Icon,
  DeliveryTruck01Icon,
  FlashIcon,
  Route01Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import Form from 'next/form'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import React, { Suspense, useEffect, useState } from 'react'
import PayWith, { PaymentMethod } from './PayWith'
import YourMove from './YourMove'

// Helper to format labels
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
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-GB', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return dateStr
  }
}

// Helper to format distance
const formatDistance = (meters: number): string => {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} km`
  }
  return `${Math.round(meters)} m`
}

// Helper to format duration
const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.ceil((seconds % 3600) / 60)
  
  if (hours > 0) {
    return `${hours}h ${minutes}min`
  }
  return `${minutes} min`
}

const CheckoutContent = () => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  
  // Get route info and price from URL params (passed from instant-move page)
  const routeDistanceParam = searchParams.get('distance')
  const routeDurationParam = searchParams.get('duration')
  const priceParam = searchParams.get('price')
  const routeDistance = routeDistanceParam ? parseFloat(routeDistanceParam) : undefined
  const routeDuration = routeDurationParam ? parseFloat(routeDurationParam) : undefined
  const moverPrice = priceParam ? parseFloat(priceParam) : undefined
  
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')

  const {
    isInstantMove,
    moveType,
    moveDate,
    pickupStreetAddress,
    pickupLocation,
    pickupApartmentUnit,
    dropoffStreetAddress,
    dropoffLocation,
    dropoffApartmentUnit,
    dropoffFloorLevel,
    homeType,
    floorLevel,
    elevatorAvailable,
    dropoffElevatorAvailable,
    parkingSituation,
    dropoffParkingSituation,
    arrivalWindow,
    packingServiceLevel,
    additionalServices,
    storageWeeks,
    crewSize,
    vehicleType,
    inventory,
    customItems,
    coverPhoto,
    galleryPhotos,
    contactInfo,
    updateContactInfo,
    addStoredMove,
    reset,
  } = useMoveSearch()

  // Auto-populate contact info from authenticated user
  useEffect(() => {
    if (user && !contactInfo.fullName && !contactInfo.email) {
      updateContactInfo({
        fullName: user.fullName || '',
        email: user.email || '',
        phoneNumber: user.phone || '',
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  useEffect(() => {
    document.documentElement.scrollTo({
      top: 0,
      behavior: 'instant',
    })
  }, [])

  // Calculate prices based on move type
  const getBasePrice = () => {
    if (isInstantMove) {
      // Use the mover's price if passed from select-mover page
      if (moverPrice) {
        return moverPrice
      }
      // Fallback: calculate based on distance
      if (routeDistance) {
        const distanceKm = routeDistance / 1000
        // Base price: €30 + €2/km
        return Math.round(30 + distanceKm * 2)
      }
      return 49 // Default instant move base price
    }
    // Scheduled move pricing
    return moveType === 'premium' ? 299 : moveType === 'regular' ? 199 : 99
  }

  const basePrice = getBasePrice()
  const packingPrice = isInstantMove ? 0 : (packingServiceLevel === 'full' ? 250 : packingServiceLevel === 'unpacking' ? 350 : packingServiceLevel === 'partial' ? 150 : 0)
  const servicesPrice = isInstantMove ? 0 : additionalServices.length * 50
  const storagePrice = isInstantMove ? 0 : storageWeeks * 30
  
  // Item-based pricing for instant moves - already included in moverPrice if available
  const inventoryCount = Object.values(inventory).reduce((sum, qty) => sum + qty, 0) + customItems.length
  const itemsPrice = isInstantMove && !moverPrice ? inventoryCount * 5 : 0 // Only add if no mover price
  
  const subtotal = basePrice + packingPrice + servicesPrice + storagePrice + itemsPrice
  const tax = Math.round(subtotal * 0.19) // 19% VAT
  const totalPrice = subtotal + tax

  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmitForm = async (formData: FormData) => {
    if (isSubmitting) return
    setIsSubmitting(true)

    try {
      // Call the createMove cloud function via Appwrite
      const { Functions } = await import('appwrite')
      const { client } = await import('@/lib/appwrite')
      const functions = new Functions(client)
      const functionId = process.env.NEXT_PUBLIC_FUNCTION_CREATE_MOVE!

      const payload = {
        clientId: user?.appwriteId,
        moveCategory: isInstantMove ? 'instant' : 'scheduled',
        moveType: isInstantMove ? 'light' : moveType,
        moveDate: isInstantMove ? new Date().toISOString() : moveDate,
        // Pickup
        pickupLocation: pickupLocation || pickupStreetAddress,
        pickupLatitude: null,
        pickupLongitude: null,
        pickupStreetAddress,
        pickupApartmentUnit,
        pickupFloorLevel: floorLevel,
        pickupElevator: elevatorAvailable,
        pickupParking: parkingSituation,
        // Dropoff
        dropoffLocation: dropoffStreetAddress || dropoffLocation,
        dropoffLatitude: null,
        dropoffLongitude: null,
        dropoffStreetAddress,
        dropoffApartmentUnit,
        dropoffFloorLevel,
        dropoffElevator: dropoffElevatorAvailable,
        dropoffParking: dropoffParkingSituation,
        // Home
        homeType,
        // Inventory
        inventoryItems: JSON.stringify(inventory),
        customItems: customItems.map((i) => JSON.stringify(i)),
        // Packing
        packingServiceLevel: isInstantMove ? 'none' : packingServiceLevel,
        packingMaterials: isInstantMove ? [] : [],
        // Timing
        arrivalWindow: isInstantMove ? 'now' : arrivalWindow,
        flexibility: null,
        // Crew
        crewSize: isInstantMove ? '2' : crewSize,
        vehicleType: isInstantMove ? 'small_van' : vehicleType,
        // Services
        additionalServices: isInstantMove ? [] : additionalServices,
        storageWeeks: isInstantMove ? 0 : storageWeeks,
        // Photos (IDs — for now pass null, actual upload would happen separately)
        coverPhotoId: null,
        galleryPhotoIds: [],
        // Contact
        contactFullName: contactInfo.fullName || user?.fullName || '',
        contactPhone: contactInfo.phoneNumber || user?.phone || '',
        contactEmail: contactInfo.email || user?.email || '',
        contactNotes: contactInfo.notesForMovers,
        isBusinessMove: contactInfo.isBusinessMove,
        companyName: contactInfo.companyName,
        vatId: contactInfo.vatId,
        // Pricing
        estimatedPrice: totalPrice,
        routeDistanceMeters: routeDistance || null,
        routeDurationSeconds: routeDuration || null,
        // Legal
        termsAccepted: true,
        privacyAccepted: true,
        // Payment
        paymentMethod,
      }

      const execution = await functions.createExecution(
        functionId,
        JSON.stringify(payload),
        false
      )

      let moveHandle = ''
      let moveId = ''
      try {
        const responseData = JSON.parse(execution.responseBody)
        moveHandle = responseData.handle || responseData.move?.handle || ''
        moveId = responseData.moveId || responseData.move?.$id || ''
      } catch {
        // Fallback if parsing fails
        moveHandle = `move-${Date.now()}`
      }

      // Also store locally for immediate display on pay-done page
      const newMove: StoredMove = {
        id: moveId || `move-${Date.now()}`,
        handle: moveHandle || `move-${Date.now()}`,
        status: isInstantMove ? 'in_progress' : 'pending',
        createdAt: new Date().toISOString(),
        paidAt: paymentMethod === 'cash' ? '' : new Date().toISOString(),
        totalPrice: totalPrice,
        bookingCode: moveHandle ? `#${moveHandle.slice(-9).toUpperCase()}` : '#PENDING',
        moveType: isInstantMove ? 'light' : moveType,
        moveDate: isInstantMove ? new Date().toISOString() : moveDate,
        pickupLocation: pickupLocation || pickupStreetAddress,
        pickupStreetAddress,
        pickupApartmentUnit,
        dropoffStreetAddress: dropoffStreetAddress || dropoffLocation,
        dropoffApartmentUnit,
        dropoffFloorLevel,
        homeType,
        floorLevel,
        elevatorAvailable,
        dropoffElevatorAvailable,
        parkingSituation,
        dropoffParkingSituation,
        packingServiceLevel: isInstantMove ? null : packingServiceLevel,
        additionalServices: isInstantMove ? [] : additionalServices,
        storageWeeks: isInstantMove ? 0 : storageWeeks,
        crewSize: isInstantMove ? '2' : crewSize,
        vehicleType: isInstantMove ? 'small_van' : vehicleType,
        arrivalWindow: isInstantMove ? 'now' : arrivalWindow,
        inventoryCount,
        contactInfo,
        coverPhoto,
        galleryPhotos,
      }

      addStoredMove(newMove)
      reset()
      router.push(`/pay-done?handle=${newMove.handle}&paymentMethod=${paymentMethod}`)
    } catch (error) {
      console.error('Failed to create move:', error)
      // Still navigate with local-only data as fallback
      const fallbackHandle = `move-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`
      const newMove: StoredMove = {
        id: fallbackHandle,
        handle: fallbackHandle,
        status: isInstantMove ? 'in_progress' : 'pending',
        createdAt: new Date().toISOString(),
        paidAt: paymentMethod === 'cash' ? '' : new Date().toISOString(),
        totalPrice,
        bookingCode: '#PENDING',
        moveType: isInstantMove ? 'light' : moveType,
        moveDate: isInstantMove ? new Date().toISOString() : moveDate,
        pickupLocation: pickupLocation || pickupStreetAddress,
        pickupStreetAddress,
        pickupApartmentUnit,
        dropoffStreetAddress: dropoffStreetAddress || dropoffLocation,
        dropoffApartmentUnit,
        dropoffFloorLevel,
        homeType,
        floorLevel,
        elevatorAvailable,
        dropoffElevatorAvailable,
        parkingSituation,
        dropoffParkingSituation,
        packingServiceLevel: isInstantMove ? null : packingServiceLevel,
        additionalServices: isInstantMove ? [] : additionalServices,
        storageWeeks: isInstantMove ? 0 : storageWeeks,
        crewSize: isInstantMove ? '2' : crewSize,
        vehicleType: isInstantMove ? 'small_van' : vehicleType,
        arrivalWindow: isInstantMove ? 'now' : arrivalWindow,
        inventoryCount,
        contactInfo,
        coverPhoto,
        galleryPhotos,
      }
      addStoredMove(newMove)
      reset()
      router.push(`/pay-done?handle=${newMove.handle}&paymentMethod=${paymentMethod}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderSidebar = () => {
    return (
      <div className="flex w-full flex-col gap-y-6 border-neutral-200 px-0 sm:gap-y-8 sm:rounded-4xl sm:p-6 lg:border xl:p-8 dark:border-neutral-700">
        <div className="flex flex-col sm:flex-row sm:items-center">
          <div className="w-full shrink-0 sm:w-40">
            <div className="aspect-w-4 overflow-hidden rounded-2xl aspect-h-3 sm:aspect-h-4 bg-neutral-100 dark:bg-neutral-800">
              {coverPhoto ? (
                <Image
                  alt="Move preview"
                  fill
                  sizes="200px"
                  src={coverPhoto}
                  className="object-cover"
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <HugeiconsIcon
                    icon={isInstantMove ? FlashIcon : DeliveryTruck01Icon}
                    size={48}
                    strokeWidth={1}
                    className="text-neutral-400"
                  />
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-y-3 py-5 text-start sm:ps-5">
            <div>
              <span className="line-clamp-1 text-sm text-neutral-500 dark:text-neutral-400">
                {isInstantMove ? 'Instant Move' : `${formatLabel(moveType)} Move`}
                {!isInstantMove && moveDate && ` · ${formatDate(moveDate)}`}
              </span>
              <span className="mt-1 block text-base font-medium line-clamp-2">
                {pickupStreetAddress || pickupLocation || 'Pickup'} → {dropoffStreetAddress || dropoffLocation || 'Drop-off'}
              </span>
            </div>
            <p className="block text-sm text-neutral-500 dark:text-neutral-400">
              {inventoryCount} items
              {!isInstantMove && crewSize && ` · ${crewSize} movers`}
              {!isInstantMove && vehicleType && ` · ${formatLabel(vehicleType)}`}
            </p>
            
            {/* Route info for instant moves */}
            {isInstantMove && (routeDistance || routeDuration) && (
              <div className="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400">
                <HugeiconsIcon icon={Route01Icon} size={16} strokeWidth={1.5} />
                {routeDistance && <span>{formatDistance(routeDistance)}</span>}
                {routeDistance && routeDuration && <span>·</span>}
                {routeDuration && <span>{formatDuration(routeDuration)}</span>}
              </div>
            )}
            
            <Divider className="w-10!" />
            <div className="flex items-center gap-2">
              {isInstantMove ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                  <HugeiconsIcon icon={FlashIcon} size={12} strokeWidth={1.5} />
                  Now
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full bg-primary-100 px-2 py-0.5 text-xs font-medium text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
                  {formatLabel(arrivalWindow)}
                </span>
              )}
            </div>
          </div>
        </div>

        <Divider className="block lg:hidden" />

        <DescriptionList>
          {isInstantMove ? (
            <>
              <DescriptionTerm>{moverPrice ? 'Mover fare' : 'Base fare'}</DescriptionTerm>
              <DescriptionDetails className="sm:text-right">€{basePrice.toFixed(2)}</DescriptionDetails>
              
              {itemsPrice > 0 && (
                <>
                  <DescriptionTerm>Items ({inventoryCount})</DescriptionTerm>
                  <DescriptionDetails className="sm:text-right">€{itemsPrice.toFixed(2)}</DescriptionDetails>
                </>
              )}
            </>
          ) : (
            <>
              <DescriptionTerm>Base rate ({formatLabel(moveType)})</DescriptionTerm>
              <DescriptionDetails className="sm:text-right">€{basePrice.toFixed(2)}</DescriptionDetails>
              
              {packingPrice > 0 && (
                <>
                  <DescriptionTerm>Packing service</DescriptionTerm>
                  <DescriptionDetails className="sm:text-right">€{packingPrice.toFixed(2)}</DescriptionDetails>
                </>
              )}
              
              {servicesPrice > 0 && (
                <>
                  <DescriptionTerm>Additional services ({additionalServices.length})</DescriptionTerm>
                  <DescriptionDetails className="sm:text-right">€{servicesPrice.toFixed(2)}</DescriptionDetails>
                </>
              )}
              
              {storagePrice > 0 && (
                <>
                  <DescriptionTerm>Storage ({storageWeeks} weeks)</DescriptionTerm>
                  <DescriptionDetails className="sm:text-right">€{storagePrice.toFixed(2)}</DescriptionDetails>
                </>
              )}
            </>
          )}
          
          <DescriptionTerm>VAT (19%)</DescriptionTerm>
          <DescriptionDetails className="sm:text-right">€{tax.toFixed(2)}</DescriptionDetails>
          
          <DescriptionTerm className="font-semibold text-neutral-900 dark:text-white">Total</DescriptionTerm>
          <DescriptionDetails className="font-semibold sm:text-right text-primary-600">€{totalPrice.toFixed(2)}</DescriptionDetails>
        </DescriptionList>

        {/* Cash payment notice */}
        {paymentMethod === 'cash' && (
          <div className="rounded-xl bg-neutral-50 dark:bg-neutral-800/50 p-4 border border-neutral-200 dark:border-neutral-700">
            <div className="flex items-start gap-3">
              <HugeiconsIcon
                icon={Coins01Icon}
                size={20}
                strokeWidth={1.5}
                className="text-neutral-500 shrink-0 mt-0.5"
              />
              <div>
                <p className="text-sm font-medium text-neutral-900 dark:text-white">
                  Cash payment selected
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                  Please have €{totalPrice.toFixed(2)} ready to pay your mover after the move is complete.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  const renderMain = () => {
    return (
      <Form
        action={handleSubmitForm}
        className="flex w-full flex-col gap-y-8 border-neutral-200 px-0 sm:rounded-4xl sm:border sm:p-6 xl:p-8 dark:border-neutral-700"
      >
        <h1 className="text-3xl font-semibold lg:text-4xl">
          {isInstantMove ? 'Confirm your move' : 'Confirm and payment'}
        </h1>
        <Divider />
        <YourMove routeDistance={routeDistance} routeDuration={routeDuration} />
        <PayWith 
          onPaymentMethodChange={setPaymentMethod}
          selectedMethod={paymentMethod}
        />
        <div>
          <ButtonPrimary type="submit" className="mt-10 text-base/6!" disabled={isSubmitting}>
            {isSubmitting
              ? 'Processing...'
              : paymentMethod === 'cash' 
                ? `Confirm move · €${totalPrice.toFixed(2)}`
                : `Confirm and pay €${totalPrice.toFixed(2)}`
            }
          </ButtonPrimary>
          {paymentMethod === 'cash' && (
            <p className="mt-3 text-sm text-neutral-500 dark:text-neutral-400">
              You&apos;ll pay your mover directly after the move is complete.
            </p>
          )}
        </div>
      </Form>
    )
  }

  return (
    <main className="container mt-10 mb-24 flex flex-col gap-14 lg:mb-32 lg:flex-row lg:gap-10">
      <div className="w-full lg:w-3/5 xl:w-2/3">{renderMain()}</div>
      <Divider className="block lg:hidden" />
      <div className="grow">{renderSidebar()}</div>
    </main>
  )
}

const Page = () => {
  return (
    <AuthGate redirectBack="/checkout">
      <Suspense fallback={<div className="container mt-10 mb-24">Loading...</div>}>
        <CheckoutContent />
      </Suspense>
    </AuthGate>
  )
}

export default Page
