/**
 * Which currency a signed-in user sees by default (plan
 * `currency/0.master.md` section 2): the currency of the country they
 * registered with. A mover's is the country of their mover profile (earnings,
 * fee balance); a client's is `users.countryCode`. Signed out, or before the
 * country is known, it is euro, which is what every page showed before
 * markets had currencies.
 *
 * A screen that shows the money of one move passes that move's own currency
 * instead (`moveCurrency(move)`), which differs only for a move outside the
 * user's own market.
 *
 * Pure: the provider (`src/components/DisplayCurrency.tsx`) feeds it the auth
 * user and the market list and hands the result to `setDisplayCurrency`.
 */
import { currencyOf, DEFAULT_CURRENCY, type CurrencyCode } from './currency'

export interface MarketCurrency {
  code: string
  currency: string
}

interface DisplayUser {
  userType?: string | null
  countryCode?: string | null
  moverDetails?: { countryCode?: string | null } | null
}

/** The country whose currency the user sees: the mover profile's for a mover, else the user's own. */
export function displayCountryOf(user: DisplayUser | null | undefined): string | null {
  if (!user) return null
  const own = typeof user.countryCode === 'string' && user.countryCode.trim() ? user.countryCode : null
  if (user.userType === 'mover') {
    const mover = user.moverDetails?.countryCode
    return typeof mover === 'string' && mover.trim() ? mover : own
  }
  return own
}

export function resolveDisplayCurrency(
  user: DisplayUser | null | undefined,
  markets: readonly MarketCurrency[] | null | undefined,
): CurrencyCode {
  const country = displayCountryOf(user)
  return country ? currencyOf(country, markets) : DEFAULT_CURRENCY
}

/** `GET /api/markets` → the list; anything unusable is dropped. */
export function parseMarkets(raw: unknown): MarketCurrency[] {
  const list = (raw as { markets?: unknown } | null)?.markets
  if (!Array.isArray(list)) return []
  return list.flatMap((m) => {
    const o = m as { code?: unknown; currency?: unknown } | null
    return o && typeof o.code === 'string' && typeof o.currency === 'string' ? [{ code: o.code, currency: o.currency }] : []
  })
}
