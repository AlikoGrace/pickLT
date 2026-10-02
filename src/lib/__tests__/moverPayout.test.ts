import { describe, expect, it } from 'vitest'

import type { InventoryItemDef } from '@/lib/classifyMove'
import { moverPayoutEur, moverPayoutFromGross, payoutRatesFrom } from '@/lib/moverPayout'
import { quoteMove, serializeBreakdown } from '@/lib/pricingEngine'

// The web scenario-8 booking of 2026-10-02: Medium · instant, 3.163 km / 635 s,
// sofa_3seater + tv, medium truck, crew 2 → €383.49 gross, net 322.26, fee 23.87.
// Same case as `pickltmobile/__tests__/mover-payout.test.ts`; the catalog rows
// carry no dimensions there, so they carry none here (volume 0 both sides).
const catalog: InventoryItemDef[] = [
  {
    id: 'sofa_3seater', name: 'Sofa (3-seater)', category: 'living_room',
    meta: { widthCm: 0, heightCm: 0, depthCm: 0, weightKg: 70 },
    classificationPoints: 12, moveTypeMinimum: 'regular', unitPriceEur: 26.7, requiredCrew: 2,
  },
  {
    id: 'tv', name: 'TV', category: 'living_room',
    meta: { widthCm: 0, heightCm: 0, depthCm: 0, weightKg: 10 },
    classificationPoints: 3, moveTypeMinimum: 'light', unitPriceEur: 2.5, requiredCrew: 1,
  },
]
const quote = quoteMove({
  tier: 'regular', mode: 'instant', distanceKm: 3.163471, durationSeconds: 634.936,
  basket: { counts: { sofa_3seater: 1, tv: 1 }, customItems: [] }, catalog, vehicleType: 'medium_truck',
})

describe('moverPayoutEur — what the driver earns', () => {
  it('is net minus the platform fee on an engine-priced row', () => {
    expect(quote.total).toBe(383.49)
    expect(quote.net).toBe(322.26)
    expect(quote.platformFee).toBe(23.87)
    const payout = moverPayoutEur({ estimatedPrice: quote.total, finalPrice: null, priceBreakdown: serializeBreakdown(quote) })
    expect(payout).toBe(Math.round((quote.net - quote.platformFee) * 100) / 100)
    expect(payout).toBe(298.39)
    expect(payout).toBe(quote.adjustedSubtotal)
  })

  it('accepts an already-parsed breakdown', () => {
    expect(moverPayoutEur({ estimatedPrice: quote.total, priceBreakdown: quote })).toBe(298.39)
  })

  it('prefers the final price and re-derives the fee from the quote rates', () => {
    const payout = moverPayoutEur({ estimatedPrice: quote.total, finalPrice: 400, priceBreakdown: serializeBreakdown(quote) })
    // 400 / 1.19 = 336.13 ex-VAT; / 1.08 = 311.23 after the 8 % fee
    expect(payout).toBe(311.23)
  })

  it('falls back to the config/default rates on a pre-engine row', () => {
    expect(moverPayoutEur({ estimatedPrice: 119, finalPrice: null, priceBreakdown: null })).toBe(92.59)
    expect(moverPayoutEur({ estimatedPrice: 119, finalPrice: null }, { 'platformFee.rate': 0 })).toBe(100)
  })

  it('is zero without a price and never negative', () => {
    expect(moverPayoutEur({ estimatedPrice: null, finalPrice: null })).toBe(0)
    expect(moverPayoutEur({ estimatedPrice: 0 })).toBe(0)
    expect(moverPayoutEur({})).toBe(0)
    expect(moverPayoutFromGross(1, { vatRate: 0.19, feeRate: 0.08, feeFixed: 5 })).toBe(0)
    expect(moverPayoutFromGross(NaN, { vatRate: 0.19, feeRate: 0.08, feeFixed: 0 })).toBe(0)
  })

  it('reads the rates the quote was priced with', () => {
    expect(payoutRatesFrom(quote)).toEqual({ vatRate: 0.19, feeRate: 0.08, feeFixed: 0 })
    expect(payoutRatesFrom(null, { 'tax.vatRate': 0.2 })).toEqual({ vatRate: 0.2, feeRate: 0.08, feeFixed: 0 })
    expect(payoutRatesFrom(undefined)).toEqual({ vatRate: 0.19, feeRate: 0.08, feeFixed: 0 })
  })
})
