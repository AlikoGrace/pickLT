'use client'

import { useMoveSearch } from '@/context/moveSearch'
import { Divider } from '@/shared/divider'
import Input from '@/shared/Input'
import Textarea from '@/shared/Textarea'
import Form from 'next/form'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import FormItem from '../FormItem'

const Page = () => {
  const router = useRouter()
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  const {
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
  } = useMoveSearch()

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
      errors.streetAddress = 'Please enter a street address'
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
      <h1 className="text-2xl font-semibold">Pickup Address</h1>
      <Divider className="w-14!" />

      {/* FORM */}
      <Form id="add-listing-form" action={handleSubmitForm} className="flex flex-col gap-y-8">
        {/* Street Address */}
        <FormItem label="Street address" desccription="Enter the full pickup street address">
          <Input
            name="streetAddress"
            placeholder="e.g., Hauptstraße 45"
            defaultValue={pickupStreetAddress}
            onChange={(e) => setPickupStreetAddress(e.target.value)}
          />
          {formErrors.streetAddress && (
            <div className="text-sm text-red-600 mt-2">{formErrors.streetAddress}</div>
          )}
        </FormItem>

        {/* Apartment/Unit */}
        <FormItem label="Apartment / Unit (optional)" desccription="Floor, apartment number, or unit name">
          <Input
            name="apartmentUnit"
            placeholder="e.g., 3rd floor, Apt 12"
            defaultValue={pickupApartmentUnit}
            onChange={(e) => setPickupApartmentUnit(e.target.value)}
          />
        </FormItem>

        {/* Access Notes */}
        <FormItem label="Access notes (optional)" desccription="Any details that will help our team access the location">
          <Textarea
            name="accessNotes"
            placeholder="e.g., narrow corridor, steep stairs, construction at entrance"
            defaultValue={pickupAccessNotes}
            onChange={(e) => setPickupAccessNotes(e.target.value)}
          />
        </FormItem>

        <Divider />

        {/* Loading Zone Required */}
        <FormItem
          label="Loading zone required? (German Haltverbot permit)"
          desccription="A Haltverbot zone reserves parking space for the moving truck"
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
              <span className="text-sm">Yes</span>
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
              <span className="text-sm">No</span>
            </label>
          </div>
        </FormItem>

        {/* Conditional: Arrange Haltverbot */}
        {pickupLoadingZoneRequired && (
          <div className="p-4 bg-neutral-50 dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700">
            <FormItem
              label="Do you want us to arrange the Haltverbot permit for you?"
              desccription="We'll handle the permit application with your local municipality"
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
                  <span className="text-sm">Yes, arrange it for me</span>
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
                  <span className="text-sm">No, I'll handle it</span>
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
