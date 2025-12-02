'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navigation = [
  {
    title: 'Account',
    href: '/account',
  },
  {
    title: 'Saved listings',
    href: '/account-savelists',
  },
  {
    title: 'Password',
    href: '/account-password',
  },
  {
    title: 'Payments & payouts',
    href: '/account-billing',
  },
]

export const PageNavigation = () => {
  const pathname = usePathname()

  return (
    <div className="container">
      <div className="hidden-scrollbar flex gap-x-8 overflow-x-auto md:gap-x-14">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.title}
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
