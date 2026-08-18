import { describe, expect, it } from 'vitest'

import { countryToIso2, isSanctionedCountry } from '@/lib/sanctions'

/**
 * The web onboarding route must reject the same countries the
 * `submitmoverprofile` function rejects — these mirror the function's
 * behaviour so a drift in either port fails a test.
 */
describe('countryToIso2', () => {
  it('maps common spellings to ISO2', () => {
    expect(countryToIso2('Germany')).toBe('DE')
    expect(countryToIso2('deutschland')).toBe('DE')
    expect(countryToIso2(' Österreich ')).toBe('AT')
    expect(countryToIso2('North Korea')).toBe('KP')
  })

  it('passes through bare ISO2 codes', () => {
    expect(countryToIso2('ru')).toBe('RU')
    expect(countryToIso2('IR')).toBe('IR')
  })

  it('maps unknown or non-string input to null', () => {
    expect(countryToIso2('Atlantis')).toBe(null)
    expect(countryToIso2('')).toBe(null)
    expect(countryToIso2(null)).toBe(null)
    expect(countryToIso2(42)).toBe(null)
  })
})

describe('isSanctionedCountry', () => {
  const LIST = ['KP', 'IR', 'SY', 'CU', 'RU', 'BY']

  it('blocks sanctioned countries in any accepted spelling', () => {
    expect(isSanctionedCountry('Russia', LIST)).toBe(true)
    expect(isSanctionedCountry('ru', LIST)).toBe(true)
    expect(isSanctionedCountry('Iran', LIST)).toBe(true)
  })

  it('allows operating countries', () => {
    expect(isSanctionedCountry('Germany', LIST)).toBe(false)
    expect(isSanctionedCountry('France', LIST)).toBe(false)
  })

  it('never blocks unknown countries or malformed lists', () => {
    expect(isSanctionedCountry('Atlantis', LIST)).toBe(false)
    expect(isSanctionedCountry('Russia', 'not-a-list')).toBe(false)
    expect(isSanctionedCountry('Russia', null)).toBe(false)
  })
})
