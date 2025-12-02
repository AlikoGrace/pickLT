import PropertyCardH from '@/components/PropertyCardH'
import { TRealEstateListing } from '@/data/listings'
import ButtonPrimary from '@/shared/ButtonPrimary'
import T from '@/utils/getT'
import { ArrowRightIcon } from '@heroicons/react/24/solid'
import clsx from 'clsx'
import { FC } from 'react'
import SectionTabHeader from './SectionTabHeader'

interface Props {
  listing: TRealEstateListing[]
  heading?: string
  subHeading?: string
  tabs?: string[]
  className?: string
}

const SectionGridFeatureProperty: FC<Props> = ({
  listing,
  heading = 'Find Your Smart Home',
  subHeading = 'Explore the best properties in the world.',
  tabs = ['New York', 'Tokyo', 'Paris', 'London'],
  className,
}) => {
  return (
    <div className={clsx('relative', className)}>
      <SectionTabHeader
        tabActive={'New York'}
        subHeading={subHeading}
        tabs={tabs}
        heading={heading}
        rightButtonHref="/real-estate-categories/all"
      />
      <div className={'mt-8 grid grid-cols-1 gap-x-6 gap-y-7 sm:grid-cols-1 xl:grid-cols-2'}>
        {listing.map((listing) => {
          return <PropertyCardH key={listing.id} className="h-full" data={listing} />
        })}
      </div>
      <div className="mt-16 flex items-center justify-center">
        <ButtonPrimary href={'/real-estate-categories/all'}>
          {T['common']['Show me more']}
          <ArrowRightIcon className="h-5 w-5 rtl:rotate-180" />
        </ButtonPrimary>
      </div>
    </div>
  )
}

export default SectionGridFeatureProperty
