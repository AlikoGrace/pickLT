import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * `POST /api/moves/create-instant` and `/create-scheduled` — the server basket,
 * totals and tier (inventory parity plan; crew master D2/D5).
 *
 * The client's tier is a floor: the route classifies the basket with the admin
 * thresholds and prices + stores max(client, classified). Client totals are
 * ignored, custom items are normalised, counts over the caps are a 400
 * `inventory.quantityTooHigh`, `extraHelpers` is clamped and billed, and the
 * instant crew gate reads the mover's stored `crewSize`.
 */

vi.hoisted(() => {
  process.env.APPWRITE_DATABASE_ID = 'db'
  process.env.APPWRITE_COLLECTION_USERS = 'users'
  process.env.APPWRITE_COLLECTION_MOVER_PROFILES = 'mover_profiles'
  process.env.APPWRITE_COLLECTION_MOVES = 'moves'
  process.env.APPWRITE_COLLECTION_MOVE_REQUESTS = 'move_requests'
  process.env.APPWRITE_COLLECTION_INVENTORY_CATALOG = 'inventory_catalog'
})

const db = vi.hoisted(() => ({
  listDocuments: vi.fn(),
  getDocument: vi.fn(),
  createDocument: vi.fn(),
}))

vi.mock('@/lib/appwrite-server', () => ({ createAdminClient: () => ({ databases: db }) }))
vi.mock('@/lib/auth-session', () => ({ getSessionUserId: async () => 'user_1' }))
vi.mock('@/lib/i18n-server', () => ({ getTranslations: async () => ({ t: (k: string) => k }) }))
vi.mock('@/lib/mover-gates', () => ({ directAssignmentBlock: () => null }))
vi.mock('@/lib/moveCountry', () => ({ resolveMoveCountry: async () => 'DE' }))
vi.mock('@/lib/notify', () => ({ relId: (v: unknown) => (typeof v === 'string' ? v : null) }))

import type { QuoteBreakdown } from '@/lib/pricingEngine'
import { POST as createInstant } from '../create-instant/route'
import { POST as createScheduled } from '../create-scheduled/route'

const CATALOG = [
  { $id: 'd1', itemId: 'sofa_3seater', name: 'Sofa', category: 'living_room', widthCm: 200, heightCm: 90, depthCm: 90, weightKg: 70, moveClassificationWeight: 12, moveTypeMinimum: 'regular', unitPriceEur: 26.7, requiredCrew: 1 },
  { $id: 'd2', itemId: 'piano', name: 'Piano', category: 'special', widthCm: 150, heightCm: 130, depthCm: 60, weightKg: 200, moveClassificationWeight: 25, moveTypeMinimum: 'premium', unitPriceEur: 41.7, requiredCrew: 2 },
  { $id: 'd3', itemId: 'cardboard_boxes', name: 'Boxes', category: 'boxes', widthCm: 60, heightCm: 40, depthCm: 40, weightKg: 10, moveClassificationWeight: 2, moveTypeMinimum: 'light', unitPriceEur: 2.5, requiredCrew: 1 },
]

let mover: Record<string, unknown>

beforeEach(() => {
  db.listDocuments.mockReset()
  db.getDocument.mockReset()
  db.createDocument.mockReset()
  mover = { $id: 'mp_1', userId: 'auth_mover', vehicleType: 'medium_truck', crewSize: 3 }
  db.listDocuments.mockImplementation(async (_d: string, col: string) => {
    if (col === 'inventory_catalog') return { documents: CATALOG }
    if (col === 'pricing_config') return { documents: [] }
    throw new Error(`unexpected ${col}`)
  })
  db.getDocument.mockImplementation(async (_d: string, col: string) => {
    if (col === 'mover_profiles') return mover
    if (col === 'users') return { countryCode: 'DE' }
    throw new Error(`unexpected ${col}`)
  })
  db.createDocument.mockImplementation(async (_d: string, _c: string, id: string, data: object) => ({ ...data, $id: id }))
})

function req(body: Record<string, unknown>) {
  return { json: async () => body } as unknown as Parameters<typeof createInstant>[0]
}

const moveWrite = () => db.createDocument.mock.calls.find((c) => c[1] === 'moves')?.[3] as Record<string, unknown>

describe.each([
  ['create-instant', createInstant, { moverProfileId: 'mp_1' }],
  ['create-scheduled', createScheduled, {}],
] as const)('%s', (_name, route, extra) => {
  it('a forced light tier with a piano is priced and stored premium; client totals ignored', async () => {
    const res = await route(req({ ...extra, moveType: 'light', inventoryItems: JSON.stringify({ piano: 1 }), totalItemCount: 99, routeDistanceMeters: 10_000 }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toMatchObject({ moveType: 'premium', systemMoveType: 'premium' })
    expect((body.breakdown as QuoteBreakdown).tier).toBe('premium')
    expect(moveWrite()).toMatchObject({ moveType: 'premium', systemMoveType: 'premium', totalItemCount: 1, totalWeightKg: 200, totalVolumeCm3: 1_170_000 })
  })

  it('normalises legacy custom items and counts their quantities', async () => {
    await route(req({
      ...extra,
      moveType: 'regular',
      inventoryItems: { cardboard_boxes: 2, sofa_3seater: 0 },
      customItems: [JSON.stringify({ id: 'w1', name: 'Aquarium', quantity: 2, approxSize: 'XL', approxWeight: '45 kg' }), { id: 'w2', name: 'Lamp', approxSize: '', approxWeight: '' }],
    }))
    const data = moveWrite()
    expect(data.inventoryItems).toBe('{"cardboard_boxes":2}')
    expect(data.customItems).toEqual([
      '{"id":"w1","name":"Aquarium","quantity":2,"approxSize":"extra_large","approxWeight":45}',
      '{"id":"w2","name":"Lamp","quantity":1,"approxSize":"medium","approxWeight":20}',
    ])
    expect(data).toMatchObject({ totalItemCount: 5, totalWeightKg: 130 })
  })

  it('clamps extraHelpers to crew.maxExtraHelpers, bills the line and stores the whole crew', async () => {
    const res = await route(req({ ...extra, moveType: 'regular', inventoryItems: { cardboard_boxes: 2 }, extraHelpers: 8, routeDistanceMeters: 10_000 }))
    const b = (await res.json()).breakdown as QuoteBreakdown
    expect(b.profile.extraHelpers).toBe(3)
    expect(b.lines.extraHelpers).toBe(3 * 24 * b.profile.billableHours)
    expect(moveWrite()).toMatchObject({ extraHelpers: 3, crewSize: String(b.profile.crew + 3) })
  })

  it('rejects counts over the caps with inventory.quantityTooHigh and writes nothing', async () => {
    const res = await route(req({ ...extra, inventoryItems: { piano: 11 } }))
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ fnCode: 'inventory.quantityTooHigh', fnParams: { itemId: 'piano', max: 10 } })
    expect(db.createDocument).not.toHaveBeenCalled()
  })
})

describe('create-instant crew gate reads the stored crewSize', () => {
  it('refuses a mover whose stored crew is below the required crew', async () => {
    mover = { ...mover, crewSize: 1, crew_members: [{ role: 'helper' }, { role: 'helper' }] }
    const res = await createInstant(req({ moverProfileId: 'mp_1', moveType: 'premium', inventoryItems: { piano: 1 } }))
    expect(res.status).toBe(400)
    expect((await res.json()).fnCode).toBe('mover.crewTooSmall')
  })

  it('falls back to driver + active helpers when crewSize is missing', async () => {
    mover = { ...mover, crewSize: null, crew_members: [{ role: 'helper', isActive: true }, { role: 'driver' }] }
    const res = await createInstant(req({ moverProfileId: 'mp_1', moveType: 'premium', inventoryItems: { piano: 1 } }))
    expect(res.status).toBe(200)
  })
})
