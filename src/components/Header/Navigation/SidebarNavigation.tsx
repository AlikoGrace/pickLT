'use client'

import { getCurrencies, getLanguages, TNavigationItem } from '@/data/navigation'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Divider } from '@/shared/divider'
import { Link } from '@/shared/link'
import SocialsList from '@/shared/SocialsList'
import { Disclosure, DisclosureButton, DisclosurePanel, useClose } from '@headlessui/react'
import { ChevronDownIcon } from '@heroicons/react/24/solid'
import { Search01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import clsx from 'clsx'
import Form from 'next/form'
import { useRouter } from 'next/navigation'
import React, { useEffect } from 'react'
import CurrLangDropdown from '../CurrLangDropdown'

interface Props {
  data: TNavigationItem[]
  currencies: Awaited<ReturnType<typeof getCurrencies>>
  languages: Awaited<ReturnType<typeof getLanguages>>
}

const SidebarNavigation: React.FC<Props> = ({ data, currencies, languages }) => {
  const handleClose = useClose()
  const router = useRouter()

  // Prefetch the next step to improve performance
  useEffect(() => {
    router.prefetch('/stay-categories/all')
  }, [router])

  // Handle form submission
  const handleSubmitForm = async (formData: FormData) => {
    const formObject = Object.fromEntries(formData.entries())
    // Handle form submission logic here
    console.log('Form submitted:', formObject)
    const searchQuery = formObject.search as string
    // Close the popover
    handleClose()
    // Redirect to the search page
    router.push('/stay-categories/all' + (searchQuery ? `?q=${encodeURIComponent(searchQuery)}` : ''))
  }

  const _renderMenuChild = (
    item: TNavigationItem,
    itemClass = 'pl-3 text-neutral-900 dark:text-neutral-200 font-medium'
  ) => {
    return (
      <ul className="nav-mobile-sub-menu pb-1 pl-6 text-base">
        {item.children?.map((childMenu, index) => (
          <Disclosure key={index} as="li">
            <Link
              href={childMenu.href || '#'}
              onClick={handleClose}
              className={`mt-0.5 flex rounded-lg pr-4 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 ${itemClass}`}
            >
              <span className={`py-2.5 ${!childMenu.children ? 'block w-full' : ''}`}>{childMenu.name}</span>
              {childMenu.children && (
                <span className="flex grow items-center" onClick={(e) => e.preventDefault()}>
                  <DisclosureButton as="span" className="flex grow justify-end">
                    <ChevronDownIcon className="ml-2 h-4 w-4 text-neutral-500" aria-hidden="true" />
                  </DisclosureButton>
                </span>
              )}
            </Link>
            {childMenu.children && (
              <DisclosurePanel>
                {_renderMenuChild(childMenu, 'pl-3 text-neutral-600 dark:text-neutral-400')}
              </DisclosurePanel>
            )}
          </Disclosure>
        ))}
      </ul>
    )
  }

  const _renderItem = (menu: TNavigationItem, index: number) => {
    return (
      <Disclosure key={index} as="li" className="text-neutral-900 dark:text-white">
        <DisclosureButton className="flex w-full cursor-pointer rounded-lg px-3 text-start text-sm font-medium tracking-wide uppercase hover:bg-neutral-100 dark:hover:bg-neutral-800">
          <Link
            href={menu.href || '#'}
            className={clsx(!menu.children?.length && 'flex-1', 'block py-2.5')}
            onClick={handleClose}
          >
            {menu.name}
          </Link>
          {menu.children?.length && (
            <div className="flex flex-1 justify-end">
              <ChevronDownIcon className="ml-2 h-4 w-4 self-center text-neutral-500" aria-hidden="true" />
            </div>
          )}
        </DisclosureButton>
        {menu.children && <DisclosurePanel>{_renderMenuChild(menu)}</DisclosurePanel>}
      </Disclosure>
    )
  }

  const renderSearchForm = () => {
    return (
      <Form className="flex-1 text-neutral-900 dark:text-neutral-200" action={handleSubmitForm}>
        <div className="flex h-full items-center gap-x-2.5 rounded-xl bg-neutral-50 px-3 py-3 dark:bg-white/5">
          <HugeiconsIcon icon={Search01Icon} size={24} color="currentColor" strokeWidth={1.5} />
          <input
            type="search"
            name="search"
            autoFocus
            autoComplete="off"
            aria-label="Search for articles"
            data-autofocus
            placeholder="Type and press enter"
            className="w-full border-none bg-transparent focus:ring-0 focus:outline-hidden sm:text-sm"
          />
        </div>
        <input type="submit" hidden value="" />
      </Form>
    )
  }

  return (
    <div>
      <span>Discover the most outstanding articles on all topics of life. Write your stories and share them</span>

      <div className="mt-4 flex items-center justify-between">
        <SocialsList itemClass="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-full text-xl" />
      </div>
      <div className="mt-5">{renderSearchForm()}</div>
      <ul className="flex flex-col gap-y-1 px-2 py-6">{data?.map(_renderItem)}</ul>
      <Divider className="mb-6" />

      {/* FOR OUR DEMO */}

      <div className="flex items-center justify-between gap-x-2.5 py-6">
        <ButtonPrimary
          href="https://themeforest.net/item/chisfis-online-booking-nextjs-template/43399526"
          target="_blank"
          rel="noopener noreferrer"
        >
          Buy this template
        </ButtonPrimary>

        <CurrLangDropdown
          currencies={currencies}
          languages={languages}
          panelAnchor={{
            to: 'top end',
            gap: 12,
          }}
          panelClassName="z-10 w-72 p-4!"
        />
      </div>
    </div>
  )
}

export default SidebarNavigation
