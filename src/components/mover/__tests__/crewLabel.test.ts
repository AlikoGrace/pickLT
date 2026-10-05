import { describe, expect, it } from 'vitest'

import { crewLabel, moveCrew } from '../crewLabel'

const t = (key: string, o?: Record<string, unknown>) => (o && 'count' in o ? `${key}#${o.count}` : key)
const DRIVER_ONLY = 'booking:pricing.assumptions.crewDriverOnly.label'
const HELPERS = 'booking:pricing.assumptions.crewHelpers.label'
const REQUESTED = 'web:mover.crew.requestedByClient.label'

describe('moveCrew', () => {
  it('helpers = crewSize − 1', () => {
    expect(moveCrew({ crewSize: 3 })).toEqual({ total: 3, helpers: 2, extraHelpers: 0 })
    expect(moveCrew({ crewSize: '2' })?.helpers).toBe(1)
  })
  it('null without a usable crewSize', () => {
    expect(moveCrew({ crewSize: null })).toBeNull()
    expect(moveCrew({ crewSize: 0 })).toBeNull()
  })
  it('falls back to the quote profile', () => {
    const priceBreakdown = JSON.stringify({
      version: 'v3', currency: 'EUR', tier: 'premium', mode: 'scheduled', total: 1,
      lines: {}, profile: { crew: 3, extraHelpers: 2, totalCrew: 5 },
    })
    expect(moveCrew({ priceBreakdown })).toEqual({ total: 5, helpers: 4, extraHelpers: 2 })
  })
})

describe('crewLabel', () => {
  it('driver only', () => {
    expect(crewLabel(t, { crewSize: 1 })).toBe(DRIVER_ONLY)
  })
  it('driver + N helpers with no +1', () => {
    expect(crewLabel(t, { crewSize: 2 })).toBe(`${HELPERS}#1`)
  })
  it('mentions client-requested extras', () => {
    expect(crewLabel(t, { crewSize: 4, extraHelpers: 2 })).toBe(`${HELPERS}#3 ${REQUESTED}#2`)
  })
})
