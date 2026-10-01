import { createAdminClient } from '@/lib/appwrite-server'
import { loadPricingConfig } from '@/lib/pricing-server'
import { NextResponse } from 'next/server'

/**
 * GET /api/pricing/config
 *
 * Admin-editable pricing rates as a `{ key: value }` map, for the client-side
 * quote *display* (the server re-quotes on create — master D5). Only keys the
 * v3 registry knows are returned, so a stale row cannot inject a rate no
 * consumer understands. Returns `{}` on any failure: the caller keeps its
 * compiled defaults, so a config outage shows the previous price rather than
 * nothing.
 */
export async function GET() {
  try {
    const { databases } = createAdminClient()
    const rates = await loadPricingConfig(databases)
    return NextResponse.json({ rates })
  } catch (err) {
    console.warn('[pricing] config unavailable, client will use defaults:', err)
    return NextResponse.json({ rates: {} })
  }
}
