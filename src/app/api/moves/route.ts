import { getTranslations } from '@/lib/i18n-server'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/appwrite-server'
import { APPWRITE } from '@/lib/constants'
import { Query } from 'node-appwrite'
import { getSessionUserId } from '@/lib/auth-session'

/**
 * GET /api/moves
 * List moves for the authenticated user
 * Query params: ?status=paid&limit=25&offset=0
 */
export async function GET(req: NextRequest) {
  const { t } = await getTranslations()
  try {
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: t('errors:auth.unauthorized') }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '25', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    const { databases } = createAdminClient()

    const queries = [
      Query.equal('clientId', userId),
      // Exclude in-progress mobile booking wizards (`wizardDraft: true` until
      // submit). The isNull branch matters: adding `wizardDraft` with
      // `default: false` did NOT backfill existing rows, and `null != true` is
      // null in SQL, so a bare notEqual dropped every pre-existing move.
      // Those rows were backfilled 2026-07-27; the branch stays as insurance.
      Query.or([Query.notEqual('wizardDraft', true), Query.isNull('wizardDraft')]),
      Query.limit(limit),
      Query.offset(offset),
      Query.orderDesc('$createdAt'),
    ]

    if (status) {
      queries.push(Query.equal('status', status))
    }

    const moves = await databases.listDocuments(
      APPWRITE.DATABASE_ID,
      APPWRITE.COLLECTIONS.MOVES,
      queries
    )

    return NextResponse.json({
      documents: moves.documents,
      total: moves.total,
    })
  } catch (err) {
    console.error('GET /api/moves error:', err)
    return NextResponse.json({ error: t('errors:generic.internal') }, { status: 500 })
  }
}
