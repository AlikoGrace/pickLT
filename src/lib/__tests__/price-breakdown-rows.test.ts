import type { TFunction } from 'i18next'
import { describe, expect, it } from 'vitest'

import { breakdownRows, crewAssumption } from '@/components/PriceBreakdown'
import { quoteMove } from '@/lib/pricingEngine'

/** A `t` that renders the English fallback with its params, so labels can be read. */
const t = ((key: string, opts?: Record<string, unknown>) => {
  const fallback = typeof opts?.defaultValue === 'string' ? opts.defaultValue : key
  return fallback.replace(/\{\{(\w+)\}\}/g, (_m, p: string) => String(opts?.[p] ?? ''))
}) as unknown as TFunction

const base = { tier: 'regular' as const, mode: 'scheduled' as const, distanceKm: 20, durationSeconds: 0, basket: { counts: {}, customItems: [] }, catalog: [] }

describe('PriceBreakdown — extra helpers (crew master D2)', () => {
  it('adds a row after labour with the count, rate and hours', () => {
    const rows = breakdownRows(t, quoteMove({ ...base, extraHelpers: 2 }))
    const i = rows.findIndex((r) => r.key === 'labor')
    expect(rows[i + 1]).toMatchObject({ key: 'extraHelpers', amount: 96 })
    expect(rows[i + 1].label).toMatch(/^Extra helpers \(2 × .*24.* × 2 h\)$/)
  })

  it('tells the crew as the driver plus helpers', () => {
    expect(crewAssumption(t, 1)).toBe('Crew: driver only')
    expect(crewAssumption(t, 4)).toBe('Crew: driver + 3 helpers')
  })
})
