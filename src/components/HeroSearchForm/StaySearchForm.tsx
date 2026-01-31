'use client'

import { useMoveSearch } from '@/context/moveSearch'
import clsx from 'clsx'
import Form from 'next/form'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ButtonSubmit, GuestNumberField, LocationInputField, LocationSuggestion, VerticalDividerLine } from './ui'

interface Props {
  className?: string
  formStyle: 'default' | 'small'
}

export const StaySearchForm = ({ className, formStyle = 'default' }: Props) => {
  const router = useRouter()
  const {
    setPickupLocation,
    setDropoffLocation,
    setPickupCoordinates,
    setDropoffCoordinates,
    setMoveType: setContextMoveType,
  } = useMoveSearch()

  // Prefetch the move choice page to improve performance
  useEffect(() => {
    router.prefetch('/move-choice')
  }, [router])

  const [moveType, setMoveType] = useState<string | null>(null)
  const [pickupData, setPickupData] = useState<LocationSuggestion | null>(null)
  const [dropoffData, setDropoffData] = useState<LocationSuggestion | null>(null)

  const handlePickupChange = (location: LocationSuggestion | null) => {
    setPickupData(location)
    if (location) {
      setPickupLocation(location.fullAddress)
      if (location.coordinates) {
        setPickupCoordinates({
          latitude: location.coordinates.latitude,
          longitude: location.coordinates.longitude,
        })
      }
    } else {
      setPickupLocation('')
      setPickupCoordinates(null)
    }
  }

  const handleDropoffChange = (location: LocationSuggestion | null) => {
    setDropoffData(location)
    if (location) {
      setDropoffLocation(location.fullAddress)
      if (location.coordinates) {
        setDropoffCoordinates({
          latitude: location.coordinates.latitude,
          longitude: location.coordinates.longitude,
        })
      }
    } else {
      setDropoffLocation('')
      setDropoffCoordinates(null)
    }
  }

  const handleFormSubmit = (formData: FormData) => {
    const formDataEntries = Object.fromEntries(formData.entries())
    console.log('Form submitted', formDataEntries)

    const pickupLocation = pickupData?.fullAddress || (formDataEntries['pickupLocation'] || '') as string
    const dropoffLocation = dropoffData?.fullAddress || (formDataEntries['dropoffLocation'] || '') as string
    const mt = (formDataEntries['moveType'] || moveType || '') as string

    // Update context with move type
    if (mt) {
      setContextMoveType(mt as any)
    }

    let url = '/move-choice'
    const params = new URLSearchParams()
    if (pickupLocation) params.set('pickup', pickupLocation)
    if (dropoffLocation) params.set('dropoff', dropoffLocation)
    if (mt) params.set('moveType', mt)
    const qs = params.toString()
    if (qs) url = url + `?${qs}`
    router.push(url)
  }

  return (
    <Form
      className={clsx(
        'relative z-10 flex w-full rounded-full bg-white [--form-bg:var(--color-white)] dark:bg-neutral-800 dark:[--form-bg:var(--color-neutral-800)]',
        className,
        formStyle === 'small' && 'custom-shadow-1',
        formStyle === 'default' && 'shadow-xl dark:shadow-2xl'
      )}
      action={handleFormSubmit}
    >
      <LocationInputField
        className="hero-search-form__field-after flex-5/12"
        fieldStyle={formStyle}
        placeholder="Where are you moving from?"
        description="Pickup location"
        inputName="pickupLocation"
        onChange={handlePickupChange}
      />
      <VerticalDividerLine />
      <LocationInputField
        className="hero-search-form__field-before hero-search-form__field-after flex-4/12"
        fieldStyle={formStyle}
        placeholder="Where are you moving to?"
        description="Drop-off location"
        inputName="dropoffLocation"
        onChange={handleDropoffChange}
      />
      <VerticalDividerLine />
      <GuestNumberField
        className="hero-search-form__field-before flex-4/12"
        clearDataButtonClassName={clsx(formStyle === 'small' && 'sm:end-18', formStyle === 'default' && 'sm:end-22')}
        fieldStyle={formStyle}
        onChange={(val) => setMoveType(val)}
      />
      {/* hidden input to include moveType in form submission */}
      <input type="hidden" name="moveType" value={moveType || ''} />

      <ButtonSubmit fieldStyle={formStyle} className="z-10" />
    </Form>
  )
}
