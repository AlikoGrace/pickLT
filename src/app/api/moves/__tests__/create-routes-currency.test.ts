import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * `POST /api/moves/create-instant` and `/create-scheduled`: the market's
 * currency and item prices (plan `currency/0.master.md` W1).
 *
 * A move is priced, stored and later settled in the currency of its pickup
 * country. The route resolves it from the operator's `supported_countries`,
 * prices catalog items at the market's own price (else the base price times
 * the market's `items.priceFactor`), records the currency on the quote and on
 * the row, and converts nothing. A move in a euro market is byte-identical to
 * one priced without any of this.
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
/** What the test world looks like: the pickup country and whether the market feature has any data. */
const world = vi.hoisted(() => ({ country: 'DE', markets: true }))

vi.mock('@/lib/appwrite-server', () => ({ createAdminClient: () => ({ databases: db }) }))
vi.mock('@/lib/auth-session', () => ({ getSessionUserId: async () => 'user_1' }))
vi.mock('@/lib/i18n-server', () => ({ getTranslations: async () => ({ t: (k: string) => k }) }))
vi.mock('@/lib/mover-gates', () => ({ directAssignmentBlock: () => null }))
vi.mock('@/lib/moveCountry', () => ({
  resolveMoveCountryWithLock: async () => ({ countryCode: world.country, violation: null }),
  scopeLockStatus: () => 400,
}))
vi.mock('@/lib/live-countries-server', () => ({ loadLiveCountries: async () => ['DE', 'PL'] }))
vi.mock('@/lib/notify', () => ({ relId: (v: unknown) => (typeof v === 'string' ? v : null) }))

import { parseBreakdown, type QuoteBreakdown } from '@/lib/pricingEngine'
import { POST as createInstant } from '../create-instant/route'
import { POST as createScheduled } from '../create-scheduled/route'

const BASE_CATALOG = [
  { $id: 'd1', itemId: 'sofa_3seater', name: 'Sofa', category: 'living_room', widthCm: 200, heightCm: 90, depthCm: 90, weightKg: 70, moveClassificationWeight: 12, moveTypeMinimum: 'regular', unitPriceEur: 26.7, requiredCrew: 1 },
  { $id: 'd3', itemId: 'cardboard_boxes', name: 'Boxes', category: 'boxes', widthCm: 60, heightCm: 40, depthCm: 40, weightKg: 10, moveClassificationWeight: 2, moveTypeMinimum: 'light', unitPriceEur: 2.5, requiredCrew: 1 },
]
/** The sofa has its own price in Poland; the boxes do not, so the market's factor applies to them. */
const MARKET_CATALOG = [{ ...BASE_CATALOG[0], unitPrices: JSON.stringify({ PL: 110 }) }, BASE_CATALOG[1]]
const SUPPORTED = JSON.stringify([
  { code: 'DE', live: true, currency: 'EUR' },
  { code: 'PL', live: true, currency: 'PLN', vatRate: 0.23, timeZone: 'Europe/Warsaw' },
])
/** Poland's own rates, in zloty: an item factor and a minimum that cannot bind. */
const PL_RATES = [{ key: 'items.priceFactor', value: 4, country: 'PL' }]

let mover: Record<string, unknown>

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-11-26T10:00:00.000Z'))
  world.country = 'DE'
  world.markets = true
  db.listDocuments.mockReset()
  db.getDocument.mockReset()
  db.createDocument.mockReset()
  mover = { $id: 'mp_1', userId: 'auth_mover', vehicleType: 'medium_truck', crewSize: 3 }
  db.listDocuments.mockImplementation(async (_d: string, col: string) => {
    if (col === 'inventory_catalog') return { documents: world.markets ? MARKET_CATALOG : BASE_CATALOG }
    if (col === 'pricing_config') return { documents: world.markets ? PL_RATES : [] }
    if (col === 'platform_config' && world.markets) return { documents: [{ key: 'supported_countries', value: SUPPORTED }] }
    throw new Error(`unexpected ${col}`)
  })
  db.getDocument.mockImplementation(async (_d: string, col: string) => {
    if (col === 'mover_profiles') return mover
    if (col === 'users') return { countryCode: world.country }
    throw new Error(`unexpected ${col}`)
  })
  db.createDocument.mockImplementation(async (_d: string, _c: string, id: string, data: object) => ({ ...data, $id: id }))
})

afterEach(() => {
  vi.useRealTimers()
})

function req(body: Record<string, unknown>) {
  return { json: async () => body } as unknown as Parameters<typeof createInstant>[0]
}
const moveWrite = () => db.createDocument.mock.calls.find((c) => c[1] === 'moves')?.[3] as Record<string, unknown>
const BODY = { moveType: 'regular', inventoryItems: { sofa_3seater: 1, cardboard_boxes: 4 }, routeDistanceMeters: 10_000, routeDurationSeconds: 1200 }

describe.each([
  ['create-instant', createInstant, { moverProfileId: 'mp_1' }],
  ['create-scheduled', createScheduled, {}],
] as const)('%s in a non-euro market', (_name, route, extra) => {
  it('stores PLN on the row and inside the quote, with the market\'s item prices', async () => {
    world.country = 'PL'
    const res = await route(req({ ...extra, ...BODY }))
    expect(res.status).toBe(200)
    const body = await res.json()
    const b = body.breakdown as QuoteBreakdown
    expect(b.currency).toBe('PLN')
    expect(b.countryCode).toBe('PL')

    const row = moveWrite()
    expect(row.currency).toBe('PLN')
    expect(row.countryCode).toBe('PL')
    expect(parseBreakdown(row.priceBreakdown)?.currency).toBe('PLN')
    expect(row.estimatedPrice).toBe(b.total)

    // The sofa at Poland's own price; the boxes at the base price times Poland's factor.
    const line = (key: string) => b.itemLines.find((l) => l.key === key)
    expect(line('sofa_3seater')).toMatchObject({ qty: 1, unitEur: 110, amountEur: 110 })
    expect(line('cardboard_boxes')).toMatchObject({ qty: 4, unitEur: 10, amountEur: 40 })
    expect(b.lines.items).toBe(150)
  })

  it('a move in Germany is byte-identical to one priced without market currencies', async () => {
    // Today: no market list is readable and no item carries market prices.
    world.markets = false
    const before = await route(req({ ...extra, ...BODY }))
    const rowBefore = moveWrite()
    const bodyBefore = await before.json()
    db.createDocument.mockClear()

    // With the feature's data in place (a PLN market, Polish item prices and factor).
    world.markets = true
    const after = await route(req({ ...extra, ...BODY }))
    const rowAfter = moveWrite()
    const bodyAfter = await after.json()

    expect(rowAfter.currency).toBe('EUR')
    expect(rowAfter.priceBreakdown).toBe(rowBefore.priceBreakdown)
    expect(JSON.stringify(rowAfter)).toBe(JSON.stringify(rowBefore))
    const strip = ({ moveId: _m, moveRequestId: _r, ...rest }: Record<string, unknown>) => rest
    expect(JSON.stringify(strip(bodyAfter))).toBe(JSON.stringify(strip(bodyBefore)))
    // German item prices are the base prices, untouched by Poland's factor.
    const b = bodyAfter.breakdown as QuoteBreakdown
    expect(b.itemLines.find((l) => l.key === 'sofa_3seater')).toMatchObject({ unitEur: 26.7 })
    expect(b.lines.items).toBe(36.7)
  })
})

describe('create-instant travel to pickup keeps the market\'s currency', () => {
  it('the price for the chosen mover, the row and the offer are in PLN', async () => {
    world.country = 'PL'
    // 30 km north of the pickup.
    mover = { ...mover, currentLatitude: 52.23 + 30 / 111.195, currentLongitude: 21.01 }
    const res = await createInstant(req({ moverProfileId: 'mp_1', ...BODY, pickupLatitude: 52.23, pickupLongitude: 21.01 }))
    expect(res.status).toBe(200)
    const b = (await res.json()).breakdown as QuoteBreakdown
    expect(b.lines.approach).toBeGreaterThan(0)
    expect(b.currency).toBe('PLN')
    const row = moveWrite()
    expect(row.currency).toBe('PLN')
    expect(parseBreakdown(row.priceBreakdown)?.currency).toBe('PLN')
    expect(row.estimatedPrice).toBe(b.total)
  })
})
