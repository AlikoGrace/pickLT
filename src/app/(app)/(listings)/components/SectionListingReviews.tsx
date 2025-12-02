import ListingReview from '@/components/ListingReview'
import { TListingReivew } from '@/data/data'
import ButtonCircle from '@/shared/ButtonCircle'
import ButtonSecondary from '@/shared/ButtonSecondary'
import { Divider } from '@/shared/divider'
import Input from '@/shared/Input'
import { ArrowRightIcon, StarIcon } from '@heroicons/react/24/solid'
import clsx from 'clsx'
import { SectionHeading } from './SectionHeading'

interface Props {
  reviewCount: number
  reviewStart: number
  reviews: TListingReivew[]
}

const SectionListingReviews = ({ reviews, reviewCount, reviewStart }: Props) => {
  return (
    <div className="flex flex-col gap-y-6 pt-8 sm:gap-y-8">
      {/* HEADING */}
      <div>
        <SectionHeading>Reviews ({reviewCount} reviews) </SectionHeading>
        <div className="mt-4 flex items-center">
          {[0, 1, 2, 3, 4].map((number) => (
            <StarIcon
              key={number}
              aria-hidden="true"
              className={clsx(reviewStart > number ? 'text-yellow-400' : 'text-gray-200', 'size-6 shrink-0')}
            />
          ))}
        </div>
      </div>

      <Divider className="w-14!" />

      {/* Content */}
      <div className="relative">
        <Input
          sizeClass="h-16 px-6 py-3"
          fontClass="text-base/6"
          rounded="rounded-full"
          placeholder="Share your thoughts ..."
        />
        <div className="absolute end-2 top-1/2 -translate-y-1/2">
          <ButtonCircle className="size-12!">
            <ArrowRightIcon className="h-5 w-5 rtl:rotate-180" />
          </ButtonCircle>
        </div>
      </div>

      {/* comment */}
      <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
        {reviews.map((item, index) => (
          <ListingReview key={index} className="py-7" reivew={item} />
        ))}
        <div className="flex w-full justify-center pt-8">
          <ButtonSecondary>View more 20 reviews</ButtonSecondary>
        </div>
      </div>
    </div>
  )
}

export default SectionListingReviews
