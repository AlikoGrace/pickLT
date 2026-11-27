/**
 * The currency and item prices of a market, for the server functions (plan
 * `.agent/plans/currency/0.master.md`). Port of `lib/currency.ts`.
 *
 * Each market has one currency, set by the operator in
 * `platform_config.supported_countries`. A function resolves it from the
 * move's pickup country and stores it on the move; nothing is ever converted.
 *
 * Import-free. Byte-identical in every function that carries it
 * (`SHARED_FILES` in scripts/check-function-mirrors.sh); a parity test runs it
 * against the TS module.
 */

export const CURRENCY_CODES = ['EUR', 'GBP', 'PLN', 'CHF', 'USD', 'GHS'];
export const DEFAULT_CURRENCY = 'EUR';

/** Smallest card charge per currency, in minor units; `null` = no card payments (cash only). */
export const CARD_MINIMUM_MINOR = { EUR: 50, GBP: 30, PLN: 200, CHF: 50, USD: 50, GHS: null };

export function isCurrencyCode(v) {
  return typeof v === 'string' && CURRENCY_CODES.includes(v);
}

export function normalizeCurrency(v) {
  const up = typeof v === 'string' ? v.trim().toUpperCase() : '';
  return isCurrencyCode(up) ? up : DEFAULT_CURRENCY;
}

function parseList(raw) {
  let v = raw;
  if (typeof v === 'string') {
    try {
      v = JSON.parse(v);
    } catch {
      return [];
    }
  }
  return Array.isArray(v) ? v : [];
}

/** The currency of a country in the operator's `supported_countries` document (JSON string or array). */
export function currencyOf(countryCode, markets) {
  const cc = typeof countryCode === 'string' ? countryCode.trim().toUpperCase() : '';
  if (!cc) return DEFAULT_CURRENCY;
  const market = parseList(markets).find((m) => m && typeof m.code === 'string' && m.code.toUpperCase() === cc);
  return normalizeCurrency(market ? market.currency : null);
}

/** The currency of a move: the stored code, then its country's, then euro. */
export function moveCurrency(move, markets) {
  const stored = move && typeof move.currency === 'string' ? move.currency.trim().toUpperCase() : '';
  if (isCurrencyCode(stored)) return stored;
  return currencyOf(move ? move.countryCode : null, markets);
}

/**
 * The currency of a market, read from `platform_config`. Never throws: an
 * unreadable config or an unknown country is euro, which is what every market
 * was before this feature.
 */
export async function loadMarketCurrency({ databases, Query, databaseId, collectionId, countryCode, error }) {
  if (!countryCode) return DEFAULT_CURRENCY;
  try {
    const res = await databases.listDocuments(databaseId, collectionId || 'platform_config', [
      Query.equal('key', 'supported_countries'),
      Query.limit(1),
    ]);
    const row = res.documents && res.documents[0];
    return currencyOf(countryCode, row ? row.value : null);
  } catch (e) {
    if (typeof error === 'function') error(`market currency unavailable for ${countryCode} (EUR applies): ${e.message}`);
    return DEFAULT_CURRENCY;
  }
}

export function toMinor(amount) {
  const n = typeof amount === 'number' ? amount : Number(amount);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

export function cardPaymentsAvailable(currency) {
  return CARD_MINIMUM_MINOR[normalizeCurrency(currency)] !== null;
}

export function belowCardMinimum(amountMinor, currency) {
  const min = CARD_MINIMUM_MINOR[normalizeCurrency(currency)];
  return min === null || amountMinor < min;
}

// ── Item prices per market ─────────────────────────────────────────────────

function marketPrices(raw) {
  let v = raw;
  if (typeof v === 'string') {
    if (!v.trim()) return {};
    try {
      v = JSON.parse(v);
    } catch {
      return {};
    }
  }
  return v && typeof v === 'object' && !Array.isArray(v) ? v : {};
}

/** `config` is the override map of the market (`toPricingConfig`); the factor defaults to 1. */
export function itemPriceForMarket(item, countryCode, config) {
  const cc = typeof countryCode === 'string' ? countryCode.trim().toUpperCase() : '';
  const own = cc ? marketPrices(item.unitPrices)[cc] : undefined;
  if (typeof own === 'number' && Number.isFinite(own) && own >= 0) return own;
  const base = item.unitPriceEur;
  if (typeof base !== 'number' || !Number.isFinite(base) || base < 0) return null;
  const raw = config ? config['items.priceFactor'] : undefined;
  const factor = typeof raw === 'number' && Number.isFinite(raw) && raw > 0 ? raw : 1;
  return Math.round(base * factor * 100) / 100;
}

/** The catalog with every item's `unitPriceEur` holding the price in the market's currency. */
export function catalogForMarket(catalog, countryCode, config) {
  let changed = false;
  const out = (catalog || []).map((item) => {
    const price = itemPriceForMarket(item, countryCode, config);
    if (price === (item.unitPriceEur ?? null)) return item;
    changed = true;
    return { ...item, unitPriceEur: price };
  });
  return changed ? out : catalog;
}
