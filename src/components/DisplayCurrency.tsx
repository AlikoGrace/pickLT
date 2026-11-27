'use client'

import { createContext, useContext, useEffect, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { useAuth } from '@/context/auth'
import { useMarkets } from '@/hooks/useMarkets'
import { currencyOf, DEFAULT_CURRENCY, type CurrencyCode } from '@/lib/currency'
import { resolveDisplayCurrency } from '@/lib/display-currency'
import { getDisplayCurrency, setDisplayCurrency } from '@/lib/format'

/**
 * The currency money is shown in when a screen names none (plan currency/0):
 * the currency of the signed-in user's own market. A client's is the country
 * they registered with, a mover's the country of their mover profile; signed
 * out it is euro again.
 *
 * `formatMoney` reads a module-level default (`setDisplayCurrency`), exactly as
 * it reads the active language, so nothing subscribes to it. When the default
 * changes, the pages have to render again. They already do that for a language
 * change: every `useTranslation()` re-renders on the instance's
 * `languageChanged` event. This provider raises that same event (the language
 * itself is unchanged), so every translated component re-renders once and
 * formats in the new currency. With only euro markets the currency never
 * changes and nothing is raised.
 *
 * Browser only: the default is set in an effect, never during a server render,
 * where one process serves many users. Server-rendered output stays euro.
 */
const DisplayCurrencyContext = createContext<CurrencyCode>(DEFAULT_CURRENCY)

/** The signed-in user's currency, for a component that wants to depend on it explicitly. */
export function useDisplayCurrency(): CurrencyCode {
  return useContext(DisplayCurrencyContext)
}

/**
 * The currency of a quote before the move exists (plan currency/0 W2): the
 * pickup market's once the pickup country is known, the user's own until then.
 * The server prices the move in the pickup market's currency on create.
 */
export function useQuoteCurrency(pickupCountryCode: string | null | undefined): CurrencyCode {
  const own = useContext(DisplayCurrencyContext)
  const markets = useMarkets()
  return pickupCountryCode ? currencyOf(pickupCountryCode, markets) : own
}

export default function DisplayCurrencyProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const markets = useMarkets()
  const { i18n } = useTranslation()
  const currency = resolveDisplayCurrency(user, markets)

  useEffect(() => {
    if (getDisplayCurrency() === currency) return
    setDisplayCurrency(currency)
    i18n.emit('languageChanged', i18n.language)
  }, [currency, i18n])

  return <DisplayCurrencyContext.Provider value={currency}>{children}</DisplayCurrencyContext.Provider>
}
