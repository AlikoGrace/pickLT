import { afterEach, describe, expect, it } from 'vitest'

import { displayCountryOf, parseMarkets, resolveDisplayCurrency } from '../display-currency'
import { formatMoney, getDisplayCurrency, setDisplayCurrency } from '../format'
import { SUPPORTED_COUNTRIES } from '../supportedCountries'

/**
 * The currency a signed-in user sees by default (plan `currency/0.master.md`
 * section 2 and W2/W3): that of the country they registered with; a mover's is
 * the country of their mover profile; signed out it is euro.
 */
const MARKETS = [
  { code: 'DE', currency: 'EUR' },
  { code: 'PL', currency: 'PLN' },
  { code: 'GH', currency: 'GHS' },
]

afterEach(() => setDisplayCurrency('EUR'))

describe('resolveDisplayCurrency', () => {
  it('a client sees the currency of the country they registered with', () => {
    expect(resolveDisplayCurrency({ userType: 'client', countryCode: 'PL' }, MARKETS)).toBe('PLN')
    expect(resolveDisplayCurrency({ userType: 'client', countryCode: 'pl' }, MARKETS)).toBe('PLN')
    expect(resolveDisplayCurrency({ userType: 'client', countryCode: 'DE' }, MARKETS)).toBe('EUR')
  })

  it('a mover sees the currency of the mover profile\'s country, else of their own', () => {
    expect(resolveDisplayCurrency({ userType: 'mover', countryCode: 'DE', moverDetails: { countryCode: 'GH' } }, MARKETS)).toBe('GHS')
    expect(resolveDisplayCurrency({ userType: 'mover', countryCode: 'PL', moverDetails: { countryCode: null } }, MARKETS)).toBe('PLN')
    expect(displayCountryOf({ userType: 'client', countryCode: 'DE', moverDetails: { countryCode: 'GH' } })).toBe('DE')
  })

  it('signed out, no country, an unknown country and a missing market list are euro', () => {
    expect(resolveDisplayCurrency(null, MARKETS)).toBe('EUR')
    expect(resolveDisplayCurrency({ userType: 'client', countryCode: null }, MARKETS)).toBe('EUR')
    expect(resolveDisplayCurrency({ userType: 'client', countryCode: 'XX' }, MARKETS)).toBe('EUR')
    expect(resolveDisplayCurrency({ userType: 'client', countryCode: 'PL' }, null)).toBe('EUR')
  })

  it('with the markets open today every user is euro', () => {
    for (const m of SUPPORTED_COUNTRIES) {
      expect(resolveDisplayCurrency({ userType: 'client', countryCode: m.code }, SUPPORTED_COUNTRIES)).toBe('EUR')
    }
  })

  it('reads the list of GET /api/markets and drops anything unusable', () => {
    expect(parseMarkets({ markets: [{ code: 'PL', currency: 'PLN' }, { code: 1 }, null, 'x'] })).toEqual([{ code: 'PL', currency: 'PLN' }])
    expect(parseMarkets(null)).toEqual([])
    expect(parseMarkets({ markets: 'no' })).toEqual([])
  })
})

describe('the display currency drives formatMoney; a move\'s own currency wins', () => {
  it('sets, formats and resets to euro on sign-out', () => {
    const euro = formatMoney(12.5, { locale: 'en' })
    setDisplayCurrency(resolveDisplayCurrency({ userType: 'client', countryCode: 'PL' }, MARKETS))
    expect(getDisplayCurrency()).toBe('PLN')
    expect(formatMoney(12.5, { locale: 'en' })).toBe('PLN 12.50')
    // One move's money in the move's own currency, whatever the user's is.
    expect(formatMoney(12.5, { locale: 'en', currency: 'EUR' })).toBe(euro)
    setDisplayCurrency(resolveDisplayCurrency(null, MARKETS))
    expect(formatMoney(12.5, { locale: 'en' })).toBe(euro)
    expect(euro).toBe('€12.50')
  })
})
