/**
 * Supported countries — where PickLT sells moves (plan `wave-2026-10/4` C3).
 *
 * Operator-editable through `platform_config.supported_countries` (JSON array of
 * `SupportedCountry`); these are the compiled defaults the apps and functions
 * fall back to. `live:false` = seeded (pricing rows + tax rules exist) but not
 * open: sign-up and booking are refused with a friendly message, movers may
 * register and wait. v1 is euro-area only — the platform charges in EUR
 * (Stripe, payments, formatters); non-euro markets need the T9 FX work first.
 *
 * Standard VAT rates as of 2026 (eurofiscalis.com, hellotax.com, euvat.dev).
 * Place of supply for a consumer move inside the EU is the country of
 * departure, so a move is priced in the PICKUP country's rules (C2).
 *
 * Web PORT of `pickltmobile/lib/supported-countries.ts` (source of truth); the
 * mover and admin repos carry byte-identical copies.
 */

export interface SupportedCountry {
  /** ISO-3166-1 alpha-2 */
  code: string;
  currency: 'EUR';
  /** Standard VAT rate as a fraction — the seed for `pricing_config` `tax.vatRate` scoped to this country. */
  vatRate: number;
  /** Open for clients and movers. */
  live: boolean;
  /** IANA zone used for service days and schedules in this market. */
  timeZone: string;
}

export const GLOBAL_PRICING_SCOPE = 'GLOBAL';

export const SUPPORTED_COUNTRIES: readonly SupportedCountry[] = [
  { code: 'DE', currency: 'EUR', vatRate: 0.19, live: true, timeZone: 'Europe/Berlin' },
  { code: 'AT', currency: 'EUR', vatRate: 0.2, live: false, timeZone: 'Europe/Vienna' },
  { code: 'NL', currency: 'EUR', vatRate: 0.21, live: false, timeZone: 'Europe/Amsterdam' },
  { code: 'BE', currency: 'EUR', vatRate: 0.21, live: false, timeZone: 'Europe/Brussels' },
  { code: 'FR', currency: 'EUR', vatRate: 0.2, live: false, timeZone: 'Europe/Paris' },
  { code: 'IT', currency: 'EUR', vatRate: 0.22, live: false, timeZone: 'Europe/Rome' },
  { code: 'ES', currency: 'EUR', vatRate: 0.21, live: false, timeZone: 'Europe/Madrid' },
  { code: 'PT', currency: 'EUR', vatRate: 0.23, live: false, timeZone: 'Europe/Lisbon' },
  { code: 'IE', currency: 'EUR', vatRate: 0.23, live: false, timeZone: 'Europe/Dublin' },
  { code: 'LU', currency: 'EUR', vatRate: 0.17, live: false, timeZone: 'Europe/Luxembourg' },
];

/** The market everything defaulted to before countries existed. */
export const DEFAULT_COUNTRY_CODE = 'DE';

/**
 * Parses the operator's `platform_config.supported_countries` JSON. Unknown or
 * malformed entries are dropped; an empty/invalid document yields the compiled
 * defaults so a bad edit can never close every market at once.
 */
export function parseSupportedCountries(raw: unknown): SupportedCountry[] {
  let value: unknown = raw;
  if (typeof raw === 'string') {
    try {
      value = JSON.parse(raw);
    } catch {
      return [...SUPPORTED_COUNTRIES];
    }
  }
  if (!Array.isArray(value)) return [...SUPPORTED_COUNTRIES];
  const out: SupportedCountry[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const o = item as Record<string, unknown>;
    const code = typeof o.code === 'string' ? o.code.toUpperCase() : '';
    if (!/^[A-Z]{2}$/.test(code)) continue;
    const def = SUPPORTED_COUNTRIES.find((c) => c.code === code);
    const vat = typeof o.vatRate === 'number' && Number.isFinite(o.vatRate) ? o.vatRate : def?.vatRate;
    if (vat == null || vat < 0 || vat > 1) continue;
    out.push({
      code,
      currency: 'EUR',
      vatRate: vat,
      live: o.live === true,
      timeZone: typeof o.timeZone === 'string' && o.timeZone ? o.timeZone : def?.timeZone ?? 'Europe/Berlin',
    });
  }
  return out.length ? out : [...SUPPORTED_COUNTRIES];
}

export function findSupportedCountry(
  list: readonly SupportedCountry[],
  code: string | null | undefined,
): SupportedCountry | null {
  if (!code) return null;
  const up = code.toUpperCase();
  return list.find((c) => c.code === up) ?? null;
}

/** Can clients sign up / book and movers be matched in this country right now? */
export function isCountryLive(list: readonly SupportedCountry[], code: string | null | undefined): boolean {
  return findSupportedCountry(list, code)?.live === true;
}

/** ISO2 codes that are live, for pickers. */
export function liveCountryCodes(list: readonly SupportedCountry[]): string[] {
  return list.filter((c) => c.live).map((c) => c.code);
}
