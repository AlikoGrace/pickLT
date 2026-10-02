import { describe, expect, it } from 'vitest'
import {
  DEFAULT_COUNTRY_CODE,
  SUPPORTED_COUNTRIES,
  findSupportedCountry,
  isCountryLive,
  liveCountryCodes,
  parseSupportedCountries,
} from '@/lib/supportedCountries';

describe('supported countries (plan wave-2026-10/4 C3)', () => {
  it('ships Germany live and the euro-area seeds closed', () => {
    expect(DEFAULT_COUNTRY_CODE).toBe('DE');
    expect(liveCountryCodes(SUPPORTED_COUNTRIES)).toEqual(['DE']);
    expect(SUPPORTED_COUNTRIES.every((c) => c.currency === 'EUR')).toBe(true);
    expect(findSupportedCountry(SUPPORTED_COUNTRIES, 'it')?.vatRate).toBe(0.22);
    expect(findSupportedCountry(SUPPORTED_COUNTRIES, 'LU')?.vatRate).toBe(0.17);
  });
  it('parses the operator JSON and honours live flags', () => {
    const list = parseSupportedCountries(JSON.stringify([{ code: 'de', live: true }, { code: 'IT', live: true, vatRate: 0.22 }, { code: 'zz' }, { code: 'FR' }]));
    expect(list.map((c) => c.code)).toEqual(['DE', 'IT', 'FR']);
    expect(isCountryLive(list, 'IT')).toBe(true);
    expect(isCountryLive(list, 'FR')).toBe(false);
    expect(isCountryLive(list, 'PL')).toBe(false);
    expect(list.find((c) => c.code === 'DE')?.vatRate).toBe(0.19); // inherits the seed rate
  });
  it('falls back to the compiled list on garbage so no edit can close every market', () => {
    expect(parseSupportedCountries('not json')).toEqual(SUPPORTED_COUNTRIES);
    expect(parseSupportedCountries([])).toEqual(SUPPORTED_COUNTRIES);
    expect(parseSupportedCountries([{ code: 'XX', vatRate: 5 }])).toEqual(SUPPORTED_COUNTRIES);
  });
});
