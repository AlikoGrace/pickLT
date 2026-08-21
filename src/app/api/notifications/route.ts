import { getTranslations } from '@/lib/i18n-server'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/appwrite-server'
import { APPWRITE } from '@/lib/constants'
import { Query } from 'node-appwrite'
import { getSessionUserId } from '@/lib/auth-session'

/**
 * GET /api/notifications
 * List notifications for the current user
 * Query params: ?unreadOnly=true&limit=50
 */
export async function GET(req: Request) {
  const { t } = await getTranslations()
  try {
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: t('errors:auth.unauthorized') }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const unreadOnly = searchParams.get('unreadOnly') === 'true'
    const limit = parseInt(searchParams.get('limit') || '50', 10)

    const { databases } = createAdminClient()

    const queries = [
      Query.equal('userId', userId),
      Query.orderDesc('$createdAt'),
      Query.limit(limit),
    ]

    if (unreadOnly) {
      queries.push(Query.equal('isRead', false))
    }

    const notifications = await databases.listDocuments(
      APPWRITE.DATABASE_ID,
      APPWRITE.COLLECTIONS.NOTIFICATIONS,
      queries
    )

    return NextResponse.json({
      documents: notifications.documents,
      total: notifications.total,
    })
  } catch (err) {
    console.error('GET /api/notifications error:', err)
    return NextResponse.json({ error: t('errors:generic.internal') }, { status: 500 })
  }
}
