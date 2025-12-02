import { TStayListing } from '@/data/listings'
import ButtonPrimary from '@/shared/ButtonPrimary'
import T from '@/utils/getT'
import { ArrowRightIcon } from '@heroicons/react/24/solid'
import { FC, ReactNode } from 'react'
import SectionTabHeader from './SectionTabHeader'
import StayCard from './StayCard'
import StayCard2 from './StayCard2'

//
interface SectionGridFeaturePlacesProps {
  stayListings: TStayListing[]
  gridClass?: string
  heading?: ReactNode
  subHeading?: string
  headingIsCenter?: boolean
  cardType?: 'card1' | 'card2'
}

const SectionGridFeaturePlaces: FC<SectionGridFeaturePlacesProps> = ({
  stayListings = [],
  gridClass = '',
  heading = 'Featured places to stay.',
  subHeading = 'Keep calm & travel on',
  cardType = 'card2',
}) => {
  const tabs = ['New York', 'Tokyo', 'Paris', 'London', 'Barcelona']

  let CardName = StayCard
  if (cardType === 'card1') {
    CardName = StayCard
  } else if (cardType === 'card2') {
    CardName = StayCard2
  }

  return (
    <div className="relative">
      <SectionTabHeader tabActive={'New York'} subHeading={subHeading} tabs={tabs} heading={heading} />
      <div
        className={`mt-8 grid gap-x-6 gap-y-8 sm:grid-cols-2 md:gap-x-8 md:gap-y-12 lg:grid-cols-3 xl:grid-cols-4 ${gridClass}`}
      >
        {stayListings.map((stay) => (
          <CardName key={stay.id} data={stay} />
        ))}
      </div>
      <div className="mt-16 flex items-center justify-center">
        <ButtonPrimary href={'/stay-categories/all'}>
          {T['common']['Show me more']}
          <ArrowRightIcon className="h-5 w-5 rtl:rotate-180" />
        </ButtonPrimary>
      </div>
    </div>
  )
}

export default SectionGridFeaturePlaces
