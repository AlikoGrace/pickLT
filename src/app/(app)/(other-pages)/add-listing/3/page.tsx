'use client'

import { useMoveSearch, type FloorLevelKey, type DropoffParkingKey } from '@/context/moveSearch'
import { Divider } from '@/shared/divider'
import Input from '@/shared/Input'
import Select from '@/shared/Select'
import Form from 'next/form'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import FormItem from '../FormItem'

const Page = () => {
  const router = useRouter()
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  const {
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
  } = useMoveSearch()

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
      errors.streetAddress = 'Please enter a street address'
    }
    if (!formObject['floorLevel']) {
      errors.floorLevel = 'Please select a floor level'
    }
    if (!formObject['parkingSituation']) {
      errors.parkingSituation = 'Please select a parking situation'
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
      <h1 className="text-2xl font-semibold">Drop-Off Address</h1>
      <Divider className="w-14!" />

      {/* FORM */}
      <Form id="add-listing-form" action={handleSubmitForm} className="flex flex-col gap-y-8">
        {/* Street Address */}
        <FormItem label="Street address" desccription="Enter the full delivery street address">
          <Input
            name="streetAddress"
            placeholder="e.g., Berliner Straße 12"
            defaultValue={dropoffStreetAddress}
            onChange={(e) => setDropoffStreetAddress(e.target.value)}
          />
          {formErrors.streetAddress && (
            <div className="text-sm text-red-600 mt-2">{formErrors.streetAddress}</div>
          )}
        </FormItem>

        {/* Apartment/Unit */}
        <FormItem label="Apartment / Unit (optional)" desccription="Floor, apartment number, or unit name">
          <Input
            name="apartmentUnit"
            placeholder="e.g., 2nd floor, Apt 5"
            defaultValue={dropoffApartmentUnit}
            onChange={(e) => setDropoffApartmentUnit(e.target.value)}
          />
        </FormItem>

        {/* Floor Level */}
        <FormItem label="Floor level" desccription="Which floor is the drop-off address on?">
          <Select
            name="floorLevel"
            defaultValue={dropoffFloorLevel ?? ''}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              setDropoffFloorLevel(e.target.value ? (e.target.value as FloorLevelKey) : null)
            }
          >
            <option value="">Select floor</option>
            <option value="ground">Ground floor</option>
            <option value="1">1st floor</option>
            <option value="2">2nd floor</option>
            <option value="3">3rd floor</option>
            <option value="4">4th floor</option>
            <option value="5">5th floor</option>
            <option value="6">6th floor</option>
            <option value="7">7th floor</option>
            <option value="8">8th floor</option>
            <option value="9">9th floor</option>
            <option value="10">10th floor</option>
            <option value="11">11th floor</option>
            <option value="12">12th floor</option>
          </Select>
          {formErrors.floorLevel && (
            <div className="text-sm text-red-600 mt-2">{formErrors.floorLevel}</div>
          )}
        </FormItem>

        {/* Elevator Available */}
        <FormItem label="Elevator available?" desccription="Is there an elevator at the drop-off location?">
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
              <span className="text-sm">Yes</span>
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
              <span className="text-sm">No</span>
            </label>
          </div>
        </FormItem>

        <Divider />

        {/* Parking Situation */}
        <FormItem label="Parking situation" desccription="Availability of parking near the building for the moving truck">
          <Select
            name="parkingSituation"
            defaultValue={dropoffParkingSituation ?? ''}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              setDropoffParkingSituation(e.target.value ? (e.target.value as DropoffParkingKey) : null)
            }
          >
            <option value="">Select parking situation</option>
            <option value="directly_in_front">Parking directly in front</option>
            <option value="limited">Limited parking</option>
            <option value="street_only">No parking / street only</option>
            <option value="underground">Underground garage access</option>
            <option value="loading_zone">Need loading zone (Haltverbot)</option>
          </Select>
          {formErrors.parkingSituation && (
            <div className="text-sm text-red-600 mt-2">{formErrors.parkingSituation}</div>
          )}
        </FormItem>

        {/* Conditional: Arrange Haltverbot for Drop-off */}
        {needsLoadingZone && (
          <div className="p-4 bg-neutral-50 dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700">
            <FormItem
              label="Should we arrange the Haltverbot permit for the drop-off location?"
              desccription="We'll handle the permit application with the local municipality"
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
                  <span className="text-sm">Yes, arrange it for me</span>
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
                  <span className="text-sm">No, I'll handle it</span>
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
