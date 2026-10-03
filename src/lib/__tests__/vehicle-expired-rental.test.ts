import { describe, expect, it } from 'vitest'

import { mayBeExpiredRental, vehicleSummaryLine, withExpiredRental } from '../vehicle-labels'

describe('withExpiredRental (R4 — mirrors the mover app)', () => {
  const cleared = { vehicleOwnership: 'rented', currentVehicleId: null }
  const expiredRow = { ownership: 'rented', expiredAt: '2026-10-03T17:52:10.288Z' }

  it('a cleared profile after an expiry reads RENTAL_EXPIRED, never "add your vehicle"', () => {
    expect(withExpiredRental('RENTAL_PENDING_VEHICLE', cleared, expiredRow)).toBe('RENTAL_EXPIRED')
  })

  it('never had a rental expire: still the onboarding "add your rental vehicle"', () => {
    expect(withExpiredRental('RENTAL_PENDING_VEHICLE', cleared, null)).toBe('RENTAL_PENDING_VEHICLE')
    expect(withExpiredRental('RENTAL_PENDING_VEHICLE', cleared, undefined)).toBe('RENTAL_PENDING_VEHICLE')
  })

  it('a row retired for another reason carries no expiredAt; an owned row never counts', () => {
    expect(withExpiredRental('RENTAL_PENDING_VEHICLE', cleared, { ownership: 'rented', expiredAt: null })).toBe(
      'RENTAL_PENDING_VEHICLE',
    )
    expect(withExpiredRental('RENTAL_PENDING_VEHICLE', cleared, { ...expiredRow, ownership: 'owned' })).toBe(
      'RENTAL_PENDING_VEHICLE',
    )
  })

  it('something in service again, or a new submission under review: the shared state wins', () => {
    expect(withExpiredRental('RENTAL_PENDING_VEHICLE', { ...cleared, currentVehicleId: 'veh_2' }, expiredRow)).toBe(
      'RENTAL_PENDING_VEHICLE',
    )
    expect(withExpiredRental('RENTAL_VEHICLE_REVIEW', cleared, expiredRow)).toBe('RENTAL_VEHICLE_REVIEW')
    expect(withExpiredRental('OWN_VERIFIED', cleared, expiredRow)).toBe('OWN_VERIFIED')
  })
})

describe('mayBeExpiredRental (useVehicleReadiness only reads vehicles when it can matter)', () => {
  it('a cleared profile reading "add vehicle" may be an expired rental', () => {
    expect(mayBeExpiredRental('RENTAL_PENDING_VEHICLE', { currentVehicleId: null })).toBe(true)
  })
  it('anything else, a current vehicle, or no profile: no lookup', () => {
    expect(mayBeExpiredRental('RENTAL_PENDING_VEHICLE', { currentVehicleId: 'veh_1' })).toBe(false)
    expect(mayBeExpiredRental('RENTAL_PENDING_VEHICLE', null)).toBe(false)
    expect(mayBeExpiredRental('OWN_PENDING_VEHICLE', { currentVehicleId: null })).toBe(false)
    expect(mayBeExpiredRental('RENTAL_ACTIVE', { currentVehicleId: null })).toBe(false)
  })
  it('composes with withExpiredRental into "Rent again" for the accept gates', () => {
    const profile = { vehicleOwnership: 'rented' as const, currentVehicleId: null }
    const state = 'RENTAL_PENDING_VEHICLE' as const
    expect(mayBeExpiredRental(state, profile)).toBe(true)
    expect(withExpiredRental(state, profile, { ownership: 'rented', expiredAt: '2026-10-03T00:00:00Z' })).toBe('RENTAL_EXPIRED')
  })
})

describe('vehicleSummaryLine', () => {
  it('joins brand, model and plate', () => {
    expect(vehicleSummaryLine({ brand: 'Ford', model: 'Transit', registrationNumber: 'B-AB 123' })).toBe(
      'Ford Transit · B-AB 123',
    )
  })
  it('drops what is missing; nothing at all is null', () => {
    expect(vehicleSummaryLine({ brand: 'Ford', model: '', registrationNumber: 'B-AB 123' })).toBe('Ford · B-AB 123')
    expect(vehicleSummaryLine({ brand: null, model: null, registrationNumber: null })).toBeNull()
    expect(vehicleSummaryLine(null)).toBeNull()
  })
})
