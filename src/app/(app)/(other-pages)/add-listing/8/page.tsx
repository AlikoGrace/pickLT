'use client'

import NcInputNumber from '@/components/NcInputNumber'
import { useMoveSearch, type AdditionalService } from '@/context/moveSearch'
import { Checkbox, CheckboxField, CheckboxGroup } from '@/shared/Checkbox'
import { Divider } from '@/shared/divider'
import { Fieldset, Label } from '@/shared/fieldset'
import Textarea from '@/shared/Textarea'
import Form from 'next/form'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

const ADDITIONAL_SERVICES: { id: AdditionalService; label: string; description: string }[] = [
  {
    id: 'furniture_disassembly',
    label: 'Furniture disassembly',
    description: 'We disassemble beds, wardrobes, tables before loading',
  },
  {
    id: 'furniture_assembly',
    label: 'Furniture assembly',
    description: 'We reassemble furniture at the new location',
  },
  {
    id: 'tv_mount_remove',
    label: 'TV mount / remove',
    description: 'Mount or remove wall-mounted TVs',
  },
  {
    id: 'appliance_disconnect',
    label: 'Appliance disconnect',
    description: 'Disconnect washing machine, dishwasher, dryer',
  },
  {
    id: 'appliance_connect',
    label: 'Appliance connect',
    description: 'Reconnect appliances at the new address',
  },
  {
    id: 'disposal_entsorgung',
    label: 'Disposal (Entsorgung)',
    description: 'Dispose of unwanted furniture and items',
  },
  {
    id: 'moveout_cleaning',
    label: 'Move-out cleaning',
    description: 'Professional cleaning of your old apartment',
  },
  {
    id: 'temporary_storage',
    label: 'Temporary storage',
    description: 'Store items securely between moves',
  },
]

const Page = () => {
  const router = useRouter()

  const {
    additionalServices,
    storageWeeks,
    disposalItems,
    toggleAdditionalService,
    setStorageWeeks,
    setDisposalItems,
  } = useMoveSearch()

  // Prefetch the next step to improve performance
  useEffect(() => {
    router.prefetch('/add-listing/9')
  }, [router])

  const handleSubmitForm = async (formData: FormData) => {
    const formObject = Object.fromEntries(formData.entries())
    console.log('Form submitted:', formObject)

    // Redirect to the next step
    router.push('/add-listing/9')
  }

  const showStorageOptions = additionalServices.includes('temporary_storage')
  const showDisposalOptions = additionalServices.includes('disposal_entsorgung')

  return (
    <>
      <div>
        <h2 className="text-2xl font-semibold">Additional services</h2>
        <span className="mt-2 block text-neutral-500 dark:text-neutral-400">
          Select any extra services you need. These are standard offerings from German movers.
        </span>
      </div>

      <Divider />

      <Form id="add-listing-form" action={handleSubmitForm} className="flex flex-col gap-y-8">
        {/* Additional Services Checkboxes */}
        <Fieldset>
          <CheckboxGroup className="space-y-4">
            {ADDITIONAL_SERVICES.map((service) => (
              <CheckboxField key={service.id}>
                <Checkbox
                  name={`service_${service.id}`}
                  checked={additionalServices.includes(service.id)}
                  onChange={() => toggleAdditionalService(service.id)}
                />
                <Label className="flex flex-col">
                  <span className="font-medium">{service.label}</span>
                  <span className="text-sm text-neutral-500 dark:text-neutral-400">
                    {service.description}
                  </span>
                </Label>
              </CheckboxField>
            ))}
          </CheckboxGroup>
        </Fieldset>

        {/* Conditional: Storage Duration */}
        {showStorageOptions && (
          <>
            <Divider />
            <div className="p-4 bg-neutral-50 dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700">
              <p className="text-lg font-semibold mb-4">Storage details</p>
              <NcInputNumber
                inputName="storageWeeks"
                inputId="storageWeeks"
                label="How many weeks of storage?"
                defaultValue={storageWeeks}
                min={1}
                max={52}
                onChange={(value) => setStorageWeeks(value)}
              />
              <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
                Standard storage units are climate-controlled and insured.
              </p>
            </div>
          </>
        )}

        {/* Conditional: Disposal Items */}
        {showDisposalOptions && (
          <>
            <Divider />
            <div className="p-4 bg-neutral-50 dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700">
              <p className="text-lg font-semibold">Items for disposal</p>
              <span className="mt-1 block text-sm text-neutral-500 dark:text-neutral-400">
                List the furniture or items you want us to dispose of.
              </span>
              <div className="mt-4">
                <Textarea
                  name="disposalItems"
                  placeholder="e.g., Old sofa, broken bookshelf, mattress..."
                  value={disposalItems}
                  onChange={(e) => setDisposalItems(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          </>
        )}

        {/* Hidden fields for form data */}
        <input type="hidden" name="additionalServices" value={JSON.stringify(additionalServices)} />
        <input type="hidden" name="storageWeeksValue" value={storageWeeks} />
        <input type="hidden" name="disposalItemsValue" value={disposalItems} />
      </Form>
    </>
  )
}

export default Page
