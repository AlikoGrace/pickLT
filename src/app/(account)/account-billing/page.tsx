import ButtonPrimary from '@/shared/ButtonPrimary'
import { Divider } from '@/shared/divider'
import { getTranslations } from '@/lib/i18n-server'
import { Metadata } from 'next'

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslations()
  return {
    title: t('web:seo.accountBilling.title'),
    description: t('web:seo.accountBilling.description'),
  }
}

const AccountBilling = async () => {
  const { t } = await getTranslations()

  return (
    <div>
      {/* HEADING */}
      <h1 className="text-3xl font-semibold">{t('web:billing.title')}</h1>

      <Divider className="my-8 w-14!" />

      <div className="max-w-2xl">
        <span className="block text-xl font-semibold">{t('web:billing.payoutMethods.title')}</span>
        <br />
        <span className="block text-neutral-700 dark:text-neutral-300">
          {t('web:billing.payoutMethods.body')}
        </span>
        <div className="pt-10">
          <ButtonPrimary>{t('web:billing.addPayout.cta')}</ButtonPrimary>
        </div>
      </div>
    </div>
  )
}

export default AccountBilling
