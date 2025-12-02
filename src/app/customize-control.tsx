'use client'

import SwitchDarkMode2 from '@/shared/SwitchDarkMode2'
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react'
import { Cog8ToothIcon as CogIcon, ShoppingBagIcon as ShoppingCartIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useContext } from 'react'
import { ThemeContext } from './theme-provider'

const homePages = [
  { name: 'Stays', slug: '/' },
  { name: 'Real Estates', slug: '/real-estate' },
  { name: 'Experiences', slug: '/experience' },
  { name: 'Cars', slug: '/car' },
  { name: 'Flights', slug: '/flight-categories/all' },
  { name: 'Home 2', slug: '/home-2' },
]

const CustomizeControl = () => {
  const theme = useContext(ThemeContext)
  //
  const pathname = usePathname()

  const renderSwitchDarkMode = () => {
    return (
      <div className="mt-4">
        <span className="text-sm font-medium">Dark mode</span>
        <div className="mt-1.5">
          <SwitchDarkMode2 />
        </div>
      </div>
    )
  }

  const renderRadioDir = () => {
    return (
      <div className="mt-4">
        <span className="text-sm font-medium">Theme Dir</span>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {(['ltr', 'rtl'] as const).map((value) => {
            return (
              <div
                key={value}
                className={`flex cursor-pointer items-center rounded-full px-3.5 py-1.5 text-xs font-medium uppercase select-none ${
                  theme?.themeDir === value
                    ? 'bg-black text-white shadow-lg shadow-black/10 dark:bg-neutral-100 dark:text-black'
                    : 'border border-neutral-300 hover:border-neutral-400 dark:border-neutral-700 dark:hover:border-neutral-600'
                }`}
                onClick={() => {
                  theme?.setThemeDir(value)
                }}
              >
                {value}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const renderRadioHomePages = () => {
    return (
      <div className="mt-4">
        <span className="text-sm font-medium">Home Pages</span>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {homePages.map((home) => {
            return (
              <Link
                key={home.slug}
                href={home.slug}
                className={`flex cursor-pointer items-center rounded-full px-3.5 py-1.5 text-xs font-medium select-none ${
                  pathname === home.slug
                    ? 'bg-black text-white shadow-lg shadow-black/10 dark:bg-neutral-100 dark:text-black'
                    : 'border border-neutral-300 hover:border-neutral-400 dark:border-neutral-700 dark:hover:border-neutral-600'
                }`}
              >
                {home.name}
              </Link>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="relative hidden lg:block">
      <div className="fixed top-1/4 right-5 z-40 flex items-center">
        <Popover className="relative">
          {({ open }) => (
            <>
              <PopoverButton
                className={`rounded-xl border border-neutral-200 bg-white p-2.5 shadow-xl hover:bg-neutral-100 focus:outline-hidden dark:border-primary-600 dark:bg-primary-600 dark:hover:bg-primary-700 ${
                  open ? 'ring-primary-500 focus:ring-2' : ''
                }`}
              >
                <CogIcon className="h-8 w-8" />
              </PopoverButton>

              <PopoverPanel
                transition
                className="absolute right-0 z-10 mt-3 w-sm rounded-2xl bg-white custom-shadow-1 transition data-closed:translate-y-1 data-closed:opacity-0 dark:bg-neutral-800"
              >
                <div className="relative p-6">
                  <span className="text-xl font-semibold">Customize</span>
                  <div className="mt-4 w-full border-b border-neutral-200 dark:border-neutral-700"></div>
                  {renderRadioHomePages()}
                  {renderSwitchDarkMode()}
                  {renderRadioDir()}
                </div>
                <div className="rounded-b-2xl bg-gray-50 p-5 dark:bg-white/5">
                  <a
                    className="flex w-full items-center justify-center rounded-xl! bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
                    href={'https://themeforest.net/item/chisfis-online-booking-nextjs-template/43399526'}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ShoppingCartIcon className="h-4 w-4" />
                    <span className="ms-2">Buy this template</span>
                  </a>
                </div>
              </PopoverPanel>
            </>
          )}
        </Popover>
      </div>
    </div>
  )
}

export default CustomizeControl
