import BtnLikeIcon from '@/components/BtnLikeIcon'
import GallerySlider from '@/components/GallerySlider'
import SaleOffBadge from '@/components/SaleOffBadge'
import StartRating from '@/components/StartRating'
import { TRealEstateListing } from '@/data/listings'
import { Badge } from '@/shared/Badge'
import clsx from 'clsx'
import Link from 'next/link'
import { FC } from 'react'

interface Props {
  className?: string
  data: TRealEstateListing
}

const PropertyCard: FC<Props> = ({ className = '', data }) => {
  const {
    galleryImgs,
    listingCategory,
    address,
    title,
    handle: listingHandle,
    like,
    saleOff,
    isAds,
    price,
    reviewStart,
    reviewCount,
    bedrooms,
    bathrooms,
    acreage,
    maxGuests,
  } = data

  const listingHref = `/real-estate-listings/${listingHandle}`

  const renderSliderGallery = () => {
    return (
      <div className="relative w-full">
        <GallerySlider ratioClass="aspect-w-4 aspect-h-3" galleryImgs={galleryImgs} href={listingHref} />
        <BtnLikeIcon isLiked={like} className="absolute end-3 top-3 z-1" />
        {saleOff && <SaleOffBadge className="absolute start-3 top-3" />}
      </div>
    )
  }

  const renderContent = () => {
    return (
      <div className={clsx('mt-2 flex flex-col gap-y-2 p-3')}>
        <div className="flex flex-col gap-y-2">
          <div className="flex flex-wrap gap-1 text-sm text-neutral-500 dark:text-neutral-400">
            <span>{bedrooms} beds</span>
            <span>·</span>
            <span>{bathrooms} baths</span>
            <span>·</span>
            <span>{acreage} Sq. Fit</span>
          </div>

          <div className="flex items-center gap-x-2">
            {isAds && <Badge color="green">ADS</Badge>}
            <h2 className={`text-base font-semibold text-neutral-900 capitalize dark:text-white`}>
              <span className="line-clamp-1">{title}</span>
            </h2>
          </div>
          <div className="flex items-center gap-x-1.5 text-sm text-neutral-500 dark:text-neutral-400">{address}</div>
        </div>
        <div className="w-14 border-b border-neutral-100 dark:border-neutral-800"></div>
        <div className="flex items-center justify-between gap-2">
          <div>
            <span className="text-base font-semibold"> {price}</span>
          </div>
          {!!reviewStart && <StartRating reviewCount={reviewCount} point={reviewStart} />}
        </div>
      </div>
    )
  }

  return (
    <div className={`group relative overflow-hidden rounded-xl bg-white dark:bg-neutral-900 ${className}`}>
      {renderSliderGallery()}
      <Link href={listingHref}>{renderContent()}</Link>
    </div>
  )
}

export default PropertyCard
