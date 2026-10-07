import { describe, expect, it } from 'vitest'

import { photoBannerStyle, vehicleBannerPhoto } from '../photo-banner'

describe('vehicleBannerPhoto (plan mover/dashboard-photo-banners)', () => {
  it('a rented vehicle, or any rental state, shows the key handover', () => {
    expect(vehicleBannerPhoto('OWN_VEHICLE_REVIEW', 'rented')).toBe('vehicleRental')
    expect(vehicleBannerPhoto('RENTAL_EXPIRED', null)).toBe('vehicleRental')
    expect(vehicleBannerPhoto('RENTAL_ACTIVE', 'owned')).toBe('vehicleRental')
  })
  it('everything else shows the loaded van', () => {
    expect(vehicleBannerPhoto('OWN_VEHICLE_VERIFIED', 'owned')).toBe('vehicleOwned')
    expect(vehicleBannerPhoto('VEHICLE_REJECTED', null)).toBe('vehicleOwned')
    expect(vehicleBannerPhoto(null, undefined)).toBe('vehicleOwned')
  })
  it('the overlay sits over the photo, 55 % of the strip wide and anchored right', () => {
    const s = photoBannerStyle('feePayment')
    expect(s.backgroundImage).toMatch(/^linear-gradient\(.+\), url\(\/images\/banners\/fee-payment\.jpg\)$/)
    expect(s.backgroundSize).toBe('100% 100%, 55% auto')
    expect(s.backgroundPosition).toBe('center, right center')
    expect(s.backgroundColor).toBe('#0A0F19')
  })
})
