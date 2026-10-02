import { describe, expect, it } from 'vitest'
import { countryCodeFromFeature, pickMoveCountry, resolveMoveCountry, reverseGeocodeCountry } from '@/lib/moveCountry'

// Plan wave-2026-10/4 C2: the move's country is the PICKUP country — geocode,
// then the client's hint, then the client's own country, then the default.
describe('pickMoveCountry', () => {
  it('prefers the geocoder, then the hint, then the user, then DE', () => {
    expect(pickMoveCountry({ geocoded: 'it', hint: 'FR', userCountryCode: 'DE' })).toBe('IT')
    expect(pickMoveCountry({ geocoded: null, hint: 'country.fr', userCountryCode: 'DE' })).toBe('FR')
    expect(pickMoveCountry({ geocoded: 'Atlantis', hint: '', userCountryCode: 'at' })).toBe('AT')
    expect(pickMoveCountry({})).toBe('DE')
  })
})

describe('countryCodeFromFeature', () => {
  it('reads the v6 context, the v5 short code and a context array', () => {
    expect(countryCodeFromFeature({ properties: { context: { country: { country_code: 'it' } } } })).toBe('IT')
    expect(countryCodeFromFeature({ properties: { short_code: 'fr' } })).toBe('FR')
    expect(countryCodeFromFeature({ context: [{ id: 'region.1' }, { id: 'country.1', short_code: 'de' }] })).toBe('DE')
    expect(countryCodeFromFeature(null)).toBeNull()
    expect(countryCodeFromFeature({ properties: {} })).toBeNull()
  })
})

describe('reverseGeocodeCountry / resolveMoveCountry', () => {
  const fetchOk = (code: string) => async () => ({
    ok: true,
    json: async () => ({ features: [{ properties: { context: { country: { country_code: code } } } }] }),
  })
  it('asks Mapbox for the country at the pickup point', async () => {
    let url = ''
    const f = async (u: string) => {
      url = u
      return fetchOk('it')()
    }
    expect(await reverseGeocodeCountry(41.9, 12.5, 'tok', f)).toBe('IT')
    expect(url).toContain('types=country')
    expect(url).toContain('latitude=41.9')
  })
  it('is null without a token, with bad coordinates or on a failed call', async () => {
    expect(await reverseGeocodeCountry(41.9, 12.5, undefined, fetchOk('it'))).toBeNull()
    expect(await reverseGeocodeCountry(null, 12.5, 'tok', fetchOk('it'))).toBeNull()
    expect(await reverseGeocodeCountry(41.9, 12.5, 'tok', async () => ({ ok: false, json: async () => ({}) }))).toBeNull()
    expect(
      await reverseGeocodeCountry(41.9, 12.5, 'tok', async () => {
        throw new Error('offline')
      }),
    ).toBeNull()
  })
  it('falls through to the hint and the user when the geocoder has nothing', async () => {
    const none = async () => ({ ok: true, json: async () => ({ features: [] }) })
    expect(
      await resolveMoveCountry({ pickupLatitude: 1, pickupLongitude: 1, pickupCountryCode: 'es', token: 'tok', fetchImpl: none }),
    ).toBe('ES')
    expect(await resolveMoveCountry({ userCountryCode: 'NL', token: 'tok', fetchImpl: none })).toBe('NL')
    expect(await resolveMoveCountry({ token: 'tok', fetchImpl: none })).toBe('DE')
    expect(
      await resolveMoveCountry({ pickupLatitude: 41.9, pickupLongitude: 12.5, pickupCountryCode: 'de', token: 'tok', fetchImpl: fetchOk('it') }),
    ).toBe('IT')
  })
})
