'use client'

import { useMoveSearch, Coordinates } from '@/context/moveSearch'
import { moverCapacityM3, moverFitsLoad } from '@/lib/moveVolume'
import { asVehicleType, vehicleCapacity, vehicleLabel } from '@/lib/pricing'
import { quoteForMover, type QuoteBreakdown, type QuoteInput } from '@/lib/pricingEngine'
import { basketFromWire, kmFromMeters } from '@/lib/pricingInputs'
import { useInventoryCatalog } from '@/hooks/useInventoryCatalog'
import { usePricingConfig } from '@/hooks/usePricingConfig'
import { useInventoryNames } from '@/lib/inventory-labels'
import PriceBreakdown from '@/components/PriceBreakdown'
import { useQuoteCurrency } from '@/components/DisplayCurrency'
import { cardPaymentsAvailable, catalogForMarket } from '@/lib/currency'
import { crewLabel } from '@/components/mover/crewLabel'
import ExtraHelpersStepper from '@/components/booking/ExtraHelpersStepper'
import { basketItemCount, serializeBasket } from '@/components/inventory/basket'
import { toClassifyCustom } from '@/components/inventory/selector-logic'
import { classifyMove, enforcedTier, thresholdsFromConfig } from '@/lib/classifyMove'
import { recommendedMoverId, sortMoversForDisplay } from '@/lib/mover-recommendation'
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
import { formatDistanceKm, formatVolumeM3 } from '@/lib/format'
import { EXTENDED_RADIUS_KM, NEAR_RADIUS_KM, radiusForStage, searchOutcome, type SearchStage } from '@/lib/search-radius'

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
  vehicleBrand?: string
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
  /** Holds an admin-approved moving certificate (plan legal/7 V2). The API sorts these first. */
  certified?: boolean
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

/** A listed mover with the v3 quote the customer would pay for them. */
interface MoverWithQuote {
  id: string
  name: string
  profilePhoto: string
  rating: number
  totalMoves: number
  vehicleType: ReturnType<typeof asVehicleType>
  vehicleName: string
  vehiclePlate: string
  crewSize: number
  capacityM3: number
  yearsExperience: number
  languages: string[]
  isVerified: boolean
  /** Renders as the "Certified mover" badge. */
  certified: boolean
  price: number
  quote: QuoteBreakdown
  estimatedArrival: number
  distanceKm: number
  currentLatitude: number | null
  currentLongitude: number | null
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
  const { t } = useTranslation()
  const router = useRouter()
  const {
    pickupLocation,
    dropoffLocation,
    pickupCoordinates,
    pickupCountryCode,
    dropoffCountryCode,
    dropoffCoordinates,
    inventory,
    customItems,
    coverPhotoId,
    galleryPhotoIds,
    // The tier the user picked drives the route-base multiplier. The page used
    // to ignore it entirely and quote every move at the light-tier rate.
    moveType,
    extraHelpers,
    setExtraHelpers,
    setIsInstantMove,
  } = useMoveSearch()

  const [isLoading, setIsLoading] = useState(true)
  const [selectedMover, setSelectedMover] = useState<string | null>(null)
  const [routeDistance, setRouteDistance] = useState<number | null>(null)
  const [routeDuration, setRouteDuration] = useState<number | null>(null)
  const [apiMovers, setApiMovers] = useState<Mover[]>([])
  const [fetchError, setFetchError] = useState<string | null>(null)
  // The search starts in the near ring; the client widens it on request
  // (plan pickltmobile `.agent/plans/matching/1`).
  const [stage, setStage] = useState<SearchStage>('near')
  const radiusKm = radiusForStage(stage)
  // Admin rate overrides (`{}` → compiled defaults) and the priced catalog —
  // the two inputs the engine needs besides the basket and the route.
  // Per pickup country (plan wave-2026-10/4 C5): the market's VAT and tariff.
  const pricingConfig = usePricingConfig(pickupCountryCode)
  // Quotes wait for a ready, non-empty catalog (crew plan 1 #8).
  const { catalog, status: catalogStatus, ready: catalogReady, retry: retryCatalog } = useInventoryCatalog()
  const inventoryNames = useInventoryNames()
  // The market's currency and item prices (plan currency/0): every quote on
  // this page is in the currency of the pickup country, as the server prices it.
  const currency = useQuoteCurrency(pickupCountryCode)
  const marketCatalog = useMemo(
    () => catalogForMarket(catalog, pickupCountryCode, pricingConfig),
    [catalog, pickupCountryCode, pricingConfig],
  )
  const cardAvailable = cardPaymentsAvailable(currency)

  // Catalog + custom quantities (not the number of custom rows).
  const inventoryCount = basketItemCount(inventory, customItems)

  // The tier the server will price: the higher of the client's tier and the
  // basket's classification (crew master D5).
  const pricedTier = useMemo(() => {
    const chosen = moveType || 'regular'
    if (!catalogReady) return chosen
    const c = classifyMove(inventory, toClassifyCustom(customItems), chosen, catalog, thresholdsFromConfig(pricingConfig))
    return enforcedTier(chosen, c.recommendedType)
  }, [moveType, catalogReady, catalog, inventory, customItems, pricingConfig])
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

        // Country-scoped (C6): only movers in the pickup's market.
        const country = pickupCountryCode ? `&country=${encodeURIComponent(pickupCountryCode)}` : ''
        const res = await fetch(`/api/movers/nearby?lat=${lat}&lng=${lng}&radiusKm=${radiusKm}${country}`)
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
  }, [pickupCoordinates, pickupCountryCode, radiusKm])

  const outcome = searchOutcome(stage, apiMovers.length)

  const extendSearch = () => {
    setIsLoading(true)
    setStage('extended')
  }

  // Nobody was found, even in the wider ring: continue as a scheduled move.
  // Addresses, items, photos and helpers live in the shared booking state, so
  // the scheduling steps open with them already filled in.
  const scheduleInstead = () => {
    setIsInstantMove(false)
    router.push('/add-listing/1')
  }

  // The mover-independent part of the quote: tier, mode, route and basket.
  // Each mover then only changes the vehicle line (pricing master D8) — the
  // list is comparable because two movers with the same truck quote the same
  // number, whatever crew they bring (master D7).
  const quoteInput = useMemo<Omit<QuoteInput, 'vehicleType'> | null>(() => {
    if (!routeDistance || !catalogReady) return null
    return {
      tier: pricedTier,
      mode: 'instant',
      extraHelpers,
      distanceKm: kmFromMeters(routeDistance),
      durationSeconds: routeDuration ?? 0,
      basket: basketFromWire(inventory, customItems),
      catalog: marketCatalog,
      countryCode: pickupCountryCode,
      currency,
    }
  }, [routeDistance, routeDuration, catalogReady, marketCatalog, currency, pricedTier, extraHelpers, inventory, customItems, pickupCountryCode])

  // Price every mover with the shared v3 engine and gate out anyone the job
  // exceeds: a vehicle that cannot hold the load, or a crew smaller than the
  // load requires (master D7). The server repeats both the quote and the crew
  // check on confirm, so this list is a preview, not the authority.
  const { moversWithPrices, hiddenForCrew, hiddenForCapacity, loadedVolumeM3 } = useMemo(() => {
    const empty = { moversWithPrices: [] as MoverWithQuote[], hiddenForCrew: 0, hiddenForCapacity: 0, loadedVolumeM3: 0 }
    if (!quoteInput || apiMovers.length === 0) return empty

    const distanceKm = kmFromMeters(routeDistance)
    let hiddenForCrew = 0
    let hiddenForCapacity = 0
    let loadedVolumeM3 = 0
    const priced: MoverWithQuote[] = []

    for (const mover of apiMovers) {
      const crewSize = mover.crewSize || 1
      const vehicleType = asVehicleType(mover.vehicleType)
      // Travel to pickup (plan pricing/8): this mover's own straight-line
      // distance to the pickup, in km, as `/api/movers/nearby` measured it.
      // Whole metres, like the server stores it, so the list price and the
      // booked price agree to the cent. Unknown → no approach line.
      const approachKm =
        typeof mover.distanceKm === 'number' && Number.isFinite(mover.distanceKm) && mover.distanceKm >= 0
          ? Math.round(mover.distanceKm * 1000) / 1000
          : null
      const { quote, eligible } = quoteForMover(quoteInput, { vehicleType, crewSize, distanceKm: approachKm }, pricingConfig)
      loadedVolumeM3 = quote.profile.loadedVolumeM3

      if (!moverFitsLoad(quote.profile.loadedVolumeM3, { vehicleType, vehicleCapacity: mover.vehicleCapacity }, pricingConfig)) {
        hiddenForCapacity += 1
        continue
      }
      if (!eligible) {
        hiddenForCrew += 1
        continue
      }

      // Estimated arrival from distance
      const estimatedArrival = mover.distanceKm
        ? Math.max(5, Math.round(mover.distanceKm * 3))
        : 15

      priced.push({
        id: mover.$id,
        name: mover.businessName || mover.fullName || 'Mover',
        profilePhoto: mover.profilePhotoUrl || mover.profilePhoto || '',
        rating: mover.rating || 0,
        totalMoves: mover.totalMoves || 0,
        vehicleType,
        vehicleName: [mover.vehicleBrand, mover.vehicleModel].filter(Boolean).join(' ') || vehicleLabel(t, vehicleType),
        vehiclePlate: mover.vehiclePlateNumber || '',
        crewSize,
        capacityM3: moverCapacityM3({ vehicleType, vehicleCapacity: mover.vehicleCapacity }, pricingConfig),
        yearsExperience: mover.yearsExperience || 0,
        languages: mover.languages || ['German'],
        isVerified: mover.verificationStatus === 'verified',
        // Strict `=== true`: "unknown" must render as no badge, not as a certified one.
        certified: mover.certified === true,
        // The customer pays the gross total (master D11); it varies by vehicle
        // class and by the mover's distance to the pickup (plan pricing/8).
        price: quote.total,
        quote,
        estimatedArrival,
        distanceKm: mover.distanceKm || distanceKm,
        currentLatitude: mover.currentLatitude || null,
        currentLongitude: mover.currentLongitude || null,
      })
    }

    // Cheapest first; at the same price the server's order stands (certified
    // first inside a distance band, then nearer: plan legal/7 V2).
    return { moversWithPrices: sortMoversForDisplay(priced), hiddenForCrew, hiddenForCapacity, loadedVolumeM3 }
  }, [quoteInput, apiMovers, pricingConfig, routeDistance, t])

  // The mark goes to the first certified mover in the list when there is one.
  const recommendedId = useMemo(() => recommendedMoverId(moversWithPrices), [moversWithPrices])

  const handleSelectMover = (moverId: string) => {
    setSelectedMover(moverId)
  }

  const [isConfirming, setIsConfirming] = useState(false)
  const [confirmError, setConfirmError] = useState<string | null>(null)
  // T7 parity: both methods settle at completion — cash in person, card via
  // the mobile app's Stripe flow. Nothing is charged at booking.
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card'>('cash')
  // Card cannot stay chosen in a currency that has no card payments.
  useEffect(() => {
    if (!cardAvailable) setPaymentMethod('cash')
  }, [cardAvailable])

  const handleConfirmMover = async () => {
    if (!selectedMover || isConfirming) return

    const mover = moversWithPrices.find((m) => m.id === selectedMover)
    if (!mover) return

    setIsConfirming(true)
    setConfirmError(null)

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
      const basket = serializeBasket(inventory, customItems)
      const createBody = {
        moverProfileId: mover.id,
        pickupLocation: pickupLocation || null,
        pickupLatitude: pickupCoordinates?.latitude ?? null,
        pickupLongitude: pickupCoordinates?.longitude ?? null,
        dropoffLocation: dropoffLocation || null,
        dropoffLatitude: dropoffCoordinates?.latitude ?? null,
        dropoffLongitude: dropoffCoordinates?.longitude ?? null,
        // The tier the user picked — this used to post a hardcoded 'regular'.
        moveType: moveType || 'regular',
        inventoryItems: basket.inventoryItems,
        customItems: basket.customItems,
        totalItemCount: inventoryCount,
        // Helpers on top of the tier crew (crew master D2); the server clamps.
        extraHelpers,
        // No price is sent: the server recomputes it from these inputs and the
        // chosen mover's vehicle class (pricing master D5).
        coverPhotoId: uploadedCoverPhotoId,
        galleryPhotoIds: uploadedGalleryPhotoIds,
        routeDistanceMeters: routeDistance || null,
        routeDurationSeconds: routeDuration || null,
        paymentMethod,
        // Geocoder hint for the pickup country (C2); the server re-derives it.
        pickupCountryCode,
        // Hint for the server's cross-border check (plan legal/1.scope-lock S2).
        dropoffCountryCode,
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
      } else if (res.status === 400) {
        // The assignment gate refused this mover (went offline, vehicle no
        // longer service-ready — the list is a snapshot). Stay here so the
        // client can pick someone else instead of tracking a move that was
        // never created.
        const data = await res.json().catch(() => ({}))
        // Scope lock (plan legal/1.scope-lock S2): the move crosses a border.
        // Nothing was created, so stay here and say why.
        if (typeof data.fnCode === 'string' && data.fnCode.startsWith('country.')) {
          setConfirmError(data.error || t('errors:country.crossBorder'))
          setIsConfirming(false)
          return
        }
        if (typeof data.fnCode === 'string' && (data.fnCode.startsWith('mover.') || data.fnCode === 'fees.restricted')) {
          setApiMovers((prev) => prev.filter((m) => m.$id !== selectedMover))
          setSelectedMover(null)
          setConfirmError(data.error || t('errors:instant.moverUnavailable.error'))
          setIsConfirming(false)
          return
        }
      } else if (res.status === 403) {
        // Scope lock (plan legal/1.scope-lock S3): the pickup's market is closed.
        const data = await res.json().catch(() => ({}))
        if (typeof data.fnCode === 'string' && data.fnCode.startsWith('country.')) {
          setConfirmError(data.error || t('errors:country.pickupNotLive'))
          setIsConfirming(false)
          return
        }
      }
    } catch (err) {
      console.error('Failed to create move:', err)
      // Continue anyway — the mover page will still work for UI
    }

    setIsConfirming(false)
    // Navigate to the instant-move page with the map
    router.push('/instant-move')
  }

  // The catalog failed or is empty: no quote is possible, so say so and offer a retry.
  if (catalogStatus === 'error' || catalogStatus === 'empty') {
    return (
      <div className="min-h-screen bg-white dark:bg-neutral-900 flex flex-col items-center justify-center p-6">
        <HugeiconsIcon icon={Alert02Icon} size={48} strokeWidth={1.5} className="text-amber-500 mb-4" />
        <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-2">
          {catalogStatus === 'empty' ? t('inventory:unavailable.empty.title') : t('inventory:unavailable.error.title')}
        </h2>
        <p className="text-neutral-500 dark:text-neutral-400 text-center max-w-sm mb-6">
          {catalogStatus === 'empty' ? t('inventory:unavailable.empty.body') : t('inventory:unavailable.error.body')}
        </p>
        <div className="flex gap-3">
          <ButtonSecondary href="/instant-move/photos">{t('common:action.goBack.cta')}</ButtonSecondary>
          <ButtonPrimary onClick={retryCatalog}>{t('common:action.tryAgain.cta')}</ButtonPrimary>
        </div>
      </div>
    )
  }

  if (isLoading || !catalogReady) {
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

  // Nobody in the near ring: ask before searching the wider one. Nobody in the
  // wider ring either: suggest a scheduled move.
  if (!fetchError && outcome !== 'list') {
    const extend = outcome === 'offerExtend'
    return (
      <div className="min-h-screen bg-white dark:bg-neutral-900 flex flex-col items-center justify-center p-6">
        <HugeiconsIcon icon={Alert02Icon} size={48} strokeWidth={1.5} className="text-amber-500 mb-4" />
        <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-2 text-center">
          {extend
            ? t('web:selectMover.nearEmpty.title', { distance: formatDistanceKm(NEAR_RADIUS_KM) })
            : t('web:selectMover.noneFound.title')}
        </h2>
        <p className="text-neutral-500 dark:text-neutral-400 text-center max-w-sm mb-6">
          {extend ? t('web:selectMover.nearEmpty.subtitle') : t('web:selectMover.noneFound.subtitle')}
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <ButtonSecondary href="/instant-move/photos">{t('common:action.goBack.cta')}</ButtonSecondary>
          {extend ? (
            <ButtonPrimary onClick={extendSearch}>
              {t('web:selectMover.extend.cta', { distance: formatDistanceKm(EXTENDED_RADIUS_KM) })}
            </ButtonPrimary>
          ) : (
            <ButtonPrimary onClick={scheduleInstead}>{t('web:selectMover.scheduleInstead.cta')}</ButtonPrimary>
          )}
        </div>
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
        {!fetchError && (hiddenForCrew > 0 || hiddenForCapacity > 0) && (
          <p className="text-sm text-amber-600 dark:text-amber-400 text-center max-w-sm mb-6">
            {hiddenForCapacity > 0 &&
              t('web:selectMover.capacityTooSmall.helper', { count: hiddenForCapacity, volume: formatVolumeM3(loadedVolumeM3) })}
            {hiddenForCapacity > 0 && hiddenForCrew > 0 && ' '}
            {hiddenForCrew > 0 &&
              t('booking:pricing.crewTooSmall.helper', {
                defaultValue: '{{count}} movers hidden: crew too small for this load',
                count: hiddenForCrew,
              })}
          </p>
        )}
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

        {/* Extra helpers — every mover's quote below includes them (crew master D2) */}
        <ExtraHelpersStepper
          value={extraHelpers}
          onChange={setExtraHelpers}
          tier={pricedTier}
          config={pricingConfig}
          currency={currency}
          className="mb-6 bg-white dark:bg-neutral-800"
        />

        {/* Movers List */}
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
          {t('web:selectMover.available.title', { count: moversWithPrices.length })}
        </h2>
        {stage === 'extended' && (
          <p className="-mt-2 mb-4 text-sm text-neutral-500 dark:text-neutral-400">
            {t('web:selectMover.extended.helper', { distance: formatDistanceKm(EXTENDED_RADIUS_KM) })}
          </p>
        )}

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
              <div className="flex items-start gap-3 sm:gap-4">
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
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-1">
                    <h3 className="min-w-0 break-words font-semibold text-neutral-900 dark:text-white">
                      {mover.name}
                    </h3>
                    {mover.id === recommendedId && (
                      <span className="rounded-full bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
                        {t('web:moverCard.recommended.badge')}
                      </span>
                    )}
                  </div>
                  
                  {/* Rating & Experience */}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-neutral-500 dark:text-neutral-400 mb-2">
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
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
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
                    {/* Every mover `/api/movers/nearby` returns passed the vehicle
                        readiness gate, so the vehicle is verified by construction
                        (master D3). The plate itself stays redacted. */}
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-300">
                      <HugeiconsIcon icon={CheckmarkCircle02Icon} size={12} strokeWidth={2} />
                      {t('web:moverCard.vehicleVerified.badge')}
                    </span>
                    {/* An admin-approved moving certificate (plan legal/7 V2). */}
                    {mover.certified && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
                        <HugeiconsIcon icon={CheckmarkCircle02Icon} size={12} strokeWidth={2} />
                        {t('web:moverCard.certified.badge')}
                      </span>
                    )}
                  </div>

                  {/* Capacity & Crew */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-neutral-500 dark:text-neutral-400">
                    <span className="flex items-center gap-1">
                      <HugeiconsIcon icon={WeightScale01Icon} size={14} strokeWidth={1.5} />
                      {t('web:selectMover.capacity.label', { volume: formatVolumeM3(mover.capacityM3) })}
                    </span>
                    <span className="flex items-center gap-1">
                      <HugeiconsIcon icon={UserMultiple02Icon} size={14} strokeWidth={1.5} />
                      {/* `crewSize` already counts the driver (nearby API: crew members + 1). */}
                      {crewLabel(t, { crewSize: mover.crewSize })}
                    </span>
                    <span className="text-neutral-400">
                      {vehicleCapacity(t, mover.vehicleType)}
                    </span>
                  </div>
                </div>

                {/* Price & ETA */}
                <div className="text-right shrink-0">
                  <p className="text-xl font-bold text-neutral-900 dark:text-white">
                    {formatMoney(mover.price, { compact: true, currency: mover.quote.currency })}
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                    {t('web:selectMover.eta.label', { count: mover.estimatedArrival })}
                  </p>
                </div>
              </div>

              {/* Selection Indicator + the itemised estimate for this mover */}
              {selectedMover === mover.id && (
                <div className="mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-700">
                  <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-sm">
                    <span className="text-primary-600 dark:text-primary-400 font-medium">
                      {t('common:state.selected.label')}
                    </span>
                    <span className="text-neutral-500 dark:text-neutral-400">
                      {t('web:selectMover.languages.label', {
                        languages: mover.languages.join(t('common:list.separator')),
                      })}
                    </span>
                  </div>
                  <div className="mt-3" onClick={(e) => e.stopPropagation()}>
                    <PriceBreakdown breakdown={mover.quote} compact itemNames={inventoryNames} />
                    <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
                      {t('booking:pricing.perMover.helper', {
                        defaultValue: "Price includes this mover's vehicle class",
                      })}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Gated movers */}
        {(hiddenForCrew > 0 || hiddenForCapacity > 0) && (
          <p className="mt-4 text-xs text-amber-600 dark:text-amber-400">
            {hiddenForCapacity > 0 &&
              t('web:selectMover.capacityTooSmall.helper', { count: hiddenForCapacity, volume: formatVolumeM3(loadedVolumeM3) })}
            {hiddenForCapacity > 0 && hiddenForCrew > 0 && ' '}
            {hiddenForCrew > 0 &&
              t('booking:pricing.crewTooSmall.helper', {
                defaultValue: '{{count}} movers hidden: crew too small for this load',
                count: hiddenForCrew,
              })}
          </p>
        )}

        {/* Pricing Info */}
        <div className="mt-6 rounded-xl bg-neutral-100 dark:bg-neutral-800/50 p-4">
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            <strong>{t('web:selectMover.pricing.title')}</strong>{' '}
            {t('web:selectMover.pricing.helper', {
              count: inventoryCount,
              distance: routeDistance ? formatDistance(routeDistance) : '-',
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
                // A currency without card payments (plan currency/0): the option stays visible, disabled.
                disabled={method === 'card' && !cardAvailable}
                className={`flex-1 rounded-xl border px-4 py-3 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
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
          {!cardAvailable && (
            <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">{t('web:payment.cardUnavailable.helper')}</p>
          )}
        </div>
      </div>

      {/* Fixed Bottom Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 p-4">
        {confirmError && (
          <p role="alert" className="container max-w-3xl mx-auto mb-3 text-sm text-red-600 dark:text-red-400">
            {confirmError}
          </p>
        )}
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
                      { compact: true, currency },
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
