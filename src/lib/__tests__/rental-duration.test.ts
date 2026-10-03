import { describe, expect, it } from 'vitest'

import { durationToHours, hoursToDuration } from '../rental-time'
import { resolveRentalWindow } from '../vehicle-service'

describe('rental "Enter a duration"', () => {
  it('converts a typed amount + unit to hours', () => {
    expect(durationToHours('5', 'hours')).toBe(5)
    expect(durationToHours('10', 'days')).toBe(240)
    expect(durationToHours('1,5', 'days')).toBe(36)
    expect(durationToHours('', 'hours')).toBeNull()
    expect(durationToHours('0', 'days')).toBeNull()
    expect(durationToHours('abc', 'hours')).toBeNull()
  })

  it('reads hours back in the friendliest unit', () => {
    expect(hoursToDuration(240)).toEqual({ amount: '10', unit: 'days' })
    expect(hoursToDuration(36)).toEqual({ amount: '36', unit: 'hours' })
    expect(hoursToDuration(null)).toEqual({ amount: '', unit: 'hours' })
  })

  it('resolves like a chip and keeps the 30-day cap', () => {
    const now = Date.parse('2026-10-03T10:00:00.000Z')
    const ten = resolveRentalWindow({ hours: durationToHours('10', 'days') }, now)
    expect(ten.ok && ten.window.endAt).toBe('2026-10-13T10:00:00.000Z')
    expect(resolveRentalWindow({ hours: durationToHours('31', 'days') }, now)).toEqual({
      ok: false,
      codes: ['vehicle.rentalWindowTooLong'],
    })
  })
})
