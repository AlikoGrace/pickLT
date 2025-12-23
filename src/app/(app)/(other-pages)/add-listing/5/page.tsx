'use client'

import { useMoveSearch, type FlexibilityOption } from '@/context/moveSearch'
import { Checkbox, CheckboxField, CheckboxGroup } from '@/shared/Checkbox'
import { Divider } from '@/shared/divider'
import { Fieldset, Label, Legend } from '@/shared/fieldset'
import { Radio, RadioField, RadioGroup } from '@/shared/radio'
import { ClockIcon, XMarkIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'
import Form from 'next/form'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import TimePicker from 'react-time-picker'
import 'react-time-picker/dist/TimePicker.css'
import 'react-clock/dist/Clock.css'

const PageAddListing6 = () => {
  const router = useRouter()

  const {
    moveDate,
    arrivalWindow,
    flexibility,
    preferEarliestArrival,
    avoidLunchBreak,
    avoidEveningDelivery,
    setArrivalWindow,
    setFlexibility,
    setPreferEarliestArrival,
    setAvoidLunchBreak,
    setAvoidEveningDelivery,
  } = useMoveSearch()

  // Prefetch the next step to improve performance
  useEffect(() => {
    router.prefetch('/add-listing/6')
  }, [router])

  const handleSubmitForm = async (formData: FormData) => {
    const formObject = Object.fromEntries(formData.entries())
    console.log('Form submitted:', formObject)

    // Redirect to the next step
    router.push('/add-listing/6')
  }

  // Format move date for display
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Not selected'
    try {
      const date = new Date(dateStr)
      return date.toLocaleDateString('en-GB', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    } catch {
      return dateStr
    }
  }

  const formatTimeDisplay = () => {
    if (!arrivalWindow) return 'Select time'
    // Convert 24h to 12h format for display
    const [hours, minutes] = arrivalWindow.split(':').map(Number)
    const period = hours >= 12 ? 'PM' : 'AM'
    const hour12 = hours % 12 || 12
    return `${hour12}:${minutes.toString().padStart(2, '0')} ${period}`
  }

  const showFlexibilityOption = arrivalWindow !== null

  return (
    <>
      <div>
        <h2 className="text-2xl font-semibold">Move timing</h2>
        <span className="mt-2 block text-neutral-500 dark:text-neutral-400">
          Choose when the movers should arrive.
        </span>
      </div>

      <Divider />

      <Form id="add-listing-form" action={handleSubmitForm} className="flex flex-col gap-y-8">
        {/* Move Date Display */}
        <div>
          <p className="text-lg font-semibold">Move date</p>
          <div className="mt-2 p-4 bg-neutral-50 dark:bg-neutral-800 rounded-2xl">
            <p className="text-neutral-900 dark:text-neutral-100 font-medium">
              {formatDate(moveDate)}
            </p>
            {!moveDate && (
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                You can set your move date in Step 1
              </p>
            )}
          </div>
        </div>

        <Divider />

        {/* Arrival Window - Time Picker */}
        <div>
          <p className="text-lg font-semibold">Preferred arrival time</p>
          <span className="mt-1 block text-sm text-neutral-500 dark:text-neutral-400">
            Select when you&apos;d like the movers to arrive.
          </span>
          
          <div className="mt-4">
            <div className="flex items-center gap-x-4 rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-5 py-4">
              <ClockIcon className="h-6 w-6 text-neutral-400 dark:text-neutral-500" />
              <div className="flex-1">
                <span className="block text-sm text-neutral-500 dark:text-neutral-400 mb-2">
                  Arrival time
                </span>
                <div className="time-picker-container">
                  <TimePicker
                    onChange={(value) => setArrivalWindow(value as string | null)}
                    value={arrivalWindow}
                    disableClock={true}
                    clearIcon={arrivalWindow ? <XMarkIcon className="h-4 w-4 text-neutral-500" /> : null}
                    clockIcon={null}
                    format="hh:mm a"
                    hourPlaceholder="HH"
                    minutePlaceholder="MM"
                    className="custom-time-picker"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Conditional: Flexibility option */}
        {showFlexibilityOption && (
          <div className="p-4 bg-neutral-50 dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700">
            <Fieldset>
              <Legend className="text-base!">Flexibility</Legend>
              <RadioGroup
                name="flexibility"
                value={flexibility || ''}
                onChange={(value: string) => setFlexibility(value as FlexibilityOption)}
              >
                <RadioField>
                  <Radio value="flexible_1hr" />
                  <Label>I&apos;m flexible by up to 1 hour</Label>
                </RadioField>
                <RadioField>
                  <Radio value="not_flexible" />
                  <Label>Not flexible</Label>
                </RadioField>
              </RadioGroup>
            </Fieldset>
          </div>
        )}

        <Divider />

        {/* Optional Add-ons */}
        <div>
          <p className="text-lg font-semibold">Optional preferences</p>
          <span className="mt-1 block text-sm text-neutral-500 dark:text-neutral-400">
            Select any additional timing preferences.
          </span>
          <Fieldset className="mt-4">
            <CheckboxGroup className="space-y-4">
              <CheckboxField>
                <Checkbox
                  name="preferEarliestArrival"
                  checked={preferEarliestArrival}
                  onChange={(checked) => setPreferEarliestArrival(checked)}
                />
                <Label>Prefer earliest possible arrival</Label>
              </CheckboxField>
              <CheckboxField>
                <Checkbox
                  name="avoidLunchBreak"
                  checked={avoidLunchBreak}
                  onChange={(checked) => setAvoidLunchBreak(checked)}
                />
                <Label>Avoid lunch break gap</Label>
              </CheckboxField>
              <CheckboxField>
                <Checkbox
                  name="avoidEveningDelivery"
                  checked={avoidEveningDelivery}
                  onChange={(checked) => setAvoidEveningDelivery(checked)}
                />

                <Label>Avoid evening delivery</Label>
              </CheckboxField>
            </CheckboxGroup>
          </Fieldset>
        </div>

        {/* Hidden fields for form data */}
        <input type="hidden" name="moveDate" value={moveDate || ''} />
        <input type="hidden" name="arrivalWindowValue" value={arrivalWindow || ''} />
        <input type="hidden" name="flexibilityValue" value={flexibility || ''} />
        <input type="hidden" name="preferEarliestArrivalValue" value={preferEarliestArrival ? 'true' : 'false'} />
        <input type="hidden" name="avoidLunchBreakValue" value={avoidLunchBreak ? 'true' : 'false'} />
        <input type="hidden" name="avoidEveningDeliveryValue" value={avoidEveningDelivery ? 'true' : 'false'} />
      </Form>

      <style jsx global>{`
        .time-picker-container .react-time-picker {
          width: 100%;
        }
        .time-picker-container .react-time-picker__wrapper {
          border: none;
          background: transparent;
          padding: 0;
        }
        .time-picker-container .react-time-picker__inputGroup {
          display: flex;
          align-items: center;
          gap: 2px;
          font-size: 1rem;
          font-weight: 600;
          color: #111827;
        }
        .dark .time-picker-container .react-time-picker__inputGroup {
          color: #f3f4f6;
        }
        .time-picker-container .react-time-picker__inputGroup__input {
          color: inherit;
          background: transparent;
          border: none;
          outline: none;
          font-weight: 600;
          font-size: 1rem;
          min-width: 0;
          padding: 0;
        }
        .time-picker-container .react-time-picker__inputGroup__input:invalid {
          background: transparent;
        }
        .time-picker-container .react-time-picker__inputGroup__divider {
          color: inherit;
        }
        .time-picker-container .react-time-picker__inputGroup__amPm {
          color: inherit;
          background: transparent;
          border: none;
          font-weight: 600;
          font-size: 1rem;
          cursor: pointer;
        }
        .time-picker-container .react-time-picker__inputGroup__amPm option {
          background: white;
          color: #111827;
        }
        .dark .time-picker-container .react-time-picker__inputGroup__amPm option {
          background: #1f2937;
          color: #f3f4f6;
        }
        .time-picker-container .react-time-picker__clear-button {
          padding: 4px;
          border-radius: 50%;
        }
        .time-picker-container .react-time-picker__clear-button:hover {
          background: #f3f4f6;
        }
        .dark .time-picker-container .react-time-picker__clear-button:hover {
          background: #374151;
        }
      `}</style>
    </>
  )
}

export default PageAddListing6
