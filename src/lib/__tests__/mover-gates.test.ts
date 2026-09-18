import { describe, expect, it } from 'vitest'

import {
  LOCATION_FRESHNESS_MS,
  directAssignmentBlock,
  mayMarkOnline,
  resolveOwnershipWrite,
  startGate,
} from '../mover-gates'

type AnyDoc = Record<string, any>

const TZ = 'Europe/Berlin'
const NOW = Date.parse('2026-09-18T12:00:00Z')
const TODAY = '2026-09-18'

/** A verified, online, freshly located owned driver — passes every gate. */
const mover = (over: AnyDoc = {}): AnyDoc => ({
  $id: 'mp_1',
  userId: 'user_1',
  verificationStatus: 'verified',
  isOnline: true,
  locationUpdatedAt: new Date(NOW - 30_000).toISOString(),
  vehicleOwnership: 'owned',
  vehicleStatus: 'verified',
  currentVehicleId: 'v1',
  ...over,
})

const rentedToday = (over: AnyDoc = {}) =>
  mover({ vehicleOwnership: 'rented', vehicleConfirmedServiceDate: TODAY, vehicleReconfirmRequired: false, ...over })

describe('directAssignmentBlock (create-instant, parity with createpriorityrequest)', () => {
  it('lets a verified, online, fresh, service-ready mover through', () => {
    expect(directAssignmentBlock(mover(), NOW, TZ)).toBeNull()
    expect(directAssignmentBlock(rentedToday(), NOW, TZ)).toBeNull()
  })

  it('rejects an unknown or unverified mover first', () => {
    expect(directAssignmentBlock(null, NOW, TZ)).toBe('mover.notVerified')
    expect(directAssignmentBlock(mover({ verificationStatus: 'pending_verification' }), NOW, TZ)).toBe('mover.notVerified')
  })

  it('rejects an offline mover and a stale or missing location fix', () => {
    expect(directAssignmentBlock(mover({ isOnline: false }), NOW, TZ)).toBe('mover.offline')
    expect(
      directAssignmentBlock(mover({ locationUpdatedAt: new Date(NOW - LOCATION_FRESHNESS_MS - 1).toISOString() }), NOW, TZ),
    ).toBe('mover.offline')
    expect(directAssignmentBlock(mover({ locationUpdatedAt: null }), NOW, TZ)).toBe('mover.offline')
  })

  it('rejects a mover whose vehicle is not service-ready with mover.vehicleNotReady', () => {
    expect(directAssignmentBlock(mover({ vehicleStatus: 'pending_review' }), NOW, TZ)).toBe('mover.vehicleNotReady')
    expect(directAssignmentBlock(mover({ currentVehicleId: null }), NOW, TZ)).toBe('mover.vehicleNotReady')
    // Rental: yesterday's confirmation, and a pending post-move re-confirmation (D12).
    expect(directAssignmentBlock(rentedToday({ vehicleConfirmedServiceDate: '2026-09-17' }), NOW, TZ)).toBe('mover.vehicleNotReady')
    expect(directAssignmentBlock(rentedToday({ vehicleReconfirmRequired: true }), NOW, TZ)).toBe('mover.vehicleNotReady')
  })
})

describe('startGate (update-move-status)', () => {
  it('blocks leaving mover_assigned when the driver is not service-ready', () => {
    const gate = startGate({ status: 'mover_assigned' }, rentedToday({ vehicleReconfirmRequired: true }), NOW, TZ)
    expect(gate).toEqual({ blocked: true, vehicleId: null })
  })

  it('snapshots the current vehicle when leaving mover_assigned with none on the move (D13)', () => {
    expect(startGate({ status: 'mover_assigned', vehicleId: null }, mover(), NOW, TZ)).toEqual({ blocked: false, vehicleId: 'v1' })
  })

  it('keeps a vehicle the assignment already snapshotted', () => {
    expect(startGate({ status: 'mover_assigned', vehicleId: 'v0' }, mover(), NOW, TZ)).toEqual({ blocked: false, vehicleId: null })
  })

  it('never gates a move that is already under way (D4)', () => {
    const notReady = rentedToday({ vehicleReconfirmRequired: true, vehicleStatus: 'rejected' })
    for (const status of [
      'accepted',
      'mover_accepted',
      'mover_en_route',
      'mover_arrived',
      'loading',
      'in_transit',
      'arrived_destination',
      'unloading',
      'awaiting_payment',
    ]) {
      expect(startGate({ status }, notReady, NOW, TZ)).toEqual({ blocked: false, vehicleId: null })
    }
  })
})

describe('mayMarkOnline (update-location heartbeat)', () => {
  it('marks a service-ready driver online', () => {
    expect(mayMarkOnline(mover(), NOW, TZ)).toBe(true)
    expect(mayMarkOnline(rentedToday(), NOW, TZ)).toBe(true)
  })

  it('leaves isOnline alone without KYC or a service-ready vehicle', () => {
    expect(mayMarkOnline(mover({ verificationStatus: 'pending_verification' }), NOW, TZ)).toBe(false)
    expect(mayMarkOnline(mover({ vehicleStatus: 'none', currentVehicleId: null }), NOW, TZ)).toBe(false)
    expect(mayMarkOnline(rentedToday({ vehicleReconfirmRequired: true }), NOW, TZ)).toBe(false)
    expect(mayMarkOnline(rentedToday({ vehicleConfirmedServiceDate: null }), NOW, TZ)).toBe(false)
    expect(mayMarkOnline(null, NOW, TZ)).toBe(false)
  })
})

describe('resolveOwnershipWrite (submit-profile)', () => {
  it("defaults to 'owned' on create only", () => {
    expect(resolveOwnershipWrite(undefined, true)).toEqual({ ok: true, write: 'owned' })
    expect(resolveOwnershipWrite(null, true)).toEqual({ ok: true, write: 'owned' })
  })

  it('leaves the column alone on an update that omits it — a rented driver stays rented', () => {
    expect(resolveOwnershipWrite(undefined, false)).toEqual({ ok: true, write: undefined })
    expect(resolveOwnershipWrite(null, false)).toEqual({ ok: true, write: undefined })
  })

  it('writes a supplied valid value on both paths', () => {
    expect(resolveOwnershipWrite('rented', true)).toEqual({ ok: true, write: 'rented' })
    expect(resolveOwnershipWrite('owned', false)).toEqual({ ok: true, write: 'owned' })
  })

  it('rejects a supplied invalid value on both paths', () => {
    expect(resolveOwnershipWrite('leased', true)).toEqual({ ok: false })
    expect(resolveOwnershipWrite('', false)).toEqual({ ok: false })
    expect(resolveOwnershipWrite(1, false)).toEqual({ ok: false })
  })
})

describe('rented → owned needs admin approval (master D16)', () => {
  it('a vehicle submission never switches a rented profile to owned', async () => {
    const { profileOwnershipOnSubmit } = await import('../mover-gates')
    expect(profileOwnershipOnSubmit('rented', 'owned')).toBe('rented')
    expect(profileOwnershipOnSubmit('owned', 'rented')).toBe('rented')
    expect(profileOwnershipOnSubmit('owned', 'owned')).toBe('owned')
    expect(profileOwnershipOnSubmit(undefined, 'owned')).toBe('owned')
  })

  it('a profile re-submit cannot switch rented → owned, but can still tighten owned → rented', async () => {
    const { resolveOwnershipWrite } = await import('../mover-gates')
    expect(resolveOwnershipWrite('owned', false, 'rented')).toEqual({ ok: true, write: undefined })
    expect(resolveOwnershipWrite('rented', false, 'owned')).toEqual({ ok: true, write: 'rented' })
    expect(resolveOwnershipWrite('owned', false, 'owned')).toEqual({ ok: true, write: 'owned' })
    // Create has no stored value to protect.
    expect(resolveOwnershipWrite('owned', true, undefined)).toEqual({ ok: true, write: 'owned' })
  })
})
