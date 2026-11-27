'use client'

import { useEffect, useState } from 'react'
import { parseMarkets, type MarketCurrency } from '@/lib/display-currency'
import { SUPPORTED_COUNTRIES } from '@/lib/supportedCountries'

/**
 * The markets and their currencies (plan currency/0), from `GET /api/markets`.
 *
 * One fetch per browser session, shared by every caller. Until it lands (and
 * if it fails) the compiled list applies, in which every market is euro: a
 * page shows what it showed before markets had currencies, never a blank.
 */
const COMPILED: readonly MarketCurrency[] = SUPPORTED_COUNTRIES.map((m) => ({ code: m.code, currency: m.currency }))

let cached: readonly MarketCurrency[] | null = null
let inflight: Promise<readonly MarketCurrency[]> | null = null

function fetchMarkets(): Promise<readonly MarketCurrency[]> {
  if (cached) return Promise.resolve(cached)
  if (!inflight) {
    inflight = fetch('/api/markets')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const list = parseMarkets(data)
        if (list.length > 0) cached = list
        return cached ?? COMPILED
      })
      .catch(() => COMPILED)
      .finally(() => {
        inflight = null
      })
  }
  return inflight
}

export function useMarkets(): readonly MarketCurrency[] {
  const [markets, setMarkets] = useState<readonly MarketCurrency[]>(() => cached ?? COMPILED)
  useEffect(() => {
    let cancelled = false
    fetchMarkets().then((list) => {
      if (!cancelled) setMarkets(list)
    })
    return () => {
      cancelled = true
    }
  }, [])
  return markets
}
