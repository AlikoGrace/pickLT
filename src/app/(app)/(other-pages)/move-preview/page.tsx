'use client'

import { useMoveSearch } from '@/context/moveSearch'
import Image from 'next/image'
import Link from 'next/link'
import {
  Home01Icon,
  Building01Icon,
  Location01Icon,
  Calendar01Icon,
  Clock01Icon,
  PackageIcon,
  CheckmarkSquare01Icon,
  UserIcon,
  PhoneCall01Icon,
  Mail01Icon,
  TruckIcon,
  UserGroupIcon,
  ImageAdd02Icon,
  Edit01Icon,
} from 'hugeicons-react'

export default function MovePreviewPage() {
  const {
    // Step 1
    moveType,
    // Step 2
    pickupAddress,
    pickupUnitNumber,
    pickupCity,
    pickupState,
    pickupZip,
    pickupHomeType,
    pickupSquareFootage,
    pickupBedrooms,
    pickupFloorLevel,
    pickupHasElevator,
    pickupParkingSituation,
    // Step 3
    dropoffAddress,
    dropoffUnitNumber,
    dropoffCity,
    dropoffState,
    dropoffZip,
    dropoffHomeType,
    dropoffSquareFootage,
    dropoffBedrooms,
    dropoffFloorLevel,
    dropoffHasElevator,
    dropoffParkingSituation,
    // Step 4
    inventory,
    specialItems,
    estimatedWeight,
    additionalNotes,
    // Step 5
    packingServiceLevel,
    includePackingMaterials,
    fragileItemsCount,
    // Step 6
    moveDate,
    preferredArrivalWindow,
    flexibleDates,
    alternateDate,
    // Step 7
    crewSize,
    vehicleType,
    estimatedHours,
    // Step 8
    additionalServices,
    coverPhoto,
    galleryPhotos,
    // Step 9
    contactInfo,
    specialInstructions,
    // Step 10
    legalConsent,
  } = useMoveSearch()

  const formatMoveType = (type: string) => {
    const types: Record<string, string> = {
      local: 'Local Move',
      'long-distance': 'Long Distance Move',
      international: 'International Move',
      commercial: 'Commercial Move',
    }
    return types[type] || type
  }

  const formatHomeType = (type: string) => {
    const types: Record<string, string> = {
      house: 'House',
      apartment: 'Apartment',
      condo: 'Condo',
      townhouse: 'Townhouse',
      studio: 'Studio',
      storage: 'Storage Unit',
    }
    return types[type] || type
  }

  const formatFloorLevel = (level: string) => {
    const levels: Record<string, string> = {
      ground: 'Ground Floor',
      '2nd': '2nd Floor',
      '3rd': '3rd Floor',
      '4th-plus': '4th Floor or Higher',
      basement: 'Basement',
    }
    return levels[level] || level
  }

  const formatParking = (parking: string) => {
    const options: Record<string, string> = {
      driveway: 'Driveway',
      'street-close': 'Street Parking (Close)',
      'street-far': 'Street Parking (Far)',
      'loading-dock': 'Loading Dock',
      'parking-lot': 'Parking Lot',
    }
    return options[parking] || parking
  }

  const formatPackingLevel = (level: string) => {
    const levels: Record<string, string> = {
      none: 'No Packing Service',
      partial: 'Partial Packing',
      full: 'Full Packing Service',
      'fragile-only': 'Fragile Items Only',
    }
    return levels[level] || level
  }

  const formatArrivalWindow = (window: string) => {
    const windows: Record<string, string> = {
      'early-morning': 'Early Morning (6AM - 9AM)',
      morning: 'Morning (9AM - 12PM)',
      afternoon: 'Afternoon (12PM - 4PM)',
      evening: 'Evening (4PM - 7PM)',
    }
    return windows[window] || window
  }

  const formatCrewSize = (size: string) => {
    const sizes: Record<string, string> = {
      '2-person': '2-Person Crew',
      '3-person': '3-Person Crew',
      '4-person': '4-Person Crew',
      '5-plus': '5+ Person Crew',
    }
    return sizes[size] || size
  }

  const formatVehicleType = (type: string) => {
    const types: Record<string, string> = {
      cargo_van: 'Cargo Van',
      small_truck: 'Small Truck (12-14 ft)',
      medium_truck: 'Medium Truck (16-20 ft)',
      large_truck: 'Large Truck (22-26 ft)',
      'semi-truck': 'Semi-Truck',
    }
    return types[type] || type
  }

  const formatAdditionalService = (service: string) => {
    const services: Record<string, string> = {
      piano_moving: 'Piano Moving',
      appliance_disconnect: 'Appliance Disconnect/Reconnect',
      furniture_assembly: 'Furniture Disassembly/Assembly',
      storage: 'Temporary Storage',
      cleaning: 'Move-out Cleaning',
      junk_removal: 'Junk Removal',
      auto_transport: 'Auto Transport',
    }
    return services[service] || service
  }

  const allPhotos = [
    ...(coverPhoto ? [coverPhoto] : []),
    ...galleryPhotos,
  ]

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 pb-20">
      {/* Header */}
      <div className="bg-white dark:bg-neutral-800 shadow-sm">
        <div className="container py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">
                Move Request Preview
              </h1>
              <p className="text-neutral-500 dark:text-neutral-400 mt-2">
                Review your move details before confirming
              </p>
            </div>
            <div className="flex gap-3">
              <Link
                href="/add-listing/1"
                className="px-6 py-3 rounded-xl border border-neutral-200 dark:border-neutral-600 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
              >
                Edit Move
              </Link>
              <button className="px-6 py-3 rounded-xl bg-primary-600 text-white hover:bg-primary-700 transition-colors font-medium">
                Confirm Booking
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Photo Gallery */}
      {allPhotos.length > 0 && (
        <div className="container py-8">
          <div className="bg-white dark:bg-neutral-800 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <ImageAdd02Icon className="w-5 h-5 text-primary-600" />
              <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">
                Photos
              </h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {allPhotos.map((photo, index) => (
                <div
                  key={photo.id}
                  className={`relative rounded-xl overflow-hidden ${
                    index === 0 ? 'col-span-2 row-span-2' : ''
                  }`}
                >
                  <Image
                    src={photo.url}
                    alt={photo.name}
                    width={400}
                    height={300}
                    className="w-full h-full object-cover aspect-video"
                  />
                  {photo.type === 'cover' && (
                    <span className="absolute top-2 left-2 px-2 py-1 text-xs font-medium bg-primary-600 text-white rounded-lg">
                      Cover Photo
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="container py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Move Type */}
            <div className="bg-white dark:bg-neutral-800 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <TruckIcon className="w-5 h-5 text-primary-600" />
                  <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">
                    Move Type
                  </h2>
                </div>
                <Link href="/add-listing/1" className="text-primary-600 hover:underline text-sm flex items-center gap-1">
                  <Edit01Icon className="w-4 h-4" /> Edit
                </Link>
              </div>
              <p className="text-lg text-neutral-700 dark:text-neutral-300">
                {formatMoveType(moveType)}
              </p>
            </div>

            {/* Pickup Location */}
            <div className="bg-white dark:bg-neutral-800 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Location01Icon className="w-5 h-5 text-green-600" />
                  <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">
                    Pickup Location
                  </h2>
                </div>
                <Link href="/add-listing/2" className="text-primary-600 hover:underline text-sm flex items-center gap-1">
                  <Edit01Icon className="w-4 h-4" /> Edit
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">Address</p>
                  <p className="text-neutral-900 dark:text-white font-medium">
                    {pickupAddress}
                    {pickupUnitNumber && `, Unit ${pickupUnitNumber}`}
                  </p>
                  <p className="text-neutral-700 dark:text-neutral-300">
                    {pickupCity}, {pickupState} {pickupZip}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">Property Type</p>
                  <p className="text-neutral-900 dark:text-white font-medium">
                    {formatHomeType(pickupHomeType)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">Size</p>
                  <p className="text-neutral-900 dark:text-white font-medium">
                    {pickupSquareFootage} sq ft • {pickupBedrooms} bedrooms
                  </p>
                </div>
                <div>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">Access</p>
                  <p className="text-neutral-900 dark:text-white font-medium">
                    {formatFloorLevel(pickupFloorLevel)}
                    {pickupHasElevator && ' (Elevator available)'}
                  </p>
                  <p className="text-neutral-700 dark:text-neutral-300">
                    {formatParking(pickupParkingSituation)}
                  </p>
                </div>
              </div>
            </div>

            {/* Dropoff Location */}
            <div className="bg-white dark:bg-neutral-800 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Location01Icon className="w-5 h-5 text-red-600" />
                  <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">
                    Dropoff Location
                  </h2>
                </div>
                <Link href="/add-listing/3" className="text-primary-600 hover:underline text-sm flex items-center gap-1">
                  <Edit01Icon className="w-4 h-4" /> Edit
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">Address</p>
                  <p className="text-neutral-900 dark:text-white font-medium">
                    {dropoffAddress}
                    {dropoffUnitNumber && `, Unit ${dropoffUnitNumber}`}
                  </p>
                  <p className="text-neutral-700 dark:text-neutral-300">
                    {dropoffCity}, {dropoffState} {dropoffZip}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">Property Type</p>
                  <p className="text-neutral-900 dark:text-white font-medium">
                    {formatHomeType(dropoffHomeType)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">Size</p>
                  <p className="text-neutral-900 dark:text-white font-medium">
                    {dropoffSquareFootage} sq ft • {dropoffBedrooms} bedrooms
                  </p>
                </div>
                <div>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">Access</p>
                  <p className="text-neutral-900 dark:text-white font-medium">
                    {formatFloorLevel(dropoffFloorLevel)}
                    {dropoffHasElevator && ' (Elevator available)'}
                  </p>
                  <p className="text-neutral-700 dark:text-neutral-300">
                    {formatParking(dropoffParkingSituation)}
                  </p>
                </div>
              </div>
            </div>

            {/* Inventory */}
            <div className="bg-white dark:bg-neutral-800 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <PackageIcon className="w-5 h-5 text-primary-600" />
                  <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">
                    Inventory & Items
                  </h2>
                </div>
                <Link href="/add-listing/4" className="text-primary-600 hover:underline text-sm flex items-center gap-1">
                  <Edit01Icon className="w-4 h-4" /> Edit
                </Link>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(inventory).map(([key, value]) => (
                    value > 0 && (
                      <div key={key} className="bg-neutral-50 dark:bg-neutral-700 rounded-lg p-3">
                        <p className="text-sm text-neutral-500 dark:text-neutral-400 capitalize">
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </p>
                        <p className="text-lg font-semibold text-neutral-900 dark:text-white">{value}</p>
                      </div>
                    )
                  ))}
                </div>
                {specialItems.length > 0 && (
                  <div>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-2">Special Items</p>
                    <div className="flex flex-wrap gap-2">
                      {specialItems.map((item) => (
                        <span
                          key={item}
                          className="px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 rounded-full text-sm"
                        >
                          {item.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex items-center justify-between pt-4 border-t border-neutral-200 dark:border-neutral-700">
                  <span className="text-neutral-500 dark:text-neutral-400">Estimated Weight</span>
                  <span className="font-semibold text-neutral-900 dark:text-white">{estimatedWeight} lbs</span>
                </div>
                {additionalNotes && (
                  <div>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">Notes</p>
                    <p className="text-neutral-700 dark:text-neutral-300">{additionalNotes}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Packing Services */}
            <div className="bg-white dark:bg-neutral-800 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <PackageIcon className="w-5 h-5 text-primary-600" />
                  <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">
                    Packing Services
                  </h2>
                </div>
                <Link href="/add-listing/5" className="text-primary-600 hover:underline text-sm flex items-center gap-1">
                  <Edit01Icon className="w-4 h-4" /> Edit
                </Link>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500 dark:text-neutral-400">Packing Level</span>
                  <span className="font-medium text-neutral-900 dark:text-white">
                    {formatPackingLevel(packingServiceLevel)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500 dark:text-neutral-400">Packing Materials</span>
                  <span className="font-medium text-neutral-900 dark:text-white">
                    {includePackingMaterials ? 'Included' : 'Not Included'}
                  </span>
                </div>
                {fragileItemsCount > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-500 dark:text-neutral-400">Fragile Items</span>
                    <span className="font-medium text-neutral-900 dark:text-white">{fragileItemsCount} items</span>
                  </div>
                )}
              </div>
            </div>

            {/* Schedule */}
            <div className="bg-white dark:bg-neutral-800 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Calendar01Icon className="w-5 h-5 text-primary-600" />
                  <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">
                    Schedule & Timing
                  </h2>
                </div>
                <Link href="/add-listing/6" className="text-primary-600 hover:underline text-sm flex items-center gap-1">
                  <Edit01Icon className="w-4 h-4" /> Edit
                </Link>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500 dark:text-neutral-400">Move Date</span>
                  <span className="font-medium text-neutral-900 dark:text-white">
                    {moveDate ? new Date(moveDate).toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    }) : 'Not set'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500 dark:text-neutral-400">Arrival Window</span>
                  <span className="font-medium text-neutral-900 dark:text-white">
                    {formatArrivalWindow(preferredArrivalWindow)}
                  </span>
                </div>
                {flexibleDates && alternateDate && (
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-500 dark:text-neutral-400">Alternate Date</span>
                    <span className="font-medium text-neutral-900 dark:text-white">
                      {new Date(alternateDate).toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Crew & Vehicle */}
            <div className="bg-white dark:bg-neutral-800 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <UserGroupIcon className="w-5 h-5 text-primary-600" />
                  <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">
                    Crew & Vehicle
                  </h2>
                </div>
                <Link href="/add-listing/7" className="text-primary-600 hover:underline text-sm flex items-center gap-1">
                  <Edit01Icon className="w-4 h-4" /> Edit
                </Link>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500 dark:text-neutral-400">Crew Size</span>
                  <span className="font-medium text-neutral-900 dark:text-white">
                    {formatCrewSize(crewSize)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500 dark:text-neutral-400">Vehicle Type</span>
                  <span className="font-medium text-neutral-900 dark:text-white">
                    {formatVehicleType(vehicleType)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500 dark:text-neutral-400">Estimated Hours</span>
                  <span className="font-medium text-neutral-900 dark:text-white">{estimatedHours} hours</span>
                </div>
              </div>
            </div>

            {/* Additional Services */}
            {additionalServices.length > 0 && (
              <div className="bg-white dark:bg-neutral-800 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <CheckmarkSquare01Icon className="w-5 h-5 text-primary-600" />
                    <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">
                      Additional Services
                    </h2>
                  </div>
                  <Link href="/add-listing/8" className="text-primary-600 hover:underline text-sm flex items-center gap-1">
                    <Edit01Icon className="w-4 h-4" /> Edit
                  </Link>
                </div>
                <div className="flex flex-wrap gap-2">
                  {additionalServices.map((service) => (
                    <span
                      key={service}
                      className="px-3 py-2 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-lg text-sm font-medium"
                    >
                      {formatAdditionalService(service)}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Contact Information */}
            <div className="bg-white dark:bg-neutral-800 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <UserIcon className="w-5 h-5 text-primary-600" />
                  <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">
                    Contact Information
                  </h2>
                </div>
                <Link href="/add-listing/9" className="text-primary-600 hover:underline text-sm flex items-center gap-1">
                  <Edit01Icon className="w-4 h-4" /> Edit
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">Name</p>
                  <p className="text-neutral-900 dark:text-white font-medium">
                    {contactInfo.firstName} {contactInfo.lastName}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">Email</p>
                  <p className="text-neutral-900 dark:text-white font-medium flex items-center gap-1">
                    <Mail01Icon className="w-4 h-4" /> {contactInfo.email}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">Phone</p>
                  <p className="text-neutral-900 dark:text-white font-medium flex items-center gap-1">
                    <PhoneCall01Icon className="w-4 h-4" /> {contactInfo.phone}
                  </p>
                </div>
                {contactInfo.alternatePhone && (
                  <div>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">Alternate Phone</p>
                    <p className="text-neutral-900 dark:text-white font-medium flex items-center gap-1">
                      <PhoneCall01Icon className="w-4 h-4" /> {contactInfo.alternatePhone}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">Contact Preference</p>
                  <p className="text-neutral-900 dark:text-white font-medium capitalize">
                    {contactInfo.preferredContactMethod.replace('-', ' ')}
                  </p>
                </div>
              </div>
              {specialInstructions && (
                <div className="mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-700">
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">Special Instructions</p>
                  <p className="text-neutral-700 dark:text-neutral-300">{specialInstructions}</p>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar - Price Estimate */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 bg-white dark:bg-neutral-800 rounded-2xl p-6 shadow-lg border border-neutral-200 dark:border-neutral-700">
              <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-6">
                Estimated Cost
              </h3>
              
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-neutral-500 dark:text-neutral-400">Base Rate ({estimatedHours} hours)</span>
                  <span className="text-neutral-900 dark:text-white">${estimatedHours * 150}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500 dark:text-neutral-400">{formatCrewSize(crewSize)}</span>
                  <span className="text-neutral-900 dark:text-white">Included</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500 dark:text-neutral-400">{formatVehicleType(vehicleType)}</span>
                  <span className="text-neutral-900 dark:text-white">Included</span>
                </div>
                
                {packingServiceLevel !== 'none' && (
                  <div className="flex justify-between">
                    <span className="text-neutral-500 dark:text-neutral-400">{formatPackingLevel(packingServiceLevel)}</span>
                    <span className="text-neutral-900 dark:text-white">
                      ${packingServiceLevel === 'full' ? 450 : packingServiceLevel === 'partial' ? 250 : 150}
                    </span>
                  </div>
                )}
                
                {additionalServices.length > 0 && (
                  <div className="flex justify-between">
                    <span className="text-neutral-500 dark:text-neutral-400">Additional Services ({additionalServices.length})</span>
                    <span className="text-neutral-900 dark:text-white">${additionalServices.length * 100}</span>
                  </div>
                )}

                <div className="border-t border-neutral-200 dark:border-neutral-700 pt-4 mt-4">
                  <div className="flex justify-between text-lg font-semibold">
                    <span className="text-neutral-900 dark:text-white">Estimated Total</span>
                    <span className="text-primary-600">
                      ${(
                        estimatedHours * 150 +
                        (packingServiceLevel === 'full' ? 450 : packingServiceLevel === 'partial' ? 250 : packingServiceLevel === 'fragile-only' ? 150 : 0) +
                        additionalServices.length * 100
                      ).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2">
                    * Final price may vary based on actual conditions
                  </p>
                </div>
              </div>

              <button className="w-full mt-6 py-4 rounded-xl bg-primary-600 text-white font-semibold hover:bg-primary-700 transition-colors">
                Confirm Booking
              </button>

              <p className="text-center text-xs text-neutral-500 dark:text-neutral-400 mt-4">
                By confirming, you agree to our Terms of Service and Privacy Policy
              </p>

              {/* Legal Consent Status */}
              <div className="mt-6 pt-6 border-t border-neutral-200 dark:border-neutral-700">
                <p className="text-sm font-medium text-neutral-900 dark:text-white mb-3">Consent Status</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded-full ${legalConsent.termsAccepted ? 'bg-green-500' : 'bg-neutral-300'}`} />
                    <span className="text-sm text-neutral-600 dark:text-neutral-400">Terms Accepted</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded-full ${legalConsent.liabilityWaiverAccepted ? 'bg-green-500' : 'bg-neutral-300'}`} />
                    <span className="text-sm text-neutral-600 dark:text-neutral-400">Liability Waiver</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded-full ${legalConsent.cancellationPolicyAccepted ? 'bg-green-500' : 'bg-neutral-300'}`} />
                    <span className="text-sm text-neutral-600 dark:text-neutral-400">Cancellation Policy</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
