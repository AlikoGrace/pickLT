import { getTranslations } from '@/lib/i18n-server'
import { getSessionUserId } from '@/lib/auth-session'
import { createAdminClient } from '@/lib/appwrite-server'
import { APPWRITE } from '@/lib/constants'
import { NextRequest, NextResponse } from 'next/server'

/**
 * T8: proxies a statement PDF from the locked `tax-statements` bucket (no
 * public read; files carry per-user permission for the mobile app). The web
 * session can't present Appwrite file auth directly, so this route verifies
 * ownership server-side and streams the bytes with the server key.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { t } = await getTranslations()
  try {
    const userId = await getSessionUserId()
    if (!userId) return NextResponse.json({ error: t('errors:auth.unauthorized') }, { status: 401 })

    const { id } = await params
    const { databases, storage } = createAdminClient()

    const statement = await databases.getDocument(
      APPWRITE.DATABASE_ID,
      APPWRITE.COLLECTIONS.TAX_STATEMENTS,
      id,
    )
    if (statement.driverUserId !== userId) {
      return NextResponse.json({ error: t('errors:auth.forbidden') }, { status: 403 })
    }
    if (!statement.fileId) {
      return NextResponse.json({ error: t('errors:tax.pdfNotReady') }, { status: 404 })
    }

    const bytes = await storage.getFileDownload(APPWRITE.BUCKETS.TAX_STATEMENTS, statement.fileId)
    return new NextResponse(Buffer.from(bytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${statement.number ?? 'statement'}.pdf"`,
        'Cache-Control': 'private, max-age=0',
      },
    })
  } catch (err) {
    console.error('[tax-statements] pdf failed', err)
    return NextResponse.json({ error: t('errors:tax.pdfLoadFailed') }, { status: 500 })
  }
}
