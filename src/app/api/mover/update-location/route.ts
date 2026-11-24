import { getTranslations } from '@/lib/i18n-server'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/appwrite-server'
import { PLATFORM_TZ } from '@/lib/constants'
import { getSessionUserId } from '@/lib/auth-session'
import { recordMoverPosition, type PositionDb } from '@/lib/mover-position-server'

/**
 * POST /api/mover/update-location
 *
 * The web port of `updatemoverlocation`. Receives the mover's GPS position and,
 * when the mover is online or on a job, upserts their one `mover_locations` row
 * and mirrors the position onto the profile. A ping from a mover who is
 * neither is dropped with `{ success: true, shared: false }` and nothing is
 * stored (plan legal/2, P2).
 *
 * It never sets `isOnline`. That used to happen on every ping, so an open
 * dashboard tab meant "online"; the switch is `POST /api/mover/online` now.
 */
export async function POST(req: NextRequest) {
  const { t } = await getTranslations()
  try {
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: t('errors:auth.unauthorized') }, { status: 401 })
    }

    const { latitude, longitude, heading, speed, moveId } = await req.json()

    if (
      typeof latitude !== 'number' ||
      typeof longitude !== 'number' ||
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      Math.abs(latitude) > 90 ||
      Math.abs(longitude) > 180
    ) {
      return NextResponse.json(
        { error: 'latitude and longitude are required numbers' },
        { status: 400 }
      )
    }

    const { databases } = createAdminClient()
    const result = await recordMoverPosition(databases as unknown as PositionDb, {
      userId,
      latitude,
      longitude,
      heading: typeof heading === 'number' ? heading : null,
      speed: typeof speed === 'number' ? speed : null,
      moveId: typeof moveId === 'string' ? moveId : null,
      nowMs: Date.now(),
      tz: PLATFORM_TZ,
    })

    if (!result.ok) {
      return NextResponse.json({ error: t('errors:mover.profileNotFound') }, { status: 404 })
    }
    if (!result.shared) {
      return NextResponse.json({ success: true, shared: false, reason: result.reason })
    }
    return NextResponse.json({ success: true, shared: true })
  } catch (err) {
    console.error('POST /api/mover/update-location error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : t('errors:generic.internal') },
      { status: 500 }
    )
  }
}
