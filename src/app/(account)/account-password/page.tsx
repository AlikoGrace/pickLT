import ButtonPrimary from '@/shared/ButtonPrimary'
import { Divider } from '@/shared/divider'
import { Field, Label } from '@/shared/fieldset'
import Input from '@/shared/Input'
import T from '@/utils/getT'
import { Metadata } from 'next'
import Form from 'next/form'

export const metadata: Metadata = {
  title: 'Account - password',
  description: 'Manage your password',
}

const Page = () => {
  const handleSubmitForm = async (formData: FormData) => {
    'use server'
    // Handle form submission logic here
    console.log('Form submitted:', Object.fromEntries(formData.entries()))
  }

  return (
    <div>
      {/* HEADING */}
      <h1 className="text-3xl font-semibold">{T['accountPage']['Update your password']}</h1>

      <Divider className="my-8 w-14!" />

      <Form action={handleSubmitForm} className="max-w-xl space-y-6">
        <Field>
          <Label>{T['accountPage']['Current password']}</Label>
          <Input type="password" className="mt-1.5" />
        </Field>
        <Field>
          <Label>{T['accountPage']['New password']}</Label>
          <Input type="password" className="mt-1.5" />
        </Field>
        <Field>
          <Label>{T['accountPage']['Confirm password']}</Label>
          <Input type="password" className="mt-1.5" />
        </Field>
        <div className="pt-4">
          <ButtonPrimary type="submit">{T['accountPage']['Update password']}</ButtonPrimary>
        </div>
      </Form>
    </div>
  )
}

export default Page
