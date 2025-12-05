'use client'

import Input from '@/shared/Input'
import Select from '@/shared/Select'
import T from '@/utils/getT'
import Form from 'next/form'
import { useRouter } from 'next/navigation'
import { useSearchParams } from 'next/navigation'
import { useEffect } from 'react'
import FormItem from '../FormItem'
import { useMoveSearch } from '@/context/moveSearch'
import { useState } from 'react'

const Page = () => {
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
    if (!formObject['homeType']) errors.homeType = 'Please select a home type'
    if (!formObject['floorLevel']) errors.floorLevel = 'Please select a floor level'
    if (!formObject['parkingSituation']) errors.parkingSituation = 'Please select a parking situation'
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
    homeType,
    floorLevel,
    elevatorAvailable,
    parkingSituation,
    setHomeType,
    setFloorLevel,
    setElevatorAvailable,
    setParkingSituation,
  } = useMoveSearch()

  const { setPickupLocation, setMoveDate, setMoveType } = useMoveSearch()
  const searchParams = useSearchParams()
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  // Read incoming query params and seed provider (if present)
  useEffect(() => {
    const loc = searchParams.get('location')
    const md = searchParams.get('moveDate')
    const mt = searchParams.get('moveType')
    if (loc) setPickupLocation(loc)
    if (md) setMoveDate(md)
    if (mt) setMoveType((mt as any) || null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <>
      <h1 className="text-2xl font-semibold">STEP 1 — Move Details</h1>
      <div className="w-14 border-b border-neutral-200 dark:border-neutral-700"></div>
      {/* FORM */}
      <Form id="add-listing-form" action={handleSubmitForm} className="flex flex-col gap-y-8">
        {/* Home type */}
        <FormItem label="Home type" desccription="Select the type of home or space to move">
          <Select
            name="homeType"
            defaultValue={homeType ?? ''}
            onChange={(e: any) => setHomeType(e.target.value ? (e.target.value as any) : null)}
          >
            <option value="">Select a type</option>
            <option value="apartment">Apartment</option>
            <option value="house">House</option>
            <option value="office">Office</option>
            <option value="storage">Storage unit</option>
          </Select>
          {formErrors.homeType && <div className="text-sm text-red-600 mt-2">{formErrors.homeType}</div>}
        </FormItem>

        {/* Floor level + elevator */}
        <FormItem label="Floor level" desccription="Which floor is the pickup address on?">
          <Select
            name="floorLevel"
            defaultValue={floorLevel ?? ''}
            onChange={(e: any) => setFloorLevel(e.target.value ? (e.target.value as any) : null)}
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
              Elevator available
            </label>
          </div>
          {formErrors.floorLevel && <div className="text-sm text-red-600 mt-2">{formErrors.floorLevel}</div>}
        </FormItem>

        {/* Parking */}
        <FormItem label="Parking situation" desccription="Availability of parking near the building for the moving truck">
          <Select
            name="parkingSituation"
            defaultValue={parkingSituation ?? ''}
            onChange={(e: any) => setParkingSituation(e.target.value ? (e.target.value as any) : null)}
          >
            <option value="">Select parking situation</option>
            <option value="at_building">Parking directly at building</option>
            <option value="nearby">Parking nearby (0–20 m)</option>
            <option value="no_parking">No parking / long carry</option>
          </Select>
          {formErrors.parkingSituation && <div className="text-sm text-red-600 mt-2">{formErrors.parkingSituation}</div>}
        </FormItem>

        {/* Hidden compatibility inputs: ensure previous flows receive these values in formData */}
        <input type="hidden" name="pickupLocation" value={String((useMoveSearch() as any).pickupLocation || '')} />
        <input type="hidden" name="moveDate" value={String((useMoveSearch() as any).moveDate || '')} />
        <input type="hidden" name="moveType" value={String((useMoveSearch() as any).moveType || '')} />

        {/* <div className="pt-4 border-t border-neutral-100 flex justify-end">
          <button type="submit" className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded">
            Continue
          </button>
        </div> */}
      </Form>
    </>
  )
}

export default Page
