import { describe, expect, it } from 'vitest'

import { truckSizePx } from '../truck-size'

describe('truckSizePx (plan maps/smooth-mover-marker W6)', () => {
  it('grows with the zoom between the stops', () => {
    expect(truckSizePx(13)).toBe(51)
    expect(truckSizePx(14)).toBe(64)
    expect(truckSizePx(17)).toBe(123)
    expect(truckSizePx(15)).toBeLessThan(truckSizePx(16))
  })
  it('is clamped outside the stops', () => {
    expect(truckSizePx(3)).toBe(31)
    expect(truckSizePx(22)).toBe(154)
    expect(truckSizePx(Number.NaN)).toBe(31)
  })
})
