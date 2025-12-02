import BtnLikeIcon from '@/components/BtnLikeIcon'
import SaleOffBadge from '@/components/SaleOffBadge'
import StartRating from '@/components/StartRating'
import { TCarListing } from '@/data/listings'
import { Badge } from '@/shared/Badge'
import T from '@/utils/getT'
import { MapPinIcon } from '@heroicons/react/24/outline'
import { HumidityIcon, SeatSelectorIcon, Settings03Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import Image from 'next/image'
import Link from 'next/link'
import { FC } from 'react'

export interface CarCardHProps {
  className?: string
  data: TCarListing
}

const CarCardH: FC<CarCardHProps> = ({ className = '', data }) => {
  const {
    address,
    title,
    like,
    saleOff,
    isAds,
    price,
    reviewStart,
    reviewCount,
    handle: listingHandle,
    featuredImage,
    seats,
    airbags,
    gearshift,
  } = data

  const listingHref = `/car-listings/${listingHandle}`

  const renderSliderGallery = () => {
    return (
      <div className="relative flex w-full shrink-0 items-center justify-center border-e border-neutral-200/80 md:w-72 dark:border-neutral-700">
        <div className="aspect-w-16 w-full aspect-h-9">
          <Image
            fill
            className="object-contain"
            src={featuredImage}
            alt={title}
            sizes="(max-width: 640px) 100vw, 350px"
          />
        </div>
        <BtnLikeIcon
          colorClass="text-white bg-black/20 hover:bg-black/30"
          isLiked={like}
          className="absolute end-3 top-3 z-1"
        />
        {saleOff && <SaleOffBadge className="absolute start-3 top-3" />}
      </div>
    )
  }

  const renderContent = () => {
    return (
      <div className="flex grow flex-col p-3 sm:p-5">
        <div>
          <div className="flex items-center gap-x-2">
            {isAds && <Badge color="green">Ads</Badge>}
            <h2 className="text-xl font-semibold capitalize">
              <span className="line-clamp-1">{title}</span>
            </h2>
          </div>
          <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-neutral-500 dark:text-neutral-400">
            <StartRating reviewCount={reviewCount} point={reviewStart} />
            <span>· </span>
            <div className="flex items-center">
              <span className="hidden text-base sm:inline-block">
                <MapPinIcon className="h-4 w-4" />
              </span>
              <span className="line-clamp-1 sm:ms-2"> {address}</span>
            </div>
          </div>
        </div>

        <div className="my-4 w-14 border-b border-neutral-200/80 dark:border-neutral-700" />

        <div className="flex flex-wrap items-center gap-x-8 gap-y-1">
          {/* --- */}
          <div className="flex items-center gap-x-2">
            <HugeiconsIcon icon={SeatSelectorIcon} size={16} color="currentColor" strokeWidth={1.5} />
            <span className="text-sm text-neutral-500 dark:text-neutral-400">{seats} seats</span>
          </div>
          {/* --- */}
          <div className="flex items-center gap-x-2">
            <HugeiconsIcon icon={Settings03Icon} size={16} color="currentColor" strokeWidth={1.5} />
            <span className="text-sm text-neutral-500 dark:text-neutral-400">{gearshift}</span>
          </div>
          {/* --- */}
          <div className="flex items-center gap-x-2">
            <HugeiconsIcon icon={HumidityIcon} size={16} color="currentColor" strokeWidth={1.5} />
            <span className="text-sm text-neutral-500 dark:text-neutral-400">{airbags} airbags</span>
          </div>
        </div>

        <div className="my-4 w-14 border-b border-neutral-200/80 dark:border-neutral-700" />

        <div className="flex flex-wrap items-end justify-between gap-2">
          <div className="text-sm text-neutral-500 dark:text-neutral-400">2km from airport</div>
          <span className="text-lg font-semibold text-neutral-950 dark:text-neutral-50">
            {price}
            {` `}
            <span className="text-sm font-normal text-neutral-500 dark:text-neutral-400">/{T['common']['day']}</span>
          </span>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border border-neutral-200/80 bg-white dark:border-neutral-700 dark:bg-neutral-900 ${className}`}
    >
      <Link href={listingHref} className="absolute inset-1 z-1"></Link>
      <div className="flex flex-col md:flex-row">
        {renderSliderGallery()}
        {renderContent()}
      </div>
    </div>
  )
}

export default CarCardH
