import { ImageAdd02Icon } from '@/components/Icons'
import avatar from '@/images/avatars/Image-1.png'
import Avatar from '@/shared/Avatar'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Divider } from '@/shared/divider'
import { Field, Label } from '@/shared/fieldset'
import Input from '@/shared/Input'
import Select from '@/shared/Select'
import Textarea from '@/shared/Textarea'
import T from '@/utils/getT'
import { Metadata } from 'next'
import Form from 'next/form'

export const metadata: Metadata = {
  title: 'Account Page',
  description: 'Booking online & rental online Next.js Template',
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
      <h1 className="text-3xl font-semibold">{T['accountPage']['Account information']}</h1>

      <Divider className="my-8 w-14!" />

      <Form action={handleSubmitForm} className="flex flex-col md:flex-row">
        <div className="flex shrink-0 items-start">
          <div className="relative flex overflow-hidden rounded-full">
            <Avatar src={avatar.src} className="h-32 w-32" />
            <div className="absolute inset-0 flex cursor-pointer flex-col items-center justify-center bg-black/60 text-neutral-50">
              <ImageAdd02Icon className="h-6 w-6" />
              <span className="mt-1 text-xs">{T['accountPage']['Change Image']}</span>
            </div>
            <input type="file" className="absolute inset-0 cursor-pointer opacity-0" />
          </div>
        </div>
        <div className="mt-10 max-w-3xl grow space-y-6 md:mt-0 md:ps-16">
          <Field>
            <Label>{T['accountPage']['Name']}</Label>
            <Input className="mt-1.5" defaultValue="First name" />
          </Field>
          {/* ---- */}
          <Field>
            <Label>{T['accountPage']['Gender']}</Label>
            <Select className="mt-1.5">
              <option value="Male">{T['accountPage']['Male']}</option>
              <option value="Female">{T['accountPage']['Female']}</option>
              <option value="Other">{T['accountPage']['Other']}</option>
            </Select>
          </Field>

          {/* ---- */}
          <Field>
            <Label>{T['accountPage']['Email']}</Label>
            <Input className="mt-1.5" defaultValue="example@email.com" />
          </Field>
          {/* ---- */}
          <Field className="max-w-lg">
            <Label>{T['accountPage']['Date of birth']}</Label>
            <Input className="mt-1.5" type="date" defaultValue="1990-07-22" />
          </Field>
          {/* ---- */}
          <Field>
            <Label>{T['accountPage']['Addess']}</Label>
            <Input className="mt-1.5" defaultValue="New york, USA" />
          </Field>
          {/* ---- */}
          <Field>
            <Label>{T['accountPage']['Phone number']}</Label>
            <Input className="mt-1.5" defaultValue="003 888 232" />
          </Field>
          {/* ---- */}
          <Field>
            <Label>{T['accountPage']['About you']}</Label>
            <Textarea className="mt-1.5" defaultValue="..." />
          </Field>
          <div className="pt-4">
            <ButtonPrimary type="submit">{T['accountPage']['Update information']}</ButtonPrimary>
          </div>
        </div>
      </Form>
    </div>
  )
}

export default Page
