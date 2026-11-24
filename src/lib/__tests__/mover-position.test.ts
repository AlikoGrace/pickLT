import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/constants', () => ({
  APPWRITE: {
    DATABASE_ID: 'db',
    COLLECTIONS: { MOVER_PROFILES: 'profiles', MOVES: 'moves', MOVER_LOCATIONS: 'locations' },
  },
  PLATFORM_TZ: 'Europe/Berlin',
}))
vi.mock('node-appwrite', () => ({
  ID: { unique: () => 'new_id' },
  Permission: { read: (r: string) => `read(${r})` },
  Role: { user: (id: string) => `user:${id}` },
  Query: {
    equal: (k: string, v: unknown) => `equal(${k},${String(v)})`,
    limit: (n: number) => `limit(${n})`,
    orderDesc: (k: string) => `orderDesc(${k})`,
  },
  Client: class {},
  Databases: class {},
  Storage: class {},
  Users: class {},
}))

import {
  ON_JOB_ACCEPTED_LEAD_MS,
  coarseCoordinate,
  isOnJob,
  moverMaySharePosition,
  movesOnJob,
  type JobMove,
} from '../mover-position'
import {
  goOnlineBlock,
  recordMoverPosition,
  setMoverOnline,
  wipeMoverPositionIfIdle,
  type PositionDb,
} from '../mover-position-server'

/**
 * Plan `legal/2.privacy-security` P1 to P3 on the web: location is stored and
 * shown only while a mover is online or on a job, and being online is the
 * mover's choice. The `isOnJob` table is the same one the mover app and the
 * functions are tested against.
 */

const NOW = Date.parse('2026-11-24T10:00:00.000Z')
const MIN = 60_000
const DAY = 24 * 60 * MIN
const TZ = 'Europe/Berlin'
const iso = (ms: number) => new Date(ms).toISOString()

const CASES: { name: string; move: JobMove; expected: boolean }[] = [
  { name: 'instant, just accepted', move: { status: 'mover_accepted', moveCategory: 'instant' }, expected: true },
  { name: 'accepted, category unknown (legacy row)', move: { status: 'mover_accepted' }, expected: true },
  { name: 'scheduled, starts in 3 days', move: { status: 'mover_accepted', moveCategory: 'scheduled', moveDate: iso(NOW + 3 * DAY) }, expected: false },
  { name: 'scheduled, starts in 61 minutes', move: { status: 'mover_accepted', moveCategory: 'scheduled', moveDate: iso(NOW + 61 * MIN) }, expected: false },
  { name: 'scheduled, starts in 59 minutes', move: { status: 'mover_accepted', moveCategory: 'scheduled', moveDate: iso(NOW + 59 * MIN) }, expected: true },
  { name: 'scheduled, start already passed', move: { status: 'mover_accepted', moveCategory: 'scheduled', moveDate: iso(NOW - 30 * MIN) }, expected: true },
  { name: 'scheduled, date-only, window 30 minutes away', move: { status: 'mover_accepted', moveCategory: 'scheduled', moveDate: '2026-11-24T00:00:00.000Z', arrivalWindow: '11:30 AM' }, expected: true },
  { name: 'scheduled, date-only, window four hours away', move: { status: 'mover_accepted', moveCategory: 'scheduled', moveDate: '2026-11-24T00:00:00.000Z', arrivalWindow: '03:00 PM' }, expected: false },
  { name: 'scheduled, no readable date', move: { status: 'mover_accepted', moveCategory: 'scheduled', moveDate: 'soon' }, expected: false },
  { name: 'scheduled but en route', move: { status: 'mover_en_route', moveCategory: 'scheduled', moveDate: iso(NOW + 3 * DAY) }, expected: true },
  { name: 'in transit', move: { status: 'in_transit' }, expected: true },
  { name: 'paid, not yet closed', move: { status: 'paid' }, expected: true },
  { name: 'completed', move: { status: 'completed' }, expected: false },
  { name: 'cancelled by the client', move: { status: 'cancelled_by_client' }, expected: false },
  { name: 'assigned, not accepted', move: { status: 'mover_assigned' }, expected: false },
  { name: 'no status', move: {}, expected: false },
]

describe('isOnJob', () => {
  it.each(CASES)('$name', ({ move, expected }) => {
    expect(isOnJob(move, NOW, TZ)).toBe(expected)
  })
  it('uses a 60 minute lead and tolerates a missing move', () => {
    expect(ON_JOB_ACCEPTED_LEAD_MS).toBe(60 * MIN)
    expect(isOnJob(null, NOW)).toBe(false)
  })
})

describe('moverMaySharePosition', () => {
  const nextWeek: JobMove = { status: 'mover_accepted', moveCategory: 'scheduled', moveDate: iso(NOW + 7 * DAY) }
  const inTransit: JobMove = { status: 'in_transit' }
  it('online is enough; offline needs a job', () => {
    expect(moverMaySharePosition({ isOnline: true, liveMoves: [], nowMs: NOW })).toBe(true)
    expect(moverMaySharePosition({ isOnline: false, liveMoves: [], nowMs: NOW })).toBe(false)
    expect(moverMaySharePosition({ isOnline: false, liveMoves: [nextWeek], nowMs: NOW })).toBe(false)
    expect(moverMaySharePosition({ isOnline: false, liveMoves: [nextWeek, inTransit], nowMs: NOW })).toBe(true)
    expect(movesOnJob([nextWeek, inTransit], NOW)).toEqual([inTransit])
  })
})

describe('coarseCoordinate', () => {
  it('rounds to two decimals', () => {
    expect(coarseCoordinate(52.520008)).toBe(52.52)
    expect(coarseCoordinate(13.404954)).toBe(13.4)
  })
})

// ── Server operations ────────────────────────────────────────────────────────

const VERIFIED = {
  $id: 'prof_1',
  verificationStatus: 'verified',
  vehicleStatus: 'verified',
  currentVehicleId: 'veh_1',
  vehicleOwnership: 'owned',
}

function fakeDb(by: Record<string, Record<string, unknown>[]>) {
  const db = {
    listDocuments: vi.fn(async (_db: string, collection: string) => ({ documents: by[collection] ?? [] })),
    getDocument: vi.fn(),
    createDocument: vi.fn(async () => ({ $id: 'loc_new' })),
    updateDocument: vi.fn(async () => ({})),
    deleteDocument: vi.fn(async () => ({})),
  }
  return db as typeof db & PositionDb
}

const ping = { userId: 'mover_auth', latitude: 52.52, longitude: 13.405, nowMs: NOW, tz: TZ }

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('recordMoverPosition', () => {
  it('stores nothing for an offline mover with no job', async () => {
    const db = fakeDb({ profiles: [{ ...VERIFIED, isOnline: false }] })
    await expect(recordMoverPosition(db, ping)).resolves.toEqual({ ok: true, shared: false, reason: 'offline' })
    expect(db.updateDocument).not.toHaveBeenCalled()
    expect(db.createDocument).not.toHaveBeenCalled()
  })

  it('never marks a mover online', async () => {
    const db = fakeDb({ profiles: [{ ...VERIFIED, isOnline: true }], locations: [{ $id: 'loc_1' }] })
    await recordMoverPosition(db, ping)
    for (const call of db.updateDocument.mock.calls as unknown as unknown[][]) {
      expect(call[3]).not.toHaveProperty('isOnline')
    }
    expect(db.updateDocument).toHaveBeenCalledWith(
      'db',
      'profiles',
      'prof_1',
      { currentLatitude: 52.52, currentLongitude: 13.405, locationUpdatedAt: iso(NOW) },
    )
  })

  it('keeps sharing for an offline mover mid-job, readable by that client', async () => {
    const db = fakeDb({
      profiles: [{ ...VERIFIED, isOnline: false }],
      moves: [{ $id: 'm1', status: 'in_transit', clientId: 'client_a' }],
    })
    await expect(recordMoverPosition(db, ping)).resolves.toMatchObject({ shared: true, locationId: 'loc_new' })
    const [, collection, , payload, permissions] = db.createDocument.mock.calls[0] as unknown as [string, string, string, Record<string, unknown>, string[]]
    expect(collection).toBe('locations')
    expect(payload.moveId).toBe('m1')
    expect(permissions).toEqual(['read(user:mover_auth)', 'read(user:client_a)'])
  })

  it('ignores a stated move that is not one of the mover\'s own jobs', async () => {
    const db = fakeDb({
      profiles: [{ ...VERIFIED, isOnline: true }],
      moves: [{ $id: 'm_future', status: 'mover_accepted', moveCategory: 'scheduled', moveDate: iso(NOW + 3 * DAY), clientId: 'client_future' }],
      locations: [{ $id: 'loc_1' }],
    })
    await recordMoverPosition(db, { ...ping, moveId: 'someone_elses_move' })
    const [, , rowId, payload, permissions] = db.updateDocument.mock.calls[0] as unknown as [string, string, string, Record<string, unknown>, string[]]
    expect(rowId).toBe('loc_1')
    expect(payload.moveId).toBeNull()
    // Neither the stranger's client nor next week's client can read the row.
    expect(permissions).toEqual(['read(user:mover_auth)'])
  })

  it('reports a caller with no mover profile', async () => {
    await expect(recordMoverPosition(fakeDb({}), ping)).resolves.toEqual({ ok: false, reason: 'notAMover' })
  })
})

describe('setMoverOnline', () => {
  const input = (isOnline: boolean) => ({ userId: 'mover_auth', isOnline, nowMs: NOW, tz: TZ })

  it('refuses going online when a gate fails, with the function\'s codes', async () => {
    const cases: [Record<string, unknown>, string][] = [
      [{ ...VERIFIED, verificationStatus: 'pending_verification' }, 'mover.notVerified'],
      [{ ...VERIFIED, vehicleStatus: 'none', currentVehicleId: null }, 'mover.vehicleNotReady'],
      [{ ...VERIFIED, feeStanding: 'restricted' }, 'fees.restricted'],
    ]
    for (const [profile, fnCode] of cases) {
      const db = fakeDb({ profiles: [profile] })
      await expect(setMoverOnline(db, input(true))).resolves.toEqual({ ok: false, fnCode, status: 403 })
      expect(db.updateDocument).not.toHaveBeenCalled()
      expect(goOnlineBlock(profile, NOW, TZ)).toBe(fnCode)
    }
  })

  it('goes online without touching the position', async () => {
    const db = fakeDb({ profiles: [{ ...VERIFIED, isOnline: false }], locations: [{ $id: 'loc_1' }] })
    await expect(setMoverOnline(db, input(true))).resolves.toEqual({ ok: true, isOnline: true, positionWiped: false })
    expect(db.updateDocument).toHaveBeenCalledTimes(1)
    expect(db.deleteDocument).not.toHaveBeenCalled()
  })

  it('going offline always succeeds, even restricted, and wipes the position', async () => {
    const db = fakeDb({
      profiles: [{ ...VERIFIED, isOnline: true, feeStanding: 'restricted' }],
      locations: [{ $id: 'loc_1' }],
    })
    await expect(setMoverOnline(db, input(false))).resolves.toEqual({ ok: true, isOnline: false, positionWiped: true })
    expect(db.updateDocument).toHaveBeenCalledWith('db', 'profiles', 'prof_1', { isOnline: false })
    expect(db.updateDocument).toHaveBeenCalledWith('db', 'profiles', 'prof_1', {
      currentLatitude: null,
      currentLongitude: null,
      locationUpdatedAt: null,
    })
    expect(db.deleteDocument).toHaveBeenCalledWith('db', 'locations', 'loc_1')
  })

  it('going offline mid-job keeps the position', async () => {
    const db = fakeDb({
      profiles: [{ ...VERIFIED, isOnline: true }],
      moves: [{ $id: 'm1', status: 'loading' }],
      locations: [{ $id: 'loc_1' }],
    })
    await expect(setMoverOnline(db, input(false))).resolves.toEqual({ ok: true, isOnline: false, positionWiped: false })
    expect(db.deleteDocument).not.toHaveBeenCalled()
  })

  it('reports a caller with no mover profile', async () => {
    await expect(setMoverOnline(fakeDb({}), input(true))).resolves.toEqual({ ok: false, fnCode: 'mover.notAMover', status: 404 })
  })
})

describe('wipeMoverPositionIfIdle', () => {
  it('ignores the move that just ended and never throws', async () => {
    const db = fakeDb({ moves: [{ $id: 'm_done', status: 'paid' }], locations: [{ $id: 'loc_1' }] })
    await expect(
      wipeMoverPositionIfIdle(db, 'prof_1', { isOnline: false, nowMs: NOW, excludeMoveId: 'm_done' }),
    ).resolves.toEqual({ wiped: true, rowsDeleted: 1 })

    db.listDocuments.mockRejectedValue(new Error('boom'))
    await expect(wipeMoverPositionIfIdle(db, 'prof_1', { isOnline: false, nowMs: NOW })).resolves.toEqual({
      wiped: false,
      reason: 'error',
    })
  })
})
