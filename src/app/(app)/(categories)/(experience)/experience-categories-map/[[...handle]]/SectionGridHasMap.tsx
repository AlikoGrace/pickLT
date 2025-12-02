'use client'

import ExperiencesCard from '@/components/ExperiencesCard'
import ListingFilterTabs from '@/components/ListingFilterTabs'
import { TExperienceCategory } from '@/data/categories'
import { getStayListingFilterOptions, TExperienceListing } from '@/data/listings'
import { Divider } from '@/shared/divider'
import Pagination from '@/shared/Pagination'
import convertNumbThousand from '@/utils/convertNumbThousand'
import clsx from 'clsx'
import { FC, useState } from 'react'
import MapFixedSection from '../../../MapFixedSection'

interface Props {
  className?: string
  listings: TExperienceListing[]
  category: TExperienceCategory
  filterOptions: Awaited<ReturnType<typeof getStayListingFilterOptions>>
}

const SectionGridHasMap: FC<Props> = ({ className, listings, category, filterOptions }) => {
  const [currentHoverID, setCurrentHoverID] = useState<string>('')

  return (
    <div className={clsx('relative flex min-h-screen gap-6', className)}>
      {/* CARDS */}
      <div className="flex w-full flex-1/2 flex-col gap-y-7 pt-8 pb-20">
        <h1 className="text-lg/none font-semibold">
          Over {convertNumbThousand(category.count)} experiences
          {category.handle !== 'all' ? ` in ${category.name}` : null}
        </h1>
        <ListingFilterTabs filterOptions={filterOptions} />
        <Divider />
        <div className="grid grid-cols-1 gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-2 2xl:grid-cols-3 2xl:gap-x-6">
          {listings.map((listing) => (
            <div
              key={listing.id}
              onMouseEnter={() => setCurrentHoverID(listing.id)}
              onMouseLeave={() => setCurrentHoverID('')}
            >
              <ExperiencesCard data={listing} />
            </div>
          ))}
        </div>
        <div className="mt-16 flex items-center">
          <Pagination />
        </div>
      </div>

      <MapFixedSection
        closeButtonHref={`/experience-categories/${category.handle}#heading`}
        currentHoverID={currentHoverID}
        listings={listings}
        listingType="Experiences"
      />
    </div>
  )
}

export default SectionGridHasMap
