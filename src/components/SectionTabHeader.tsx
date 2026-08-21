'use client'

import ButtonSecondary from '@/shared/ButtonSecondary'
import Heading from '@/shared/Heading'
import { Tab, TabGroup, TabList } from '@headlessui/react'
import { ArrowRightIcon } from '@heroicons/react/24/outline'
import { FC, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

/**
 * A tab may be a plain string (caption and identity are the same word) or a
 * {value, label} pair, where only `value` is handed back to `onChangeTab` and
 * so only `value` can be compared or stored. Anything whose caption gets
 * translated must use the pair form — see `src/lib/move-ui-category.ts`.
 */
type TabItem = string | { value: string; label: string }

interface Props {
  tabActive: string
  tabs: readonly TabItem[]
  heading: ReactNode
  subHeading?: string
  onChangeTab?: (item: string) => void
  rightButtonHref?: string
}

function normalizeTab(tab: TabItem): { value: string; label: string } {
  return typeof tab === 'string' ? { value: tab, label: tab } : tab
}

const SectionTabHeader: FC<Props> = ({
  tabActive,
  tabs,
  subHeading,
  heading,
  onChangeTab,
  rightButtonHref = '/account-savelists',
}) => {
  const { t } = useTranslation()
  const items = tabs.map(normalizeTab)

  return (
    <div className="relative flex flex-col">
      <Heading subheading={subHeading}>{heading}</Heading>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="max-w-full grow">
          <TabGroup
            defaultIndex={items.findIndex((t) => t.value === tabActive)}
            onChange={(index) => onChangeTab && onChangeTab(items[index].value)}
            className="hidden-scrollbar relative flex w-full overflow-x-auto text-sm md:text-base"
          >
            <TabList className="flex sm:gap-x-1.5">
              {items.map((item) => (
                <Tab
                  key={item.value}
                  className="block rounded-full px-4 py-2.5 leading-none font-medium whitespace-nowrap focus-within:outline-hidden data-hover:bg-black/5 data-selected:bg-neutral-900 data-selected:text-white sm:px-6 sm:py-3 dark:data-hover:bg-white/5 dark:data-selected:bg-neutral-100 dark:data-selected:text-neutral-900"
                >
                  {item.label}
                </Tab>
              ))}
            </TabList>
          </TabGroup>
        </div>
        <ButtonSecondary className="ml-auto shrink-0" href={rightButtonHref}>
          <span>{t('common:action.viewAll.cta')}</span>
          <ArrowRightIcon className="size-5 rtl:rotate-180" />
        </ButtonSecondary>
      </div>
    </div>
  )
}

export default SectionTabHeader
