import { getTranslations } from '@/lib/i18n-server'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, withRetry } from '@/lib/appwrite-server'
import { APPWRITE, PLATFORM_TZ } from '@/lib/constants'
import { getSessionUserId } from '@/lib/auth-session'
import { moverLocationPermissions } from '@/lib/doc-permissions'
import { mayMarkOnline } from '@/lib/mover-gates'
import { relId } from '@/lib/notify'
import { ID, Query } from 'node-appwrite'

/**
 * POST /api/mover/update-location
 * Receives the mover's current GPS position and updates:
 *  1. mover_locations collection (creates a new record for Realtime)
 *  2. mover_profiles currentLatitude/currentLongitude
 */
export async function POST(req: NextRequest) {
  const { t } = await getTranslations()
  try {
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: t('errors:auth.unauthorized') }, { status: 401 })
    }

    const { latitude, longitude, heading, speed, moveId } = await req.json()

    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return NextResponse.json(
        { error: 'latitude and longitude are required numbers' },
        { status: 400 }
      )
    }

    const { databases } = createAdminClient()

    // Look up the mover's profile by userId
    const profiles = await withRetry(() =>
      databases.listDocuments(
        APPWRITE.DATABASE_ID,
        APPWRITE.COLLECTIONS.MOVER_PROFILES,
        [Query.equal('userId', userId), Query.limit(1)]
      )
    )

    if (profiles.total === 0) {
      return NextResponse.json({ error: t('errors:mover.profileNotFound') }, { status: 404 })
    }

    const moverProfileId = profiles.documents[0].$id

    // Live GPS is readable by the mover always, and by the client of the move
    // only while a move is attached (heartbeat rows carry no `moveId` and stay
    // mover-only). Best-effort: a failed lookup must not cost the fix.
    let moveClientAuthId: string | null = null
    if (moveId) {
      try {
        const move = await databases.getDocument(
          APPWRITE.DATABASE_ID,
          APPWRITE.COLLECTIONS.MOVES,
          moveId
        )
        moveClientAuthId = relId(move.clientId)
      } catch {
        // Unknown/unreadable move — fall back to mover-only grants.
      }
    }

    // Create location record (Appwrite Realtime will broadcast this)
    await withRetry(() =>
      databases.createDocument(
        APPWRITE.DATABASE_ID,
        APPWRITE.COLLECTIONS.MOVER_LOCATIONS,
        ID.unique(),
        {
          moverProfileId,
          moveId: moveId || null,
          latitude,
          longitude,
          heading: heading ?? null,
          speed: speed ?? null,
          timestamp: new Date().toISOString(),
        },
        // `userId` is the mover's auth account id (the session subject);
        // `moverProfileId` is a profile row id and is not a usable role.
        moverLocationPermissions(userId, moveClientAuthId)
      )
    )

    // Update current position on the mover profile. The heartbeat marks the
    // driver online only when `setmoveronline` would have allowed it (KYC +
    // service-ready vehicle, master D4); otherwise `isOnline` is left as it
    // is — never forced off, the driver may be finishing a move.
    const markOnline = mayMarkOnline(profiles.documents[0], Date.now(), PLATFORM_TZ)
    await withRetry(() =>
      databases.updateDocument(
        APPWRITE.DATABASE_ID,
        APPWRITE.COLLECTIONS.MOVER_PROFILES,
        moverProfileId,
        {
          currentLatitude: latitude,
          currentLongitude: longitude,
          // The freshness term every visibility gate reads (3 min). The
          // function port wrote it; this route did not, which left web-only
          // drivers permanently stale for `listnearbymovers`.
          locationUpdatedAt: new Date().toISOString(),
          ...(markOnline ? { isOnline: true } : {}),
        }
      )
    )

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('POST /api/mover/update-location error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : t('errors:generic.internal') },
      { status: 500 }
    )
  }
}
