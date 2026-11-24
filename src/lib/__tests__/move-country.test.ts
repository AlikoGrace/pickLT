import { describe, expect, it } from 'vitest'
import {
  countryCodeFromFeature,
  isCrossBorder,
  pickMoveCountry,
  resolveMoveCountry,
  resolveMoveCountryWithLock,
  reverseGeocodeCountry,
  scopeLockStatus,
  scopeLockViolation,
} from '@/lib/moveCountry'

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

// Plan legal/1.scope-lock S2/S3: same country at both ends, and an open market.
describe('scope lock', () => {
  const fetchBy = (codes: Record<string, string>, fail = false) => async (url: string) => {
    if (fail) return { ok: false, json: async () => ({}) }
    const lng = new URL(url).searchParams.get('longitude') ?? ''
    return { ok: true, json: async () => ({ features: [{ properties: { context: { country: { country_code: codes[lng] ?? 'de' } } } }] }) }
  }
  const BERLIN = { pickupLatitude: 52.52, pickupLongitude: 13.405 }
  const toVienna = { dropoffLatitude: 48.208, dropoffLongitude: 16.373 }
  const toMunich = { dropoffLatitude: 48.137, dropoffLongitude: 11.575 }
  const mapbox = { '16.373': 'at' }

  it('scopeLockViolation: closed market first, then cross-border; an unknown side never blocks', () => {
    expect(scopeLockViolation({ pickupCountryCode: 'DE', dropoffCountryCode: 'DE', liveCountries: ['DE'] })).toBeNull()
    expect(scopeLockViolation({ pickupCountryCode: 'AT', dropoffCountryCode: 'AT', liveCountries: ['DE'] })).toBe('country.pickupNotLive')
    expect(scopeLockViolation({ pickupCountryCode: 'DE', dropoffCountryCode: 'at', liveCountries: ['DE', 'AT'] })).toBe('country.crossBorder')
    expect(scopeLockViolation({ pickupCountryCode: 'DE', dropoffCountryCode: null, liveCountries: ['DE'] })).toBeNull()
    expect(scopeLockViolation({ pickupCountryCode: null, dropoffCountryCode: 'AT', liveCountries: ['DE'] })).toBeNull()
    expect(isCrossBorder('DE', 'de')).toBe(false)
    expect(scopeLockStatus('country.pickupNotLive')).toBe(403)
    expect(scopeLockStatus('country.crossBorder')).toBe(400)
  })

  it('a domestic move passes and a move into Austria is refused', async () => {
    const base = { ...BERLIN, liveCountries: ['DE'], token: 't' }
    expect(await resolveMoveCountryWithLock({ ...base, ...toMunich, fetchImpl: fetchBy(mapbox) })).toEqual({ countryCode: 'DE', violation: null })
    expect(await resolveMoveCountryWithLock({ ...base, ...toVienna, fetchImpl: fetchBy(mapbox) })).toEqual({
      countryCode: 'DE',
      violation: 'country.crossBorder',
    })
  })

  it('a pickup in a closed market is refused', async () => {
    const out = await resolveMoveCountryWithLock({
      pickupLatitude: 48.208, pickupLongitude: 16.373, ...toVienna, liveCountries: ['DE'], token: 't', fetchImpl: fetchBy(mapbox),
    })
    expect(out).toEqual({ countryCode: 'AT', violation: 'country.pickupNotLive' })
  })

  it('a geocoder outage lets the booking through unless the client hints say otherwise', async () => {
    const base = { ...BERLIN, ...toVienna, liveCountries: ['DE'], token: 't', fetchImpl: fetchBy(mapbox, true) }
    expect((await resolveMoveCountryWithLock(base)).violation).toBeNull()
    expect((await resolveMoveCountryWithLock({ ...base, pickupCountryCode: 'DE', dropoffCountryCode: 'AT' })).violation).toBe('country.crossBorder')
    // The client's home country prices the move but is not evidence of where it starts.
    expect(await resolveMoveCountryWithLock({ ...base, userCountryCode: 'AT' })).toEqual({ countryCode: 'AT', violation: null })
  })
})
