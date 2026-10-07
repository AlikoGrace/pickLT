import { beforeEach, describe, expect, it, vi } from 'vitest'

// Move-detail units follow the app language, not `toFixed` / hand-typed
// "km"/"min"/"hr" (plan pickltmobile i18n/move-details-leftovers, web parity).
let locale = 'en'
vi.mock('@/lib/i18n-runtime', async (orig) => ({
  ...(await orig<object>()),
  getActiveLocale: () => locale,
}))

import { formatDistanceKm, formatDuration, formatRequestedAt } from '../inventory-labels'

describe('move-detail units', () => {
  beforeEach(() => {
    locale = 'en'
  })

  it('formats distance with the locale decimal mark', () => {
    expect(formatDistanceKm(28400)).toBe('28.4 km')
    locale = 'de'
    expect(formatDistanceKm(28400)).toBe('28,4 km')
    expect(formatDistanceKm(0)).toBeNull()
  })

  it("formats duration with the locale's own units", () => {
    expect(formatDuration(5400)).toBe('~1 hr 30 min')
    locale = 'de'
    expect(formatDuration(2460)).toBe('~41 Min.')
    expect(formatDuration(5400)).toBe('~1 Std. 30 Min.')
    expect(formatDuration(null)).toBeNull()
  })

  it('formats the request time in the app language', () => {
    locale = 'de'
    expect(formatRequestedAt('2026-08-22T21:54:00.000Z')).toMatch(/Aug\./)
    expect(formatRequestedAt('nope')).toBeNull()
  })
})
