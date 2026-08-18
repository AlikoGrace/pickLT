import { describe, expect, it } from 'vitest'
import {
  isMoveStartable,
  parseArrivalWindowMinutes,
  scheduledStartAt,
  START_WINDOW_BEFORE_MS,
  withinStartWindow,
} from '../schedule-timing'

// Same fixtures as pickltmover __tests__/schedule-timing.test.ts — the web
// port and the mobile helper must agree (T6 parity).

describe('parseArrivalWindowMinutes', () => {
  it('parses 12-hour and 24-hour labels', () => {
    expect(parseArrivalWindowMinutes('03:00 PM')).toBe(15 * 60)
    expect(parseArrivalWindowMinutes('12:30 AM')).toBe(30)
    expect(parseArrivalWindowMinutes('12:00 PM')).toBe(12 * 60)
    expect(parseArrivalWindowMinutes('15:00')).toBe(15 * 60)
  })
  it('rejects garbage', () => {
    expect(parseArrivalWindowMinutes(null)).toBeNull()
    expect(parseArrivalWindowMinutes('afternoon')).toBeNull()
    expect(parseArrivalWindowMinutes('13:00 PM')).toBeNull()
    expect(parseArrivalWindowMinutes('25:00')).toBeNull()
  })
})

describe('scheduledStartAt', () => {
  it('combines a date-only moveDate with the arrival window in platform time', () => {
    // 03:00 PM Europe/Berlin on 2026-09-01 (CEST, UTC+2) = 13:00 UTC.
    expect(scheduledStartAt({ moveDate: '2026-09-01', arrivalWindow: '03:00 PM' })).toBe(
      Date.parse('2026-09-01T13:00:00Z'),
    )
  })
  it('resolves winter dates on the CET side of the DST boundary', () => {
    expect(scheduledStartAt({ moveDate: '2026-12-01', arrivalWindow: '03:00 PM' })).toBe(
      Date.parse('2026-12-01T14:00:00Z'),
    )
  })
  it('keeps a datetime moveDate and degrades on bad windows', () => {
    expect(scheduledStartAt({ moveDate: '2026-09-01T10:30:00Z', arrivalWindow: '03:00 PM' })).toBe(
      Date.parse('2026-09-01T10:30:00Z'),
    )
    expect(scheduledStartAt({ moveDate: '2026-09-01', arrivalWindow: 'morningish' })).toBe(
      Date.parse('2026-09-01T00:00:00Z'),
    )
    expect(scheduledStartAt({ moveDate: null })).toBeNull()
  })
})

describe('withinStartWindow / isMoveStartable', () => {
  const start = Date.parse('2026-09-01T15:00:00Z')
  it('opens exactly at T-5 minutes; late start allowed; never-block without data', () => {
    expect(withinStartWindow(start, start - START_WINDOW_BEFORE_MS - 1)).toBe(false)
    expect(withinStartWindow(start, start - START_WINDOW_BEFORE_MS)).toBe(true)
    expect(withinStartWindow(start, start + 60_000)).toBe(true)
    expect(withinStartWindow(null, 0)).toBe(true)
  })
  it('isMoveStartable gates a scheduled move until the window', () => {
    const move = { moveDate: '2026-09-01', arrivalWindow: '03:00 PM' }
    expect(isMoveStartable(move, Date.parse('2026-09-01T10:00:00Z'))).toBe(false)
    // Start = 13:00 UTC (03:00 PM Berlin, CEST); gate opens at T-5.
    expect(isMoveStartable(move, Date.parse('2026-09-01T12:56:00Z'))).toBe(true)
    expect(isMoveStartable({ moveDate: null }, 0)).toBe(true)
  })
})
