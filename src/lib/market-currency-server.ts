import type { Databases } from 'node-appwrite'
import { Query } from 'node-appwrite'

import { APPWRITE } from './constants'
import { currencyOf, DEFAULT_CURRENCY, type CurrencyCode } from './currency'
import { parseSupportedCountries, SUPPORTED_COUNTRIES, type SupportedCountry } from './supportedCountries'

const PLATFORM_CONFIG_COLLECTION = 'platform_config'

/**
 * The markets and their currencies for the route handlers (plan
 * `currency/0.master.md`). Web port of the functions' `market-currency.js`
 * loader: each market has one currency, set by the operator in
 * `platform_config.supported_countries`; a route resolves it from the move's
 * pickup country and stores it on the move. Nothing is ever converted.
 * Server-only: imports `node-appwrite`.
 */

/**
 * The operator's market list, else the compiled defaults. Never throws: an
 * unreadable config leaves every market as it was before markets had
 * currencies (euro).
 */
export async function loadMarkets(databases: Databases): Promise<SupportedCountry[]> {
  try {
    const cfg = await databases.listDocuments(APPWRITE.DATABASE_ID, PLATFORM_CONFIG_COLLECTION, [
      Query.equal('key', 'supported_countries'),
      Query.limit(1),
    ])
    const raw = (cfg.documents[0] as unknown as { value?: string } | undefined)?.value
    if (raw) return parseSupportedCountries(raw)
  } catch (e) {
    console.warn('[currency] market list unavailable (compiled defaults apply):', e instanceof Error ? e.message : e)
  }
  return [...SUPPORTED_COUNTRIES]
}

/** The currency of one market; euro for an unknown country or an unreadable config. */
export async function loadMarketCurrency(databases: Databases, countryCode: unknown): Promise<CurrencyCode> {
  if (typeof countryCode !== 'string' || !countryCode.trim()) return DEFAULT_CURRENCY
  return currencyOf(countryCode, await loadMarkets(databases))
}
