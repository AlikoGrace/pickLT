import { getTranslations } from '@/lib/i18n-server'
import { getSessionUserId } from '@/lib/auth-session'
import { createAdminClient } from '@/lib/appwrite-server'
import { APPWRITE } from '@/lib/constants'
import { Query } from 'node-appwrite'
import { NextResponse } from 'next/server'

/**
 * T8: the signed-in driver's monthly tax statements (rows written by the
 * `generatetaxstatements` cron). Admin client + explicit driverUserId filter —
 * the collection has document security, but this route must never rely on it.
 */
export async function GET() {
  const { t } = await getTranslations()
  try {
    const userId = await getSessionUserId()
    if (!userId) return NextResponse.json({ error: t('errors:auth.unauthorized') }, { status: 401 })

    const { databases } = createAdminClient()
    const res = await databases.listDocuments(
      APPWRITE.DATABASE_ID,
      APPWRITE.COLLECTIONS.TAX_STATEMENTS,
      [Query.equal('driverUserId', userId), Query.orderDesc('period'), Query.limit(100)],
    )
    return NextResponse.json({ statements: res.documents })
  } catch (err) {
    console.error('[tax-statements] list failed', err)
    return NextResponse.json({ error: t('errors:tax.listFailed') }, { status: 500 })
  }
}
