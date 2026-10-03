import { getTranslations } from '@/lib/i18n-server'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/appwrite-server'
import { APPWRITE } from '@/lib/constants'
import { Query } from 'node-appwrite'
import { getSessionUserId } from '@/lib/auth-session'
import { notificationListFilters } from '@/lib/notification-list-query'

/**
 * GET /api/notifications
 * List notifications for the current user
 * Query params: ?unreadOnly=true&limit=50&type=move_cancelled&since=<iso>
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
    const { type, since } = notificationListFilters(searchParams)

    const { databases } = createAdminClient()

    const queries = [
      Query.equal('userId', userId),
      Query.orderDesc('$createdAt'),
      Query.limit(limit),
    ]

    if (unreadOnly) {
      queries.push(Query.equal('isRead', false))
    }
    if (type) queries.push(Query.equal('type', type))
    if (since) queries.push(Query.greaterThan('$createdAt', since))

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

/** Unread rows marked per "mark all" call; the bell lists 10, so one page covers it in practice. */
const MARK_ALL_PAGE = 100

/**
 * PATCH /api/notifications
 * Mark the caller's notifications read.
 * Body: `{ id }` for one row, or `{ all: true }` for every unread row.
 * A row addressed to someone else answers 404, the same as a missing one.
 */
export async function PATCH(req: Request) {
  const { t } = await getTranslations()
  try {
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: t('errors:auth.unauthorized') }, { status: 401 })
    }
    const body = (await req.json().catch(() => ({}))) as { id?: unknown; all?: unknown }
    const { databases } = createAdminClient()
    const db = APPWRITE.DATABASE_ID
    const col = APPWRITE.COLLECTIONS.NOTIFICATIONS

    if (body.all === true) {
      const unread = await databases.listDocuments(db, col, [
        Query.equal('userId', userId),
        Query.equal('isRead', false),
        Query.limit(MARK_ALL_PAGE),
      ])
      await Promise.all(unread.documents.map((doc) => databases.updateDocument(db, col, doc.$id, { isRead: true })))
      return NextResponse.json({ ok: true, updated: unread.documents.length })
    }

    if (typeof body.id !== 'string' || !body.id) {
      return NextResponse.json({ error: t('errors:validation.noFields') }, { status: 400 })
    }
    const doc = await databases.getDocument(db, col, body.id).catch(() => null)
    if (!doc || doc.userId !== userId) {
      return NextResponse.json({ error: t('errors:generic.saveFailed') }, { status: 404 })
    }
    if (!doc.isRead) await databases.updateDocument(db, col, doc.$id, { isRead: true })
    return NextResponse.json({ ok: true, updated: doc.isRead ? 0 : 1 })
  } catch (err) {
    console.error('PATCH /api/notifications error:', err)
    return NextResponse.json({ error: t('errors:generic.internal') }, { status: 500 })
  }
}
