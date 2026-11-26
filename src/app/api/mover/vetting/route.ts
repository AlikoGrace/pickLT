import { getTranslations } from '@/lib/i18n-server'
import { NextResponse } from 'next/server'
import { Query } from 'node-appwrite'

import { createAdminClient } from '@/lib/appwrite-server'
import { getSessionUserId } from '@/lib/auth-session'
import { APPWRITE, PLATFORM_TZ } from '@/lib/constants'
import { dailyCapCheck, loadVettingConfig } from '@/lib/mover-vetting'
import { vettingView } from '@/lib/mover-vetting-view'

/**
 * GET /api/mover/vetting (plan legal/7).
 *
 * What the driver's own screens need about residence status, the moving
 * certificate, the insurance declaration and the daily cap:
 *
 *   { cap, residenceGateFrom, hasProfile, residence, certificate, insurance, today }
 *
 * `cap` is the configured number for drivers without a verified certificate
 * and is returned even before a profile exists, because the registration form
 * states it. The document photographs are never returned: only whether one is
 * on file. Submitting goes through `POST /api/mover/submit-profile`.
 */
export async function GET() {
  const { t } = await getTranslations()
  try {
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: t('errors:auth.unauthorized') }, { status: 401 })
    }
    const { databases } = createAdminClient()
    const config = await loadVettingConfig(databases)
    const profiles = await databases.listDocuments(APPWRITE.DATABASE_ID, APPWRITE.COLLECTIONS.MOVER_PROFILES, [
      Query.equal('userId', userId),
      Query.limit(1),
    ])
    const profile = profiles.documents[0] ?? null
    const nowMs = Date.now()
    const today = profile ? await dailyCapCheck(databases, profile, config, nowMs, PLATFORM_TZ) : null
    return NextResponse.json(vettingView(profile, config, today, nowMs))
  } catch (err) {
    console.error('GET /api/mover/vetting error:', err)
    return NextResponse.json({ error: t('errors:generic.internal') }, { status: 500 })
  }
}
