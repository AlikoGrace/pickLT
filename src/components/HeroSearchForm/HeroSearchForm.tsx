import { Link } from '@/shared/link'
import { ListingType } from '@/type'
import * as Headless from '@headlessui/react'
import {
  Airplane02Icon,
  Car05Icon,
  HotAirBalloonFreeIcons,
  House03Icon,
  RealEstate02Icon,
} from '@hugeicons/core-free-icons'
import { IconSvgElement } from '@hugeicons/react'
import clsx from 'clsx'
import { Fragment } from 'react'
import { ExperiencesSearchForm } from './ExperiencesSearchForm'
import { FlightSearchForm } from './FlightSearchForm'
import { RealEstateHeroSearchForm } from './RealEstateHeroSearchForm'
import { RentalCarSearchForm } from './RentalCarSearchForm'
import { StaySearchForm } from './StaySearchForm'

export const formTabs: {
  name: ListingType
  icon: IconSvgElement
  href: string
  formComponent: React.ComponentType<{ formStyle: 'default' | 'small' }>
}[] = [
  { name: 'Stays', icon: House03Icon, href: '/', formComponent: StaySearchForm },
  { name: 'Cars', icon: Car05Icon, href: '/car', formComponent: RentalCarSearchForm },
  { name: 'Experiences', icon: HotAirBalloonFreeIcons, href: '/experience', formComponent: ExperiencesSearchForm },
  { name: 'RealEstates', icon: RealEstate02Icon, href: '/real-estate', formComponent: RealEstateHeroSearchForm },
  { name: 'Flights', icon: Airplane02Icon, href: '/flight-categories/all', formComponent: FlightSearchForm },
]

const HeroSearchForm = ({ className, initTab = 'Stays' }: { className?: string; initTab: ListingType }) => {
  return (
    <div className={clsx('hero-search-form', className)}>
      <Headless.TabGroup defaultIndex={formTabs.findIndex((tab) => tab.name === initTab)}>
        <Headless.TabList className="ms-3 mb-8 flex sm:gap-x-6 xl:ms-10 xl:gap-x-10">
          {formTabs.map((tab) => {
            return (
              <Headless.Tab
                key={tab.name}
                as={Link}
                href={tab.href}
                className="group/tab flex shrink-0 cursor-pointer items-center text-sm font-medium text-neutral-500 hover:text-neutral-700 focus-visible:outline-hidden data-selected:text-neutral-950 lg:text-base dark:hover:text-neutral-400 dark:data-selected:text-neutral-100"
              >
                <div className="me-1.5 hidden size-2.5 rounded-full bg-neutral-950 group-data-selected/tab:block xl:me-2 dark:bg-neutral-100" />
                <span>{tab.name}</span>
              </Headless.Tab>
            )
          })}
        </Headless.TabList>
      </Headless.TabGroup>
      {formTabs.map((tab) =>
        tab.name === initTab ? (
          <Fragment key={tab.name}>
            <tab.formComponent formStyle={'default'} />
          </Fragment>
        ) : null
      )}
    </div>
  )
}

export default HeroSearchForm
