import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import {
  DEFAULT_CUSTOM_ITEM_WEIGHT_KG,
  MAX_ITEM_QTY,
  MAX_SPECIAL_ITEM_QTY,
  basketCapViolation,
  basketFromWire,
  extraHelpersFromWire,
  serializeBasket,
  type NormalizedBasket,
} from '@/lib/basket-server'
import type { InventoryItemDef } from '@/lib/classifyMove'
import { classifyBasketServer } from '@/lib/pricing-server'

/**
 * The web basket port against the fixture the Appwrite functions' `basket.js`
 * is tested with (`basket-wire.json`, a byte copy of pickltmobile's): the same
 * wire in must give the same basket, serialisation and cap verdict.
 */

interface Fixture {
  defaultCustomItemWeightKg: number
  maxItemQty: number
  maxSpecialItemQty: number
  catalog: { itemId: string; category: string }[]
  normalise: { name: string; inventoryItems: unknown; customItems: unknown; expected: unknown }[]
  serialize: { name: string; basket: NormalizedBasket; expected: unknown }[]
  caps: { name: string; basket: NormalizedBasket; expected: unknown }[]
}

const FX = JSON.parse(readFileSync(join(__dirname, 'fixtures', 'basket-wire.json'), 'utf8')) as Fixture

describe('constants match the shared fixture', () => {
  it('caps and the default custom weight', () => {
    expect(MAX_ITEM_QTY).toBe(FX.maxItemQty)
    expect(MAX_SPECIAL_ITEM_QTY).toBe(FX.maxSpecialItemQty)
    expect(DEFAULT_CUSTOM_ITEM_WEIGHT_KG).toBe(FX.defaultCustomItemWeightKg)
  })
})

describe('basketFromWire', () => {
  it.each(FX.normalise.map((c) => [c.name, c] as const))('%s', (_name, c) => {
    expect(basketFromWire(c.inventoryItems, c.customItems)).toEqual(c.expected)
  })
})

describe('serializeBasket', () => {
  it.each(FX.serialize.map((c) => [c.name, c] as const))('%s', (_name, c) => {
    expect(serializeBasket(c.basket)).toEqual(c.expected)
  })
})

describe('basketCapViolation', () => {
  it.each(FX.caps.map((c) => [c.name, c] as const))('%s (catalog rows keyed by itemId)', (_name, c) => {
    expect(basketCapViolation(c.basket, FX.catalog)).toEqual(c.expected)
  })
  it.each(FX.caps.map((c) => [c.name, c] as const))('%s (web item defs keyed by id)', (_name, c) => {
    expect(basketCapViolation(c.basket, FX.catalog.map((i) => ({ id: i.itemId, category: i.category })))).toEqual(c.expected)
  })
})

describe('extraHelpersFromWire', () => {
  it('is a whole number in 0…10', () => {
    expect([undefined, null, '2', 2.9, -1, 'x', 50].map(extraHelpersFromWire)).toEqual([0, 0, 2, 2, 0, 0, 10])
  })
})

describe('classifyBasketServer — same totals and tier as the functions', () => {
  const CATALOG: InventoryItemDef[] = [
    { id: 'piano', name: 'Piano', category: 'special', meta: { widthCm: 150, heightCm: 130, depthCm: 60, weightKg: 200 }, classificationPoints: 25, moveTypeMinimum: 'premium' },
    { id: 'cardboard_boxes', name: 'Boxes', category: 'boxes', meta: { widthCm: 60, heightCm: 40, depthCm: 40, weightKg: 10 }, classificationPoints: 2, moveTypeMinimum: 'light' },
  ]

  it('a forced light tier with a piano is premium; totals count custom quantities', () => {
    const b = basketFromWire({ piano: 1, cardboard_boxes: 2 }, [
      JSON.stringify({ id: 'c1', name: 'Vase', quantity: 3, approxSize: 'small', approxWeight: '2 kg' }),
    ])
    // Identical numbers to pickltmobile/__tests__/basket-wire.test.ts.
    expect(classifyBasketServer(b, CATALOG, {}, 'light', 'regular')).toEqual({
      moveType: 'premium',
      systemMoveType: 'premium',
      totalItemCount: 6,
      totalWeightKg: 226,
      totalVolumeCm3: 1_170_000 + 192_000 + 300_000,
    })
  })

  it('never lowers the client tier; a missing tier falls back', () => {
    const b = basketFromWire({ cardboard_boxes: 1 }, [])
    expect(classifyBasketServer(b, CATALOG, {}, 'premium', 'regular')).toMatchObject({ moveType: 'premium', systemMoveType: 'light' })
    expect(classifyBasketServer(b, CATALOG, {}, undefined, 'regular')).toMatchObject({ moveType: 'regular', systemMoveType: 'light' })
  })

  it('reads the admin thresholds', () => {
    const b = basketFromWire({ cardboard_boxes: 5 }, [])
    expect(classifyBasketServer(b, CATALOG, { 'classify.light.maxItems': 4 }, 'light', 'light').systemMoveType).toBe('regular')
  })
})
