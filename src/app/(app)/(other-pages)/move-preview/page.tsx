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
import { Fragment, useCallback, useState } from 'react'
import { SectionHeading, SectionSubheading } from '@/components/listings/SectionHeading'

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
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  } catch {
    return dateStr
  }
}

const SummaryRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex justify-between py-1">
    <span className="text-neutral-500 dark:text-neutral-400">{label}</span>
    <span className="font-medium text-neutral-900 dark:text-neutral-100">{value}</span>
  </div>
)

const Page = () => {
  const router = useRouter()
  
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
    coverPhoto,
    galleryPhotos,
    // Step 9
    contactInfo,
    // Step 10
    legalConsent,
    setTermsAccepted,
    setPrivacyAccepted,
  } = useMoveSearch()

  const inventoryCount = Object.values(inventory).reduce((sum, qty) => sum + qty, 0) + customItems.length
  const selectedHeavyItems = heavyItems.filter(item => item.selected)

  // ─── Map & location picker state ──────────────────────────
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null)
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

  // Calculate estimated price
  const basePrice = moveType === 'premium' ? 299 : moveType === 'regular' ? 199 : 99
  const packingPrice = packingServiceLevel === 'full' ? 250 : packingServiceLevel === 'unpacking' ? 350 : packingServiceLevel === 'partial' ? 150 : 0
  const servicesPrice = additionalServices.length * 50
  const storagePrice = storageWeeks * 30
  const totalPrice = basePrice + packingPrice + servicesPrice + storagePrice

  // Build gallery images array for header
  const galleryImages = [
    coverPhoto || '/images/placeholder-move.jpg',
    ...galleryPhotos,
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
              alt="Move photos"
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
            onClick={() => router.push('/add-listing/8')}
          >
            <PencilSquareIcon className="h-5 w-5" />
            <span className="ml-2 text-sm font-medium text-neutral-800 dark:text-neutral-200">
              Edit photos
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
                {formatLabel(moveType)} Move
              </span>
            </div>
            <h1 className="mt-3 text-2xl font-semibold sm:text-3xl">
              {pickupStreetAddress || pickupLocation || 'Pickup Location'} → {dropoffStreetAddress || 'Drop-off Location'}
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
            Edit
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
            <span>Floor {floorLevel || 'N/A'}</span>
          </div>
          <div className="flex items-center gap-x-3">
            <CubeIcon className="h-6 w-6 text-neutral-600 dark:text-neutral-400" />
            <span>{inventoryCount} items</span>
          </div>
          <div className="flex items-center gap-x-3">
            <UsersIcon className="h-6 w-6 text-neutral-600 dark:text-neutral-400" />
            <span>{crewSize ? `${crewSize} movers` : 'Crew TBD'}</span>
          </div>
        </div>
      </div>
    )
  }

  const renderSectionInfo = () => {
    return (
      <div className="listingSection__wrap">
        <SectionHeading>Move details</SectionHeading>
        
        {/* Pickup Address */}
        <div className="rounded-2xl border border-neutral-200 p-4 dark:border-neutral-700">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100 text-xs font-bold text-green-600">A</span>
              Pickup Address
            </h4>
            <Link href="/add-listing/2" className="text-sm text-primary-600 hover:underline">Edit</Link>
          </div>
          <div className="space-y-1 text-sm">
            <SummaryRow label="Address" value={pickupStreetAddress || 'Not specified'} />
            {pickupApartmentUnit && <SummaryRow label="Unit" value={pickupApartmentUnit} />}
            <SummaryRow label="Floor" value={formatLabel(floorLevel)} />
            <SummaryRow label="Elevator" value={elevatorAvailable ? 'Yes' : 'No'} />
            <SummaryRow label="Parking" value={formatLabel(parkingSituation)} />
            {pickupLoadingZoneRequired && (
              <SummaryRow label="Haltverbot" value={pickupArrangeHaltverbot ? 'We arrange' : 'Customer arranges'} />
            )}
            {pickupAccessNotes && <SummaryRow label="Access notes" value={pickupAccessNotes} />}
          </div>
        </div>

        {/* Drop-off Address */}
        <div className="rounded-2xl border border-neutral-200 p-4 dark:border-neutral-700">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-100 text-xs font-bold text-red-600">B</span>
              Drop-off Address
            </h4>
            <Link href="/add-listing/3" className="text-sm text-primary-600 hover:underline">Edit</Link>
          </div>
          <div className="space-y-1 text-sm">
            <SummaryRow label="Address" value={dropoffStreetAddress || 'Not specified'} />
            {dropoffApartmentUnit && <SummaryRow label="Unit" value={dropoffApartmentUnit} />}
            <SummaryRow label="Floor" value={formatLabel(dropoffFloorLevel)} />
            <SummaryRow label="Elevator" value={dropoffElevatorAvailable ? 'Yes' : 'No'} />
            <SummaryRow label="Parking" value={formatLabel(dropoffParkingSituation)} />
            {dropoffArrangeHaltverbot && <SummaryRow label="Haltverbot" value="Required" />}
          </div>
        </div>

        <Divider className="w-14!" />

        <div>
          <SectionHeading>Service details</SectionHeading>
          <SectionSubheading>Your selected services and preferences</SectionSubheading>
        </div>
        
        <DescriptionList>
          <Fragment>
            <DescriptionTerm>Inventory</DescriptionTerm>
            <DescriptionDetails>{inventoryCount} items</DescriptionDetails>
          </Fragment>
          <Fragment>
            <DescriptionTerm>Packing service</DescriptionTerm>
            <DescriptionDetails>{formatLabel(packingServiceLevel)}</DescriptionDetails>
          </Fragment>
          {packingMaterials.length > 0 && (
            <Fragment>
              <DescriptionTerm>Packing materials</DescriptionTerm>
              <DescriptionDetails>{packingMaterials.length} selected</DescriptionDetails>
            </Fragment>
          )}
          <Fragment>
            <DescriptionTerm>Arrival window</DescriptionTerm>
            <DescriptionDetails>{formatLabel(arrivalWindow)}</DescriptionDetails>
          </Fragment>
          {flexibility && (
            <Fragment>
              <DescriptionTerm>Flexibility</DescriptionTerm>
              <DescriptionDetails>{formatLabel(flexibility)}</DescriptionDetails>
            </Fragment>
          )}
          <Fragment>
            <DescriptionTerm>Crew size</DescriptionTerm>
            <DescriptionDetails>{crewSize ? `${crewSize} movers` : 'Not specified'}</DescriptionDetails>
          </Fragment>
          <Fragment>
            <DescriptionTerm>Vehicle</DescriptionTerm>
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
            <SectionHeading>Additional services</SectionHeading>
            <SectionSubheading>Extra services you&apos;ve selected</SectionSubheading>
          </div>
          <Link href="/add-listing/8" className="text-sm text-primary-600 hover:underline flex items-center gap-1">
            <PencilSquareIcon className="h-4 w-4" />
            Edit
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
              <span>Temporary storage: {storageWeeks} weeks</span>
            </div>
          )}
          {disposalItems && (
            <div className="flex items-center gap-x-3">
              <CheckCircleIcon className="h-5 w-5 text-green-500" />
              <span>Disposal items: {disposalItems}</span>
            </div>
          )}
        </div>

        {(selectedHeavyItems.length > 0 || customHeavyItems.length > 0) && (
          <>
            <Divider className="w-14!" />
            <div>
              <h4 className="font-semibold mb-3">Heavy items requiring special handling</h4>
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
              <h3 className="text-lg font-semibold">{contactInfo.fullName || 'Contact Name'}</h3>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                {contactInfo.isBusinessMove ? 'Business move' : 'Personal move'}
              </p>
            </div>
          </div>
          <Link href="/add-listing/9" className="text-sm text-primary-600 hover:underline flex items-center gap-1">
            <PencilSquareIcon className="h-4 w-4" />
            Edit
          </Link>
        </div>

        <Divider />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Email</p>
            <p className="font-medium">{contactInfo.email || 'Not provided'}</p>
          </div>
          <div>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Phone</p>
            <p className="font-medium">{contactInfo.phoneNumber || 'Not provided'}</p>
          </div>
          {contactInfo.isBusinessMove && contactInfo.companyName && (
            <div>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">Company</p>
              <p className="font-medium">{contactInfo.companyName}</p>
            </div>
          )}
          {contactInfo.isBusinessMove && contactInfo.vatId && (
            <div>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">VAT ID</p>
              <p className="font-medium">{contactInfo.vatId}</p>
            </div>
          )}
        </div>

        {contactInfo.notesForMovers && (
          <>
            <Divider />
            <div>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-2">Notes for movers</p>
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
          <p className="text-sm text-neutral-500 dark:text-neutral-400">Estimated total</p>
          <div className="mt-1 text-3xl font-bold text-primary-600">
            €{totalPrice.toLocaleString()}
          </div>
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            Final price confirmed after review
          </p>
        </div>

        <Divider />

        {/* Price breakdown */}
        <DescriptionList>
          <DescriptionTerm>Base rate ({formatLabel(moveType)})</DescriptionTerm>
          <DescriptionDetails className="sm:text-right">€{basePrice}</DescriptionDetails>
          {packingPrice > 0 && (
            <>
              <DescriptionTerm>Packing service</DescriptionTerm>
              <DescriptionDetails className="sm:text-right">€{packingPrice}</DescriptionDetails>
            </>
          )}
          {servicesPrice > 0 && (
            <>
              <DescriptionTerm>Additional services ({additionalServices.length})</DescriptionTerm>
              <DescriptionDetails className="sm:text-right">€{servicesPrice}</DescriptionDetails>
            </>
          )}
          {storagePrice > 0 && (
            <>
              <DescriptionTerm>Storage ({storageWeeks} weeks)</DescriptionTerm>
              <DescriptionDetails className="sm:text-right">€{storagePrice}</DescriptionDetails>
            </>
          )}
          <DescriptionTerm className="font-semibold text-neutral-900 dark:text-white">Total</DescriptionTerm>
          <DescriptionDetails className="font-semibold sm:text-right">€{totalPrice}</DescriptionDetails>
        </DescriptionList>

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
              I confirm the details and agree to the{' '}
              <Link href="/terms" className="text-primary-600 hover:underline">terms & conditions</Link>
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
              I acknowledge the{' '}
              <Link href="/privacy" className="text-primary-600 hover:underline">privacy policy</Link> (GDPR)
            </span>
          </label>
        </div>

        {/* SUBMIT */}
        <ButtonPrimary
          href="/checkout"
          className="w-full"
          disabled={!canProceed}
        >
          Proceed to payment
        </ButtonPrimary>

        {!canProceed && (
          <p className="text-center text-xs text-amber-600 dark:text-amber-400">
            Please accept terms and privacy policy to continue
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
                  <p className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Pickup</p>
                  <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">
                    {pickupLocation || 'Tap to select pickup'}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => handleEditLocation('dropoff')}
                  className="block w-full text-left rounded-lg px-2 py-1.5 -mx-2 hover:bg-neutral-100 dark:hover:bg-neutral-700/60 transition"
                >
                  <p className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Drop-off</p>
                  <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">
                    {dropoffLocation || 'Tap to select drop-off'}
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
          <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-3">Locations</p>
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => handleEditLocation('pickup')}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-neutral-100 dark:hover:bg-neutral-700/60 transition"
            >
              <MapPinIcon className="h-5 w-5 shrink-0 text-neutral-400" />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-neutral-500 dark:text-neutral-400">Pickup</p>
                <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">
                  {pickupLocation || 'Tap to select pickup location'}
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
                <p className="text-xs text-neutral-500 dark:text-neutral-400">Drop-off</p>
                <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">
                  {dropoffLocation || 'Tap to select drop-off location'}
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
        label={editingLocationType === 'pickup' ? 'Edit pickup location' : 'Edit drop-off location'}
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
