'use client'

import { AuthGate } from '@/components/AuthGate'
import { Calendar01Icon, UserSharingIcon } from '@/components/Icons'
import MapboxMap, { RouteInfo } from '@/components/MapboxMap'
import MapLocationPicker, { PickedLocation } from '@/components/MapLocationPicker'
import { useMoveSearch } from '@/context/moveSearch'
import ButtonPrimary from '@/shared/ButtonPrimary'
import ButtonSecondary from '@/shared/ButtonSecondary'
import { DescriptionDetails, DescriptionList, DescriptionTerm } from '@/shared/description-list'
import { Divider } from '@/shared/divider'
import {
  CheckCircleIcon,
  HomeIcon,
  MapPinIcon,
  CubeIcon,
  TruckIcon,
  UsersIcon,
  UserIcon,
  PencilSquareIcon,
} from '@heroicons/react/24/outline'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Fragment, useCallback, useEffect, useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { SectionHeading, SectionSubheading } from '@/components/listings/SectionHeading'
import { formatInventoryLabel, useInventoryNames } from '@/lib/inventory-labels'
import { formatDateWith, formatDistanceKm, formatMoney } from '@/lib/format'

const SummaryRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex justify-between py-1">
    <span className="text-neutral-500 dark:text-neutral-400">{label}</span>
    <span className="font-medium text-neutral-900 dark:text-neutral-100">{value}</span>
  </div>
)

const Page = () => {
  const router = useRouter()
  const { t } = useTranslation()

  // Both helpers live inside the component: they read `t`, so a module-scope
  // definition would freeze the boot language for every fallback below.
  const formatLabel = (value: string | null | undefined): string => {
    if (!value) return t('common:value.notSpecified.empty')
    return value
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return t('common:value.notSelected.empty')
    try {
      const date = new Date(dateStr)
      return formatDateWith(date, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    } catch {
      return dateStr
    }
  }

  const {
    // Basic info
    pickupLocation,
    dropoffLocation,
    pickupCoordinates,
    dropoffCoordinates,
    setPickupLocation,
    setDropoffLocation,
    setPickupCoordinates,
    setDropoffCoordinates,
    moveDate,
    moveType,
    // Step 1
    homeType,
    floorLevel,
    elevatorAvailable,
    parkingSituation,
    // Step 2
    pickupStreetAddress,
    pickupApartmentUnit,
    pickupAccessNotes,
    pickupLoadingZoneRequired,
    pickupArrangeHaltverbot,
    // Step 3
    dropoffStreetAddress,
    dropoffApartmentUnit,
    dropoffFloorLevel,
    dropoffElevatorAvailable,
    dropoffParkingSituation,
    dropoffArrangeHaltverbot,
    // Step 4
    inventory,
    customItems,
    // Step 5
    packingServiceLevel,
    packingMaterials,
    packingNotes,
    // Step 6
    arrivalWindow,
    flexibility,
    preferEarliestArrival,
    avoidLunchBreak,
    avoidEveningDelivery,
    // Step 7
    crewSize,
    vehicleType,
    truckAccess,
    heavyItems,
    customHeavyItems,
    // Step 8
    additionalServices,
    storageWeeks,
    disposalItems,
    coverPhotoId,
    galleryPhotoIds,
    // Step 9
    contactInfo,
    // Step 10
    legalConsent,
    setTermsAccepted,
    setPrivacyAccepted,
    // Route
    routeDistanceMeters,
    routeDurationSeconds,
    // Payment
    paymentMethod,
    // Reset
    reset,
  } = useMoveSearch()

  const inventoryCount = Object.values(inventory).reduce((sum, qty) => sum + qty, 0) + customItems.length
  // `crewSize` is a slug ('1'…'4plus'), so parse rather than cast — Number('4plus') is NaN.
  const crewCount = Number.parseInt(crewSize || '', 10)
  const hasCrewCount = Number.isFinite(crewCount)
  const selectedHeavyItems = heavyItems.filter(item => item.selected)

  // ─── Submission state ─────────────────────────────────────
  const [isSubmitting, setIsSubmitting] = useState(false)
  // Admin catalog names, so the preview matches the inventory step's wording.
  const inventoryNames = useInventoryNames()
  const [submitError, setSubmitError] = useState<string | null>(null)

  // ─── Map & location picker state ──────────────────────────
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null)
  // Admin-editable rates; empty until loaded, and every lookup has a default, so
  // the preview shows a correct price immediately and sharpens if a rate differs.
  const [pricingRates, setPricingRates] = useState<Record<string, number>>({})

  useEffect(() => {
    let cancelled = false
    fetch('/api/pricing/config')
      .then((res) => (res.ok ? res.json() : { rates: {} }))
      .then((data) => {
        if (!cancelled && data?.rates) setPricingRates(data.rates)
      })
      .catch(() => {
        // Defaults already cover this.
      })
    return () => {
      cancelled = true
    }
  }, [])
  const [locationPickerOpen, setLocationPickerOpen] = useState(false)
  const [editingLocationType, setEditingLocationType] = useState<'pickup' | 'dropoff'>('pickup')

  const handleEditLocation = useCallback((type: 'pickup' | 'dropoff') => {
    setEditingLocationType(type)
    setLocationPickerOpen(true)
  }, [])

  const handleLocationPicked = useCallback((location: PickedLocation) => {
    if (editingLocationType === 'pickup') {
      setPickupLocation(location.fullAddress)
      setPickupCoordinates(location.coordinates)
    } else {
      setDropoffLocation(location.fullAddress)
      setDropoffCoordinates(location.coordinates)
    }
    setLocationPickerOpen(false)
  }, [editingLocationType, setPickupLocation, setDropoffLocation, setPickupCoordinates, setDropoffCoordinates])

  const handleRouteCalculated = useCallback((info: RouteInfo) => {
    setRouteInfo(info)
  }, [])

  // Calculate estimated price using the same formula as calculateprice cloud function
  // Rates are admin-editable (`pricing_config`); these literals are the defaults
  // the calculateprice function also compiles in, so a config outage previews the
  // same price the server will charge rather than nothing at all.
  const r = (key: string, fallback: number) => {
    const v = pricingRates[key]
    return typeof v === 'number' && Number.isFinite(v) ? v : fallback
  }
  const BASE_RATE_PER_KM = r('instant.baseRatePerKm', 1.50)
  const MOVE_TYPE_MULTIPLIER: Record<string, number> = {
    light: r('instant.multiplier.light', 1.0),
    regular: r('instant.multiplier.regular', 1.3),
    premium: r('instant.multiplier.premium', 1.8),
  }
  const FLOOR_SURCHARGE_NO_ELEVATOR = r('instant.floorSurchargeNoElevator', 15)
  const PACKING_RATES: Record<string, number> = {
    none: r('instant.packing.none', 0),
    partial: r('instant.packing.partial', 50),
    full: r('instant.packing.full', 120),
    unpacking: r('instant.packing.unpacking', 180),
  }
  const CREW_RATES: Record<string, number> = {
    '1': r('instant.crew.1', 0),
    '2': r('instant.crew.2', 30),
    '3': r('instant.crew.3', 60),
    '4plus': r('instant.crew.4plus', 100),
  }
  const MINIMUM_PRICE = r('instant.minimumPrice', 49)

  const distanceKm = ((routeInfo?.distance ?? routeDistanceMeters) || 0) / 1000
  let basePrice = distanceKm * BASE_RATE_PER_KM * (MOVE_TYPE_MULTIPLIER[moveType || 'regular'] || 1.0)

  let floorSurcharge = 0
  const pFloor = parseInt(floorLevel || '0', 10)
  const dFloor = parseInt(dropoffFloorLevel || '0', 10)
  if (!elevatorAvailable && pFloor > 0) floorSurcharge += pFloor * FLOOR_SURCHARGE_NO_ELEVATOR
  if (!dropoffElevatorAvailable && dFloor > 0) floorSurcharge += dFloor * FLOOR_SURCHARGE_NO_ELEVATOR

  const packingPrice = PACKING_RATES[packingServiceLevel || 'none'] || 0
  const crewPrice = CREW_RATES[crewSize || '1'] || 0
  const storagePrice = (storageWeeks || 0) * r('instant.storagePerWeek', 25)
  const servicesPrice = additionalServices.length * r('scheduled.serviceFlatFee', 50)

  let totalPrice = basePrice + floorSurcharge + packingPrice + crewPrice + storagePrice + servicesPrice
  totalPrice = Math.max(totalPrice, MINIMUM_PRICE)
  totalPrice = Math.round(totalPrice * 100) / 100

  // ─── Create scheduled move handler ────────────────────────
  const handleCreateMove = useCallback(async () => {
    if (isSubmitting) return
    setIsSubmitting(true)
    setSubmitError(null)

    try {
      // 1. Upload photos
      let uploadedCoverPhotoId: string | null = null
      let uploadedGalleryPhotoIds: string[] = []

      if (coverPhotoId || galleryPhotoIds.length > 0) {
        try {
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
          }
        } catch (err) {
          console.error('Failed to upload photos:', err)
        }
      }

      // 2. Build inventory count
      const totalItemCount =
        Object.values(inventory).reduce((sum, qty) => sum + qty, 0) +
        customItems.reduce((sum, item) => sum + item.quantity, 0)

      // 3. Create the scheduled move
      const res = await fetch('/api/moves/create-scheduled', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pickupLocation: pickupLocation || null,
          pickupLatitude: pickupCoordinates?.latitude ?? null,
          pickupLongitude: pickupCoordinates?.longitude ?? null,
          pickupStreetAddress,
          pickupApartmentUnit,
          pickupAccessNotes,
          dropoffLocation: dropoffLocation || null,
          dropoffLatitude: dropoffCoordinates?.latitude ?? null,
          dropoffLongitude: dropoffCoordinates?.longitude ?? null,
          dropoffStreetAddress,
          dropoffApartmentUnit,
          moveDate,
          moveType: moveType || 'regular',
          homeType,
          floorLevel,
          elevatorAvailable,
          parkingSituation,
          pickupHaltverbot: pickupArrangeHaltverbot,
          dropoffFloorLevel,
          dropoffElevatorAvailable,
          dropoffParkingSituation,
          dropoffHaltverbot: dropoffArrangeHaltverbot,
          inventoryItems: JSON.stringify(inventory),
          customItems: customItems.map((c) => JSON.stringify(c)),
          totalItemCount,
          packingServiceLevel,
          packingMaterials: Array.isArray(packingMaterials) ? packingMaterials : [],
          packingNotes,
          arrivalWindow,
          flexibility,
          crewSize,
          vehicleType,
          additionalServices: Array.isArray(additionalServices) ? additionalServices : [],
          storageWeeks,
          disposalItems,
          coverPhotoId: uploadedCoverPhotoId,
          galleryPhotoIds: uploadedGalleryPhotoIds,
          contactName: contactInfo.fullName,
          contactEmail: contactInfo.email,
          contactPhone: contactInfo.phoneNumber,
          contactNotes: contactInfo.notesForMovers,
          isBusinessMove: contactInfo.isBusinessMove,
          companyName: contactInfo.companyName,
          vatId: contactInfo.vatId,
          routeDistanceMeters: routeInfo?.distance ?? routeDistanceMeters,
          routeDurationSeconds: routeInfo?.duration ?? routeDurationSeconds,
          estimatedPrice: totalPrice,
          finalPrice: totalPrice,
          paymentMethod,
        }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: t('errors:generic.unknown') }))
        throw new Error(errData.error || t('errors:move.createFailed'))
      }

      const data = await res.json()

      // 4. Clear the draft and redirect to move details
      reset()
      router.push(`/move-details/${data.handle}`)
    } catch (err) {
      console.error('Failed to create scheduled move:', err)
      setSubmitError(err instanceof Error ? err.message : t('errors:generic.retry.error'))
    } finally {
      setIsSubmitting(false)
    }
  }, [
    isSubmitting, coverPhotoId, galleryPhotoIds, inventory, customItems,
    pickupLocation, pickupCoordinates, pickupStreetAddress, pickupApartmentUnit,
    pickupAccessNotes, dropoffLocation, dropoffCoordinates, dropoffStreetAddress,
    dropoffApartmentUnit, moveDate, moveType, homeType, floorLevel, elevatorAvailable,
    parkingSituation, pickupArrangeHaltverbot, dropoffFloorLevel, dropoffElevatorAvailable,
    dropoffParkingSituation, dropoffArrangeHaltverbot, packingServiceLevel, packingMaterials,
    packingNotes, arrivalWindow, flexibility, crewSize, vehicleType, additionalServices,
    storageWeeks, disposalItems, contactInfo, routeInfo, routeDistanceMeters,
    routeDurationSeconds, totalPrice, paymentMethod, reset, router, t,
  ])

  // Build gallery images array for header
  const galleryImages = [
    coverPhotoId || '/images/placeholder-move.jpg',
    ...galleryPhotoIds,
  ].filter(Boolean).slice(0, 5)

  // If no photos, use placeholders
  const displayImages = galleryImages.length > 0 ? galleryImages : [
    '/images/placeholder-move.jpg',
    '/images/placeholder-move.jpg',
    '/images/placeholder-move.jpg',
    '/images/placeholder-move.jpg',
    '/images/placeholder-move.jpg',
  ]

  const renderHeaderGallery = () => {
    return (
      <header className="rounded-md sm:rounded-xl">
        <div className="relative grid grid-cols-3 gap-1 sm:grid-cols-4 sm:gap-2">
          <div className="relative col-span-2 row-span-3 cursor-pointer overflow-hidden rounded-md sm:row-span-2 sm:rounded-xl">
            <Image
              fill
              className="rounded-md object-cover sm:rounded-xl"
              src={displayImages[0] || '/images/placeholder-move.jpg'}
              alt={t('booking:photos.gallery.a11y')}
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 50vw"
            />
            <div className="absolute inset-0 bg-neutral-900 bg-opacity-20 opacity-0 transition-opacity hover:opacity-100" />
          </div>
          {displayImages.slice(1, 5).map((img, index) => (
            <div
              key={index}
              className={`relative overflow-hidden rounded-md sm:rounded-xl ${
                index >= 3 ? 'hidden sm:block' : ''
              }`}
            >
              <div className="aspect-w-4 aspect-h-3 sm:aspect-w-6 sm:aspect-h-5">
                <Image
                  fill
                  className="rounded-md object-cover sm:rounded-xl"
                  src={img || '/images/placeholder-move.jpg'}
                  alt=""
                  sizes="400px"
                />
              </div>
              <div className="absolute inset-0 cursor-pointer bg-neutral-900 bg-opacity-20 opacity-0 transition-opacity hover:opacity-100" />
            </div>
          ))}

          <button
            className="absolute bottom-3 left-3 z-10 hidden rounded-xl bg-neutral-100 px-4 py-2 text-neutral-500 hover:bg-neutral-200 md:flex md:items-center md:justify-center dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700"
            onClick={() => router.push('/add-listing/6')}
          >
            <PencilSquareIcon className="h-5 w-5" />
            <span className="ml-2 text-sm font-medium text-neutral-800 dark:text-neutral-200">
              {t('web:preview.editPhotos.cta')}
            </span>
          </button>
        </div>
      </header>
    )
  }

  const renderSectionHeader = () => {
    return (
      <div className="listingSection__wrap">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-primary-100 px-3 py-1 text-sm font-medium text-primary-800 dark:bg-primary-900/30 dark:text-primary-300">
                {t('web:preview.moveTypeBadge.label', { moveType: formatLabel(moveType) })}
              </span>
            </div>
            <h1 className="mt-3 text-2xl font-semibold sm:text-3xl">
              {pickupStreetAddress || pickupLocation || t('booking:pickup.location.label')} → {dropoffStreetAddress || t('booking:dropoff.location.label')}
            </h1>
            <p className="mt-2 text-neutral-500 dark:text-neutral-400">
              {formatDate(moveDate)} · {formatLabel(arrivalWindow)}
            </p>
          </div>
          <Link
            href="/add-listing/1"
            className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700"
          >
            <PencilSquareIcon className="h-4 w-4" />
            {t('common:action.edit.cta')}
          </Link>
        </div>

        <Divider className="my-6" />

        <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          <div className="flex items-center gap-x-3">
            <HomeIcon className="h-6 w-6 text-neutral-600 dark:text-neutral-400" />
            <span>{formatLabel(homeType)}</span>
          </div>
          <div className="flex items-center gap-x-3">
            <MapPinIcon className="h-6 w-6 text-neutral-600 dark:text-neutral-400" />
            <span>
              {t('booking:floorLevel.numbered.option', {
                n: floorLevel || t('common:value.notAvailable.label'),
              })}
            </span>
          </div>
          <div className="flex items-center gap-x-3">
            <CubeIcon className="h-6 w-6 text-neutral-600 dark:text-neutral-400" />
            <span>{t('moves:itemCount', { count: inventoryCount })}</span>
          </div>
          <div className="flex items-center gap-x-3">
            <UsersIcon className="h-6 w-6 text-neutral-600 dark:text-neutral-400" />
            <span>
              {hasCrewCount
                ? t('moves:moverCount', { count: crewCount })
                : t('booking:crew.tbd.label')}
            </span>
          </div>
        </div>
      </div>
    )
  }

  const renderSectionInfo = () => {
    return (
      <div className="listingSection__wrap">
        <SectionHeading>{t('booking:details.title')}</SectionHeading>

        {/* Pickup Address */}
        <div className="rounded-2xl border border-neutral-200 p-4 dark:border-neutral-700">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100 text-xs font-bold text-green-600">A</span>
              {t('booking:pickupAddress.label')}
            </h4>
            <Link href="/add-listing/2" className="text-sm text-primary-600 hover:underline">{t('common:action.edit.cta')}</Link>
          </div>
          <div className="space-y-1 text-sm">
            <SummaryRow label={t('moves:detail.address.label')} value={pickupStreetAddress || t('common:value.notSpecified.empty')} />
            {pickupApartmentUnit && <SummaryRow label={t('moves:detail.unit.label')} value={pickupApartmentUnit} />}
            <SummaryRow label={t('moves:detail.floor.label')} value={formatLabel(floorLevel)} />
            <SummaryRow label={t('moves:detail.elevator.label')} value={elevatorAvailable ? t('common:answer.yes.label') : t('common:answer.no.label')} />
            <SummaryRow label={t('moves:detail.parking.label')} value={formatLabel(parkingSituation)} />
            {pickupLoadingZoneRequired && (
              <SummaryRow
                label={t('booking:haltverbot.label')}
                value={pickupArrangeHaltverbot ? t('booking:haltverbot.weArrange.label') : t('booking:haltverbot.customerArranges.label')}
              />
            )}
            {pickupAccessNotes && <SummaryRow label={t('booking:accessNotes.shortLabel')} value={pickupAccessNotes} />}
          </div>
        </div>

        {/* Drop-off Address */}
        <div className="rounded-2xl border border-neutral-200 p-4 dark:border-neutral-700">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-100 text-xs font-bold text-red-600">B</span>
              {t('booking:dropoffAddress.label')}
            </h4>
            <Link href="/add-listing/3" className="text-sm text-primary-600 hover:underline">{t('common:action.edit.cta')}</Link>
          </div>
          <div className="space-y-1 text-sm">
            <SummaryRow label={t('moves:detail.address.label')} value={dropoffStreetAddress || t('common:value.notSpecified.empty')} />
            {dropoffApartmentUnit && <SummaryRow label={t('moves:detail.unit.label')} value={dropoffApartmentUnit} />}
            <SummaryRow label={t('moves:detail.floor.label')} value={formatLabel(dropoffFloorLevel)} />
            <SummaryRow label={t('moves:detail.elevator.label')} value={dropoffElevatorAvailable ? t('common:answer.yes.label') : t('common:answer.no.label')} />
            <SummaryRow label={t('moves:detail.parking.label')} value={formatLabel(dropoffParkingSituation)} />
            {dropoffArrangeHaltverbot && <SummaryRow label={t('booking:haltverbot.label')} value={t('common:value.required.label')} />}
          </div>
        </div>

        <Divider className="w-14!" />

        <div>
          <SectionHeading>{t('booking:services.detailsTitle')}</SectionHeading>
          <SectionSubheading>{t('booking:services.detailsSubtitle')}</SectionSubheading>
        </div>

        <DescriptionList>
          <Fragment>
            <DescriptionTerm>{t('booking:field.inventory.label')}</DescriptionTerm>
            <DescriptionDetails>
              {(() => {
                // Labels come from the admin catalog so this preview shows the
                // same wording the inventory step did.
                const entries = Object.entries(inventory).filter(([, qty]) => qty > 0)
                if (entries.length === 0 && customItems.length === 0) return t('moves:itemCount', { count: inventoryCount })
                return (
                  <ul className="list-disc list-inside text-sm space-y-0.5">
                    {entries.map(([id, qty]) => (
                      <li key={id}>{formatInventoryLabel(id, inventoryNames)} &times; {qty}</li>
                    ))}
                    {customItems.map((item, i) => (
                      <li key={`custom-${i}`}>{item.name} &times; {item.quantity}</li>
                    ))}
                  </ul>
                )
              })()}
            </DescriptionDetails>
          </Fragment>
          <Fragment>
            <DescriptionTerm>{t('moves:detail.packingService.label')}</DescriptionTerm>
            <DescriptionDetails>{formatLabel(packingServiceLevel)}</DescriptionDetails>
          </Fragment>
          {packingMaterials.length > 0 && (
            <Fragment>
              <DescriptionTerm>{t('booking:packingMaterials.label')}</DescriptionTerm>
              <DescriptionDetails>
                {t('booking:packingMaterials.selectedCount.label', { count: packingMaterials.length })}
              </DescriptionDetails>
            </Fragment>
          )}
          <Fragment>
            <DescriptionTerm>{t('moves:detail.arrivalWindow.label')}</DescriptionTerm>
            <DescriptionDetails>{formatLabel(arrivalWindow)}</DescriptionDetails>
          </Fragment>
          {flexibility && (
            <Fragment>
              <DescriptionTerm>{t('booking:flexibility.label')}</DescriptionTerm>
              <DescriptionDetails>{formatLabel(flexibility)}</DescriptionDetails>
            </Fragment>
          )}
          <Fragment>
            <DescriptionTerm>{t('booking:field.crewSize.label')}</DescriptionTerm>
            <DescriptionDetails>
              {hasCrewCount
                ? t('moves:moverCount', { count: crewCount })
                : t('common:value.notSpecified.empty')}
            </DescriptionDetails>
          </Fragment>
          <Fragment>
            <DescriptionTerm>{t('booking:field.vehicle.label')}</DescriptionTerm>
            <DescriptionDetails>{formatLabel(vehicleType)}</DescriptionDetails>
          </Fragment>
        </DescriptionList>
      </div>
    )
  }

  const renderSectionServices = () => {
    if (additionalServices.length === 0 && !storageWeeks && !disposalItems) {
      return null
    }

    return (
      <div className="listingSection__wrap">
        <div className="flex items-center justify-between">
          <div>
            <SectionHeading>{t('moves:detail.additionalServices.title')}</SectionHeading>
            <SectionSubheading>{t('booking:services.subtitle')}</SectionSubheading>
          </div>
          <Link href="/add-listing/6" className="text-sm text-primary-600 hover:underline flex items-center gap-1">
            <PencilSquareIcon className="h-4 w-4" />
            {t('common:action.edit.cta')}
          </Link>
        </div>
        <Divider className="w-14!" />

        <div className="grid grid-cols-1 gap-4 text-sm text-neutral-700 xl:grid-cols-2 dark:text-neutral-300">
          {additionalServices.map((service) => (
            <div key={service} className="flex items-center gap-x-3">
              <CheckCircleIcon className="h-5 w-5 text-green-500" />
              <span>{formatLabel(service)}</span>
            </div>
          ))}
          {storageWeeks > 0 && (
            <div className="flex items-center gap-x-3">
              <CheckCircleIcon className="h-5 w-5 text-green-500" />
              <span>{t('booking:services.temporaryStorageWeeks.label', { count: storageWeeks })}</span>
            </div>
          )}
          {disposalItems && (
            <div className="flex items-center gap-x-3">
              <CheckCircleIcon className="h-5 w-5 text-green-500" />
              <span>{t('booking:services.disposalItems.label', { items: disposalItems })}</span>
            </div>
          )}
        </div>

        {(selectedHeavyItems.length > 0 || customHeavyItems.length > 0) && (
          <>
            <Divider className="w-14!" />
            <div>
              <h4 className="font-semibold mb-3">{t('booking:inventory.heavyItems.label')}</h4>
              <div className="flex flex-wrap gap-2">
                {selectedHeavyItems.map((item) => (
                  <span key={item.id} className="rounded-full bg-amber-100 px-3 py-1 text-sm text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
                    {item.name}
                  </span>
                ))}
                {customHeavyItems.map((item) => (
                  <span key={item.id} className="rounded-full bg-amber-100 px-3 py-1 text-sm text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
                    {item.name}
                  </span>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    )
  }

  const renderSectionContact = () => {
    return (
      <div className="listingSection__wrap">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900/30">
              <UserIcon className="h-7 w-7 text-primary-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">{contactInfo.fullName || t('booking:contact.name.shortLabel')}</h3>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                {contactInfo.isBusinessMove
                  ? t('booking:business.type.business.label')
                  : t('booking:business.type.personal.label')}
              </p>
            </div>
          </div>
          <Link href="/add-listing/9" className="text-sm text-primary-600 hover:underline flex items-center gap-1">
            <PencilSquareIcon className="h-4 w-4" />
            {t('common:action.edit.cta')}
          </Link>
        </div>

        <Divider />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">{t('common:field.email.shortLabel')}</p>
            <p className="font-medium">{contactInfo.email || t('common:value.notProvided.empty')}</p>
          </div>
          <div>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">{t('common:field.phone.shortLabel')}</p>
            <p className="font-medium">{contactInfo.phoneNumber || t('common:value.notProvided.empty')}</p>
          </div>
          {contactInfo.isBusinessMove && contactInfo.companyName && (
            <div>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">{t('booking:business.company.shortLabel')}</p>
              <p className="font-medium">{contactInfo.companyName}</p>
            </div>
          )}
          {contactInfo.isBusinessMove && contactInfo.vatId && (
            <div>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">{t('booking:business.vatId.shortLabel')}</p>
              <p className="font-medium">{contactInfo.vatId}</p>
            </div>
          )}
        </div>

        {contactInfo.notesForMovers && (
          <>
            <Divider />
            <div>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-2">{t('booking:contact.notes.shortLabel')}</p>
              <p className="text-neutral-700 dark:text-neutral-300">{contactInfo.notesForMovers}</p>
            </div>
          </>
        )}
      </div>
    )
  }

  const renderSidebarPriceAndForm = () => {
    const canProceed = legalConsent.termsAccepted && legalConsent.privacyAccepted

    return (
      <div className="listingSection__wrap sm:shadow-xl">
        {/* PRICE */}
        <div className="text-center">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">{t('booking:pricing.estimatedTotal.label')}</p>
          <div className="mt-1 text-3xl font-bold text-primary-600">
            {formatMoney(totalPrice, { compact: true })}
          </div>
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            {t('booking:pricing.finalAfterReview.helper')}
          </p>
        </div>

        <Divider />

        {/* Price breakdown */}
        <DescriptionList>
          <DescriptionTerm>
            {t('booking:pricing.baseRateWithDistance.label', {
              moveType: formatLabel(moveType),
              distance: formatDistanceKm(distanceKm),
            })}
          </DescriptionTerm>
          <DescriptionDetails className="sm:text-right">{formatMoney(basePrice)}</DescriptionDetails>
          {floorSurcharge > 0 && (
            <>
              <DescriptionTerm>{t('booking:pricing.floorSurcharge.label')}</DescriptionTerm>
              <DescriptionDetails className="sm:text-right">{formatMoney(floorSurcharge)}</DescriptionDetails>
            </>
          )}
          {packingPrice > 0 && (
            <>
              <DescriptionTerm>{t('moves:detail.packingService.label')}</DescriptionTerm>
              <DescriptionDetails className="sm:text-right">{formatMoney(packingPrice)}</DescriptionDetails>
            </>
          )}
          {crewPrice > 0 && (
            <>
              <DescriptionTerm>
                {t('booking:pricing.crew.label', {
                  crew: hasCrewCount ? t('moves:moverCount', { count: crewCount }) : crewSize,
                })}
              </DescriptionTerm>
              <DescriptionDetails className="sm:text-right">{formatMoney(crewPrice)}</DescriptionDetails>
            </>
          )}
          {servicesPrice > 0 && (
            <>
              <DescriptionTerm>
                {t('booking:pricing.additionalServicesCount.label', { count: additionalServices.length })}
              </DescriptionTerm>
              <DescriptionDetails className="sm:text-right">{formatMoney(servicesPrice)}</DescriptionDetails>
            </>
          )}
          {storagePrice > 0 && (
            <>
              <DescriptionTerm>{t('booking:pricing.storageWeeks.label', { count: storageWeeks })}</DescriptionTerm>
              <DescriptionDetails className="sm:text-right">{formatMoney(storagePrice)}</DescriptionDetails>
            </>
          )}
          <DescriptionTerm className="font-semibold text-neutral-900 dark:text-white">{t('booking:pricing.total.label')}</DescriptionTerm>
          <DescriptionDetails className="font-semibold sm:text-right">{formatMoney(totalPrice)}</DescriptionDetails>
        </DescriptionList>

        {paymentMethod && (
          <>
            <Divider />
            <div className="flex justify-between text-sm">
              <span className="text-neutral-500 dark:text-neutral-400">{t('moves:payment.method.label')}</span>
              <span className="font-medium text-neutral-900 dark:text-neutral-100">{formatLabel(paymentMethod)}</span>
            </div>
          </>
        )}

        <Divider />

        {/* Legal Checkboxes */}
        <div className="space-y-3">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={legalConsent.termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm text-neutral-700 dark:text-neutral-300">
              <Trans
                i18nKey="legal:accept.terms"
                components={[
                  <Link key="terms" href="/terms" className="text-primary-600 hover:underline" />,
                ]}
              />
            </span>
          </label>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={legalConsent.privacyAccepted}
              onChange={(e) => setPrivacyAccepted(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm text-neutral-700 dark:text-neutral-300">
              <Trans
                i18nKey="legal:accept.privacy"
                components={[
                  <Link key="privacy" href="/privacy" className="text-primary-600 hover:underline" />,
                ]}
              />
            </span>
          </label>
        </div>

        {/* SUBMIT */}
        <ButtonPrimary
          className="w-full"
          disabled={!canProceed || isSubmitting}
          onClick={handleCreateMove}
        >
          {isSubmitting ? t('web:preview.creating.cta') : t('web:preview.complete.cta')}
        </ButtonPrimary>

        {submitError && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
            {submitError}
          </div>
        )}

        {!canProceed && (
          <p className="text-center text-xs text-amber-600 dark:text-amber-400">
            {t('legal:accept.required.error')}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="container">
      {/*  HEADER */}
      {renderHeaderGallery()}

      {/* ROUTE MAP & EDITABLE LOCATIONS */}
      {pickupCoordinates && dropoffCoordinates && (
        <div className="mt-8 overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-700">
          {/* Map */}
          <div className="relative h-56 sm:h-72">
            <MapboxMap
              pickupCoordinates={pickupCoordinates}
              dropoffCoordinates={dropoffCoordinates}
              showRoute={true}
              onRouteCalculated={handleRouteCalculated}
              className="w-full h-full !rounded-none"
            />
          </div>
          {/* Editable location cards */}
          <div className="bg-white dark:bg-neutral-800 p-4">
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-center">
                <div className="w-2.5 h-2.5 rounded-full bg-neutral-900 dark:bg-white" />
                <div className="w-px h-8 bg-neutral-300 dark:bg-neutral-600" />
                <div className="w-2.5 h-2.5 rounded-full border-2 border-neutral-900 dark:border-white" />
              </div>
              <div className="flex-1 min-w-0 space-y-3">
                <button
                  type="button"
                  onClick={() => handleEditLocation('pickup')}
                  className="block w-full text-left rounded-lg px-2 py-1.5 -mx-2 hover:bg-neutral-100 dark:hover:bg-neutral-700/60 transition"
                >
                  <p className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">{t('booking:field.pickup.label')}</p>
                  <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">
                    {pickupLocation || t('booking:pickup.tapToSelect.placeholder')}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => handleEditLocation('dropoff')}
                  className="block w-full text-left rounded-lg px-2 py-1.5 -mx-2 hover:bg-neutral-100 dark:hover:bg-neutral-700/60 transition"
                >
                  <p className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">{t('booking:field.dropoff.label')}</p>
                  <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">
                    {dropoffLocation || t('booking:dropoff.tapToSelect.placeholder')}
                  </p>
                </button>
              </div>
              {routeInfo && (
                <div className="shrink-0 text-right">
                  <p className="text-base font-semibold text-neutral-900 dark:text-white">
                    {routeInfo.distance >= 1000
                      ? `${(routeInfo.distance / 1000).toFixed(1)} km`
                      : `${Math.round(routeInfo.distance)} m`}
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    {routeInfo.duration >= 3600
                      ? `${Math.floor(routeInfo.duration / 3600)}h ${Math.ceil((routeInfo.duration % 3600) / 60)}min`
                      : `${Math.ceil(routeInfo.duration / 60)} min`}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* If no coordinates, show editable location cards without map */}
      {(!pickupCoordinates || !dropoffCoordinates) && (
        <div className="mt-8 rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-4">
          <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-3">{t('booking:locations.title')}</p>
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => handleEditLocation('pickup')}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-neutral-100 dark:hover:bg-neutral-700/60 transition"
            >
              <MapPinIcon className="h-5 w-5 shrink-0 text-neutral-400" />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-neutral-500 dark:text-neutral-400">{t('booking:field.pickup.label')}</p>
                <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">
                  {pickupLocation || t('booking:pickup.tapToSelectLong.placeholder')}
                </p>
              </div>
              <PencilSquareIcon className="h-4 w-4 shrink-0 text-neutral-400" />
            </button>
            <button
              type="button"
              onClick={() => handleEditLocation('dropoff')}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-neutral-100 dark:hover:bg-neutral-700/60 transition"
            >
              <MapPinIcon className="h-5 w-5 shrink-0 text-neutral-400" />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-neutral-500 dark:text-neutral-400">{t('booking:field.dropoff.label')}</p>
                <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">
                  {dropoffLocation || t('booking:dropoff.tapToSelectLong.placeholder')}
                </p>
              </div>
              <PencilSquareIcon className="h-4 w-4 shrink-0 text-neutral-400" />
            </button>
          </div>
        </div>
      )}

      {/* MAIN */}
      <main className="relative z-[1] mt-10 flex flex-col gap-8 lg:flex-row xl:gap-10">
        {/* CONTENT */}
        <div className="flex w-full flex-col gap-y-8 lg:w-3/5 xl:w-[64%] xl:gap-y-10">
          {renderSectionHeader()}
          {renderSectionInfo()}
          {renderSectionServices()}
        </div>

        {/* SIDEBAR */}
        <div className="grow">
          <div className="sticky top-28">{renderSidebarPriceAndForm()}</div>
        </div>
      </main>

      <Divider className="my-16" />

      {/* Contact Section */}
      <div className="mb-16">
        {renderSectionContact()}
      </div>

      {/* Location Picker Overlay */}
      <MapLocationPicker
        open={locationPickerOpen}
        onClose={() => setLocationPickerOpen(false)}
        onSelect={handleLocationPicked}
        initialCoordinates={
          editingLocationType === 'pickup' ? pickupCoordinates : dropoffCoordinates
        }
        label={editingLocationType === 'pickup' ? t('booking:pickup.edit.a11y') : t('booking:dropoff.edit.a11y')}
      />
    </div>
  )
}

const MovePreviewPage = () => (
  <AuthGate redirectBack="/move-preview">
    <Page />
  </AuthGate>
)

export default MovePreviewPage
