'use client'

import { useMoveSearch, type FloorLevelKey, type DropoffParkingKey } from '@/context/moveSearch'
import { Divider } from '@/shared/divider'
import AddressAutocompleteInput from '@/components/AddressAutocompleteInput'
import Input from '@/shared/Input'
import Select from '@/shared/Select'
import Form from 'next/form'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import FormItem from '../FormItem'
import { useTranslation } from 'react-i18next'

/** Floor values persisted as-is; the caption is a locale ordinal (§ 5.5). */
const NUMBERED_FLOORS = Array.from({ length: 12 }, (_, i) => i + 1)

const Page = () => {
  const { t } = useTranslation()
  const router = useRouter()
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  const {
    dropoffLocation,
    dropoffStreetAddress,
    dropoffApartmentUnit,
    dropoffFloorLevel,
    dropoffElevatorAvailable,
    dropoffParkingSituation,
    dropoffArrangeHaltverbot,
    setDropoffStreetAddress,
    setDropoffApartmentUnit,
    setDropoffFloorLevel,
    setDropoffElevatorAvailable,
    setDropoffParkingSituation,
    setDropoffArrangeHaltverbot,
    dropoffCoordinates,
  } = useMoveSearch()

  // Auto-fill street address from the dropoff location if not already set
  useEffect(() => {
    if (!dropoffStreetAddress && dropoffLocation) {
      const parts = dropoffLocation.split(',')
      const street = parts.length >= 1 ? parts[0].trim() : dropoffLocation
      setDropoffStreetAddress(street)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Prefetch the next step to improve performance
  useEffect(() => {
    router.prefetch('/add-listing/4')
  }, [router])

  const handleSubmitForm = async (formData: FormData) => {
    const formObject = Object.fromEntries(formData.entries())
    console.log('Form submitted:', formObject)

    // Basic validation
    const errors: Record<string, string> = {}
    if (!formObject['streetAddress'] || String(formObject['streetAddress']).trim() === '') {
      errors.streetAddress = t('booking:streetAddress.required.error')
    }
    if (!formObject['floorLevel']) {
      errors.floorLevel = t('booking:floorLevel.required.error')
    }
    if (!formObject['parkingSituation']) {
      errors.parkingSituation = t('booking:parking.required.error')
    }
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      return
    }

    // Sync form values into context
    setDropoffStreetAddress(String(formObject['streetAddress'] || ''))
    setDropoffApartmentUnit(String(formObject['apartmentUnit'] || ''))
    setDropoffFloorLevel((formObject['floorLevel'] as FloorLevelKey) || null)
    setDropoffElevatorAvailable(formObject['elevatorAvailable'] === 'on')
    setDropoffParkingSituation((formObject['parkingSituation'] as DropoffParkingKey) || null)
    setDropoffArrangeHaltverbot(formObject['arrangeHaltverbot'] === 'yes')

    // Redirect to the next step
    router.push('/add-listing/4')
  }

  const needsLoadingZone = dropoffParkingSituation === 'loading_zone'

  return (
    <>
      <h1 className="text-2xl font-semibold">{t('web:wizard.step3.title')}</h1>
      <Divider className="w-14!" />

      {/* FORM */}
      <Form id="add-listing-form" action={handleSubmitForm} className="flex flex-col gap-y-8">
        {/* Street Address */}
        <FormItem
          label={t('booking:streetAddress.label')}
          desccription={t('booking:streetAddress.dropoff.helper')}
        >
          <AddressAutocompleteInput
            name="streetAddress"
            placeholder={t('booking:streetAddress.dropoff.placeholder')}
            value={dropoffStreetAddress}
            onChangeText={setDropoffStreetAddress}
            proximity={dropoffCoordinates}
          />
          {formErrors.streetAddress && (
            <div className="text-sm text-red-600 mt-2">{formErrors.streetAddress}</div>
          )}
        </FormItem>

        {/* Apartment/Unit */}
        <FormItem
          label={t('booking:apartmentUnit.label')}
          desccription={t('booking:apartmentUnit.helper')}
        >
          <Input
            name="apartmentUnit"
            placeholder={t('booking:apartmentUnit.dropoff.placeholder')}
            value={dropoffApartmentUnit}
            onChange={(e) => setDropoffApartmentUnit(e.target.value)}
          />
        </FormItem>

        {/* Floor Level */}
        <FormItem
          label={t('booking:floorLevel.label')}
          desccription={t('booking:floorLevel.dropoff.helper')}
        >
          <Select
            name="floorLevel"
            defaultValue={dropoffFloorLevel ?? ''}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              setDropoffFloorLevel(e.target.value ? (e.target.value as FloorLevelKey) : null)
            }
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
          {formErrors.floorLevel && (
            <div className="text-sm text-red-600 mt-2">{formErrors.floorLevel}</div>
          )}
        </FormItem>

        {/* Elevator Available */}
        <FormItem
          label={t('booking:elevator.question.label')}
          desccription={t('booking:elevator.dropoff.helper')}
        >
          <div className="flex items-center gap-6 mt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="elevatorAvailable"
                value="on"
                checked={dropoffElevatorAvailable === true}
                onChange={() => setDropoffElevatorAvailable(true)}
                className="w-4 h-4 text-primary-600"
              />
              <span className="text-sm">{t('common:answer.yes.label')}</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="elevatorAvailable"
                value="off"
                checked={dropoffElevatorAvailable === false}
                onChange={() => setDropoffElevatorAvailable(false)}
                className="w-4 h-4 text-primary-600"
              />
              <span className="text-sm">{t('common:answer.no.label')}</span>
            </label>
          </div>
        </FormItem>

        <Divider />

        {/* Parking Situation */}
        <FormItem label={t('booking:parking.label')} desccription={t('booking:parking.helper')}>
          <Select
            name="parkingSituation"
            defaultValue={dropoffParkingSituation ?? ''}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              setDropoffParkingSituation(e.target.value ? (e.target.value as DropoffParkingKey) : null)
            }
          >
            <option value="">{t('booking:parking.placeholder')}</option>
            <option value="directly_in_front">{t('booking:dropoffParking.directlyInFront.label')}</option>
            <option value="limited">{t('booking:dropoffParking.limited.label')}</option>
            <option value="street_only">{t('booking:dropoffParking.streetOnly.label')}</option>
            <option value="underground">{t('booking:dropoffParking.underground.label')}</option>
            <option value="loading_zone">{t('booking:dropoffParking.loadingZone.label')}</option>
          </Select>
          {formErrors.parkingSituation && (
            <div className="text-sm text-red-600 mt-2">{formErrors.parkingSituation}</div>
          )}
        </FormItem>

        {/* Conditional: Arrange Haltverbot for Drop-off */}
        {needsLoadingZone && (
          <div className="p-4 bg-neutral-50 dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700">
            <FormItem
              label={t('booking:haltverbot.arrangeDropoff.label')}
              desccription={t('booking:haltverbot.arrangeDropoff.helper')}
            >
              <div className="flex items-center gap-6 mt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="arrangeHaltverbot"
                    value="yes"
                    checked={dropoffArrangeHaltverbot === true}
                    onChange={() => setDropoffArrangeHaltverbot(true)}
                    className="w-4 h-4 text-primary-600"
                  />
                  <span className="text-sm">{t('booking:haltverbot.arrangeYes.label')}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="arrangeHaltverbot"
                    value="no"
                    checked={dropoffArrangeHaltverbot === false}
                    onChange={() => setDropoffArrangeHaltverbot(false)}
                    className="w-4 h-4 text-primary-600"
                  />
                  <span className="text-sm">{t('booking:haltverbot.arrangeNo.label')}</span>
                </label>
              </div>
            </FormItem>
          </div>
        )}

        {/* Hidden fields */}
        <input type="hidden" name="dropoffElevatorAvailable" value={dropoffElevatorAvailable ? 'on' : 'off'} />
        <input type="hidden" name="dropoffArrangeHaltverbot" value={dropoffArrangeHaltverbot ? 'yes' : 'no'} />
      </Form>
    </>
  )
}

export default Page
