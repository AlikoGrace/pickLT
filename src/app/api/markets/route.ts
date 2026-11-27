import { createAdminClient } from '@/lib/appwrite-server'
import { loadMarkets } from '@/lib/market-currency-server'
import { SUPPORTED_COUNTRIES } from '@/lib/supportedCountries'
import { NextResponse } from 'next/server'

/**
 * GET /api/markets
 *
 * The markets and the one currency of each (plan `currency/0.master.md`), for
 * the pages: the display currency of the signed-in user (the country they
 * registered with) and the currency of a quote before the move exists (the
 * pickup country). Nothing here is personal; the same list for everyone.
 * Never fails: the compiled list (every market in euro) is the fallback.
 */
export async function GET() {
  const shape = (list: readonly { code: string; currency: string }[]) =>
    list.map((m) => ({ code: m.code, currency: m.currency }))
  try {
    const { databases } = createAdminClient()
    return NextResponse.json({ markets: shape(await loadMarkets(databases)) })
  } catch (err) {
    console.warn('[currency] GET /api/markets falling back to the compiled list:', err)
    return NextResponse.json({ markets: shape(SUPPORTED_COUNTRIES) })
  }
}
