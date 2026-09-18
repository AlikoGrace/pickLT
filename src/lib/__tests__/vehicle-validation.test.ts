import { beforeEach, describe, expect, it, vi } from 'vitest'

// `constants.ts` reads these at import time, so they must exist before the
// repo module is loaded — hence the dynamic import below.
process.env.APPWRITE_DATABASE_ID = 'db'
process.env.APPWRITE_COLLECTION_MOVER_PROFILES = 'mover_profiles'
process.env.APPWRITE_COLLECTION_VEHICLES = 'vehicles'
process.env.APPWRITE_COLLECTION_VEHICLE_EVENTS = 'vehicle_events'
process.env.PLATFORM_TZ = 'Europe/Berlin'

const { normalizePlate, validateVehicleInput } = await import('../vehicle-service')
const { uploadedPhotoPermissions, vehiclePermissions } = await import('../doc-permissions')
const repo = await import('../vehicle-repo')
const { confirmVehicleSame, markReconfirmRequired, markReconfirmRequiredForMover, submitVehicle, VehicleRepoError } = repo

type AnyDoc = Record<string, any>

/**
 * In-memory stand-in for the four `Databases` methods the repo uses. Parses
 * the JSON queries node-appwrite emits (`equal`, `notEqual`, `limit`,
 * `orderDesc`) so the duplicate-plate and current-vehicle lookups run for
 * real; everything else is a plain array.
 */
function fakeDb(seed: Record<string, AnyDoc[]>) {
  const store: Record<string, AnyDoc[]> = Object.fromEntries(
    Object.entries(seed).map(([k, v]) => [k, v.map((d) => ({ ...d }))]),
  )
  let seq = 0
  const col = (id: string) => (store[id] ??= [])
  return {
    store,
    async listDocuments(_db: string, collectionId: string, queries: string[] = []) {
      let rows = [...col(collectionId)]
      let limit = 25
      for (const raw of queries) {
        const q = JSON.parse(raw) as { method: string; attribute?: string; values?: unknown[] }
        if (q.method === 'equal') rows = rows.filter((r) => (q.values ?? []).includes(r[q.attribute!]))
        else if (q.method === 'notEqual') rows = rows.filter((r) => !(q.values ?? []).includes(r[q.attribute!]))
        else if (q.method === 'limit') limit = Number(q.values?.[0] ?? limit)
        else if (q.method === 'orderDesc') rows.sort((a, b) => String(b[q.attribute!]).localeCompare(String(a[q.attribute!])))
      }
      rows = rows.slice(0, limit)
      return { total: rows.length, documents: rows }
    },
    async getDocument(_db: string, collectionId: string, id: string) {
      const row = col(collectionId).find((r) => r.$id === id)
      if (!row) throw new Error('Document not found')
      return row
    },
    async createDocument(_db: string, collectionId: string, id: string, data: AnyDoc, permissions?: string[]) {
      const row = { $id: id === 'unique()' || !id ? `${collectionId}_${++seq}` : id, ...data, $permissions: permissions ?? [] }
      col(collectionId).push(row)
      return row
    },
    async updateDocument(_db: string, collectionId: string, id: string, data: AnyDoc) {
      const row = col(collectionId).find((r) => r.$id === id)
      if (!row) throw new Error('Document not found')
      Object.assign(row, data)
      return row
    },
  }
}

const NOW = Date.parse('2026-09-18T12:00:00Z')
const TODAY = '2026-09-18'

const profile = (over: AnyDoc = {}): AnyDoc => ({
  $id: 'prof_1',
  userId: 'user_1',
  verificationStatus: 'verified',
  vehicleOwnership: 'owned',
  vehicleStatus: 'none',
  currentVehicleId: null,
  vehicleBrand: 'Old',
  vehicleRegistration: 'OLD-1',
  ...over,
})

const goodBody = {
  ownership: 'owned',
  registrationNumber: 'b-ab 1234',
  brand: 'Mercedes-Benz',
  model: 'Sprinter',
  year: '2022',
  vehicleType: 'medium_truck',
  capacityM3: '15',
  frontPlatePhoto: 'https://x/front',
  rearPlatePhoto: 'https://x/rear',
  fullVehiclePhoto: 'https://x/full',
  source: 'registration',
}

async function failure(p: Promise<unknown>) {
  try {
    await p
  } catch (e) {
    return e as InstanceType<typeof VehicleRepoError>
  }
  throw new Error('expected rejection')
}

describe('normalizePlate', () => {
  it('upper-cases and keeps [A-Z0-9] only', () => {
    expect(normalizePlate('b-ab 1234')).toBe('BAB1234')
    expect(normalizePlate(' M–XY 12 ')).toBe('MXY12')
    expect(normalizePlate(null)).toBe('')
  })
})

describe('validateVehicleInput — fnCode branches', () => {
  it('accepts a complete owned vehicle', () => {
    expect(validateVehicleInput({ ...goodBody, ownership: 'owned' })).toEqual([])
  })
  it('names every missing thing, in contract order', () => {
    expect(validateVehicleInput({})).toEqual([
      'vehicle.photosRequired',
      'vehicle.plateInvalid',
      'vehicle.fieldsRequired',
      'vehicle.typeInvalid',
    ])
  })
  it('plate needs two alphanumerics after normalisation and ≤32 chars', () => {
    expect(validateVehicleInput({ ...goodBody, ownership: 'owned', registrationNumber: '-' })).toContain('vehicle.plateInvalid')
    expect(validateVehicleInput({ ...goodBody, ownership: 'owned', registrationNumber: 'A'.repeat(33) })).toContain('vehicle.plateInvalid')
    expect(validateVehicleInput({ ...goodBody, ownership: 'owned', registrationNumber: 'A1' })).not.toContain('vehicle.plateInvalid')
  })
  it('capacity and year are optional but must be sane when given', () => {
    expect(validateVehicleInput({ ...goodBody, ownership: 'owned', capacityM3: '' })).toEqual([])
    expect(validateVehicleInput({ ...goodBody, ownership: 'owned', capacityM3: 0 })).toContain('vehicle.capacityOutOfRange')
    expect(validateVehicleInput({ ...goodBody, ownership: 'owned', capacityM3: 121 })).toContain('vehicle.capacityOutOfRange')
    expect(validateVehicleInput({ ...goodBody, ownership: 'owned', year: '' })).toEqual([])
    expect(validateVehicleInput({ ...goodBody, ownership: 'owned', year: '22' })).toContain('vehicle.yearInvalid')
  })
})

describe('upload permissions (master D11)', () => {
  it('vehicle photos are owner-read-only like the licence; the selfie keeps the bucket default', () => {
    expect(uploadedPhotoPermissions('vehicle', 'user_1')).toEqual(['read("user:user_1")'])
    expect(uploadedPhotoPermissions('license', 'user_1')).toEqual(['read("user:user_1")'])
    expect(uploadedPhotoPermissions('selfie', 'user_1')).toBeUndefined()
    expect(vehiclePermissions('user_1')).toEqual(['read("user:user_1")'])
  })
})

describe('submitVehicle', () => {
  it('403 mover.notAMover when the session has no profile', async () => {
    const db = fakeDb({})
    const err = await failure(submitVehicle(db, { userId: 'nobody', body: goodBody, nowMs: NOW }))
    expect(err).toBeInstanceOf(VehicleRepoError)
    expect([err.fnCode, err.status]).toEqual(['mover.notAMover', 403])
  })

  it('400 with the first validation code and the full list', async () => {
    const db = fakeDb({ mover_profiles: [profile()] })
    const err = await failure(submitVehicle(db, { userId: 'user_1', body: { ...goodBody, frontPlatePhoto: '' }, nowMs: NOW }))
    expect([err.fnCode, err.status]).toEqual(['vehicle.photosRequired', 400])
    expect(err.codes).toEqual(['vehicle.photosRequired'])
  })

  it("409 vehicle.plateInUse when another mover's live vehicle has the plate — retired ones do not count", async () => {
    const db = fakeDb({
      mover_profiles: [profile()],
      vehicles: [
        { $id: 'v_other', moverProfileId: 'prof_2', registrationNormalized: 'BAB1234', status: 'verified' },
      ],
    })
    const err = await failure(submitVehicle(db, { userId: 'user_1', body: goodBody, nowMs: NOW }))
    expect([err.fnCode, err.status]).toEqual(['vehicle.plateInUse', 409])

    db.store.vehicles[0].status = 'retired'
    await expect(submitVehicle(db, { userId: 'user_1', body: goodBody, nowMs: NOW })).resolves.toBeTruthy()
  })

  it('first submission: creates the row, the event and points the profile at it — without touching KYC or the snapshot', async () => {
    const db = fakeDb({ mover_profiles: [profile()] })
    const { vehicle, profile: p } = await submitVehicle(db, { userId: 'user_1', body: goodBody, nowMs: NOW })

    expect(vehicle).toMatchObject({
      moverProfileId: 'prof_1',
      ownerUserId: 'user_1',
      ownership: 'owned',
      registrationNumber: 'B-AB 1234',
      registrationNormalized: 'BAB1234',
      brand: 'Mercedes-Benz',
      model: 'Sprinter',
      year: '2022',
      vehicleType: 'medium_truck',
      capacityM3: 15,
      status: 'pending_review',
      isCurrent: true,
      replacesVehicleId: null,
      submittedAt: new Date(NOW).toISOString(),
      $permissions: ['read("user:user_1")'],
    })
    expect(p).toMatchObject({
      vehicleOwnership: 'owned',
      currentVehicleId: vehicle.$id,
      vehicleStatus: 'pending_review',
      vehicleReconfirmRequired: false,
      vehicleConfirmedServiceDate: null,
      // untouched
      verificationStatus: 'verified',
      vehicleBrand: 'Old',
      vehicleRegistration: 'OLD-1',
    })
    expect(db.store.vehicle_events.map((e) => e.action)).toEqual(['submitted'])
    expect(db.store.vehicle_events[0]).toMatchObject({
      vehicleId: vehicle.$id,
      newStatus: 'pending_review',
      source: 'registration',
      serviceDate: TODAY,
      actorId: 'user_1',
      actorRole: 'mover',
      $permissions: ['read("user:user_1")'],
    })
  })

  it('CHANGE from the daily prompt: retires the current vehicle, links the replacement, logs change_requested, clears the confirmation', async () => {
    const db = fakeDb({
      mover_profiles: [
        profile({
          vehicleOwnership: 'rented',
          vehicleStatus: 'verified',
          currentVehicleId: 'v_cur',
          vehicleConfirmedServiceDate: TODAY,
        }),
      ],
      vehicles: [{ $id: 'v_cur', moverProfileId: 'prof_1', registrationNormalized: 'OLD1', status: 'verified', isCurrent: true }],
    })
    const { vehicle, profile: p } = await submitVehicle(db, {
      userId: 'user_1',
      body: { ...goodBody, ownership: 'rented', source: 'login' },
      nowMs: NOW,
    })
    const old = db.store.vehicles.find((v) => v.$id === 'v_cur')!
    expect(old).toMatchObject({ status: 'retired', isCurrent: false, retiredAt: new Date(NOW).toISOString() })
    expect(vehicle).toMatchObject({ ownership: 'rented', replacesVehicleId: 'v_cur', isCurrent: true })
    expect(p).toMatchObject({
      vehicleOwnership: 'rented',
      currentVehicleId: vehicle.$id,
      vehicleStatus: 'pending_review',
      vehicleConfirmedServiceDate: null,
    })
    expect(db.store.vehicle_events.map((e) => e.action)).toEqual(['retired', 'submitted', 'change_requested'])
  })

  it('resubmission: updates the rejected vehicle in place and logs resubmitted', async () => {
    const db = fakeDb({
      mover_profiles: [profile({ vehicleStatus: 'rejected', currentVehicleId: 'v_rej' })],
      vehicles: [
        { $id: 'v_rej', moverProfileId: 'prof_1', registrationNormalized: 'BAB1234', status: 'rejected', rejectionReason: 'blurry', isCurrent: true },
      ],
    })
    const { vehicle } = await submitVehicle(db, {
      userId: 'user_1',
      body: { ...goodBody, source: 'settings', vehicleId: 'v_rej' },
      nowMs: NOW,
    })
    expect(vehicle.$id).toBe('v_rej')
    expect(vehicle).toMatchObject({ status: 'pending_review', rejectionReason: null, isCurrent: true })
    expect(db.store.vehicles).toHaveLength(1)
    expect(db.store.vehicle_events.map((e) => e.action)).toEqual(['resubmitted'])
    expect(db.store.vehicle_events[0]).toMatchObject({ previousStatus: 'rejected', newStatus: 'pending_review' })
  })

  it("resubmission: refuses another mover's vehicle (404) and a verified one (409)", async () => {
    const db = fakeDb({
      mover_profiles: [profile()],
      vehicles: [
        { $id: 'v_theirs', moverProfileId: 'prof_2', registrationNormalized: 'ZZ9', status: 'rejected' },
        { $id: 'v_ok', moverProfileId: 'prof_1', registrationNormalized: 'BAB1234', status: 'verified' },
      ],
    })
    const a = await failure(submitVehicle(db, { userId: 'user_1', body: { ...goodBody, vehicleId: 'v_theirs' }, nowMs: NOW }))
    expect([a.fnCode, a.status]).toEqual(['vehicle.notFound', 404])
    const b = await failure(submitVehicle(db, { userId: 'user_1', body: { ...goodBody, vehicleId: 'v_ok' }, nowMs: NOW }))
    expect([b.fnCode, b.status]).toEqual(['vehicle.notPending', 409])
    const c = await failure(submitVehicle(db, { userId: 'user_1', body: { ...goodBody, vehicleId: 'v_missing' }, nowMs: NOW }))
    expect([c.fnCode, c.status]).toEqual(['vehicle.notFound', 404])
  })
})

describe('confirmVehicleSame', () => {
  it('400 vehicle.notRental for an owned driver', async () => {
    const db = fakeDb({ mover_profiles: [profile({ vehicleStatus: 'verified', currentVehicleId: 'v1' })] })
    const err = await failure(confirmVehicleSame(db, { userId: 'user_1', source: 'login', nowMs: NOW }))
    expect([err.fnCode, err.status]).toEqual(['vehicle.notRental', 400])
  })

  it('409 vehicle.notVerified until the vehicle is approved', async () => {
    const db = fakeDb({ mover_profiles: [profile({ vehicleOwnership: 'rented', vehicleStatus: 'pending_review', currentVehicleId: 'v1' })] })
    const err = await failure(confirmVehicleSame(db, { userId: 'user_1', source: 'login', nowMs: NOW }))
    expect([err.fnCode, err.status]).toEqual(['vehicle.notVerified', 409])
  })

  it("SAME stamps today's service date, clears the flag and logs confirmed_same with the move", async () => {
    const db = fakeDb({
      mover_profiles: [
        profile({ vehicleOwnership: 'rented', vehicleStatus: 'verified', currentVehicleId: 'v1', vehicleReconfirmRequired: true }),
      ],
    })
    const { serviceDate, profile: p } = await confirmVehicleSame(db, {
      userId: 'user_1',
      source: 'post_move',
      moveId: 'move_9',
      note: 'session-abc',
      nowMs: NOW,
    })
    expect(serviceDate).toBe(TODAY)
    expect(p).toMatchObject({
      vehicleConfirmedAt: new Date(NOW).toISOString(),
      vehicleConfirmedServiceDate: TODAY,
      vehicleReconfirmRequired: false,
    })
    expect(db.store.vehicle_events[0]).toMatchObject({
      action: 'confirmed_same',
      source: 'post_move',
      moveId: 'move_9',
      serviceDate: TODAY,
      note: 'session-abc',
      vehicleId: 'v1',
    })
  })

  it('the confirmation is for the platform-zone day, even late at night', async () => {
    const db = fakeDb({ mover_profiles: [profile({ vehicleOwnership: 'rented', vehicleStatus: 'verified', currentVehicleId: 'v1' })] })
    const { serviceDate } = await confirmVehicleSame(db, {
      userId: 'user_1',
      source: 'login',
      nowMs: Date.parse('2026-09-18T22:30:00Z'),
    })
    expect(serviceDate).toBe('2026-09-19')
  })
})

describe('markReconfirmRequired (D12)', () => {
  // Typed on the one field the assertion below needs; the real signature is `writeNotification`'s.
  const notify = vi.fn(async (_params: { userId: string }) => {})
  beforeEach(() => notify.mockClear())

  it('is a no-op for owned drivers', async () => {
    const db = fakeDb({ mover_profiles: [profile({ vehicleStatus: 'verified', currentVehicleId: 'v1' })] })
    const set = await markReconfirmRequired(db, db.store.mover_profiles[0], { moveId: 'm1', handle: 'MV-1', nowMs: NOW, notify })
    expect(set).toBe(false)
    expect(db.store.mover_profiles[0].vehicleReconfirmRequired).toBeUndefined()
    expect(notify).not.toHaveBeenCalled()
  })

  it('rented: sets the flag, logs a system event and writes the confirmation notification', async () => {
    const db = fakeDb({
      mover_profiles: [profile({ vehicleOwnership: 'rented', vehicleStatus: 'verified', currentVehicleId: 'v1' })],
    })
    const set = await markReconfirmRequired(db, db.store.mover_profiles[0], { moveId: 'm1', handle: 'MV-1', nowMs: NOW, notify })
    expect(set).toBe(true)
    expect(db.store.mover_profiles[0].vehicleReconfirmRequired).toBe(true)
    expect(db.store.vehicle_events[0]).toMatchObject({
      action: 'reconfirm_required',
      source: 'system',
      actorRole: 'system',
      moveId: 'm1',
      vehicleId: 'v1',
      serviceDate: TODAY,
    })
    expect(notify).toHaveBeenCalledTimes(1)
    expect(notify.mock.calls[0][0]).toMatchObject({
      userId: 'user_1',
      type: 'vehicle_confirmation_required',
      data: { handle: 'MV-1', moveId: 'm1' },
      i18n: { key: 'vehicle.confirmationRequired' },
    })
  })

  it('rented: a failed event write after the flag landed still reports the flag and still notifies', async () => {
    const db = fakeDb({
      mover_profiles: [profile({ vehicleOwnership: 'rented', vehicleStatus: 'verified', currentVehicleId: 'v1' })],
    })
    db.createDocument = async () => {
      throw new Error('vehicle_events unavailable')
    }
    const set = await markReconfirmRequired(db, db.store.mover_profiles[0], { moveId: 'm1', handle: 'MV-1', nowMs: NOW, notify })
    expect(set).toBe(true)
    expect(db.store.mover_profiles[0].vehicleReconfirmRequired).toBe(true)
    expect(db.store.vehicle_events ?? []).toHaveLength(0)
    expect(notify).toHaveBeenCalledTimes(1)
  })

  it('rented: a failed notification does not throw or undo the flag and the event', async () => {
    const db = fakeDb({
      mover_profiles: [profile({ vehicleOwnership: 'rented', vehicleStatus: 'verified', currentVehicleId: 'v1' })],
    })
    notify.mockRejectedValueOnce(new Error('notifications unavailable'))
    const set = await markReconfirmRequired(db, db.store.mover_profiles[0], { moveId: 'm1', handle: 'MV-1', nowMs: NOW, notify })
    expect(set).toBe(true)
    expect(db.store.mover_profiles[0].vehicleReconfirmRequired).toBe(true)
    expect(db.store.vehicle_events).toHaveLength(1)
  })

  it('rented: a failed flag write is the only failure that reports false — no event, no notification', async () => {
    const db = fakeDb({
      mover_profiles: [profile({ vehicleOwnership: 'rented', vehicleStatus: 'verified', currentVehicleId: 'v1' })],
    })
    db.updateDocument = async () => {
      throw new Error('mover_profiles unavailable')
    }
    const set = await markReconfirmRequired(db, db.store.mover_profiles[0], { moveId: 'm1', handle: 'MV-1', nowMs: NOW, notify })
    expect(set).toBe(false)
    expect(db.store.vehicle_events ?? []).toHaveLength(0)
    expect(notify).not.toHaveBeenCalled()
  })
})

// The client-confirms-second completion path holds only `moves.moverProfileId`.
describe('markReconfirmRequiredForMover (D12, client confirm-payment path)', () => {
  const notify = vi.fn(async (_params: { userId: string }) => {})
  beforeEach(() => notify.mockClear())

  it('rented: loads the profile by id and sets the flag, event and notification', async () => {
    const db = fakeDb({
      mover_profiles: [profile({ vehicleOwnership: 'rented', vehicleStatus: 'verified', currentVehicleId: 'v1' })],
    })
    const set = await markReconfirmRequiredForMover(db, db.store.mover_profiles[0].$id, { moveId: 'm1', handle: 'MV-1', nowMs: NOW, notify })
    expect(set).toBe(true)
    expect(db.store.mover_profiles[0].vehicleReconfirmRequired).toBe(true)
    expect(db.store.vehicle_events[0]).toMatchObject({ action: 'reconfirm_required', moveId: 'm1' })
    expect(notify).toHaveBeenCalledTimes(1)
  })

  it('owned: no-op', async () => {
    const db = fakeDb({ mover_profiles: [profile({ vehicleStatus: 'verified', currentVehicleId: 'v1' })] })
    expect(await markReconfirmRequiredForMover(db, db.store.mover_profiles[0].$id, { moveId: 'm1', nowMs: NOW, notify })).toBe(false)
    expect(notify).not.toHaveBeenCalled()
  })

  it('never throws: no assigned mover, or a profile that cannot be read', async () => {
    const db = fakeDb({ mover_profiles: [] })
    expect(await markReconfirmRequiredForMover(db, null, { moveId: 'm1', nowMs: NOW, notify })).toBe(false)
    expect(await markReconfirmRequiredForMover(db, 'missing', { moveId: 'm1', nowMs: NOW, notify })).toBe(false)
    expect(notify).not.toHaveBeenCalled()
  })
})

describe('reviewer checks and audit note (sub-plan 9)', () => {
  it('hints at unusual plates without rejecting them', () => {
    expect(repo.plateFormatHint('BMV123')).toBe('ok')
    for (const plate of ['123456', 'ABCDEF', 'A1', 'ABCDE1234567']) expect(repo.plateFormatHint(plate)).toBe('unusual')
  })

  it('writes the same checks shape as the submitvehicle function', () => {
    expect(JSON.parse(repo.buildVehicleChecks({ registrationNormalized: 'BMV123', previouslyUsedByDriver: false }))).toEqual({
      v: 1,
      photosPresent: true,
      plateNormalized: 'BMV123',
      plateFormat: 'ok',
      duplicatePlate: false,
      previouslyUsedByDriver: false,
      ocr: null,
    })
  })

  it('prefers the caller note, falls back to the user agent, and respects the column size', () => {
    expect(repo.webAuditNote('device-abc', 'Mozilla/5.0')).toBe('device-abc')
    expect(repo.webAuditNote(undefined, 'Mozilla/5.0')).toBe('web; Mozilla/5.0')
    expect(repo.webAuditNote('', null)).toBe('web')
    expect(repo.webAuditNote(null, 'x'.repeat(900))!.length).toBe(512)
  })
})

describe('withoutPhotoPlaceholders (backfilled rows, D14)', () => {
  it('blanks the backfill sentinel and keeps real URLs', () => {
    const out = repo.withoutPhotoPlaceholders({
      $id: 'veh_1',
      frontPlatePhoto: 'backfill:missing',
      rearPlatePhoto: 'https://cloud.appwrite.io/v1/storage/buckets/b/files/f/view?project=p',
      fullVehiclePhoto: '',
    })
    expect(out).toMatchObject({ frontPlatePhoto: null, fullVehiclePhoto: null })
    expect(out?.rearPlatePhoto).toMatch(/^https:/)
    expect(repo.withoutPhotoPlaceholders(null)).toBeNull()
  })
})
