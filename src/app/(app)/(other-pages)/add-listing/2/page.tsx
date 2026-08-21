'use client'

import { useMoveSearch } from '@/context/moveSearch'
import { Divider } from '@/shared/divider'
import AddressAutocompleteInput from '@/components/AddressAutocompleteInput'
import Input from '@/shared/Input'
import Textarea from '@/shared/Textarea'
import Form from 'next/form'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import FormItem from '../FormItem'
import { useTranslation } from 'react-i18next'

const Page = () => {
  const { t } = useTranslation()
  const router = useRouter()
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  const {
    pickupLocation,
    pickupStreetAddress,
    pickupApartmentUnit,
    pickupAccessNotes,
    pickupLoadingZoneRequired,
    pickupArrangeHaltverbot,
    setPickupStreetAddress,
    setPickupApartmentUnit,
    setPickupAccessNotes,
    setPickupLoadingZoneRequired,
    setPickupArrangeHaltverbot,
    pickupCoordinates,
  } = useMoveSearch()

  // Auto-fill street address from the pickup location if not already set
  useEffect(() => {
    if (!pickupStreetAddress && pickupLocation) {
      // Extract the street-level portion (first part before second comma)
      const parts = pickupLocation.split(',')
      const street = parts.length >= 1 ? parts[0].trim() : pickupLocation
      setPickupStreetAddress(street)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Prefetch the next step to improve performance
  useEffect(() => {
    router.prefetch('/add-listing/3')
  }, [router])

  const handleSubmitForm = async (formData: FormData) => {
    const formObject = Object.fromEntries(formData.entries())
    console.log('Form submitted:', formObject)

    // Basic validation
    const errors: Record<string, string> = {}
    if (!formObject['streetAddress'] || String(formObject['streetAddress']).trim() === '') {
      errors.streetAddress = t('booking:streetAddress.required.error')
    }
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      return
    }

    // Sync form values into context
    setPickupStreetAddress(String(formObject['streetAddress'] || ''))
    setPickupApartmentUnit(String(formObject['apartmentUnit'] || ''))
    setPickupAccessNotes(String(formObject['accessNotes'] || ''))
    setPickupLoadingZoneRequired(formObject['loadingZoneRequired'] === 'yes')
    setPickupArrangeHaltverbot(formObject['arrangeHaltverbot'] === 'yes')

    // Redirect to the next step
    router.push('/add-listing/3')
  }

  return (
    <>
      <h1 className="text-2xl font-semibold">{t('web:wizard.step2.title')}</h1>
      <Divider className="w-14!" />

      {/* FORM */}
      <Form id="add-listing-form" action={handleSubmitForm} className="flex flex-col gap-y-8">
        {/* Street Address */}
        <FormItem
          label={t('booking:streetAddress.label')}
          desccription={t('booking:streetAddress.pickup.helper')}
        >
          <AddressAutocompleteInput
            name="streetAddress"
            placeholder={t('booking:streetAddress.pickup.placeholder')}
            value={pickupStreetAddress}
            onChangeText={setPickupStreetAddress}
            proximity={pickupCoordinates}
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
            placeholder={t('booking:apartmentUnit.pickup.placeholder')}
            value={pickupApartmentUnit}
            onChange={(e) => setPickupApartmentUnit(e.target.value)}
          />
        </FormItem>

        {/* Access Notes */}
        <FormItem
          label={t('booking:accessNotes.label')}
          desccription={t('booking:accessNotes.helper')}
        >
          <Textarea
            name="accessNotes"
            placeholder={t('booking:accessNotes.placeholder')}
            value={pickupAccessNotes}
            onChange={(e) => setPickupAccessNotes(e.target.value)}
          />
        </FormItem>

        <Divider />

        {/* Loading Zone Required */}
        <FormItem
          label={t('booking:haltverbot.label')}
          desccription={t('booking:haltverbot.helper')}
        >
          <div className="flex items-center gap-6 mt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="loadingZoneRequired"
                value="yes"
                checked={pickupLoadingZoneRequired === true}
                onChange={() => setPickupLoadingZoneRequired(true)}
                className="w-4 h-4 text-primary-600"
              />
              <span className="text-sm">{t('common:answer.yes.label')}</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="loadingZoneRequired"
                value="no"
                checked={pickupLoadingZoneRequired === false}
                onChange={() => setPickupLoadingZoneRequired(false)}
                className="w-4 h-4 text-primary-600"
              />
              <span className="text-sm">{t('common:answer.no.label')}</span>
            </label>
          </div>
        </FormItem>

        {/* Conditional: Arrange Haltverbot */}
        {pickupLoadingZoneRequired && (
          <div className="p-4 bg-neutral-50 dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700">
            <FormItem
              label={t('booking:haltverbot.arrange.label')}
              desccription={t('booking:haltverbot.arrange.helper')}
            >
              <div className="flex items-center gap-6 mt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="arrangeHaltverbot"
                    value="yes"
                    checked={pickupArrangeHaltverbot === true}
                    onChange={() => setPickupArrangeHaltverbot(true)}
                    className="w-4 h-4 text-primary-600"
                  />
                  <span className="text-sm">{t('booking:haltverbot.arrangeYes.label')}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="arrangeHaltverbot"
                    value="no"
                    checked={pickupArrangeHaltverbot === false}
                    onChange={() => setPickupArrangeHaltverbot(false)}
                    className="w-4 h-4 text-primary-600"
                  />
                  <span className="text-sm">{t('booking:haltverbot.arrangeNo.label')}</span>
                </label>
              </div>
            </FormItem>
          </div>
        )}

        {/* Hidden fields for form submission */}
        <input type="hidden" name="pickupLoadingZoneRequired" value={pickupLoadingZoneRequired ? 'yes' : 'no'} />
        <input type="hidden" name="pickupArrangeHaltverbot" value={pickupArrangeHaltverbot ? 'yes' : 'no'} />
      </Form>
    </>
  )
}

export default Page
