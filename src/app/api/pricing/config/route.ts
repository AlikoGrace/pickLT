import { createAdminClient } from '@/lib/appwrite-server'
import { APPWRITE } from '@/lib/constants'
import { Query } from 'node-appwrite'
import { NextResponse } from 'next/server'

/**
 * GET /api/pricing/config
 *
 * Admin-editable pricing rates as a `{ key: value }` map, for the client-side
 * quote preview. Returns `{}` on any failure: the caller keeps its compiled
 * defaults, so a config outage shows the previous price rather than nothing.
 */
export async function GET() {
  try {
    const { databases } = createAdminClient()
    const res = await databases.listDocuments(
      APPWRITE.DATABASE_ID,
      process.env.APPWRITE_COLLECTION_PRICING_CONFIG || 'pricing_config',
      [Query.limit(200)],
    )
    const rates: Record<string, number> = {}
    for (const doc of res.documents) {
      const key = (doc as { key?: unknown }).key
      const value = (doc as { value?: unknown }).value
      if (typeof key === 'string' && typeof value === 'number' && Number.isFinite(value)) {
        rates[key] = value
      }
    }
    return NextResponse.json({ rates })
  } catch (err) {
    console.warn('[pricing] config unavailable, client will use defaults:', err)
    return NextResponse.json({ rates: {} })
  }
}
