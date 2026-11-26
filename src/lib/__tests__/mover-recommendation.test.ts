import { describe, expect, it } from 'vitest'
import { recommendedMoverId, sortMoversForDisplay } from '../mover-recommendation'

describe('recommendedMoverId (plan legal/7 V2)', () => {
  it('is null for an empty list', () => {
    expect(recommendedMoverId([])).toBeNull()
  })
  it('is the first mover when nobody is certified', () => {
    expect(recommendedMoverId([{ id: 'a' }, { id: 'b', certified: false }])).toBe('a')
  })
  it('is the first certified mover when there is one', () => {
    expect(
      recommendedMoverId([
        { id: 'a', certified: false },
        { id: 'b', certified: true },
        { id: 'c', certified: true },
      ]),
    ).toBe('b')
  })
})

describe('sortMoversForDisplay', () => {
  it('sorts by price and keeps the server order among equal prices', () => {
    const list = [
      { id: 'certified-near', price: 120 },
      { id: 'uncertified-near', price: 120 },
      { id: 'cheap-far', price: 90 },
      { id: 'certified-far', price: 120 },
    ]
    expect(sortMoversForDisplay(list).map((m) => m.id)).toEqual([
      'cheap-far',
      'certified-near',
      'uncertified-near',
      'certified-far',
    ])
  })
  it('does not mutate its input', () => {
    const list = [{ price: 2 }, { price: 1 }]
    sortMoversForDisplay(list)
    expect(list.map((m) => m.price)).toEqual([2, 1])
  })
})
