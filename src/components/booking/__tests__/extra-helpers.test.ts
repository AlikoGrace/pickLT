import { describe, expect, it } from 'vitest'

import { clampExtraHelpers, helperRateEur, includedHelpers, maxExtraHelpers, stepExtraHelpers } from '../extra-helpers'

/** Extra-helpers stepper bounds (crew master D2): 0…`crew.maxExtraHelpers`, default 3. */

describe('extra helpers', () => {
  it('the cap comes from live config, default 3', () => {
    expect(maxExtraHelpers({})).toBe(3)
    expect(maxExtraHelpers(null)).toBe(3)
    expect(maxExtraHelpers({ 'crew.maxExtraHelpers': 5 })).toBe(5)
    expect(maxExtraHelpers({ 'crew.maxExtraHelpers': -1 })).toBe(0)
  })

  it('clamps to whole numbers in 0…max', () => {
    expect(clampExtraHelpers(2.9, 3)).toBe(2)
    expect(clampExtraHelpers(7, 3)).toBe(3)
    expect(clampExtraHelpers(-1, 3)).toBe(0)
    expect(clampExtraHelpers('x', 3)).toBe(0)
  })

  it('steps within the bounds', () => {
    expect(stepExtraHelpers(0, -1, 3)).toBe(0)
    expect(stepExtraHelpers(0, 1, 3)).toBe(1)
    expect(stepExtraHelpers(3, 1, 3)).toBe(3)
    expect(stepExtraHelpers(5, -1, 3)).toBe(2)
    expect(stepExtraHelpers(1, 1, 0)).toBe(0)
  })

  it('rate and included helpers follow the tier', () => {
    expect(helperRateEur({}, 'regular')).toBe(24)
    expect(helperRateEur({ 'tier.premium.laborRatePerHour': 30 }, 'premium')).toBe(30)
    expect(includedHelpers({}, 'light')).toBe(0)
    expect(includedHelpers({}, 'regular')).toBe(1)
    expect(includedHelpers({}, 'premium')).toBe(2)
  })
})
