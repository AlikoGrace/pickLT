import { describe, expect, it } from 'vitest'
import {
  RESTRICTED_VEHICLE_STATES,
  serviceDate,
  vehicleServiceReady,
  vehicleServiceState,
  type VehicleProfileFields,
} from '../vehicle-service'

/**
 * Master §5 pinned as a table. `src/lib/vehicle-service.ts` is byte-identical
 * to the mover app's copy and mirrored inline in every gating function, so a
 * change here is a change to who a client can see and who can accept a move.
 */

const TZ = 'Europe/Berlin'
// 2026-09-18 14:00 CEST (UTC+2)
const NOON = Date.parse('2026-09-18T12:00:00Z')
const TODAY = '2026-09-18'

const base: VehicleProfileFields = {
  verificationStatus: 'verified',
  vehicleOwnership: 'owned',
  vehicleStatus: 'verified',
  currentVehicleId: 'veh_1',
  vehicleConfirmedServiceDate: null,
  vehicleReconfirmRequired: false,
}

describe('serviceDate', () => {
  it('is the calendar date in the platform zone, not UTC', () => {
    // 23:59:59 CEST is still the 18th; one second later it is the 19th —
    // while UTC says 21:59 / 22:00 on the 18th for both.
    expect(serviceDate(Date.parse('2026-09-18T21:59:59Z'), TZ)).toBe('2026-09-18')
    expect(serviceDate(Date.parse('2026-09-18T22:00:00Z'), TZ)).toBe('2026-09-19')
  })

  it('handles the winter offset too', () => {
    // CET is UTC+1 in December.
    expect(serviceDate(Date.parse('2026-12-01T22:59:59Z'), TZ)).toBe('2026-12-01')
    expect(serviceDate(Date.parse('2026-12-01T23:00:00Z'), TZ)).toBe('2026-12-02')
  })

  it('falls back to UTC for an unknown zone rather than throwing inside a gate', () => {
    expect(serviceDate(NOON, 'Not/AZone')).toBe('2026-09-18')
  })
})

describe('vehicleServiceReady', () => {
  it('requires driver KYC first — the existing gate is unchanged', () => {
    expect(vehicleServiceReady({ ...base, verificationStatus: 'pending_verification' }, NOON, TZ)).toBe(false)
    expect(vehicleServiceReady(null, NOON, TZ)).toBe(false)
  })

  it('owned: verified current vehicle is enough', () => {
    expect(vehicleServiceReady(base, NOON, TZ)).toBe(true)
    expect(vehicleServiceReady({ ...base, vehicleStatus: 'pending_review' }, NOON, TZ)).toBe(false)
    expect(vehicleServiceReady({ ...base, vehicleStatus: 'none' }, NOON, TZ)).toBe(false)
    expect(vehicleServiceReady({ ...base, currentVehicleId: null }, NOON, TZ)).toBe(false)
  })

  it('a legacy row with none of the columns is not ready', () => {
    expect(vehicleServiceReady({ verificationStatus: 'verified' }, NOON, TZ)).toBe(false)
  })

  it("rented: needs today's SAME confirmation and no pending re-confirmation", () => {
    const rented = { ...base, vehicleOwnership: 'rented' }
    expect(vehicleServiceReady({ ...rented, vehicleConfirmedServiceDate: TODAY }, NOON, TZ)).toBe(true)
    expect(vehicleServiceReady({ ...rented, vehicleConfirmedServiceDate: '2026-09-17' }, NOON, TZ)).toBe(false)
    expect(vehicleServiceReady({ ...rented, vehicleConfirmedServiceDate: null }, NOON, TZ)).toBe(false)
    expect(
      vehicleServiceReady({ ...rented, vehicleConfirmedServiceDate: TODAY, vehicleReconfirmRequired: true }, NOON, TZ),
    ).toBe(false)
  })

  it("rented: yesterday's confirmation expires at midnight in the platform zone", () => {
    const rented = { ...base, vehicleOwnership: 'rented', vehicleConfirmedServiceDate: '2026-09-18' }
    expect(vehicleServiceReady(rented, Date.parse('2026-09-18T21:59:59Z'), TZ)).toBe(true)
    expect(vehicleServiceReady(rented, Date.parse('2026-09-18T22:00:00Z'), TZ)).toBe(false)
  })
})

describe('vehicleServiceState', () => {
  const rows: [string, Partial<VehicleProfileFields>, { replacesVehicleId?: string | null } | null, string][] = [
    ['owned + verified', {}, null, 'OWN_VERIFIED'],
    ['owned + pending', { vehicleStatus: 'pending_review' }, null, 'OWN_VEHICLE_REVIEW'],
    ['owned + none (D10 failure case)', { vehicleStatus: 'none', currentVehicleId: null }, null, 'OWN_PENDING_VEHICLE'],
    ['owned + verified but no pointer', { currentVehicleId: null }, null, 'OWN_PENDING_VEHICLE'],
    ['rejected (owned)', { vehicleStatus: 'rejected' }, null, 'VEHICLE_REJECTED'],
    ['rejected (rented)', { vehicleOwnership: 'rented', vehicleStatus: 'rejected' }, null, 'VEHICLE_REJECTED'],
    ['rented + none', { vehicleOwnership: 'rented', vehicleStatus: 'none', currentVehicleId: null }, null, 'RENTAL_PENDING_VEHICLE'],
    ['rented + first review', { vehicleOwnership: 'rented', vehicleStatus: 'pending_review' }, { replacesVehicleId: null }, 'RENTAL_VEHICLE_REVIEW'],
    ['rented + change review', { vehicleOwnership: 'rented', vehicleStatus: 'pending_review' }, { replacesVehicleId: 'veh_0' }, 'RENTAL_CHANGE_PENDING'],
    ['rented + verified, not confirmed today', { vehicleOwnership: 'rented', vehicleConfirmedServiceDate: '2026-09-17' }, null, 'RENTAL_DAILY_CONFIRMATION_REQUIRED'],
    ['rented + verified, reconfirm after move', { vehicleOwnership: 'rented', vehicleConfirmedServiceDate: TODAY, vehicleReconfirmRequired: true }, null, 'RENTAL_DAILY_CONFIRMATION_REQUIRED'],
    ['rented + verified today', { vehicleOwnership: 'rented', vehicleConfirmedServiceDate: TODAY }, null, 'RENTAL_VERIFIED_TODAY'],
  ]

  it.each(rows)('%s → %s', (_label, overrides, vehicle, expected) => {
    expect(vehicleServiceState({ ...base, ...overrides }, vehicle, NOON, TZ)).toBe(expected)
  })

  it('a null profile is an owned driver with no vehicle', () => {
    expect(vehicleServiceState(null, null, NOON, TZ)).toBe('OWN_PENDING_VEHICLE')
  })

  it('every non-ready state is restricted and every ready state is not', () => {
    for (const [, overrides, vehicle] of rows) {
      const profile = { ...base, ...overrides }
      const state = vehicleServiceState(profile, vehicle, NOON, TZ)
      expect(RESTRICTED_VEHICLE_STATES.has(state)).toBe(!vehicleServiceReady(profile, NOON, TZ))
    }
  })
})
