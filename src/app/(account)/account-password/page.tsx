import ButtonPrimary from '@/shared/ButtonPrimary'
import { Divider } from '@/shared/divider'
import { Field, Label } from '@/shared/fieldset'
import Input from '@/shared/Input'
import { getTranslations } from '@/lib/i18n-server'
import { Metadata } from 'next'
import Form from 'next/form'

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslations()
  return {
    title: t('web:seo.accountPassword.title'),
    description: t('web:seo.accountPassword.description'),
  }
}

const Page = async () => {
  const { t } = await getTranslations()

  const handleSubmitForm = async (formData: FormData) => {
    'use server'
    // Handle form submission logic here
    console.log('Form submitted:', Object.fromEntries(formData.entries()))
  }

  return (
    <div>
      {/* HEADING */}
      <h1 className="text-3xl font-semibold">{t('profile:password.title')}</h1>

      <Divider className="my-8 w-14!" />

      <Form action={handleSubmitForm} className="max-w-xl space-y-6">
        <Field>
          <Label>{t('profile:password.current.label')}</Label>
          <Input type="password" className="mt-1.5" />
        </Field>
        <Field>
          <Label>{t('profile:password.new.label')}</Label>
          <Input type="password" className="mt-1.5" />
        </Field>
        <Field>
          <Label>{t('profile:password.confirm.label')}</Label>
          <Input type="password" className="mt-1.5" />
        </Field>
        <div className="pt-4">
          <ButtonPrimary type="submit">{t('profile:password.submit.cta')}</ButtonPrimary>
        </div>
      </Form>
    </div>
  )
}

export default Page
