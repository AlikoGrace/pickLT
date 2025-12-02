'use client'

import ButtonPrimary from '@/shared/ButtonPrimary'
import { Divider } from '@/shared/divider'
import { Fieldset, Label, Legend } from '@/shared/fieldset'
import Input from '@/shared/Input'
import { Radio, RadioField, RadioGroup } from '@/shared/radio'
import T from '@/utils/getT'
import { PlusIcon, XMarkIcon } from '@heroicons/react/24/solid'
import Form from 'next/form'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

const Page = () => {
  const router = useRouter()

  // Prefetch the next step to improve performance
  useEffect(() => {
    router.prefetch('/add-listing/6')
  }, [router])

  // Handle form submission
  const handleSubmitForm = async (formData: FormData) => {
    const formObject = Object.fromEntries(formData.entries())
    // Handle form submission logic here
    console.log('Form submitted:', formObject)

    // Redirect to the next step
    router.push('/add-listing/6')
  }

  const renderNoInclude = (text: string) => {
    return (
      <div className="flex items-center justify-between py-3">
        <span className="flex-1 text-neutral-600 dark:text-neutral-400">{text}</span>
        <div className="cursor-pointer">
          <XMarkIcon className="h-4 w-4" />
        </div>
      </div>
    )
  }

  return (
    <>
      <div>
        <h2 className="text-2xl font-semibold">{T['addListings']['page5']['pageTitle']}</h2>
        <span className="mt-2 block text-neutral-500 dark:text-neutral-400">
          {T['addListings']['page5']['pageDescription']}
        </span>
      </div>

      <Divider />

      <Form id="add-listing-form" action={handleSubmitForm} className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2">
        <Fieldset>
          <Legend className="text-lg!">Smoking</Legend>
          <RadioGroup name="Smoking" defaultValue="Allow">
            <RadioField>
              <Radio value="not" />
              <Label>Do not allow</Label>
            </RadioField>
            <RadioField>
              <Radio value="Allow" />
              <Label>Allow</Label>
            </RadioField>
            <RadioField>
              <Radio value="Charge" />
              <Label>Charge</Label>
            </RadioField>
          </RadioGroup>
        </Fieldset>

        <Fieldset>
          <Legend className="text-lg!">Pets</Legend>
          <RadioGroup name="Pets" defaultValue="Allow">
            <RadioField>
              <Radio value="not" />
              <Label>Do not allow</Label>
            </RadioField>
            <RadioField>
              <Radio value="Allow" />
              <Label>Allow</Label>
            </RadioField>
            <RadioField>
              <Radio value="Charge" />
              <Label>Charge</Label>
            </RadioField>
          </RadioGroup>
        </Fieldset>

        <Fieldset>
          <Legend className="text-lg!">Party organizing </Legend>
          <RadioGroup name="Partyorganizing" defaultValue="Allow">
            <RadioField>
              <Radio value="not" />
              <Label>Do not allow</Label>
            </RadioField>
            <RadioField>
              <Radio value="Allow" />
              <Label>Allow</Label>
            </RadioField>
            <RadioField>
              <Radio value="Charge" />
              <Label>Charge</Label>
            </RadioField>
          </RadioGroup>
        </Fieldset>

        <Fieldset>
          <Legend className="text-lg!">Cooking </Legend>
          <RadioGroup name="Cooking" defaultValue="Do">
            <RadioField>
              <Radio value="Do" />
              <Label>Do</Label>
            </RadioField>
            <RadioField>
              <Radio value="Allow" />
              <Label>Allow</Label>
            </RadioField>
            <RadioField>
              <Radio value="Charge" />
              <Label>Charge</Label>
            </RadioField>
          </RadioGroup>
        </Fieldset>

        {/*  */}
        <input type="hidden" name="Additionalrules[]" value={'No smoking in common areas'} />
        <input type="hidden" name="Additionalrules[]" value={'Do not wear shoes/shoes in the house'} />
        <input type="hidden" name="Additionalrules[]" value={'No cooking in the bedroom'} />
        {/* ...more */}
      </Form>

      <Divider />

      <p className="block text-lg font-semibold">{T['addListings']['page5']['Additional rules']}</p>
      <div className="flow-root">
        <div className="-my-3 divide-y divide-neutral-100 dark:divide-neutral-800">
          {renderNoInclude('No smoking in common areas')}
          {renderNoInclude('Do not wear shoes/shoes in the house')}
          {renderNoInclude('No cooking in the bedroom')}
        </div>
      </div>
      <div className="flex flex-col gap-x-5 gap-y-3 sm:flex-row sm:justify-between">
        <Input placeholder={T['addListings']['page5']['No smoking']} />
        <ButtonPrimary>
          <PlusIcon className="h-5 w-5" />
          <span>{T['addListings']['page5']['Add tag']}</span>
        </ButtonPrimary>
      </div>
    </>
  )
}

export default Page
