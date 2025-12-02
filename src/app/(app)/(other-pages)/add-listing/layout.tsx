'use client'

import ButtonPrimary from '@/shared/ButtonPrimary'
import ButtonSecondary from '@/shared/ButtonSecondary'
import { ArrowRightIcon } from '@heroicons/react/24/outline'
import { usePathname } from 'next/navigation'
import React from 'react'

const Layout = ({ children }: { children: React.ReactNode }) => {
  React.useEffect(() => {
    document.documentElement.scrollTo({
      top: 0,
      behavior: 'instant',
    })
  }, [])

  return (
    <div className="mx-auto max-w-3xl px-4 pt-10 pb-24 sm:pt-16 lg:pb-32">
      <PageHeading />
      <div className="mt-8 listingSection__wrap">{children}</div>
      <Pagination />
    </div>
  )
}

const PageHeading = () => {
  const pathname = usePathname()

  // get the number from the end of pathname
  const index = pathname.match(/\d+$/) ? parseInt(pathname.match(/\d+$/)?.[0] || '1') : 1

  return (
    <div>
      <span className="text-5xl font-semibold">{index}</span>
      <span className="text-lg text-neutral-500 dark:text-neutral-400"> /10</span>
    </div>
  )
}

const Pagination = () => {
  const pathname = usePathname() as string

  // get the number from the end of pathname
  const index = pathname.match(/\d+$/) ? parseInt(pathname.match(/\d+$/)?.[0] || '1') : 1

  let nextHref = index < 10 ? undefined : '/stay-listings/preview-stay-84763232'
  let backtHref = index > 1 ? `/add-listing/${index - 1}` : `/add-listing/${1}`

  let nextBtnText = index > 9 ? 'Publish listing' : 'Next step ' + (index + 1)
  let backBtnText = index > 1 ? 'Go back' : 'Back to home'

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
