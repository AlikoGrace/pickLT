'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'

const getNavigation = (t: TFunction) => [
  {
    title: t('web:nav.account.label'),
    href: '/account',
  },
  {
    title: t('web:nav.myMoves.label'),
    href: '/account-savelists',
  },
]

export const PageNavigation = () => {
  const pathname = usePathname()
  const { t } = useTranslation()
  const navigation = getNavigation(t)

  return (
    <div className="container">
      <div className="hidden-scrollbar flex gap-x-8 overflow-x-auto md:gap-x-14">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block shrink-0 border-b-2 py-5 capitalize md:py-8 ${
                isActive ? 'border-primary-500 font-medium' : 'border-transparent'
              }`}
            >
              {item.title}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
