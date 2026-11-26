import { getTranslations } from '@/lib/i18n-server'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/appwrite-server'
import { PLATFORM_TZ } from '@/lib/constants'
import { getSessionUserId } from '@/lib/auth-session'
import { setMoverOnline, type PositionDb } from '@/lib/mover-position-server'
import { loadVettingConfig } from '@/lib/mover-vetting'

/**
 * POST /api/mover/online — the web port of `setmoveronline` (plan legal/2, P3).
 * Body: `{ isOnline: boolean }`.
 *
 * Going online needs a verified mover, a service-ready vehicle and no fee
 * restriction; a refusal carries the same `fnCode` as the function
 * (`mover.notVerified`, `mover.vehicleNotReady`, `fees.restricted`,
 * `mover.residenceNotVerified`, `mover.residenceExpired`). Going
 * offline always succeeds and removes the stored position, unless the mover is
 * on a job and a client is still following them.
 */
export async function POST(req: NextRequest) {
  const { t } = await getTranslations()
  try {
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: t('errors:auth.unauthorized') }, { status: 401 })
    }
    const body = await req.json().catch(() => ({}))
    if (typeof body?.isOnline !== 'boolean') {
      return NextResponse.json({ error: 'isOnline is required', fnCode: 'generic.badRequest' }, { status: 400 })
    }

    const { databases } = createAdminClient()
    // The residence gate date is only needed to go online; going offline is never gated.
    const residenceGateFromMs = body.isOnline ? (await loadVettingConfig(databases)).residenceGateFromMs : null
    const result = await setMoverOnline(databases as unknown as PositionDb, {
      userId,
      isOnline: body.isOnline,
      nowMs: Date.now(),
      tz: PLATFORM_TZ,
      residenceGateFromMs,
    })
    if (!result.ok) {
      const key = result.fnCode === 'mover.notAMover' ? 'errors:mover.profileNotFound' : `errors:${result.fnCode}`
      return NextResponse.json({ ok: false, error: t(key), fnCode: result.fnCode }, { status: result.status })
    }
    return NextResponse.json({ ok: true, isOnline: result.isOnline, positionWiped: result.positionWiped })
  } catch (err) {
    console.error('POST /api/mover/online error:', err)
    return NextResponse.json({ ok: false, error: t('errors:generic.internal') }, { status: 500 })
  }
}
