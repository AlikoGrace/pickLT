import { describe, expect, it } from 'vitest'
import { COUNTRIES, countryFlag, countryName, countryToIso2, isCountryCode, localizedCountryName, normCountry } from '@/lib/countryCode';

describe('countryToIso2 — one resolver for every spelling (plan wave-2026-10/4 C1)', () => {
  it('passes valid codes through in any case and rejects unknown codes', () => {
    expect(countryToIso2('DE')).toBe('DE');
    expect(countryToIso2('it')).toBe('IT');
    expect(countryToIso2('xk')).toBe('XK');
    expect(countryToIso2('ZZ')).toBeNull();
    expect(countryToIso2('UK')).toBe('GB'); // two-letter alias, not a code
  });
  it('resolves the English picker names, including punctuation variants', () => {
    expect(countryToIso2('Germany')).toBe('DE');
    expect(countryToIso2('Netherlands')).toBe('NL');
    expect(countryToIso2('Côte d’Ivoire')).toBe('CI');
    expect(countryToIso2('Antigua & Barbuda')).toBe('AG');
    expect(countryToIso2('Türkiye')).toBe('TR');
  });
  it('resolves the native spellings the old maps knew', () => {
    expect(countryToIso2('Deutschland')).toBe('DE');
    expect(countryToIso2('Österreich')).toBe('AT');
    expect(countryToIso2('Schweiz')).toBe('CH');
    expect(countryToIso2('Nederland')).toBe('NL');
    expect(countryToIso2('Polska')).toBe('PL');
    expect(countryToIso2('España')).toBe('ES');
    expect(countryToIso2('Italia')).toBe('IT');
  });
  it('accepts Mapbox short codes', () => {
    expect(countryToIso2('country.de')).toBe('DE');
  });
  it('never guesses', () => {
    expect(countryToIso2('')).toBeNull();
    expect(countryToIso2('  ')).toBeNull();
    expect(countryToIso2('Atlantis')).toBeNull();
    expect(countryToIso2(42)).toBeNull();
    expect(countryToIso2(null)).toBeNull();
  });
  it('round-trips every generated country', () => {
    for (const c of COUNTRIES) expect(countryToIso2(c.name)).toBe(c.code);
    expect(COUNTRIES.length).toBeGreaterThanOrEqual(245);
  });
});

describe('helpers', () => {
  it('isCountryCode', () => {
    expect(isCountryCode('de')).toBe(true);
    expect(isCountryCode('DEU')).toBe(false);
    expect(isCountryCode(null)).toBe(false);
  });
  it('countryName and flags', () => {
    expect(countryName('de')).toBe('Germany');
    expect(countryName('ZZ')).toBeNull();
    expect(countryFlag('DE')).toBe('🇩🇪');
    expect(countryFlag(null)).toBe('');
  });
  it('localizedCountryName falls back to English', () => {
    expect(['Deutschland', 'Germany']).toContain(localizedCountryName('DE', 'de'));
    expect(localizedCountryName('DE', 'en')).toBe('Germany');
  });
  it('normCountry strips accents and normalises connectors', () => {
    expect(normCountry('Côte  d’Ivoire')).toBe("cote d'ivoire");
    expect(normCountry('Bosnia & Herzegovina')).toBe('bosnia and herzegovina');
  });
});
