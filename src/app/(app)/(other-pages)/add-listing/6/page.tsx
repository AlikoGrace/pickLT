'use client'

import { useMoveSearch, type ArrivalWindow, type FlexibilityOption } from '@/context/moveSearch'
import { Checkbox, CheckboxField, CheckboxGroup } from '@/shared/Checkbox'
import { Divider } from '@/shared/divider'
import { Fieldset, Label, Legend } from '@/shared/fieldset'
import { Radio, RadioField, RadioGroup } from '@/shared/radio'
import Form from 'next/form'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

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
    router.prefetch('/add-listing/7')
  }, [router])

  const handleSubmitForm = async (formData: FormData) => {
    const formObject = Object.fromEntries(formData.entries())
    console.log('Form submitted:', formObject)

    // Redirect to the next step
    router.push('/add-listing/7')
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

  const showFlexibilityOption = arrivalWindow && arrivalWindow !== 'flexible'

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

        {/* Arrival Window */}
        <Fieldset>
          <Legend className="text-lg!">Arrival window</Legend>
          <RadioGroup
            name="arrivalWindow"
            value={arrivalWindow || ''}
            onChange={(value: string) => {
              setArrivalWindow(value as ArrivalWindow)
              // Reset flexibility when changing to flexible
              if (value === 'flexible') {
                setFlexibility(null)
              }
            }}
          >
            <RadioField>
              <Radio value="morning" />
              <Label>Morning (08:00–11:00)</Label>
            </RadioField>
            <RadioField>
              <Radio value="midday" />
              <Label>Midday (11:00–14:00)</Label>
            </RadioField>
            <RadioField>
              <Radio value="afternoon" />
              <Label>Afternoon (14:00–17:00)</Label>
            </RadioField>
            <RadioField>
              <Radio value="flexible" />
              <Label>Flexible</Label>
            </RadioField>
          </RadioGroup>
        </Fieldset>

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
    </>
  )
}

export default PageAddListing6
