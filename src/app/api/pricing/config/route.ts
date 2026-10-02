import { createAdminClient } from '@/lib/appwrite-server'
import { countryToIso2 } from '@/lib/countryCode'
import { loadPricingConfig } from '@/lib/pricing-server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/pricing/config?country=IT
 *
 * Admin-editable pricing rates as a `{ key: value }` map, for the client-side
 * quote *display* (the server re-quotes on create — master D5). Only keys the
 * v3 registry knows are returned, so a stale row cannot inject a rate no
 * consumer understands. With `country` (ISO2, plan wave-2026-10/4 C5) the map
 * is the GLOBAL layer with that country's overrides laid over it; without it,
 * the GLOBAL layer alone. Returns `{}` on any failure: the caller keeps its
 * compiled defaults, so a config outage shows the previous price rather than
 * nothing.
 */
export async function GET(req: NextRequest) {
  const country = countryToIso2(req.nextUrl.searchParams.get('country'))
  try {
    const { databases } = createAdminClient()
    const rates = await loadPricingConfig(databases, country)
    return NextResponse.json({ rates, country })
  } catch (err) {
    console.warn('[pricing] config unavailable, client will use defaults:', err)
    return NextResponse.json({ rates: {}, country })
  }
}
