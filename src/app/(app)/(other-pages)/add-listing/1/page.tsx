'use client'

import Input from '@/shared/Input'
import Select from '@/shared/Select'
import Form from 'next/form'
import { useRouter } from 'next/navigation'
import { useSearchParams } from 'next/navigation'
import { useEffect, Suspense, useCallback } from 'react'
import FormItem from '../FormItem'
import { useMoveSearch } from '@/context/moveSearch'
import { useState } from 'react'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { CalendarDaysIcon, PencilSquareIcon } from '@heroicons/react/24/outline'
import MapLocationPicker, { PickedLocation } from '@/components/MapLocationPicker'
import MapboxMap, { RouteInfo } from '@/components/MapboxMap'
import { useTranslation } from 'react-i18next'

/** Floor values persisted as-is; the caption is a locale ordinal (§ 5.5). */
const NUMBERED_FLOORS = Array.from({ length: 12 }, (_, i) => i + 1)

const PageContent = () => {
  const { t } = useTranslation()
  const router = useRouter()
  // Prefetch the next step to improve performance
  useEffect(() => {
    router.prefetch('/add-listing/2')
  }, [router])

  const handleSubmitForm = async (formData: FormData) => {
    const formObject = Object.fromEntries(formData.entries())
    // Handle form submission logic here
    console.log('Form submitted:', formObject)

    // basic validation
    const errors: Record<string, string> = {}
    // Pickup/dropoff come from the location picker, not the form — without
    // this check the wizard advanced (and submitted) with no addresses at all.
    if (!pickupLocation) errors.pickupLocation = t('booking:pickup.required.error')
    if (!dropoffLocation) errors.dropoffLocation = t('booking:dropoff.required.error')
    if (!moveDate) errors.moveDate = t('booking:moveDate.required.error')
    if (!formObject['homeType']) errors.homeType = t('booking:homeType.required.error')
    if (!formObject['floorLevel']) errors.floorLevel = t('booking:floorLevel.required.error')
    if (!formObject['parkingSituation']) errors.parkingSituation = t('booking:parking.required.error')
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      return
    }

    // sync form values into context (ensure provider has up-to-date values)
    setHomeType((formObject['homeType'] as any) || null)
    setFloorLevel((formObject['floorLevel'] as any) || null)
    setElevatorAvailable(Boolean(formObject['elevatorAvailable']))
    setParkingSituation((formObject['parkingSituation'] as any) || null)

    // Redirect to the next step
    router.push('/add-listing/2')
  }

  const {
    moveDate,
    homeType,
    floorLevel,
    elevatorAvailable,
    parkingSituation,
    setMoveDate,
    setHomeType,
    setFloorLevel,
    setElevatorAvailable,
    setParkingSituation,
  } = useMoveSearch()

  const { pickupLocation, dropoffLocation, setPickupLocation, setDropoffLocation, setMoveType, pickupCoordinates, dropoffCoordinates, setPickupCoordinates, setDropoffCoordinates } = useMoveSearch()
  const searchParams = useSearchParams()
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

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

  // Read incoming query params and seed provider (if present)
  useEffect(() => {
    const pickup = searchParams.get('pickup')
    const dropoff = searchParams.get('dropoff')
    const mt = searchParams.get('moveType')
    if (pickup) setPickupLocation(pickup)
    if (dropoff) setDropoffLocation(dropoff)
    if (mt) setMoveType((mt as any) || null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Convert moveDate string to Date object for DatePicker
  const selectedDate = moveDate ? new Date(moveDate) : null

  const handleDateChange = (date: Date | null) => {
    if (date) {
      // Store as ISO date string YYYY-MM-DD
      setMoveDate(date.toISOString().split('T')[0])
    } else {
      setMoveDate(null)
    }
  }

  return (
    <>
      <h1 className="text-2xl font-semibold">{t('web:wizard.step1.title')}</h1>
      <div className="w-14 border-b border-neutral-200 dark:border-neutral-700"></div>

      {(formErrors.pickupLocation || formErrors.dropoffLocation) && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
          {formErrors.pickupLocation || formErrors.dropoffLocation}
        </div>
      )}

      {/* Location Summary with Map */}
      {(pickupLocation || dropoffLocation) && (
        <div className="overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-700">
          {/* Route map */}
          {pickupCoordinates && dropoffCoordinates && (
            <div className="relative h-44 sm:h-56">
              <MapboxMap
                pickupCoordinates={pickupCoordinates}
                dropoffCoordinates={dropoffCoordinates}
                showRoute={true}
                showUserLocation={true}
                onRouteCalculated={handleRouteCalculated}
                onPickupMarkerClick={() => handleEditLocation('pickup')}
                onDropoffMarkerClick={() => handleEditLocation('dropoff')}
                className="w-full h-full !rounded-none"
              />
            </div>
          )}
          <div className="bg-neutral-50 dark:bg-neutral-800 p-4">
            <h3 className="text-sm font-medium text-neutral-500 dark:text-neutral-400 mb-3">{t('web:wizard.step1.route.title')}</h3>
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-center">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <div className="w-0.5 h-6 bg-neutral-300 dark:bg-neutral-600" />
                <div className="w-3 h-3 rounded-full bg-red-500" />
              </div>
              <div className="flex-1 space-y-2">
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
          </div>
        </div>
      )}

      {/* FORM */}
      <Form id="add-listing-form" action={handleSubmitForm} className="flex flex-col gap-y-8">
        {/* Move Date */}
        <FormItem label={t('booking:moveDate.label')} desccription={t('booking:moveDate.helper')}>
          <div className="relative">
            <DatePicker
              selected={selectedDate}
              onChange={handleDateChange}
              minDate={new Date()}
              dateFormat="EEEE, MMMM d, yyyy"
              placeholderText={t('booking:moveDate.placeholder')}
              className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 pl-12 text-sm font-medium focus:border-primary-500 focus:ring-primary-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
              calendarClassName="!rounded-2xl !border-neutral-200 dark:!border-neutral-700 !shadow-xl"
              wrapperClassName="w-full"
            />
            <CalendarDaysIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400 pointer-events-none" />
          </div>
          {formErrors.moveDate && <div className="text-sm text-red-600 mt-2">{formErrors.moveDate}</div>}
        </FormItem>

        {/* Home type */}
        <FormItem label={t('booking:homeType.label')} desccription={t('booking:homeType.helper')}>
          <Select
            name="homeType"
            defaultValue={homeType ?? ''}
            onChange={(e: any) => setHomeType(e.target.value ? (e.target.value as any) : null)}
          >
            <option value="">{t('booking:homeType.placeholder')}</option>
            <option value="apartment">{t('booking:homeType.apartment.label')}</option>
            <option value="house">{t('booking:homeType.house.label')}</option>
            <option value="office">{t('booking:homeType.office.label')}</option>
            <option value="storage">{t('booking:homeType.storage.label')}</option>
          </Select>
          {formErrors.homeType && <div className="text-sm text-red-600 mt-2">{formErrors.homeType}</div>}
        </FormItem>

        {/* Floor level + elevator */}
        <FormItem label={t('booking:floorLevel.label')} desccription={t('booking:floorLevel.pickup.helper')}>
          <Select
            name="floorLevel"
            defaultValue={floorLevel ?? ''}
            onChange={(e: any) => setFloorLevel(e.target.value ? (e.target.value as any) : null)}
          >
            <option value="">{t('booking:floorLevel.placeholder')}</option>
            <option value="ground">{t('booking:floorLevel.ground.label')}</option>
            {/* Ordinal morphology is `Intl.PluralRules`' job, not 12 catalog keys (§ 5.5). */}
            {NUMBERED_FLOORS.map((n) => (
              <option key={n} value={String(n)}>
                {t('booking:floorLevel.numbered.label', { count: n, ordinal: true })}
              </option>
            ))}
          </Select>

          <div className="mt-3 flex items-center gap-3">
            <input
              id="elevatorAvailable"
              name="elevatorAvailable"
              type="checkbox"
              checked={!!elevatorAvailable}
              onChange={(e: any) => setElevatorAvailable(Boolean(e.target.checked))}
              className="w-4 h-4"
            />
            <label htmlFor="elevatorAvailable" className="text-sm">
              {t('booking:elevator.label')}
            </label>
          </div>
          {formErrors.floorLevel && <div className="text-sm text-red-600 mt-2">{formErrors.floorLevel}</div>}
        </FormItem>

        {/* Parking */}
        <FormItem label={t('booking:parking.label')} desccription={t('booking:parking.helper')}>
          <Select
            name="parkingSituation"
            defaultValue={parkingSituation ?? ''}
            onChange={(e: any) => setParkingSituation(e.target.value ? (e.target.value as any) : null)}
          >
            <option value="">{t('booking:parking.placeholder')}</option>
            <option value="at_building">{t('booking:parking.atBuilding.label')}</option>
            <option value="nearby">{t('booking:parking.nearby.label')}</option>
            <option value="no_parking">{t('booking:parking.noParking.label')}</option>
          </Select>
          {formErrors.parkingSituation && <div className="text-sm text-red-600 mt-2">{formErrors.parkingSituation}</div>}
        </FormItem>

        {/* Hidden compatibility inputs: ensure previous flows receive these values in formData */}
        <input type="hidden" name="pickupLocation" value={pickupLocation || ''} />
        <input type="hidden" name="dropoffLocation" value={dropoffLocation || ''} />
        <input type="hidden" name="moveDate" value={moveDate || ''} />
      </Form>

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
    </>
  )
}

const PageFallback = () => {
  const { t } = useTranslation()
  return <div>{t('common:state.loading.label')}</div>
}

const Page = () => {
  return (
    <Suspense fallback={<PageFallback />}>
      <PageContent />
    </Suspense>
  )
}

export default Page
