import { getTranslations } from '@/lib/i18n-server'
import { createAdminClient } from '@/lib/appwrite-server'
import { APPWRITE } from '@/lib/constants'
import { MOVER_LEDGER_COLLECTION, snapshotOf } from '@/lib/fee-ledger-server'
import { isErrorResponse, requireMoverProfile } from '@/lib/mover-auth'
import { stripeConfigured } from '@/lib/stripe-server'
import { Query } from 'node-appwrite'
import { NextRequest, NextResponse } from 'next/server'

const DEFAULT_PAGE = 25
const MAX_PAGE = 100

/**
 * GET /api/mover/fees?limit=25&cursor=<rowId>
 *
 * The session driver's platform balance (plan `fees/0.master.md` §6/§11): the
 * profile snapshot plus their own `mover_ledger` rows, newest first, paged by
 * cursor. Admin client, scoped strictly to the session's profile — the ledger
 * has no collection-level read.
 */
export async function GET(req: NextRequest) {
  const { t } = await getTranslations()
  try {
    const auth = await requireMoverProfile()
    if (isErrorResponse(auth)) return auth
    const { moverProfile } = auth

    const { searchParams } = req.nextUrl
    const requested = parseInt(searchParams.get('limit') || '', 10)
    const limit = Number.isFinite(requested) ? Math.min(Math.max(requested, 1), MAX_PAGE) : DEFAULT_PAGE
    const cursor = searchParams.get('cursor')

    const { databases } = createAdminClient()
    const queries = [
      Query.equal('moverProfileId', moverProfile.$id),
      Query.orderDesc('$createdAt'),
      Query.limit(limit),
    ]
    if (cursor) queries.push(Query.cursorAfter(cursor))

    let rows: Record<string, any>[] = []
    let total = 0
    try {
      const page = await databases.listDocuments(APPWRITE.DATABASE_ID, MOVER_LEDGER_COLLECTION, queries)
      rows = page.documents
      total = page.total
    } catch (err) {
      // Before the schema lands (or with a stale cursor) the balance still renders: no history.
      const code = (err as { code?: number })?.code
      if (code !== 404 && code !== 400) throw err
      console.warn('[fees] ledger read failed, returning no rows:', err)
    }

    return NextResponse.json({
      ...snapshotOf(moverProfile),
      payAvailable: stripeConfigured(),
      entries: rows.map((r) => ({
        id: r.$id,
        kind: r.kind,
        amountCents: r.amountCents,
        currency: r.currency ?? 'EUR',
        moveId: r.moveId ?? null,
        moveHandle: r.moveHandle ?? null,
        dueAt: r.dueAt ?? null,
        method: r.method ?? null,
        note: r.note ?? null,
        createdAt: r.$createdAt,
      })),
      total,
      nextCursor: rows.length === limit ? rows[rows.length - 1].$id : null,
    })
  } catch (error) {
    console.error('GET /api/mover/fees error:', error)
    return NextResponse.json({ error: t('errors:fees.loadFailed') }, { status: 500 })
  }
}
