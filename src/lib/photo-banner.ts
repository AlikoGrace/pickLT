import type { CSSProperties } from 'react'

/**
 * The mover dashboard's vehicle and platform-fee strips as photo banners (plan
 * `mover/dashboard-photo-banners.md` in pickltmobile): the photo under a
 * left-to-right dark overlay so the text (left) is white-on-dark in either
 * theme while the subject shows on the right. Twin of the mover app's
 * `components/ui/mover/photo-banner.tsx`.
 */
export const BANNER_PHOTOS = {
  vehicleOwned: '/images/banners/vehicle-owned.jpg',
  vehicleRental: '/images/banners/vehicle-rental.jpg',
  feePayment: '/images/banners/fee-payment.jpg',
} as const

export type BannerPhoto = keyof typeof BANNER_PHOTOS

/** The rental photo for a rented vehicle or any rental state; the owned-van photo otherwise. */
export function vehicleBannerPhoto(state: string | null | undefined, ownership: string | null | undefined): BannerPhoto {
  return ownership === 'rented' || (state ?? '').startsWith('RENTAL_') ? 'vehicleRental' : 'vehicleOwned'
}

/**
 * The strip across the top of the mover pages stays quiet; the banner is the
 * card inside it, at the content's width — tall enough for the photo to read,
 * the state colour on its left edge.
 */
export const BANNER_STRIP = 'border-b border-neutral-200 bg-neutral-50 px-4 py-3 dark:border-neutral-800 dark:bg-neutral-900'
export const BANNER_CARD =
  'mx-auto flex min-h-[120px] max-w-3xl flex-wrap items-center gap-x-3 gap-y-2 overflow-hidden rounded-2xl border-l-4 px-5 py-5 shadow-sm sm:flex-nowrap'

export function photoBannerStyle(photo: BannerPhoto): CSSProperties {
  return {
    backgroundImage: `linear-gradient(90deg, rgba(10,15,25,0.9) 0%, rgba(10,15,25,0.72) 55%, rgba(10,15,25,0.35) 100%), url(${BANNER_PHOTOS[photo]})`,
    backgroundSize: 'cover',
    // Below centre: the subjects (boxes, key, card) sit in the lower half of each photo.
    backgroundPosition: 'right 70%',
  }
}
