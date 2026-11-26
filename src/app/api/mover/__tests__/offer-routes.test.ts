import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * `POST /api/mover/accept-move` and `POST /api/moves/offer-decision`: the
 * mover's drive to the pickup and the price the client confirms (plan
 * pricing/8, option B). The web ports of `acceptmove` and its `clientDecision`,
 * run against an in-memory database.
 *
 *   same or lower price   assigned at once, at this mover's price
 *   higher price          not assigned; the client is asked; the mover waits
 *   client accepts        assigned at the price shown
 *   client declines       not assigned; the mover is told at once
 *   answer too late       not assigned; the mover is told
 *   old offers / schema   exactly the acceptance the route made before
 */

vi.hoisted(() => {
  process.env.APPWRITE_DATABASE_ID = 'db'
  process.env.APPWRITE_COLLECTION_USERS = 'users'
  process.env.APPWRITE_COLLECTION_MOVER_PROFILES = 'mover_profiles'
  process.env.APPWRITE_COLLECTION_MOVES = 'moves'
  process.env.APPWRITE_COLLECTION_MOVE_REQUESTS = 'move_requests'
  process.env.APPWRITE_COLLECTION_NOTIFICATIONS = 'notifications'
})

type Doc = Record<string, any>

const h = vi.hoisted(() => {
  const store: Record<string, Record<string, any>[]> = {}
  return {
    store,
    session: { userId: 'auth_far' as string | null, profileId: 'p_far' },
    /** Columns the "live schema" does not have yet. */
    missing: new Set<string>(),
    notifications: [] as Record<string, any>[],
  }
})
const { store, session, missing, notifications } = h

const db = vi.hoisted(() => ({
  listDocuments: vi.fn(),
  getDocument: vi.fn(),
  updateDocument: vi.fn(),
  createDocument: vi.fn(),
}))

vi.mock('@/lib/appwrite-server', () => ({ createAdminClient: () => ({ databases: db }) }))
vi.mock('@/lib/auth-session', () => ({ getSessionUserId: async () => h.session.userId }))
vi.mock('@/lib/i18n-server', () => ({ getTranslations: async () => ({ t: (k: string) => k }) }))
vi.mock('@/lib/mover-auth', () => ({
  requireServiceReadyMover: async () => ({
    userId: h.session.userId,
    moverProfile: h.store.mover_profiles.find((p) => p.$id === h.session.profileId),
  }),
  dailyCapRefusal: async () => null,
  isErrorResponse: () => false,
}))
vi.mock('@/lib/mover-vetting', () => ({ acceptedServiceDateFor: () => '2026-11-26' }))
vi.mock('@/lib/notify', () => ({
  relId: (v: unknown) => (typeof v === 'string' ? v : v && typeof v === 'object' ? ((v as Doc).$id ?? null) : null),
  writeNotification: async (n: Doc) => {
    h.notifications.push(n)
  },
}))

import { POST as acceptMove } from '../accept-move/route'
import { POST as offerDecision } from '../../moves/offer-decision/route'
import { offerColumns, priceOfferForMover } from '@/lib/offer-pricing-server'
import { parsePendingOffer } from '@/lib/pending-offer'
import { parseBreakdown, quoteMove, serializeBreakdown, type QuoteInput } from '@/lib/pricingEngine'

const INPUT: QuoteInput = {
  tier: 'light',
  mode: 'instant',
  distanceKm: 20,
  durationSeconds: 3600,
  basket: { counts: {}, customItems: [] },
  catalog: [],
  vehicleType: 'small_van',
}
const quoteAt = (km: number) => quoteMove({ ...INPUT, approachKm: km }, null)

const move = () => store.moves[0]
const request = (id: string) => store.move_requests.find((r) => r.$id === id)!

/** A move the client booked with a mover `pricedForKm` away. */
function seed(pricedForKm: number) {
  for (const k of Object.keys(store)) delete store[k]
  missing.clear()
  notifications.length = 0
  const quote = quoteAt(pricedForKm)
  store.moves = [{
    $id: 'move_1', handle: 'IM-1', clientId: 'client_1', status: 'mover_assigned', moveCategory: 'instant', countryCode: 'DE',
    moverProfileId: null, estimatedPrice: quote.total, priceBreakdown: serializeBreakdown(quote),
    approachM: pricedForKm * 1000, pendingOffer: null,
  }]
  store.mover_profiles = ['near', 'mid', 'far'].map((id) => ({ $id: `p_${id}`, userId: `auth_${id}`, currentVehicleId: `veh_${id}` }))
  store.users = ['near', 'mid', 'far'].map((id) => ({ $id: `auth_${id}`, fullName: `Mover ${id}` }))
  store.move_requests = []
  store.pricing_config = []
  return quote
}

/** An offer row for a mover, priced as the functions price it. */
function offerRow(id: string, moverId: string, km: number, extra: Doc = {}) {
  const offer = priceOfferForMover({ move: move(), config: null, approachM: km * 1000 })
  const row = { $id: id, moveId: 'move_1', moverProfileId: `p_${moverId}`, status: 'pending', ...offerColumns(offer), ...extra }
  store.move_requests.push(row)
  return row
}

function as(moverId: string) {
  session.userId = `auth_${moverId}`
  session.profileId = `p_${moverId}`
}

const post = (route: typeof acceptMove, body: Doc) =>
  route({ json: async () => body } as unknown as Parameters<typeof acceptMove>[0])

beforeEach(() => {
  db.listDocuments.mockReset().mockImplementation(async (_d: string, col: string, queries: unknown[] = []) => {
    let rows = [...(store[col] ?? [])]
    // node-appwrite queries are JSON strings: {"method":"equal","attribute":"status","values":[…]}
    for (const q of queries) {
      const parsed = typeof q === 'string' ? JSON.parse(q) : null
      if (parsed?.method === 'equal') rows = rows.filter((r) => parsed.values.flat().includes(r[parsed.attribute]))
    }
    return { documents: rows, total: rows.length }
  })
  db.getDocument.mockReset().mockImplementation(async (_d: string, col: string, id: string) => {
    const row = (store[col] ?? []).find((r) => r.$id === id)
    if (!row) throw new Error('Document with the requested ID could not be found.')
    return row
  })
  db.updateDocument.mockReset().mockImplementation(async (_d: string, col: string, id: string, data: Doc) => {
    const row = (store[col] ?? []).find((r) => r.$id === id)
    if (!row) throw new Error('Document with the requested ID could not be found.')
    const bad = Object.keys(data ?? {}).find((k) => missing.has(k))
    if (bad) throw new Error(`Invalid document structure: Unknown attribute: "${bad}"`)
    Object.assign(row, data)
    return row
  })
})

describe('accept-move: the price for this mover', () => {
  it('assigns a nearer mover at once and the client pays the lower price', async () => {
    const agreed = seed(20)
    offerRow('r_near', 'near', 1)
    as('near')
    const res = await post(acceptMove, { requestId: 'r_near', moveId: 'move_1' })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toMatchObject({ ok: true, success: true, moveId: 'move_1' })
    expect(body.awaitingClient).toBeUndefined()
    const expected = quoteAt(1)
    expect(expected.total).toBeLessThan(agreed.total)
    expect(move()).toMatchObject({ moverProfileId: 'p_near', status: 'mover_accepted', estimatedPrice: expected.total, approachM: 1000, pendingOffer: null })
    expect(parseBreakdown(move().priceBreakdown)?.total).toBe(expected.total)
    expect(request('r_near').status).toBe('accepted')
    // The client hears the ordinary "accepted", not a price prompt.
    expect(notifications.map((n) => n.i18n?.key)).toEqual(['status.moverAccepted'])
  })

  it('assigns the chosen mover at the price the client agreed to', async () => {
    const agreed = seed(20)
    offerRow('r_mid', 'mid', 20)
    as('mid')
    const res = await post(acceptMove, { requestId: 'r_mid', moveId: 'move_1' })
    expect((await res.json()).awaitingClient).toBeUndefined()
    expect(move()).toMatchObject({ moverProfileId: 'p_mid', status: 'mover_accepted', estimatedPrice: agreed.total })
  })

  it('does not assign a farther mover: the client is asked and the mover waits', async () => {
    const agreed = seed(1)
    offerRow('r_far', 'far', 40)
    offerRow('r_other', 'mid', 10)
    as('far')
    const before = Date.now()
    const res = await post(acceptMove, { requestId: 'r_far', moveId: 'move_1' })
    expect(res.status).toBe(200)
    const body = await res.json()
    const expected = quoteAt(40)
    expect(expected.total).toBeGreaterThan(agreed.total)
    expect(body).toMatchObject({ ok: true, awaitingClient: true, total: expected.total, moveId: 'move_1', handle: 'IM-1' })
    expect(Date.parse(body.expiresAt) - before).toBeGreaterThanOrEqual(180_000)
    expect(Date.parse(body.expiresAt) - before).toBeLessThan(185_000)

    // Nothing is assigned and the price is untouched.
    expect(move()).toMatchObject({ moverProfileId: null, status: 'mover_assigned', estimatedPrice: agreed.total })
    expect(request('r_far').status).toBe('awaiting_client')
    // Other movers' offers stay open: a cheaper one can still take the move.
    expect(request('r_other').status).toBe('pending')
    expect(parsePendingOffer(move().pendingOffer)).toMatchObject({
      requestId: 'r_far', moverProfileId: 'p_far', moverName: 'Mover far', total: expected.total, previousTotal: agreed.total, approachM: 40_000,
      expiresAt: body.expiresAt,
    })
    expect(notifications).toHaveLength(1)
    expect(notifications[0]).toMatchObject({
      userId: 'client_1',
      data: { moveId: 'move_1', handle: 'IM-1' },
      i18n: { key: 'offer.priceConfirm', params: { amount: expected.total.toFixed(2), previousAmount: agreed.total.toFixed(2), currency: 'EUR' } },
    })
  })

  it('refuses a second higher price while one is with the client', async () => {
    seed(1)
    offerRow('r_far', 'far', 40)
    offerRow('r_mid', 'mid', 10)
    as('far')
    await post(acceptMove, { requestId: 'r_far', moveId: 'move_1' })
    as('mid')
    const res = await post(acceptMove, { requestId: 'r_mid', moveId: 'move_1' })
    expect(res.status).toBe(409)
    expect(await res.json()).toMatchObject({ ok: false, alreadyTaken: true, reason: 'awaiting_other_offer' })
    expect(request('r_mid').status).toBe('pending')
    expect(parsePendingOffer(move().pendingOffer)?.requestId).toBe('r_far')
  })

  it('lets a mover at the agreed price take the move while a higher price is with the client', async () => {
    const agreed = seed(10)
    offerRow('r_far', 'far', 40)
    offerRow('r_near', 'near', 2)
    as('far')
    await post(acceptMove, { requestId: 'r_far', moveId: 'move_1' })
    as('near')
    const res = await post(acceptMove, { requestId: 'r_near', moveId: 'move_1' })
    expect(res.status).toBe(200)
    expect(move()).toMatchObject({ moverProfileId: 'p_near', status: 'mover_accepted', pendingOffer: null })
    expect(move().estimatedPrice).toBeLessThanOrEqual(agreed.total)
    // The waiting mover's offer is closed, not left hanging.
    expect(request('r_far').status).toBe('expired')
  })

  it('accepts an offer without a price exactly as before the feature', async () => {
    const agreed = seed(1)
    store.move_requests.push({ $id: 'r_old', moveId: 'move_1', moverProfileId: 'p_far', status: 'pending' })
    store.move_requests.push({ $id: 'r_other', moveId: 'move_1', moverProfileId: 'p_mid', status: 'pending' })
    as('far')
    const res = await post(acceptMove, { requestId: 'r_old', moveId: 'move_1' })
    expect(res.status).toBe(200)
    expect(move()).toMatchObject({ moverProfileId: 'p_far', status: 'mover_accepted', estimatedPrice: agreed.total, priceBreakdown: serializeBreakdown(agreed) })
    expect(request('r_other').status).toBe('declined')
  })

  it('still assigns when the schema has no columns for the feature', async () => {
    seed(20)
    offerRow('r_near', 'near', 1)
    missing.add('approachM').add('pendingOffer')
    as('near')
    const res = await post(acceptMove, { requestId: 'r_near', moveId: 'move_1' })
    expect(res.status).toBe(200)
    expect(move()).toMatchObject({ moverProfileId: 'p_near', status: 'mover_accepted', estimatedPrice: quoteAt(1).total })
  })

  it('keeps the existing gates: someone else\'s request, a mismatched move, a taken move', async () => {
    seed(1)
    offerRow('r_far', 'far', 40)
    as('mid')
    expect((await post(acceptMove, { requestId: 'r_far', moveId: 'move_1' })).status).toBe(403)
    as('far')
    expect((await post(acceptMove, { requestId: 'r_far', moveId: 'move_2' })).status).toBe(403)
    move().moverProfileId = 'p_near'
    expect((await post(acceptMove, { requestId: 'r_far', moveId: 'move_1' })).status).toBe(409)
    expect(request('r_far').status).toBe('pending')
    expect(move().pendingOffer).toBeNull()
  })
})

describe('offer-decision: the client answers', () => {
  /** A farther mover accepted; the prompt is with the client. */
  async function prompt() {
    const agreed = seed(1)
    offerRow('r_far', 'far', 40)
    offerRow('r_other', 'mid', 10)
    as('far')
    await post(acceptMove, { requestId: 'r_far', moveId: 'move_1' })
    notifications.length = 0
    session.userId = 'client_1'
    return agreed
  }

  it('accept assigns the mover at the price shown', async () => {
    await prompt()
    const res = await post(offerDecision, { moveId: 'move_1', decision: 'accept' })
    expect(res.status).toBe(200)
    const expected = quoteAt(40)
    expect(await res.json()).toMatchObject({ ok: true, action: 'clientAccept', moveId: 'move_1', handle: 'IM-1', total: expected.total })
    expect(move()).toMatchObject({ moverProfileId: 'p_far', status: 'mover_accepted', vehicleId: 'veh_far', estimatedPrice: expected.total, approachM: 40_000, pendingOffer: null })
    expect(request('r_far').status).toBe('accepted')
    expect(request('r_other').status).toBe('declined')
  })

  it('decline leaves the move unassigned at the agreed price and tells the mover at once', async () => {
    const agreed = await prompt()
    const res = await post(offerDecision, { moveId: 'move_1', decision: 'decline' })
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ ok: true, action: 'clientDecline' })
    expect(move()).toMatchObject({ moverProfileId: null, status: 'mover_assigned', estimatedPrice: agreed.total, pendingOffer: null })
    expect(request('r_far').status).toBe('cancelled')
    expect(request('r_other').status).toBe('pending')
    expect(notifications).toHaveLength(1)
    expect(notifications[0]).toMatchObject({
      userId: 'auth_far',
      data: { moveId: 'move_1', requestId: 'r_far' },
      i18n: { key: 'offer.clientDeclined', params: { handle: 'IM-1' } },
    })
  })

  it('an answer after the deadline is refused and the mover is told', async () => {
    const agreed = await prompt()
    const late = { ...JSON.parse(move().pendingOffer), expiresAt: new Date(Date.now() - 1000).toISOString() }
    move().pendingOffer = JSON.stringify(late)
    const res = await post(offerDecision, { moveId: 'move_1', decision: 'accept' })
    expect(res.status).toBe(409)
    expect(await res.json()).toMatchObject({ ok: false, fnCode: 'offer.expired', error: 'errors:offer.expired' })
    expect(move()).toMatchObject({ moverProfileId: null, estimatedPrice: agreed.total, pendingOffer: null })
    expect(request('r_far').status).toBe('expired')
    expect(notifications.map((n) => [n.userId, n.i18n.key])).toEqual([['auth_far', 'offer.clientNoAnswer']])
  })

  it('never charges more than the price the client was shown', async () => {
    const agreed = await prompt()
    // The prompt showed less than the offer costs now (the rates moved).
    move().pendingOffer = JSON.stringify({ ...JSON.parse(move().pendingOffer), total: agreed.total + 0.01 })
    const res = await post(offerDecision, { moveId: 'move_1', decision: 'accept' })
    expect(res.status).toBe(409)
    expect((await res.json()).fnCode).toBe('offer.expired')
    expect(move()).toMatchObject({ moverProfileId: null, estimatedPrice: agreed.total })
    expect(request('r_far').status).toBe('expired')
  })

  it('refuses when the move went to someone else in the meantime', async () => {
    await prompt()
    move().moverProfileId = 'p_near'
    move().status = 'mover_accepted'
    const res = await post(offerDecision, { moveId: 'move_1', decision: 'accept' })
    expect(res.status).toBe(409)
    expect((await res.json()).fnCode).toBe('offer.notPending')
    expect(move().moverProfileId).toBe('p_near')
    expect(request('r_far').status).toBe('expired')
  })

  it('409 offer.notPending without a prompt, or when the sweeper already closed it', async () => {
    seed(1)
    session.userId = 'client_1'
    let res = await post(offerDecision, { moveId: 'move_1', decision: 'accept' })
    expect(res.status).toBe(409)
    expect((await res.json()).fnCode).toBe('offer.notPending')

    await prompt()
    request('r_far').status = 'expired'
    res = await post(offerDecision, { moveId: 'move_1', decision: 'accept' })
    expect(res.status).toBe(409)
    expect((await res.json()).fnCode).toBe('offer.notPending')
    expect(move()).toMatchObject({ moverProfileId: null, pendingOffer: null })
    expect(notifications).toHaveLength(0)
  })

  it('only the client of the move may answer; the body is validated', async () => {
    await prompt()
    session.userId = 'auth_far'
    expect((await post(offerDecision, { moveId: 'move_1', decision: 'accept' })).status).toBe(403)
    session.userId = null
    expect((await post(offerDecision, { moveId: 'move_1', decision: 'accept' })).status).toBe(401)
    session.userId = 'client_1'
    expect((await post(offerDecision, { moveId: 'move_1', decision: 'maybe' })).status).toBe(400)
    expect((await post(offerDecision, { decision: 'accept' })).status).toBe(400)
    expect(request('r_far').status).toBe('awaiting_client')
  })
})
