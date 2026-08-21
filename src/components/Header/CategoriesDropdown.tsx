'use client'

import { CloseButton, Popover, PopoverButton, PopoverPanel } from '@headlessui/react'
import { ChevronDownIcon } from '@heroicons/react/24/solid'
import { TruckIcon, UserIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'

// § 7.6 — built from `t` so the captions follow the language switcher.
const getSolutions = (t: TFunction) => [
  {
    name: t('web:nav.signInAsClient.label'),
    description: t('web:nav.signInAsClient.helper'),
    href: '/login?type=client',
    icon: UserIcon,
  },
  {
    name: t('web:nav.signInAsMover.label'),
    description: t('web:nav.signInAsMover.helper'),
    href: '/login?type=mover',
    icon: TruckIcon,
  },
]

export default function DropdownTravelers() {
  const { t } = useTranslation()
  const solutions = getSolutions(t)
  const pathName = usePathname()

  return (
    <Popover className="group">
      <PopoverButton className="-m-2.5 flex items-center p-2.5 text-sm font-medium text-neutral-700 group-hover:text-neutral-950 focus:outline-hidden dark:text-neutral-300 dark:group-hover:text-neutral-100">
        {t('auth:login.submit.cta')}
        <ChevronDownIcon className="ms-1 size-4 group-data-open:rotate-180" aria-hidden="true" />
      </PopoverButton>
      <PopoverPanel
        anchor={{
          to: 'bottom start',
          gap: 16,
        }}
        transition
        className="z-40 w-80 rounded-3xl shadow-lg ring-1 ring-black/5 transition duration-200 ease-in-out data-closed:translate-y-1 data-closed:opacity-0 sm:px-0 dark:ring-white/10"
      >
        <div>
          <div className="relative grid grid-cols-1 gap-7 bg-white p-7 dark:bg-neutral-800">
            {solutions.map((item, index) => {
              const isActive = pathName === item.href
              return (
                <CloseButton
                  as={Link}
                  key={index}
                  href={item.href}
                  className={`focus-visible:ring-opacity-50 -m-3 flex items-center rounded-lg p-2 focus:outline-none focus-visible:ring focus-visible:ring-orange-500 ${
                    isActive ? 'bg-neutral-50 dark:bg-neutral-700' : 'hover:bg-neutral-50 dark:hover:bg-neutral-700'
                  }`}
                >
                  <div className="flex size-10 flex-shrink-0 items-center justify-center rounded-md bg-neutral-50 text-primary-500 sm:h-12 sm:w-12 dark:bg-neutral-700 dark:text-primary-200">
                    <item.icon className="size-7" />
                  </div>
                  <div className="ms-4 space-y-0.5">
                    <p className="text-sm font-medium">{item.name}</p>
                    <p className="line-clamp-1 text-xs text-neutral-500 dark:text-neutral-300">{item.description}</p>
                  </div>
                </CloseButton>
              )
            })}
          </div>
        </div>
      </PopoverPanel>
    </Popover>
  )
}
