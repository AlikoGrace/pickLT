'use client'

import MapboxMap, { RouteInfo } from '@/components/MapboxMap'
import MapLocationPicker, { PickedLocation } from '@/components/MapLocationPicker'
import InventorySelector from '@/components/inventory/InventorySelector'
import { basketItemCount } from '@/components/inventory/basket'
import { useMoveSearch } from '@/context/moveSearch'
import ButtonPrimary from '@/shared/ButtonPrimary'
import ButtonSecondary from '@/shared/ButtonSecondary'
import Logo from '@/shared/Logo'
import { ArrowLeft02Icon, DeliveryTruck01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

const InstantMoveInventoryPage = () => {
  const router = useRouter()
  const { t } = useTranslation('inventory')

  const {
    pickupLocation,
    dropoffLocation,
    pickupCoordinates,
    dropoffCoordinates,
    setPickupLocation,
    setDropoffLocation,
    setPickupCoordinates,
    setPickupCountryCode,
    setDropoffCoordinates,
    inventory,
    customItems,
  } = useMoveSearch()

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
      setPickupCountryCode(location.countryCode ?? null)
    } else {
      setDropoffLocation(location.fullAddress)
      setDropoffCoordinates(location.coordinates)
    }
    setLocationPickerOpen(false)
  }, [editingLocationType, setPickupLocation, setDropoffLocation, setPickupCoordinates, setDropoffCoordinates, setPickupCountryCode])

  const handleRouteCalculated = useCallback((info: RouteInfo) => {
    setRouteInfo(info)
  }, [])

  // Prefetch the next step
  useEffect(() => {
    router.prefetch('/instant-move')
  }, [router])

  const handleFindMover = () => {
    // Go to photos page first, then mover selection
    router.push('/instant-move/photos')
  }

  const handleBack = () => {
    router.push('/move-choice')
  }

  // Catalog + custom quantities
  const totalItems = basketItemCount(inventory, customItems)

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-900">
      <div className="mx-auto max-w-3xl px-4 pt-8 pb-32 sm:pt-12">
        {/* Logo */}
        <div className="mb-10 flex justify-center">
          <Logo className="w-28 sm:w-32" />
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white sm:text-3xl">
            {t('web:instant.inventory.title')}
          </h1>
          <p className="mt-2 text-neutral-500 dark:text-neutral-400">
            {t('web:instant.inventory.subtitle')}
          </p>
        </div>

        {/* Location Summary with Map */}
        {(pickupLocation || dropoffLocation) && (
          <div className="overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-700 mb-8">
            {/* Route map */}
            {pickupCoordinates && dropoffCoordinates && (
              <div className="relative h-44 sm:h-56">
                <MapboxMap
                  pickupCoordinates={pickupCoordinates}
                  dropoffCoordinates={dropoffCoordinates}
                  showRoute={true}
                  onRouteCalculated={handleRouteCalculated}
                  onPickupMarkerClick={() => handleEditLocation('pickup')}
                  onDropoffMarkerClick={() => handleEditLocation('dropoff')}
                  className="w-full h-full !rounded-none"
                />
              </div>
            )}
            <div className="bg-neutral-50 dark:bg-neutral-800 p-4">
              <div className="flex items-center gap-3">
                <div className="flex flex-col items-center">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <div className="w-0.5 h-6 bg-neutral-300 dark:bg-neutral-600" />
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                </div>
                <div className="flex-1 min-w-0 space-y-2">
                  <button
                    type="button"
                    onClick={() => handleEditLocation('pickup')}
                    className="block w-full text-left rounded-lg px-2 py-1 -mx-2 hover:bg-neutral-100 dark:hover:bg-neutral-700/60 transition"
                  >
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">{t('booking:route.from.label')}</p>
                    <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">
                      {pickupLocation || t('booking:pickup.tapToSelect.placeholder')}
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleEditLocation('dropoff')}
                    className="block w-full text-left rounded-lg px-2 py-1 -mx-2 hover:bg-neutral-100 dark:hover:bg-neutral-700/60 transition"
                  >
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">{t('booking:route.to.label')}</p>
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
              {totalItems > 0 && (
                <div className="mt-3 pt-3 border-t border-neutral-200 dark:border-neutral-700 flex items-center gap-2">
                  <HugeiconsIcon
                    icon={DeliveryTruck01Icon}
                    size={18}
                    strokeWidth={1.5}
                    className="shrink-0 text-neutral-400 dark:text-neutral-500"
                  />
                  <span className="text-sm text-neutral-600 dark:text-neutral-300">
                    {t('booking:inventory.selectedCount', { count: totalItems })}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* The shared selector (crew plan 1 #10): search, tabs, Special, custom items, upgrade. */}
        <InventorySelector />
      </div>

      {/* Fixed Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-700 p-4">
        <div className="mx-auto max-w-3xl flex items-center justify-between gap-4">
          <ButtonSecondary onClick={handleBack} className="flex items-center gap-2">
            <HugeiconsIcon icon={ArrowLeft02Icon} size={18} strokeWidth={1.5} />
            {t('common:action.back.cta')}
          </ButtonSecondary>
          <div className="flex items-center gap-4">
            {totalItems > 0 && (
              <span className="text-sm text-neutral-500 dark:text-neutral-400">
                {t('booking:inventory.selectedCount', { count: totalItems })}
              </span>
            )}
            <ButtonPrimary 
              onClick={handleFindMover}
              disabled={totalItems === 0}
              className="disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('web:instant.inventory.next.cta')}
            </ButtonPrimary>
          </div>
        </div>
      </div>

      {/* Location Picker Overlay */}
      <MapLocationPicker
        open={locationPickerOpen}
        onClose={() => setLocationPickerOpen(false)}
        onSelect={handleLocationPicked}
        initialCoordinates={
          editingLocationType === 'pickup' ? pickupCoordinates : dropoffCoordinates
        }
        label={
          editingLocationType === 'pickup'
            ? t('booking:pickup.edit.a11y')
            : t('booking:dropoff.edit.a11y')
        }
      />
    </div>
  )
}

export default InstantMoveInventoryPage