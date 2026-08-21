import SectionSubscribe2 from '@/components/SectionSubscribe2'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Divider } from '@/shared/divider'
import { Field, Label } from '@/shared/fieldset'
import Input from '@/shared/Input'
import SocialsList from '@/shared/SocialsList'
import Textarea from '@/shared/Textarea'
import { getTranslations } from '@/lib/i18n-server'
import type { TFunction } from 'i18next'
import { Metadata } from 'next'

// § 7.6 — a module-scope label array freezes at import and never re-reads the
// locale. It has to be a function of `t`, called during render.
const getInfo = (t: TFunction) => [
  {
    title: t('web:contact.address.label'),
    description: t('web:contact.address.value'),
  },
  {
    title: t('web:contact.email.label'),
    // Placeholder contact data, not translatable copy.
    description: 'example@example.com',
  },
  {
    title: t('web:contact.phone.label'),
    description: '000-123-456-7890',
  },
]

// § 7.8 — module-scope `metadata` cannot read the request locale.
export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslations()
  return {
    title: t('web:seo.contact.title'),
    description: t('web:seo.contact.description'),
  }
}

const PageContact = async () => {
  const { t } = await getTranslations()
  const info = getInfo(t)

  return (
    <div className="pt-10 pb-24 sm:py-24 lg:py-32">
      <div className="container mx-auto max-w-7xl">
        <div className="grid shrink-0 grid-cols-1 gap-x-5 gap-y-12 sm:grid-cols-2">
          <div>
            <h1 className="max-w-2xl text-4xl font-semibold sm:text-5xl">{t('web:contact.title')}</h1>
            <div className="mt-10 flex max-w-sm flex-col gap-y-8 sm:mt-20">
              {info.map((item, index) => (
                <div key={index}>
                  <h3 className="text-sm font-semibold tracking-wider uppercase dark:text-neutral-200">{item.title}</h3>
                  <span className="mt-2 block text-neutral-500 dark:text-neutral-400">{item.description}</span>
                </div>
              ))}
              <div>
                <h3 className="text-sm font-semibold tracking-wider uppercase dark:text-neutral-200">
                  {t('web:contact.socials.label')}
                </h3>
                <SocialsList className="mt-2" />
              </div>
            </div>
          </div>
          <form className="grid grid-cols-1 gap-6" action="#" method="post">
            <Field className="block">
              <Label>{t('common:field.fullName.label')}</Label>
              <Input placeholder={t('web:contact.fullName.placeholder')} type="text" className="mt-1" />
            </Field>
            <Field className="block">
              <Label>{t('auth:field.email.label')}</Label>
              <Input type="email" placeholder={t('auth:field.email.placeholder')} className="mt-1" />
            </Field>
            <Field className="block">
              <Label>{t('web:contact.message.label')}</Label>
              <Textarea className="mt-1" rows={6} />
            </Field>
            <div>
              <ButtonPrimary type="submit">{t('web:contact.submit.cta')}</ButtonPrimary>
            </div>
          </form>
        </div>
      </div>

      {/* OTHER SECTIONS */}
      <div className="container mt-20 lg:mt-32">
        <Divider />
        <SectionSubscribe2 className="mt-20 lg:mt-32" />
      </div>
    </div>
  )
}

export default PageContact
