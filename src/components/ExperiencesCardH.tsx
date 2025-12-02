import BtnLikeIcon from '@/components/BtnLikeIcon'
import GallerySlider from '@/components/GallerySlider'
import SaleOffBadge from '@/components/SaleOffBadge'
import StartRating from '@/components/StartRating'
import { TExperienceListing } from '@/data/listings'
import Avatar from '@/shared/Avatar'
import { Badge } from '@/shared/Badge'
import T from '@/utils/getT'
import { ClockIcon, MapPinIcon, UsersIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'
import { FC } from 'react'

interface Props {
  className?: string
  data: TExperienceListing
}

const ExperiencesCardH: FC<Props> = ({ className = '', data }) => {
  const {
    galleryImgs,
    address,
    title,
    handle: listingHandle,
    like,
    saleOff,
    isAds,
    price,
    reviewStart,
    reviewCount,
    host: author,
    id,
  } = data

  const listingHref = `/experience-listings/${listingHandle}`

  const renderSliderGallery = () => {
    return (
      <div className="relative w-full shrink-0 overflow-hidden md:w-72">
        <GallerySlider
          ratioClass="aspect-w-12 aspect-h-9 md:aspect-h-11"
          galleryImgs={galleryImgs}
          href={listingHref}
        />
        <BtnLikeIcon isLiked={like} className="absolute end-3 top-3" />
        {saleOff && <SaleOffBadge className="absolute start-3 top-3" />}
      </div>
    )
  }

  const renderContent = () => {
    return (
      <div className="flex grow flex-col p-3 text-start sm:p-5">
        <div className="space-y-2">
          <div className="flex items-center gap-x-2">
            {isAds && <Badge color="green">ADS</Badge>}
            <h2 className="text-lg font-medium capitalize">
              <span className="line-clamp-1">{title}</span>
            </h2>
          </div>
          <div className="flex items-center gap-x-4 text-sm text-neutral-500 dark:text-neutral-400">
            <StartRating reviewCount={reviewCount} point={reviewStart} />
            <span>·</span>
            <div className="flex items-center">
              <span className="hidden text-base sm:inline-block">
                <MapPinIcon className="h-4 w-4" />
              </span>
              <span className="sm:ms-2"> {address}</span>
            </div>
          </div>
        </div>
        <div className="mt-4 hidden text-sm text-neutral-500 sm:block dark:text-neutral-400">
          <span className="line-clamp-2">
            {`Making a cup of coffee in Vietnam is a whole process that you barely
            have free time in the middle. But it's also not a really complicated
            task to start the day with`}
          </span>
        </div>
        <div className="mt-4 flex items-center gap-x-8">
          <div className="flex items-center gap-x-2">
            <ClockIcon className="h-4 w-4" />
            <span className="text-sm text-neutral-500 dark:text-neutral-400">3 hours</span>
          </div>
          <div className="flex items-center gap-x-2">
            <UsersIcon className="h-4 w-4" />
            <span className="text-sm text-neutral-500 dark:text-neutral-400">Up to 6 people</span>
          </div>
        </div>
        <div className="my-4 w-14 border-b border-neutral-100 dark:border-neutral-800"></div>
        <div className="flex items-end justify-between">
          <div className="flex items-center gap-x-3 text-sm text-neutral-700 dark:text-neutral-300">
            <Avatar src={author.avatarUrl} />
            <span className="hidden sm:inline-block">
              <span className="hidden sm:inline">{T['common']['Hosted by']}</span> {author.displayName}
            </span>
          </div>
          <span className="text-base font-semibold text-secondary-700">
            {price}
            {` `}
            <span className="text-sm font-normal text-neutral-500 dark:text-neutral-400">/{T['common']['person']}</span>
          </span>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border border-neutral-200/80 bg-white dark:border-neutral-700 dark:bg-neutral-900 ${className}`}
    >
      <Link href={listingHref} className="absolute inset-0" />
      <div className="md:flex md:flex-row">
        {renderSliderGallery()}
        {renderContent()}
      </div>
    </div>
  )
}

export default ExperiencesCardH
