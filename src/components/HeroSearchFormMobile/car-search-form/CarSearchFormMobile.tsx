'use client'

import converSelectedDateToString from '@/utils/converSelectedDateToString'
import T from '@/utils/getT'
import * as Headless from '@headlessui/react'
import Form from 'next/form'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import DatesRangeInput from '../DatesRangeInput'
import FieldPanelContainer from '../FieldPanelContainer'
import LocationInput from '../LocationInput'

const CarSearchFormMobile = () => {
  //
  const [fieldNameShow, setFieldNameShow] = useState<'locationPickup' | 'locationDropoff' | 'dates'>('locationPickup')
  //
  const [locationInputPickUp, setLocationInputPickUp] = useState('')
  const [locationInputDropOff, setLocationInputDropOff] = useState('')
  const [startDate, setStartDate] = useState<Date | null>(new Date('2025/02/06'))
  const [endDate, setEndDate] = useState<Date | null>(new Date('2025/02/23'))
  const [dropOffLocationType, setDropOffLocationType] = useState<'same' | 'different'>('different')
  const router = useRouter()

  const onChangeDate = (dates: [Date | null, Date | null]) => {
    const [start, end] = dates
    setStartDate(start)
    setEndDate(end)
  }

  const handleFormSubmit = (formData: FormData) => {
    const formDataEntries = Object.fromEntries(formData.entries())
    console.log('Form submitted', formDataEntries)
    // You can also redirect or perform other actions based on the form data

    // example: add location to the URL
    const location = formDataEntries['pickup-location'] as string
    let url = '/car-categories/all'
    if (location) {
      url = url + `?location=${encodeURIComponent(location)}`
    }
    router.push(url)
  }

  return (
    <Form id="form-hero-search-form-mobile" action={handleFormSubmit} className="flex w-full flex-col gap-y-3">
      {/* RADIO */}
      <Headless.RadioGroup
        value={dropOffLocationType}
        onChange={setDropOffLocationType}
        aria-label="Drop Off Location Type"
        name="drop_off_location_type"
        className={'flex flex-wrap items-center justify-center gap-2.5 py-1'}
      >
        <Headless.Radio
          value="different"
          className={`flex cursor-pointer items-center rounded-full border border-neutral-300 px-4 py-1.5 text-xs font-medium data-checked:bg-black data-checked:text-white data-checked:shadow-lg data-checked:shadow-black/10 dark:border-neutral-700 dark:data-checked:bg-neutral-200 dark:data-checked:text-neutral-900`}
        >
          {T['HeroSearchForm']['Different drop off']}
        </Headless.Radio>
        <Headless.Radio
          value="same"
          className={`flex cursor-pointer items-center rounded-full border border-neutral-300 px-4 py-1.5 text-xs font-medium data-checked:bg-black data-checked:text-white data-checked:shadow-lg data-checked:shadow-black/10 dark:border-neutral-700 dark:data-checked:bg-neutral-200 dark:data-checked:text-neutral-900`}
        >
          {T['HeroSearchForm']['Same drop off']}
        </Headless.Radio>
      </Headless.RadioGroup>

      {/*  */}
      <FieldPanelContainer
        isActive={fieldNameShow === 'locationPickup'}
        headingOnClick={() => setFieldNameShow('locationPickup')}
        headingTitle={T['HeroSearchForm']['Pick up']}
        headingValue={locationInputPickUp || T['HeroSearchForm']['Location']}
      >
        <LocationInput
          headingText={T['HeroSearchForm']['Pick up'] + '?'}
          imputName="pickup-location"
          defaultValue={locationInputPickUp}
          onChange={(value) => {
            setLocationInputPickUp(value)
            if (dropOffLocationType === 'different') {
              setFieldNameShow('locationDropoff')
            } else {
              setFieldNameShow('dates')
            }
          }}
        />
      </FieldPanelContainer>

      {/*  */}
      {dropOffLocationType === 'different' && (
        <FieldPanelContainer
          isActive={fieldNameShow === 'locationDropoff'}
          headingOnClick={() => setFieldNameShow('locationDropoff')}
          headingTitle={T['HeroSearchForm']['Drop off']}
          headingValue={locationInputDropOff || T['HeroSearchForm']['Location']}
        >
          <LocationInput
            headingText={T['HeroSearchForm']['Drop off'] + '?'}
            imputName="dropoff-location"
            defaultValue={locationInputDropOff}
            onChange={(value) => {
              setLocationInputDropOff(value)
              setFieldNameShow('dates')
            }}
          />
        </FieldPanelContainer>
      )}

      {/* DATE RANGE  */}
      <FieldPanelContainer
        isActive={fieldNameShow === 'dates'}
        headingOnClick={() => setFieldNameShow('dates')}
        headingTitle={T['HeroSearchForm']['When']}
        headingValue={startDate ? converSelectedDateToString([startDate, endDate]) : T['HeroSearchForm']['Add dates']}
      >
        <DatesRangeInput onChange={onChangeDate} />
      </FieldPanelContainer>
      {/*  */}
    </Form>
  )
}

export default CarSearchFormMobile
