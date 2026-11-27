import { describe, expect, it, vi } from 'vitest'

/**
 * Re-pricing an instant move for one mover keeps the quote's currency (plan
 * `currency/0.master.md` W1): the approach line is added in the currency the
 * move was priced in, and nothing is converted.
 */
vi.hoisted(() => {
  process.env.APPWRITE_DATABASE_ID = 'db'
})
vi.mock('@/lib/appwrite-server', () => ({ createAdminClient: () => ({ databases: {} }) }))

import { movePriceColumns, priceOfferForMover } from '../offer-pricing-server'
import { parseBreakdown, quoteMove, serializeBreakdown, type QuoteInput } from '../pricingEngine'

const INPUT: QuoteInput = {
  tier: 'light',
  mode: 'instant',
  distanceKm: 20,
  durationSeconds: 3600,
  basket: { counts: {}, customItems: [] },
  catalog: [],
  vehicleType: 'small_van',
}
const PICKUP = { pickupLatitude: 52.23, pickupLongitude: 21.01 }
const north = (km: number) => ({ currentLatitude: 52.23 + km / 111.195, currentLongitude: 21.01 })

describe.each(['PLN', 'EUR'] as const)('an offer on a %s move', (currency) => {
  it('is priced in the move\'s currency, and so are the columns written on acceptance', () => {
    const quote = quoteMove({ ...INPUT, countryCode: currency === 'PLN' ? 'PL' : 'DE', currency }, null)
    const move = { moveCategory: 'instant', estimatedPrice: quote.total, priceBreakdown: serializeBreakdown(quote), ...PICKUP }
    const offer = priceOfferForMover({ move, mover: north(30) })
    expect(offer).not.toBeNull()
    expect(offer!.breakdown.currency).toBe(currency)
    expect(offer!.total).toBeGreaterThan(quote.total)
    expect(parseBreakdown(movePriceColumns(offer!).priceBreakdown)?.currency).toBe(currency)
  })
})
