'use client'

import { useMoveSearch } from '@/context/moveSearch'
import Form from 'next/form'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import FieldPanelContainer from '../FieldPanelContainer'
import LocationInput, { LocationSuggestion } from '../LocationInput'
import MoveTypeInput from '../MoveTypeInput'

type MoveTypeKey = 'light' | 'regular' | 'premium'

const StaySearchFormMobile = () => {
  const { t } = useTranslation()
  const [fieldNameShow, setFieldNameShow] = useState<'pickupLocation' | 'dropoffLocation' | 'moveType'>('pickupLocation')
  const router = useRouter()
  const {
    pickupLocation,
    dropoffLocation,
    moveType: contextMoveType,
    setPickupLocation,
    setDropoffLocation,
    setPickupCoordinates,
    setDropoffCoordinates,
    setMoveType: setContextMoveType,
  } = useMoveSearch()

  // Local state synced with context
  const [pickupLocationInput, setPickupLocationInput] = useState(pickupLocation)
  const [dropoffLocationInput, setDropoffLocationInput] = useState(dropoffLocation)
  const [moveType, setMoveType] = useState<MoveTypeKey | null>(contextMoveType)

  // Sync local state with context when context changes (e.g. desktop form updated it)
  useEffect(() => {
    setPickupLocationInput(pickupLocation)
  }, [pickupLocation])

  useEffect(() => {
    setDropoffLocationInput(dropoffLocation)
  }, [dropoffLocation])

  useEffect(() => {
    setMoveType(contextMoveType)
  }, [contextMoveType])

  // Prefetch the move choice page
  useEffect(() => {
    router.prefetch('/move-choice')
  }, [router])

  const handlePickupChange = (location: LocationSuggestion | null) => {
    if (location) {
      setPickupLocationInput(location.fullAddress)
      setPickupLocation(location.fullAddress)
      if (location.coordinates) {
        setPickupCoordinates({
          latitude: location.coordinates.latitude,
          longitude: location.coordinates.longitude,
        })
      }
      // Auto-advance to next field
      setFieldNameShow('dropoffLocation')
    } else {
      setPickupLocationInput('')
      setPickupLocation('')
      setPickupCoordinates(null)
    }
  }

  const handleDropoffChange = (location: LocationSuggestion | null) => {
    if (location) {
      setDropoffLocationInput(location.fullAddress)
      setDropoffLocation(location.fullAddress)
      if (location.coordinates) {
        setDropoffCoordinates({
          latitude: location.coordinates.latitude,
          longitude: location.coordinates.longitude,
        })
      }
      // Auto-advance to next field
      setFieldNameShow('moveType')
    } else {
      setDropoffLocationInput('')
      setDropoffLocation('')
      setDropoffCoordinates(null)
    }
  }

  const handleMoveTypeChange = (value: MoveTypeKey | null) => {
    setMoveType(value)
    if (value) {
      setContextMoveType(value)
    }
  }

  const handleFormSubmit = (formData: FormData) => {
    const pickup = pickupLocationInput || (formData.get('pickupLocation') as string) || ''
    const dropoff = dropoffLocationInput || (formData.get('dropoffLocation') as string) || ''
    const mt = moveType || (formData.get('moveType') as string) || ''

    // Ensure context is up to date
    if (mt) setContextMoveType(mt as MoveTypeKey)

    let url = '/move-choice'
    const params = new URLSearchParams()
    if (pickup) params.set('pickup', pickup)
    if (dropoff) params.set('dropoff', dropoff)
    if (mt) params.set('moveType', mt)
    const qs = params.toString()
    if (qs) url = url + `?${qs}`
    router.push(url)
  }

  return (
    <Form id="form-hero-search-form-mobile" action={handleFormSubmit} className="flex w-full flex-col gap-y-3">
      {/* PICKUP LOCATION */}
      <FieldPanelContainer
        isActive={fieldNameShow === 'pickupLocation'}
        headerMain={t('booking:field.pickup.label')}
        headingOnClick={() => setFieldNameShow('pickupLocation')}
        headingTitle={t('web:search.from.label')}
        headingValue={pickupLocationInput || t('booking:map.pickup.placeholder')}
      >
        <LocationInput
          defaultValue={pickupLocationInput}
          headingText={t('web:search.pickup.placeholder')}
          imputName="pickupLocation"
          onChange={handlePickupChange}
        />
      </FieldPanelContainer>

      {/* DROP-OFF LOCATION */}
      <FieldPanelContainer
        isActive={fieldNameShow === 'dropoffLocation'}
        headerMain={t('booking:field.dropoff.label')}
        headingOnClick={() => setFieldNameShow('dropoffLocation')}
        headingTitle={t('web:search.to.label')}
        headingValue={dropoffLocationInput || t('booking:map.dropoff.placeholder')}
      >
        <LocationInput
          defaultValue={dropoffLocationInput}
          headingText={t('web:search.dropoff.placeholder')}
          imputName="dropoffLocation"
          onChange={handleDropoffChange}
        />
      </FieldPanelContainer>

      {/* MOVE TYPE */}
      <FieldPanelContainer
        isActive={fieldNameShow === 'moveType'}
        headerMain={t('booking:moveType.selectHelper')}
        headingOnClick={() => setFieldNameShow('moveType')}
        headingTitle={t('booking:field.moveType.label')}
        headingValue={
          moveType
            ? // i18n-keys: booking:moveType.light.title, booking:moveType.regular.title, booking:moveType.premium.title
              t(`booking:moveType.${moveType}.title`)
            : t('booking:moveType.selectPlaceholder')
        }
      >
        <MoveTypeInput
          defaultValue={moveType}
          onChange={handleMoveTypeChange}
        />
      </FieldPanelContainer>
    </Form>
  )
}

export default StaySearchFormMobile
