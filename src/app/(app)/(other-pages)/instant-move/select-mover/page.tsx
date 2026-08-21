'use client'

import { useMoveSearch, Coordinates } from '@/context/moveSearch'
import { moverCapacityM3 } from '@/lib/moveVolume'
import {
  asVehicleType,
  instantRouteBase,
  priceForMover,
  vehicleCapacity,
  vehicleLabel,
  type PricingRates,
} from '@/lib/pricing'
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
import { formatMoney } from '@/lib/format'
import { useTranslation } from 'react-i18next'
import { formatVolumeM3 } from '@/lib/format'

// Mover types - matches API response from /api/movers/nearby
interface Mover {
  $id: string
  userId: string
  businessName?: string
  fullName?: string
  profilePhoto?: string
  profilePhotoUrl?: string
  rating?: number
  totalMoves?: number
  vehicleType?: string
  vehicleMake?: string
  vehicleModel?: string
  vehiclePlateNumber?: string
  crewSize?: number
  /**
   * Declared load capacity in m³ (free text on the schema).
   *
   * This used to be `maxCarryWeight`, which is not a column on mover_profiles
   * and is not returned by /api/movers/nearby — so `mover.maxCarryWeight || 500`
   * rendered a hardcoded "500kg max" against every mover on the platform.
   */
  vehicleCapacity?: string | number | null
  yearsExperience?: number
  languages?: string[]
  isVerified?: boolean
  verificationStatus?: string
  currentLatitude?: number
  currentLongitude?: number
  distanceKm?: number
  // `baseRatePerKm` used to be declared here and read by the pricing block.
  // No such field exists on mover_profiles (the column is `baseRate`, and it is
  // read by no quoting code in any app), so the read always fell through to a
  // hardcoded fallback. Price now comes from declared capability — crewSize and
  // vehicleType — via `@/lib/pricing`.
}

// Vehicle labels and capacity blurbs come from `@/lib/pricing`, keyed on the
// real `mover_profiles.vehicleType` enum. The maps that used to live here keyed
// on `medium_van` / `large_van` / `truck` / `car` — none of which the schema can
// hold — so every mover rendered the fallback label and blurb.

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
  const { t } = useTranslation()
  const router = useRouter()
  const {
    pickupLocation,
    dropoffLocation,
    pickupCoordinates,
    dropoffCoordinates,
    inventory,
    customItems,
    coverPhotoId,
    galleryPhotoIds,
    // The tier the user picked drives the route-base multiplier. The page used
    // to ignore it entirely and quote every move at the light-tier rate.
    moveType,
  } = useMoveSearch()

  const [isLoading, setIsLoading] = useState(true)
  const [selectedMover, setSelectedMover] = useState<string | null>(null)
  const [routeDistance, setRouteDistance] = useState<number | null>(null)
  const [routeDuration, setRouteDuration] = useState<number | null>(null)
  const [apiMovers, setApiMovers] = useState<Mover[]>([])
  const [fetchError, setFetchError] = useState<string | null>(null)
  // Admin rate overrides. `{}` until the fetch lands (and if it fails), which
  // means the compiled defaults apply — a config outage must show the previous
  // price, never a blank or a zero.
  const [pricingRates, setPricingRates] = useState<PricingRates>({})

  useEffect(() => {
    let cancelled = false
    fetch('/api/pricing/config')
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled && d?.rates) setPricingRates(d.rates)
      })
      .catch(() => {
        /* keep defaults */
      })
    return () => {
      cancelled = true
    }
  }, [])

  const inventoryCount = Object.values(inventory).reduce((sum, qty) => sum + qty, 0) + customItems.length
  const photoCount = (coverPhotoId ? 1 : 0) + galleryPhotoIds.length

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
          throw new Error(errData.error || t('errors:movers.fetchFailed'))
        }
        const data = await res.json()
        setApiMovers(data.movers || [])
      } catch (err) {
        console.error('Failed to fetch nearby movers:', err)
        setFetchError(err instanceof Error ? err.message : t('errors:movers.findFailed'))
      } finally {
        setIsLoading(false)
      }
    }

    // Small delay for better UX
    const timer = setTimeout(fetchMovers, 1000)
    return () => clearTimeout(timer)
  }, [pickupCoordinates])

  // Calculate prices for each mover
  //
  // This used to run its own formula — a €25 hardcoded base fee, a per-km rate
  // read off `mover.baseRatePerKm` (a field that does not exist on
  // mover_profiles, so it always fell through to a hardcoded 2.0 against the
  // platform's 1.50), and a per-item fee keyed on vehicle types that are not in
  // the schema enum, so every real mover hit its default arm. None of it read
  // `pricing_config`, so admin rate edits never reached this page and the
  // number shown here was not the number the backend would charge.
  //
  // It now shares `instantRouteBase` (a port of the calculateprice function)
  // and `priceForMover` (parity with the mobile client) from `@/lib/pricing`.
  const moversWithPrices = useMemo(() => {
    if (!routeDistance || apiMovers.length === 0) return []

    const distanceKm = routeDistance / 1000

    // The route base is mover-independent, so compute it once rather than per row.
    const { estimatedPrice: routeBaseEur } = instantRouteBase(
      { routeDistanceMeters: routeDistance, moveType },
      pricingRates
    )

    return apiMovers.map((mover) => {
      const crewSize = mover.crewSize || 1
      const vehicleType = asVehicleType(mover.vehicleType)

      const totalPrice = priceForMover(routeBaseEur, { vehicleType, crewSize }, inventoryCount, pricingRates)

      // Estimated arrival from distance
      const estimatedArrival = mover.distanceKm
        ? Math.max(5, Math.round(mover.distanceKm * 3))
        : 15

      return {
        id: mover.$id,
        name: mover.businessName || mover.fullName || 'Mover',
        profilePhoto: mover.profilePhotoUrl || mover.profilePhoto || '',
        rating: mover.rating || 0,
        totalMoves: mover.totalMoves || 0,
        vehicleType,
        vehicleName: [mover.vehicleMake, mover.vehicleModel].filter(Boolean).join(' ') || vehicleLabel(t, vehicleType),
        vehiclePlate: mover.vehiclePlateNumber || '',
        crewSize,
        capacityM3: moverCapacityM3({ vehicleType, vehicleCapacity: mover.vehicleCapacity }, pricingRates),
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
  }, [routeDistance, inventoryCount, apiMovers, pricingRates, moveType, t])

  const handleSelectMover = (moverId: string) => {
    setSelectedMover(moverId)
  }

  const [isConfirming, setIsConfirming] = useState(false)
  // T7 parity: both methods settle at completion — cash in person, card via
  // the mobile app's Stripe flow. Nothing is charged at booking.
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card'>('cash')

  const handleConfirmMover = async () => {
    if (!selectedMover || isConfirming) return

    const mover = moversWithPrices.find((m) => m.id === selectedMover)
    if (!mover) return

    setIsConfirming(true)

    // Store selected mover in sessionStorage
    sessionStorage.setItem('selectedMover', JSON.stringify({
      ...mover,
      routeDistance,
      routeDuration,
    }))

    // ── Upload photos to storage first ──────────────────────
    let uploadedCoverPhotoId: string | null = null
    let uploadedGalleryPhotoIds: string[] = []

    if (coverPhotoId || galleryPhotoIds.length > 0) {
      try {
        console.log(
          `[select-mover] Uploading photos — cover: ${coverPhotoId ? 'yes' : 'no'}, gallery: ${galleryPhotoIds.length}`
        )
        const photoRes = await fetch('/api/moves/upload-photos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            coverPhotoId: coverPhotoId || null,
            galleryPhotoIds: galleryPhotoIds.length > 0 ? galleryPhotoIds : [],
          }),
        })

        if (photoRes.ok) {
          const photoData = await photoRes.json()
          uploadedCoverPhotoId = photoData.coverPhotoId ?? null
          uploadedGalleryPhotoIds = photoData.galleryPhotoIds ?? []
          console.log(
            `[select-mover] Upload result — cover: ${uploadedCoverPhotoId ? 'URL ok' : 'null'}, gallery: ${uploadedGalleryPhotoIds.length} URLs`
          )
        } else {
          const errText = await photoRes.text()
          console.error(`[select-mover] Photo upload failed (${photoRes.status}):`, errText)
        }
      } catch (err) {
        console.error('[select-mover] Failed to upload photos:', err)
      }
    }

    // ── Create the move + move_request via API ──────────────
    try {
      const createBody = {
        moverProfileId: mover.id,
        pickupLocation: pickupLocation || null,
        pickupLatitude: pickupCoordinates?.latitude ?? null,
        pickupLongitude: pickupCoordinates?.longitude ?? null,
        dropoffLocation: dropoffLocation || null,
        dropoffLatitude: dropoffCoordinates?.latitude ?? null,
        dropoffLongitude: dropoffCoordinates?.longitude ?? null,
        moveType: 'regular',
        inventoryItems: JSON.stringify(inventory),
        customItems: customItems.map((c) => JSON.stringify(c)),
        totalItemCount: inventoryCount,
        estimatedPrice: mover.price,
        coverPhotoId: uploadedCoverPhotoId,
        galleryPhotoIds: uploadedGalleryPhotoIds,
        routeDistanceMeters: routeDistance || null,
        routeDurationSeconds: routeDuration || null,
        paymentMethod,
      }
      console.log(
        `[select-mover] Creating move — cover: ${createBody.coverPhotoId ? 'URL' : 'null'}, gallery: ${createBody.galleryPhotoIds.length}`
      )
      const res = await fetch('/api/moves/create-instant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createBody),
      })

      if (res.ok) {
        const data = await res.json()
        // Store moveId so the instant-move page can subscribe to updates
        sessionStorage.setItem('activeMoveId', data.moveId)
        sessionStorage.setItem('activeMoveRequestId', data.moveRequestId)
      }
    } catch (err) {
      console.error('Failed to create move:', err)
      // Continue anyway — the mover page will still work for UI
    }

    setIsConfirming(false)
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
          {t('web:selectMover.searching.title')}
        </h2>
        <p className="text-neutral-500 dark:text-neutral-400 text-center max-w-sm">
          {t('web:selectMover.searching.subtitle')}
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
          {fetchError ? t('web:selectMover.error.title') : t('web:selectMover.empty.title')}
        </h2>
        <p className="text-neutral-500 dark:text-neutral-400 text-center max-w-sm mb-6">
          {fetchError || t('web:selectMover.empty.subtitle')}
        </p>
        <div className="flex gap-3">
          <ButtonSecondary href="/instant-move/photos">
            {t('common:action.goBack.cta')}
          </ButtonSecondary>
          <ButtonPrimary onClick={() => window.location.reload()}>
            {t('common:action.tryAgain.cta')}
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
              <span className="text-sm font-medium">{t('common:action.back.cta')}</span>
            </Link>
            <div className="text-center">
              <p className="text-sm font-medium text-neutral-900 dark:text-white">
                {t('web:selectMover.title')}
              </p>
              <p className="text-xs text-neutral-500">
                {t('web:wizard.stepOf.label', { current: 4, total: 4 })}
              </p>
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
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">{t('booking:route.from.label')}</p>
              <p className="text-sm font-medium text-neutral-900 dark:text-white line-clamp-1">
                {pickupLocation?.split(',')[0] || t('booking:pickup.label')}
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
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">{t('booking:route.to.label')}</p>
              <p className="text-sm font-medium text-neutral-900 dark:text-white line-clamp-1">
                {dropoffLocation?.split(',')[0] || t('booking:dropoff.label')}
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
              {t('moves:itemCount', { count: inventoryCount })}
            </span>
            <span className="text-neutral-300 dark:text-neutral-600">•</span>
            <span className="text-sm text-neutral-600 dark:text-neutral-300">
              {t('booking:photos.photoCount', { count: photoCount })}
            </span>
          </div>
        </div>

        {/* Movers List */}
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
          {t('web:selectMover.available.title', { count: moversWithPrices.length })}
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
                    <span>{t('moves:moveCount', { count: mover.totalMoves })}</span>
                    {mover.yearsExperience > 0 && (
                      <>
                        <span>•</span>
                        <span>{t('web:selectMover.experienceYears', { count: mover.yearsExperience })}</span>
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
                      {vehicleLabel(t, mover.vehicleType)}
                    </span>
                  </div>

                  {/* Capacity & Crew */}
                  <div className="flex items-center gap-4 mt-2 text-xs text-neutral-500 dark:text-neutral-400">
                    <span className="flex items-center gap-1">
                      <HugeiconsIcon icon={WeightScale01Icon} size={14} strokeWidth={1.5} />
                      {t('web:selectMover.capacity.label', { volume: formatVolumeM3(mover.capacityM3) })}
                    </span>
                    <span className="flex items-center gap-1">
                      <HugeiconsIcon icon={UserMultiple02Icon} size={14} strokeWidth={1.5} />
                      {t('moves:moverCount', { count: mover.crewSize + 1 })}
                    </span>
                    <span className="text-neutral-400">
                      {vehicleCapacity(t, mover.vehicleType)}
                    </span>
                  </div>
                </div>

                {/* Price & ETA */}
                <div className="text-right shrink-0">
                  <p className="text-xl font-bold text-neutral-900 dark:text-white">
                    {formatMoney(mover.price, { compact: true })}
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                    {t('web:selectMover.eta.label', { count: mover.estimatedArrival })}
                  </p>
                </div>
              </div>

              {/* Selection Indicator */}
              {selectedMover === mover.id && (
                <div className="mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-700">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-primary-600 dark:text-primary-400 font-medium">
                      {t('common:state.selected.label')}
                    </span>
                    <span className="text-neutral-500 dark:text-neutral-400">
                      {t('web:selectMover.languages.label', {
                        languages: mover.languages.join(t('common:list.separator')),
                      })}
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
            <strong>{t('web:selectMover.pricing.title')}</strong>{' '}
            {t('web:selectMover.pricing.helper', {
              count: inventoryCount,
              distance: routeDistance ? formatDistance(routeDistance) : '—',
            })}{' '}
            {t('web:selectMover.pricing.disclaimer')}
          </p>
        </div>
      </div>

      {/* Payment method — settled at completion, never charged at booking */}
      <div className="container max-w-3xl mx-auto px-4 pb-28">
        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-700 p-4">
          <p className="font-semibold text-neutral-900 dark:text-neutral-100 mb-3">{t('booking:payment.title')}</p>
          <div className="flex gap-3">
            {(['cash', 'card'] as const).map((method) => (
              <button
                key={method}
                type="button"
                onClick={() => setPaymentMethod(method)}
                className={`flex-1 rounded-xl border px-4 py-3 text-sm font-semibold transition-colors ${
                  paymentMethod === method
                    ? 'bg-primary-6000 border-primary-6000 text-white'
                    : 'border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300'
                }`}
              >
                {method === 'cash' ? t('booking:payment.payCash.cta') : t('booking:payment.payCard.cta')}
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs text-neutral-500 dark:text-neutral-400">
            {paymentMethod === 'card'
              ? t('booking:payment.card.helper')
              : t('booking:payment.cash.helper')}
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
            {t('common:action.back.cta')}
          </ButtonSecondary>
          <ButtonPrimary
            onClick={handleConfirmMover}
            className="flex-1"
            disabled={!selectedMover || isConfirming}
          >
            {isConfirming
              ? t('web:selectMover.creating.cta')
              : selectedMover
                ? t('web:selectMover.confirm.cta', {
                    amount: formatMoney(
                      moversWithPrices.find((m) => m.id === selectedMover)?.price || 0,
                      { compact: true },
                    ),
                  })
                : t('web:selectMover.selectFirst.cta')}
          </ButtonPrimary>
        </div>
      </div>
    </div>
  )
}

export default SelectMoverPage
