import BtnLikeIcon from '@/components/BtnLikeIcon'
import GallerySlider from '@/components/GallerySlider'
import SaleOffBadge from '@/components/SaleOffBadge'
import StartRating from '@/components/StartRating'
import { TStayListing } from '@/data/listings'
import { Badge } from '@/shared/Badge'
import T from '@/utils/getT'
import { Location06Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import clsx from 'clsx'
import Link from 'next/link'
import { FC } from 'react'

interface StayCard2Props {
  className?: string
  data: TStayListing
  size?: 'default' | 'small'
}

const StayCard2: FC<StayCard2Props> = ({ size = 'default', className = '', data }) => {
  const {
    galleryImgs,
    listingCategory,
    address,
    title,
    bedrooms,
    handle: listingHandle,
    like,
    saleOff,
    isAds,
    price,
    reviewStart,
    reviewCount,
    id,
  } = data

  const listingHref = `/stay-listings/${listingHandle}`

  const renderSliderGallery = () => {
    return (
      <div className="relative w-full">
        <GallerySlider ratioClass="aspect-w-12 aspect-h-11" galleryImgs={galleryImgs} href={listingHref} />
        <BtnLikeIcon isLiked={like} className="absolute end-3 top-3 z-1" />
        {saleOff && <SaleOffBadge className="absolute start-3 top-3" />}
      </div>
    )
  }

  const renderContent = () => {
    return (
      <div className={clsx(size === 'default' ? 'mt-3 gap-y-3' : 'mt-2 gap-y-2', 'flex flex-col')}>
        <div className="flex flex-col gap-y-2">
          <span className="text-sm text-neutral-500 dark:text-neutral-400">
            {listingCategory} · {bedrooms} beds
          </span>
          <div className="flex items-center gap-x-2">
            {isAds && <Badge color="green">ADS</Badge>}
            <h2 className={`text-base font-semibold text-neutral-900 capitalize dark:text-white`}>
              <span className="line-clamp-1">{title}</span>
            </h2>
          </div>
          <div className="flex items-center gap-x-1.5 text-sm text-neutral-500 dark:text-neutral-400">
            {size === 'default' && (
              <HugeiconsIcon
                className="mb-0.5"
                icon={Location06Icon}
                size={16}
                color="currentColor"
                strokeWidth={1.5}
              />
            )}
            <span>{address}</span>
          </div>
        </div>
        <div className="w-14 border-b border-neutral-100 dark:border-neutral-800"></div>
        <div className="flex items-center justify-between gap-2">
          <div>
            <span className="text-base font-semibold"> {price}</span>
            {size === 'default' && (
              <>
                <span className="mx-1 text-sm font-light text-neutral-400 dark:text-neutral-500">/</span>
                <span className="text-sm font-normal text-neutral-500 dark:text-neutral-400">
                  {T['common']['night']}
                </span>
              </>
            )}
          </div>
          {!!reviewStart && <StartRating reviewCount={reviewCount} point={reviewStart} />}
        </div>
      </div>
    )
  }

  return (
    <div className={`group relative ${className}`}>
      {renderSliderGallery()}
      <Link href={listingHref}>{renderContent()}</Link>
    </div>
  )
}

export default StayCard2
