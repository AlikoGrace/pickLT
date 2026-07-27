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
  try {
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '25', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    const { databases } = createAdminClient()

    const queries = [
      Query.equal('clientId', userId),
      // The mobile app creates a `moves` row when its booking wizard opens and
      // patches it per step (`wizardDraft: true` until submit). An unfinished
      // booking is not a move, so it must not appear in the user's move list.
      // `notEqual` so rows predating the attribute still match.
      Query.notEqual('wizardDraft', true),
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
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
