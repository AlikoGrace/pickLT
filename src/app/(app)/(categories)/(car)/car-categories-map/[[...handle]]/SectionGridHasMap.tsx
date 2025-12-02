'use client'

import CarCardH from '@/components/CarCardH'
import ListingFilterTabs from '@/components/ListingFilterTabs'
import { TCarCategory } from '@/data/categories'
import { getCarListingFilterOptions, TCarListing } from '@/data/listings'
import { Divider } from '@/shared/divider'
import Pagination from '@/shared/Pagination'
import convertNumbThousand from '@/utils/convertNumbThousand'
import clsx from 'clsx'
import { FC, useState } from 'react'
import MapFixedSection from '../../../MapFixedSection'

interface Props {
  className?: string
  listings: TCarListing[]
  category: TCarCategory
  filterOptions: Awaited<ReturnType<typeof getCarListingFilterOptions>>
}

const SectionGridHasMap: FC<Props> = ({ className, listings, category, filterOptions }) => {
  const [currentHoverID, setCurrentHoverID] = useState<string>('')

  return (
    <div className={clsx('relative flex min-h-screen gap-6', className)}>
      <div className="flex w-full flex-1/2 flex-col gap-y-8 pt-8 pb-20">
        <h1 id="heading" className="text-lg font-semibold sm:text-xl">
          Over {convertNumbThousand(category.count)} cars
          {category.handle !== 'all' ? ` in ${category.name}` : null}
        </h1>
        <ListingFilterTabs filterOptions={filterOptions} />
        <Divider />
        <div className="grid grid-cols-1 gap-y-8">
          {listings.map((listing) => (
            <div
              key={listing.id}
              onMouseEnter={() => setCurrentHoverID(listing.id)}
              onMouseLeave={() => setCurrentHoverID('')}
            >
              <CarCardH data={listing} />
            </div>
          ))}
        </div>
        <div className="mt-16 flex items-center">
          <Pagination />
        </div>
      </div>

      <MapFixedSection
        closeButtonHref={`/car-categories/${category.handle}#heading`}
        currentHoverID={currentHoverID}
        listings={listings}
        listingType="Cars"
      />
    </div>
  )
}

export default SectionGridHasMap
