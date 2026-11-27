/**
 * Currency of a market (plan `.agent/plans/currency/0.master.md`).
 *
 * Each market (country) has exactly one currency. Money is shown, calculated,
 * charged and owed in the currency of the market a move belongs to. A user's
 * own market is the country they registered with, so nobody ever picks a
 * currency: it follows from the country.
 *
 * There is no conversion between a client and a mover. A market's rates are
 * entered by the administrator in that market's currency; exchange rates are
 * used only for the platform's own reporting.
 *
 * Pure. Byte-identical in pickltmover `lib/` and pickltadmin `src/lib/`
 * (`scripts/check-lib-mirrors.sh`); pickLT `src/lib/currency.ts` is the same
 * file with one import path changed. The server functions use the mirror
 * inside `pricing-engine.js` and the helpers in `market-currency.js`.
 */

import { rate, type PricingConfig } from './pricing';

/** Currencies a market can be given. All have two decimals (minor unit = 1/100). */
export const CURRENCY_CODES = ['EUR', 'GBP', 'PLN', 'CHF', 'USD', 'GHS'] as const;
export type CurrencyCode = (typeof CURRENCY_CODES)[number];

/** What everything was before markets had a currency, and the fallback for anything unknown. */
export const DEFAULT_CURRENCY: CurrencyCode = 'EUR';

export interface CurrencyDef {
  code: CurrencyCode;
  /** Decimals of the minor unit. The engine works in whole minor units ("cents"). */
  minorUnits: 2;
  /**
   * Smallest card charge the payment provider accepts, in minor units, or
   * `null` when card payments are not offered in this currency (cash only).
   * To be confirmed against the provider's account before a market opens.
   */
  cardMinimumMinor: number | null;
}

export const CURRENCIES: Record<CurrencyCode, CurrencyDef> = {
  EUR: { code: 'EUR', minorUnits: 2, cardMinimumMinor: 50 },
  GBP: { code: 'GBP', minorUnits: 2, cardMinimumMinor: 30 },
  PLN: { code: 'PLN', minorUnits: 2, cardMinimumMinor: 200 },
  CHF: { code: 'CHF', minorUnits: 2, cardMinimumMinor: 50 },
  USD: { code: 'USD', minorUnits: 2, cardMinimumMinor: 50 },
  GHS: { code: 'GHS', minorUnits: 2, cardMinimumMinor: null },
};

export function isCurrencyCode(v: unknown): v is CurrencyCode {
  return typeof v === 'string' && (CURRENCY_CODES as readonly string[]).includes(v);
}

/** A known code (case-insensitive), or the default. Never throws, never returns nothing. */
export function normalizeCurrency(v: unknown): CurrencyCode {
  const up = typeof v === 'string' ? v.trim().toUpperCase() : '';
  return isCurrencyCode(up) ? up : DEFAULT_CURRENCY;
}

interface MarketLike {
  code?: unknown;
  currency?: unknown;
}

/** The currency of a country, from the market list; the default for an unknown country. */
export function currencyOf(countryCode: unknown, markets: readonly MarketLike[] | null | undefined): CurrencyCode {
  const cc = typeof countryCode === 'string' ? countryCode.trim().toUpperCase() : '';
  if (!cc) return DEFAULT_CURRENCY;
  const market = (markets ?? []).find((m) => typeof m?.code === 'string' && m.code.toUpperCase() === cc);
  return normalizeCurrency(market?.currency);
}

/** What a user sees before a move exists: the currency of the country they registered with. */
export function userCurrency(
  user: { countryCode?: unknown } | null | undefined,
  markets: readonly MarketLike[] | null | undefined,
): CurrencyCode {
  return currencyOf(user?.countryCode, markets);
}

/**
 * The currency of a move. The code stored on the row wins (the price was
 * calculated in it); then the pickup country; a row from before the feature is
 * euro.
 */
export function moveCurrency(
  move: { currency?: unknown; countryCode?: unknown } | null | undefined,
  markets?: readonly MarketLike[] | null,
): CurrencyCode {
  const stored = typeof move?.currency === 'string' ? move.currency.trim().toUpperCase() : '';
  if (isCurrencyCode(stored)) return stored;
  return currencyOf(move?.countryCode, markets);
}

/** Whole minor units of an amount (cents for every supported currency). */
export function toMinor(amount: unknown): number {
  const n = typeof amount === 'number' ? amount : Number(amount);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

/** Whether a card can be charged in this currency at all. */
export function cardPaymentsAvailable(currency: unknown): boolean {
  return CURRENCIES[normalizeCurrency(currency)].cardMinimumMinor !== null;
}

/** Whether a card charge of this size is below what the provider accepts. */
export function belowCardMinimum(amountMinor: number, currency: unknown): boolean {
  const min = CURRENCIES[normalizeCurrency(currency)].cardMinimumMinor;
  return min === null || amountMinor < min;
}

// ── Item prices per market ─────────────────────────────────────────────────

interface CatalogItemLike {
  unitPriceEur?: number | null;
  /** `{ "PL": 110, "GH": 300 }`, a JSON string or an object: the item's price in a market's own currency. */
  unitPrices?: unknown;
}

function marketPrices(raw: unknown): Record<string, unknown> {
  let v = raw;
  if (typeof v === 'string') {
    if (!v.trim()) return {};
    try {
      v = JSON.parse(v);
    } catch {
      return {};
    }
  }
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

/**
 * An item's unit price in a market: the price entered for that market when
 * there is one, otherwise the base price multiplied by the market's
 * `items.priceFactor` (1 by default). `null` when the item has no price at all.
 */
export function itemPriceForMarket(
  item: CatalogItemLike,
  countryCode: unknown,
  config?: PricingConfig | null,
): number | null {
  const cc = typeof countryCode === 'string' ? countryCode.trim().toUpperCase() : '';
  const own = cc ? marketPrices(item.unitPrices)[cc] : undefined;
  if (typeof own === 'number' && Number.isFinite(own) && own >= 0) return own;
  const base = item.unitPriceEur;
  if (typeof base !== 'number' || !Number.isFinite(base) || base < 0) return null;
  const factor = rate(config, 'items.priceFactor');
  return Math.round(base * (factor > 0 ? factor : 1) * 100) / 100;
}

/**
 * The catalog as the engine should see it for a market: every item's
 * `unitPriceEur` holds the price in that market's currency. (The field name is
 * a wire name from before markets had currencies; it means "unit price in the
 * quote's currency".) Returns the same array when nothing changes.
 */
export function catalogForMarket<T extends CatalogItemLike>(
  catalog: readonly T[],
  countryCode: unknown,
  config?: PricingConfig | null,
): T[] {
  let changed = false;
  const out = catalog.map((item) => {
    const price = itemPriceForMarket(item, countryCode, config);
    if (price === (item.unitPriceEur ?? null)) return item;
    changed = true;
    return { ...item, unitPriceEur: price };
  });
  return changed ? out : (catalog as T[]);
}
