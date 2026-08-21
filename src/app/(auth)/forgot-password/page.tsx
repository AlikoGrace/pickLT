import ButtonPrimary from '@/shared/ButtonPrimary'
import { Field, Label } from '@/shared/fieldset'
import Input from '@/shared/Input'
import Logo from '@/shared/Logo'
import { getTranslations } from '@/lib/i18n-server'
import { Metadata } from 'next'
import Link from 'next/link'

// § 7.8 — `export const metadata` is module scope and cannot read the
// request-scoped locale. Every localisable title has to become async.
export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslations()
  return {
    title: t('web:seo.forgotPassword.title'),
    description: t('web:seo.forgotPassword.description'),
  }
}

const Page = async () => {
  const { t } = await getTranslations()

  return (
    <div className="container">
      <div className="my-16 flex justify-center">
        <Logo className="w-32" />
      </div>

      <div className="mx-auto max-w-md space-y-6">
        {/* FORM */}
        <form className="grid grid-cols-1 gap-6" action="#" method="post">
          <Field className="block">
            <Label className="text-neutral-800 dark:text-neutral-200">
              {t('auth:field.email.label')}
            </Label>
            <Input
              type="email"
              placeholder={t('auth:field.email.placeholder')}
              className="mt-1"
            />
          </Field>

          <ButtonPrimary type="submit">{t('common:action.continue.cta')}</ButtonPrimary>
        </form>

        {/* ==== */}
        <div className="block text-center text-sm text-neutral-700 dark:text-neutral-300">
          {t('auth:login.newUser.label')} {` `}
          <Link href="/signup" className="font-medium underline">
            {t('auth:signup.createAccount.cta')}
          </Link>
          {` `}
          {t('common:separator.or.label')}
          {` `}
          <Link href="/login" className="font-medium underline">
            {t('auth:login.submit.cta')}
          </Link>
        </div>
      </div>
    </div>
  )
}

export default Page
