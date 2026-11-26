import { describe, expect, it, vi } from 'vitest'

/**
 * The price of an instant move for one mover, and the offer that waits for the
 * client (plan pricing/8, option B): the web port of the functions'
 * `offer-pricing.js` and the server half of `pending-offer.js`.
 */

vi.hoisted(() => {
  process.env.APPWRITE_DATABASE_ID = 'db'
  process.env.APPWRITE_COLLECTION_MOVES = 'moves'
  process.env.APPWRITE_COLLECTION_MOVE_REQUESTS = 'move_requests'
})
vi.mock('@/lib/appwrite-server', () => ({ createAdminClient: () => ({ databases: {} }) }))

import {
  approachMetres,
  assignMoveToMover,
  buildPendingOffer,
  isUnknownAttributeError,
  movePriceColumns,
  offerColumns,
  offerNeedsClientConfirmation,
  pendingOfferExpired,
  priceOfferForMover,
} from '../offer-pricing-server'
import { CLIENT_CONFIRM_SECONDS, openPendingOffer, parsePendingOffer } from '../pending-offer'
import { parseBreakdown, quoteMove, serializeBreakdown, type QuoteInput } from '../pricingEngine'

const BERLIN = { pickupLatitude: 52.52, pickupLongitude: 13.405 }
/** A point `km` north of the pickup. */
const north = (km: number) => ({ currentLatitude: 52.52 + km / 111.195, currentLongitude: 13.405 })

const INPUT: QuoteInput = {
  tier: 'light',
  mode: 'instant',
  distanceKm: 20,
  durationSeconds: 3600,
  basket: { counts: {}, customItems: [] },
  catalog: [],
  vehicleType: 'small_van',
}

/** A stored instant move priced for a mover `km` away (0 = priced without a mover). */
function storedMove(km = 0) {
  const quote = quoteMove(km > 0 ? { ...INPUT, approachKm: km } : INPUT, null)
  return {
    quote,
    move: { moveCategory: 'instant', estimatedPrice: quote.total, priceBreakdown: serializeBreakdown(quote), ...BERLIN },
  }
}

describe('approachMetres', () => {
  it('measures the straight line from the mover to the pickup in whole metres', () => {
    const m = approachMetres(BERLIN, north(20))
    expect(m).not.toBeNull()
    expect(Math.abs((m as number) - 20_000)).toBeLessThanOrEqual(2)
    expect(Number.isInteger(m)).toBe(true)
  })

  it('is null when a position is missing, empty or the 0,0 placeholder', () => {
    expect(approachMetres(BERLIN, {})).toBeNull()
    expect(approachMetres(BERLIN, { currentLatitude: null, currentLongitude: 13 })).toBeNull()
    expect(approachMetres(BERLIN, { currentLatitude: '', currentLongitude: '' })).toBeNull()
    expect(approachMetres(BERLIN, { currentLatitude: 0, currentLongitude: 0 })).toBeNull()
    expect(approachMetres({}, north(5))).toBeNull()
    expect(approachMetres(null, null)).toBeNull()
  })
})

describe('priceOfferForMover', () => {
  it('equals a fresh quote with that approach distance', () => {
    const { move } = storedMove()
    for (const km of [0, 3, 12.345, 20, 40, 200]) {
      const offer = priceOfferForMover({ move, config: null, approachM: Math.round(km * 1000) })
      const fresh = quoteMove({ ...INPUT, approachKm: km }, null)
      expect(offer).not.toBeNull()
      expect(offer!.total).toBe(fresh.total)
      expect(offer!.breakdown.lines.approach).toBe(fresh.lines.approach)
      expect(offer!.breakdown.net).toBe(fresh.net)
      expect(offer!.breakdown.platformFee).toBe(fresh.platformFee)
      expect(offer!.approachM).toBe(Math.round(km * 1000))
    }
  })

  it('re-prices a move already priced for another mover, up and down', () => {
    const { move, quote } = storedMove(20)
    const nearer = priceOfferForMover({ move, config: null, approachM: 1000 })!
    const farther = priceOfferForMover({ move, config: null, approachM: 40_000 })!
    expect(nearer.total).toBeLessThan(quote.total)
    expect(farther.total).toBeGreaterThan(quote.total)
    expect(nearer.total).toBe(quoteMove({ ...INPUT, approachKm: 1 }, null).total)
    expect(farther.total).toBe(quoteMove({ ...INPUT, approachKm: 40 }, null).total)
  })

  it('pays the mover the net less the platform fee', () => {
    const { move } = storedMove()
    const offer = priceOfferForMover({ move, config: null, approachM: 30_000 })!
    expect(offer.payout).toBe(Math.round((offer.breakdown.net - offer.breakdown.platformFee) * 100) / 100)
    expect(offer.payout).toBeLessThan(offer.total)
    expect(offer.payout).toBeGreaterThan(0)
  })

  it('measures the distance itself from the stored positions when none is given', () => {
    const { move } = storedMove()
    const offer = priceOfferForMover({ move, mover: north(20), config: null })!
    expect(offer.approachM).toBe(approachMetres(move, north(20)))
    expect(offer.breakdown.lines.approach).toBeGreaterThan(0)
  })

  it('is null for a scheduled move, a move without a v3 quote, or an unknown position', () => {
    const { move } = storedMove()
    expect(priceOfferForMover({ move: { ...move, moveCategory: 'scheduled' }, approachM: 5000 })).toBeNull()
    expect(priceOfferForMover({ move: { ...move, priceBreakdown: null }, approachM: 5000 })).toBeNull()
    expect(priceOfferForMover({ move: { ...move, priceBreakdown: 'not json' }, approachM: 5000 })).toBeNull()
    expect(priceOfferForMover({ move, mover: {} })).toBeNull()
    expect(priceOfferForMover({ move: null, approachM: 5000 })).toBeNull()
    const scheduledQuote = quoteMove({ ...INPUT, mode: 'scheduled' }, null)
    expect(
      priceOfferForMover({ move: { ...move, priceBreakdown: serializeBreakdown(scheduledQuote) }, approachM: 5000 }),
    ).toBeNull()
  })
})

describe('offer and move columns', () => {
  it('carries the offer on the request row in cents and metres', () => {
    const { move } = storedMove()
    const offer = priceOfferForMover({ move, config: null, approachM: 40_000 })!
    expect(offerColumns(offer)).toEqual({
      offerTotalCents: Math.round(offer.total * 100),
      offerPayoutCents: Math.round(offer.payout * 100),
      offerApproachM: 40_000,
    })
    expect(offerColumns(null)).toEqual({})
  })

  it('writes a breakdown the engine reads back', () => {
    const { move } = storedMove()
    const offer = priceOfferForMover({ move, config: null, approachM: 40_000 })!
    const cols = movePriceColumns(offer)
    expect(cols.estimatedPrice).toBe(offer.total)
    expect(cols.approachM).toBe(40_000)
    expect(parseBreakdown(cols.priceBreakdown)?.total).toBe(offer.total)
  })
})

describe('the price the client has to confirm', () => {
  it('needs no confirmation at the same or a lower price, and needs one at a higher price', () => {
    expect(offerNeedsClientConfirmation(100, 100)).toBe(false)
    expect(offerNeedsClientConfirmation(100, 99.99)).toBe(false)
    expect(offerNeedsClientConfirmation(100, 100.01)).toBe(true)
    // Compared in cents: float noise is not a higher price.
    expect(offerNeedsClientConfirmation(0.1 + 0.2, 0.3)).toBe(false)
    expect(offerNeedsClientConfirmation(null, 10)).toBe(true)
  })

  it('a nearer mover than the chosen one goes through; a farther one waits', () => {
    const { move } = storedMove(20)
    const nearer = priceOfferForMover({ move, config: null, approachM: 1000 })!
    const same = priceOfferForMover({ move, config: null, approachM: 20_000 })!
    const farther = priceOfferForMover({ move, config: null, approachM: 40_000 })!
    expect(offerNeedsClientConfirmation(move.estimatedPrice, nearer.total)).toBe(false)
    expect(offerNeedsClientConfirmation(move.estimatedPrice, same.total)).toBe(false)
    expect(offerNeedsClientConfirmation(move.estimatedPrice, farther.total)).toBe(true)
  })

  it('builds a pending offer the shared reader accepts, due in three minutes', () => {
    const nowMs = Date.parse('2026-11-26T10:00:00.000Z')
    const raw = buildPendingOffer({
      requestId: 'r1', moverProfileId: 'p1', moverName: 'A'.repeat(200), total: 120.456, previousTotal: 100, approachM: 40000.4, nowMs,
    })
    const offer = parsePendingOffer(raw)!
    expect(offer).toMatchObject({ requestId: 'r1', moverProfileId: 'p1', total: 120.46, previousTotal: 100, approachM: 40000 })
    expect(offer.moverName).toHaveLength(80)
    expect(Date.parse(offer.expiresAt) - nowMs).toBe(CLIENT_CONFIRM_SECONDS * 1000)
    expect(openPendingOffer(raw, nowMs + 179_000)).not.toBeNull()
    expect(openPendingOffer(raw, nowMs + 180_000)).toBeNull()
    expect(pendingOfferExpired(offer, nowMs + 179_999)).toBe(false)
    expect(pendingOfferExpired(offer, nowMs + 180_000)).toBe(true)
    expect(pendingOfferExpired(null, nowMs)).toBe(true)
  })

  it('recognises the unknown-attribute failure and nothing else', () => {
    expect(isUnknownAttributeError(new Error('Invalid document structure: Unknown attribute: "pendingOffer"'))).toBe(true)
    expect(isUnknownAttributeError(new Error('Document with the requested ID could not be found.'))).toBe(false)
    expect(isUnknownAttributeError(null)).toBe(false)
  })
})

describe('assignMoveToMover', () => {
  it('writes the assignment with the price and clears the prompt', async () => {
    const updateDocument = vi.fn(async (_d: string, _c: string, id: string, data: object) => ({ $id: id, ...data }))
    const databases = { updateDocument } as unknown as Parameters<typeof assignMoveToMover>[0]['databases']
    await assignMoveToMover({
      databases, moveId: 'm1', moverProfile: { $id: 'p1', currentVehicleId: 'v1' },
      priceColumns: { estimatedPrice: 90, priceBreakdown: '{}', approachM: 1000 },
    })
    expect(updateDocument).toHaveBeenCalledTimes(1)
    expect(updateDocument.mock.calls[0][3]).toMatchObject({
      moverProfileId: 'p1', status: 'mover_accepted', vehicleId: 'v1', estimatedPrice: 90, approachM: 1000, pendingOffer: null,
    })
  })

  it('falls back to the old write when the schema has no columns for the feature', async () => {
    const missing = new Set(['pendingOffer', 'approachM'])
    const updateDocument = vi.fn(async (_d: string, _c: string, id: string, data: Record<string, unknown>) => {
      const bad = Object.keys(data).find((k) => missing.has(k))
      if (bad) throw new Error(`Invalid document structure: Unknown attribute: "${bad}"`)
      return { $id: id, ...data }
    })
    const databases = { updateDocument } as unknown as Parameters<typeof assignMoveToMover>[0]['databases']
    const row = await assignMoveToMover({
      databases, moveId: 'm1', moverProfile: { $id: 'p1' }, priceColumns: { estimatedPrice: 90, priceBreakdown: '{}', approachM: 1000 },
    })
    expect(row).toMatchObject({ moverProfileId: 'p1', status: 'mover_accepted', estimatedPrice: 90 })
    expect(row).not.toHaveProperty('pendingOffer')
    expect(row).not.toHaveProperty('approachM')
  })
})
