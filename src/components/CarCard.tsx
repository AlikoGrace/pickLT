import BtnLikeIcon from '@/components/BtnLikeIcon'
import SaleOffBadge from '@/components/SaleOffBadge'
import StartRating from '@/components/StartRating'
import { TCarListing } from '@/data/listings'
import { Badge } from '@/shared/Badge'
import T from '@/utils/getT'
import Image from 'next/image'
import Link from 'next/link'
import { FC } from 'react'

interface CarCardProps {
  className?: string
  data: TCarListing
  size?: 'default' | 'small'
}

const CarCard: FC<CarCardProps> = ({ size = 'default', className = '', data }) => {
  const {
    featuredImage,
    title,
    handle: listingHandle,
    like,
    saleOff,
    isAds,
    price,
    reviewStart,
    reviewCount,
    seats,
    gearshift,
    airbags,
  } = data

  const listingHref = `/car-listings/${listingHandle}`

  const renderSliderGallery = () => {
    return (
      <div className="relative w-full overflow-hidden rounded-2xl">
        <div className="aspect-w-16 aspect-h-9">
          <Image
            fill
            src={featuredImage}
            alt={title}
            sizes="(max-width: 640px) 100vw, 350px"
            className="object-contain"
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
      <div className={size === 'default' ? 'space-y-4 p-5' : 'space-y-2 p-3'}>
        <div className="space-y-2">
          <div className="flex items-center gap-x-2">
            {isAds && <Badge color="green">ADS</Badge>}
            <h2 className={`font-semibold ${size === 'default' ? 'text-xl' : 'text-base'}`}>
              <span className="line-clamp-1">{title}</span>
            </h2>
          </div>
          <div className="flex items-center gap-x-2 text-sm text-neutral-500 dark:text-neutral-400">
            <span>{seats} seats</span>
            <span>-</span>
            <span>{gearshift} </span>
          </div>
        </div>
        <div className="w-14 border-b border-neutral-100 dark:border-neutral-800"></div>
        <div className="flex items-center justify-between">
          <span className="text-base font-semibold">
            {price}
            {` `}
            {size === 'default' && (
              <span className="text-sm font-normal text-neutral-500 dark:text-neutral-400">/{T['common']['day']}</span>
            )}
          </span>
          <StartRating reviewCount={reviewCount} point={reviewStart} />
        </div>
      </div>
    )
  }

  return (
    <div
      className={`group relative overflow-hidden rounded-3xl border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900 ${className}`}
    >
      <Link href={listingHref} className="absolute inset-1 z-1"></Link>
      <div className="flex flex-col">
        {renderSliderGallery()}
        {renderContent()}
      </div>
    </div>
  )
}

export default CarCard
