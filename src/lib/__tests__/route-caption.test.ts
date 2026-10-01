import { describe, expect, it } from 'vitest'
import { routeCaptionParts, toCoordinate } from '../route-caption'

describe('toCoordinate', () => {
  it('pairs a valid latitude/longitude', () => {
    expect(toCoordinate(52.52, 13.405)).toEqual({ latitude: 52.52, longitude: 13.405 })
  })

  it('is null when either half is missing or not a real number', () => {
    expect(toCoordinate(null, 13.405)).toBeNull()
    expect(toCoordinate(52.52, undefined)).toBeNull()
    expect(toCoordinate(Number.NaN, 13.405)).toBeNull()
    expect(toCoordinate(52.52, Number.POSITIVE_INFINITY)).toBeNull()
  })

  it('rejects out-of-range values', () => {
    expect(toCoordinate(91, 0)).toBeNull()
    expect(toCoordinate(0, -181)).toBeNull()
  })
})

describe('routeCaptionParts', () => {
  it('formats the row distance in kilometres and the duration in hours and minutes', () => {
    const parts = routeCaptionParts(2_700, 4_800, 'en')
    expect(parts.distance).toBe('2.7 km')
    expect(parts.duration).toBe('1 hr 20 min')
  })

  it('shows only minutes under an hour and only hours on the exact hour', () => {
    expect(routeCaptionParts(1_000, 25 * 60, 'en').duration).toBe('25 min')
    expect(routeCaptionParts(1_000, 2 * 3_600, 'en').duration).toBe('2 hr')
  })

  it('follows the locale for the decimal mark and the unit abbreviations', () => {
    const de = routeCaptionParts(2_700, 4_800, 'de')
    expect(de.distance).toBe('2,7 km')
    expect(de.duration).toMatch(/^1 Std\.,? 20 Min\.$/)
  })

  it('is null for a missing, zero or negative figure', () => {
    expect(routeCaptionParts(null, undefined, 'en')).toEqual({ distance: null, duration: null })
    expect(routeCaptionParts(0, -5, 'en')).toEqual({ distance: null, duration: null })
  })

  it('never renders zero minutes for a sub-minute duration', () => {
    expect(routeCaptionParts(100, 10, 'en').duration).toBe('1 min')
  })
})
