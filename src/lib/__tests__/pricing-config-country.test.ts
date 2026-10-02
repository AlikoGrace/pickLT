import { describe, expect, it } from 'vitest'
import { GLOBAL_PRICING_SCOPE, pricingRowScope, toPricingConfig } from '@/lib/pricing';
import { quoteMove } from '@/lib/pricingEngine';

// Plan wave-2026-10/4 C4/C5: one registry, country rows laid over the GLOBAL layer.
const rows = [
  { key: 'tax.vatRate', value: 0.19 }, // legacy row, no country column → GLOBAL
  { key: 'tax.vatRate', value: 0.22, country: 'IT' },
  { key: 'tax.vatRate', value: 0.2, country: 'fr' },
  { key: 'tier.regular.basePrice', value: 60, country: 'GLOBAL' },
  { key: 'tier.regular.basePrice', value: 70, country: 'IT' },
  { key: 'pricing.minimumCharge', value: 55, country: 'IT' },
  { key: 'nope.unknown', value: 1, country: 'IT' },
  { key: 'tier.light.basePrice', value: 'abc', country: 'IT' },
];

describe('toPricingConfig with a country', () => {
  it('without a country only the GLOBAL layer applies', () => {
    expect(toPricingConfig(rows)).toEqual({ 'tax.vatRate': 0.19, 'tier.regular.basePrice': 60 });
  });
  it('lays the country rows over the base and ignores other countries', () => {
    expect(toPricingConfig(rows, 'IT')).toEqual({
      'tax.vatRate': 0.22,
      'tier.regular.basePrice': 70,
      'pricing.minimumCharge': 55,
    });
    expect(toPricingConfig(rows, 'FR')).toEqual({ 'tax.vatRate': 0.2, 'tier.regular.basePrice': 60 });
  });
  it('matches the country case-insensitively and treats blanks as GLOBAL', () => {
    expect(toPricingConfig(rows, 'it')['tax.vatRate']).toBe(0.22);
    expect(pricingRowScope({ key: 'x', value: 1 })).toBe(GLOBAL_PRICING_SCOPE);
    expect(pricingRowScope({ key: 'x', value: 1, country: ' de ' })).toBe('DE');
  });
  it('an unknown country falls back to the GLOBAL layer alone', () => {
    expect(toPricingConfig(rows, 'ZZ')).toEqual({ 'tax.vatRate': 0.19, 'tier.regular.basePrice': 60 });
  });
});

describe('quoteMove records the market it priced for', () => {
  const basket = { counts: {}, customItems: [] };
  it('prices an Italian pickup at 22 % and stamps IT on the breakdown', () => {
    const it = quoteMove({ tier: 'regular', mode: 'scheduled', distanceKm: 10, durationSeconds: 900, basket, catalog: [], countryCode: 'it' }, toPricingConfig(rows, 'IT'));
    const de = quoteMove({ tier: 'regular', mode: 'scheduled', distanceKm: 10, durationSeconds: 900, basket, catalog: [], countryCode: 'DE' }, toPricingConfig(rows, 'DE'));
    expect(it.countryCode).toBe('IT');
    expect(it.vatRate).toBe(0.22);
    expect(it.rates['tax.vatRate']).toBe(0.22);
    expect(de.countryCode).toBe('DE');
    expect(de.vatRate).toBe(0.19);
    expect(it.total).toBeGreaterThan(de.total);
  });
  it('omits the field when no country is known (pre-wave quotes keep their shape)', () => {
    const q = quoteMove({ tier: 'light', mode: 'instant', distanceKm: 1, durationSeconds: 60, basket, catalog: [] });
    expect('countryCode' in q).toBe(false);
  });
});
