'use client'

import { AuthGate } from '@/components/AuthGate'
import ButtonPrimary from '@/shared/ButtonPrimary'
import ButtonSecondary from '@/shared/ButtonSecondary'
import { ArrowRightIcon } from '@heroicons/react/24/outline'
import { usePathname } from 'next/navigation'
import React from 'react'
import { useTranslation } from 'react-i18next'

const Layout = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname()

  React.useEffect(() => {
    document.documentElement.scrollTo({
      top: 0,
      behavior: 'instant',
    })
  }, [])

  return (
    <AuthGate redirectBack={pathname || '/add-listing/1'}>
      <div className="mx-auto max-w-3xl px-4 pt-10 pb-24 sm:pt-16 lg:pb-32">
        <PageHeading />
        <div className="mt-8 listingSection__wrap">{children}</div>
        <Pagination />
      </div>
    </AuthGate>
  )
}

const TOTAL_STEPS = 7

const PageHeading = () => {
  const { t } = useTranslation()
  const pathname = usePathname()

  // get the number from the end of pathname
  const index = pathname.match(/\d+$/) ? parseInt(pathname.match(/\d+$/)?.[0] || '1') : 1

  return (
    <div>
      <span className="text-5xl font-semibold">{index}</span>
      <span className="text-lg text-neutral-500 dark:text-neutral-400">
        {' '}
        {t('web:wizard.stepTotal.label', { total: TOTAL_STEPS })}
      </span>
    </div>
  )
}

const Pagination = () => {
  const { t } = useTranslation()
  const pathname = usePathname() as string

  // get the number from the end of pathname
  const index = pathname.match(/\d+$/) ? parseInt(pathname.match(/\d+$/)?.[0] || '1') : 1

  let nextHref = index < 7 ? undefined : undefined
  let backtHref = index > 1 ? `/add-listing/${index - 1}` : '/'

  let nextBtnText =
    index > TOTAL_STEPS - 1
      ? t('web:wizard.finish.cta')
      : t('web:wizard.nextStep.cta', { step: index + 1 })
  let backBtnText = index > 1 ? t('common:action.goBack.cta') : t('common:action.backToHome.cta')

  return (
    <div className="mt-10 flex flex-wrap justify-end gap-3">
      <ButtonSecondary type="button" href={backtHref}>
        {backBtnText}
      </ButtonSecondary>
      <ButtonPrimary type="submit" form="add-listing-form" {...(nextHref ? { href: nextHref } : {})}>
        {nextBtnText}
        <ArrowRightIcon className="h-5 w-5 rtl:rotate-180" />
      </ButtonPrimary>
    </div>
  )
}

export default Layout
