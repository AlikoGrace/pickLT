import { describe, expect, it } from 'vitest'

import { basketFromWire } from '@/lib/pricingInputs'
import { basketItemCount, normalizeCustomItems, serializeBasket, stripZeroCounts } from '../basket'
import type { CustomItem } from '../selector-logic'

/** The web client's basket on the wire (crew plan 1 §basket) and the restored-draft shape. */

const clock: CustomItem = { id: 'c1', name: 'Clock', quantity: 2, approxSize: 'large', approxWeight: 40 }

describe('serializeBasket', () => {
  it('strips zero counts and serialises custom items per the contract', () => {
    const wire = serializeBasket({ box: 3, sofa: 0, bed: -1 }, [clock])
    expect(JSON.parse(wire.inventoryItems)).toEqual({ box: 3 })
    expect(wire.customItems.map((s) => JSON.parse(s))).toEqual([
      { id: 'c1', name: 'Clock', quantity: 2, approxSize: 'large', approxWeight: 40 },
    ])
  })

  it('round-trips through the server parser', () => {
    const wire = serializeBasket({ box: 3 }, [clock])
    expect(basketFromWire(wire.inventoryItems, wire.customItems)).toMatchObject({
      counts: { box: 3 },
      customItems: [{ quantity: 2, approxSize: 'large', approxWeight: 40 }],
    })
  })

  it('drops zero-quantity custom items', () => {
    expect(serializeBasket({}, [{ ...clock, quantity: 0 }]).customItems).toEqual([])
  })
})

describe('restoring older drafts', () => {
  it('maps free-text sizes to a band and string weights to numbers', () => {
    expect(
      normalizeCustomItems([
        { id: 'a', name: 'Clock', quantity: 1, approxSize: 'XL', approxWeight: '45 kg' },
        { id: 'b', name: 'Lamp', quantity: '2', approxSize: '100x50 cm', approxWeight: '' },
      ]),
    ).toEqual([
      { id: 'a', name: 'Clock', quantity: 1, approxSize: 'extra_large', approxWeight: 45 },
      { id: 'b', name: 'Lamp', quantity: 2, approxSize: 'medium', approxWeight: 0 },
    ])
  })

  it('drops junk', () => {
    expect(normalizeCustomItems([null, { name: '', quantity: 1 }, { name: 'X', quantity: 0 }])).toEqual([])
    expect(normalizeCustomItems('nope')).toEqual([])
  })
})

describe('counts', () => {
  it('stripZeroCounts floors and removes non-positive values', () => {
    expect(stripZeroCounts({ a: 2.7, b: 0, c: Number.NaN })).toEqual({ a: 2 })
  })

  it('item count is catalog + custom quantities', () => {
    expect(basketItemCount({ box: 3, bed: 0 }, [clock])).toBe(5)
  })
})
