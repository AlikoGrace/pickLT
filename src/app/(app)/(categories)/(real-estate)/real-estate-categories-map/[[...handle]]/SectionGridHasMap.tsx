'use client'

import ListingFilterTabs from '@/components/ListingFilterTabs'
import PropertyCardH from '@/components/PropertyCardH'
import { TRealEstateCategory } from '@/data/categories'
import { getRealEstateListingFilterOptions, TRealEstateListing } from '@/data/listings'
import { Divider } from '@/shared/divider'
import Pagination from '@/shared/Pagination'
import convertNumbThousand from '@/utils/convertNumbThousand'
import clsx from 'clsx'
import { FC, useState } from 'react'
import MapFixedSection from '../../../MapFixedSection'

interface Props {
  className?: string
  listings: TRealEstateListing[]
  category: TRealEstateCategory
  filterOptions: Awaited<ReturnType<typeof getRealEstateListingFilterOptions>>
}

const SectionGridHasMap: FC<Props> = ({ className, listings, category, filterOptions }) => {
  const [currentHoverID, setCurrentHoverID] = useState<string>('')

  return (
    <div className={clsx('relative flex min-h-screen gap-6', className)}>
      <div className="flex w-full flex-1/2 flex-col gap-y-8 pt-8 pb-20">
        <h1 id="heading" className="text-lg font-semibold sm:text-xl">
          Over {convertNumbThousand(category.count)} properties
          {category.handle !== 'all' ? ` in ${category.name}` : null}
        </h1>
        <ListingFilterTabs filterOptions={filterOptions} />
        <Divider />
        <div className="grid grid-cols-1 gap-8">
          {listings.map((listing) => (
            <div
              key={listing.id}
              onMouseEnter={() => setCurrentHoverID(listing.id)}
              onMouseLeave={() => setCurrentHoverID('')}
            >
              <PropertyCardH data={listing} />
            </div>
          ))}
        </div>
        <div className="mt-16 flex items-center">
          <Pagination />
        </div>
      </div>

      <MapFixedSection
        closeButtonHref={`/real-estate-categories/${category.handle}#heading`}
        currentHoverID={currentHoverID}
        listings={listings}
        listingType="RealEstates"
      />
    </div>
  )
}

export default SectionGridHasMap
