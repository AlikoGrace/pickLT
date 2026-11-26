import { getTranslations } from '@/lib/i18n-server'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/appwrite-server'
import { APPWRITE } from '@/lib/constants'
import { profileCrewSize } from '@/app/api/crew/crew-size'
import { getSessionUserId } from '@/lib/auth-session'
import { displayNameOf } from '@/lib/account-delete'
import { isOnJob, type JobMove } from '@/lib/mover-position'
import { PLATFORM_TZ } from '@/lib/constants'

/**
 * GET /api/moves/[id]/full
 * Get a single move by ID with full mover profile details.
 * Used by the instant-move tracking page to get all data from DB
 * instead of relying on sessionStorage.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { t } = await getTranslations()
  try {
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: t('errors:auth.unauthorized') }, { status: 401 })
    }

    const { id } = await params

    const { databases } = createAdminClient()

    const move = await databases.getDocument(
      APPWRITE.DATABASE_ID,
      APPWRITE.COLLECTIONS.MOVES,
      id
    )

    // Verify the user owns this move or is the assigned mover
    const clientId = typeof move.clientId === 'string' ? move.clientId : move.clientId?.$id
    const isOwner = clientId === userId

    // Get the mover profile ID
    const moverProfileId = typeof move.moverProfileId === 'string'
      ? move.moverProfileId
      : move.moverProfileId?.$id || null

    let moverProfile = null
    if (moverProfileId) {
      try {
        moverProfile = await databases.getDocument(
          APPWRITE.DATABASE_ID,
          APPWRITE.COLLECTIONS.MOVER_PROFILES,
          moverProfileId
        )
      } catch {
        // Mover profile may have been deleted
      }
    }

    const isMover = moverProfile?.userId === userId || (moverProfile?.userId as any)?.$id === userId

    if (!isOwner && !isMover) {
      return NextResponse.json({ error: t('errors:auth.forbidden') }, { status: 403 })
    }

    const showMoverPosition = isMover || isOnJob(move as JobMove, Date.now(), PLATFORM_TZ)

    // Get the mover's user doc for their name / phone
    let moverUserDoc = null
    if (moverProfile) {
      const moverUserId = typeof moverProfile.userId === 'string'
        ? moverProfile.userId
        : moverProfile.userId?.$id
      if (moverUserId) {
        try {
          moverUserDoc = await databases.getDocument(
            APPWRITE.DATABASE_ID,
            APPWRITE.COLLECTIONS.USERS,
            moverUserId
          )
        } catch {
          // User doc may not exist
        }
      }
    }

    // Build enriched response
    const response: Record<string, unknown> = {
      // Only the client answers a price prompt (`move.pendingOffer`, plan pricing/8).
      viewerIsClient: isOwner,
      move: {
        ...move,
        // Flatten moverProfileId to just the ID string
        moverProfileId: moverProfileId,
      },
      mover: moverProfile ? {
        id: moverProfile.$id,
        // A mover who deleted their account reads "Deleted user", not the marker.
        name: displayNameOf(moverUserDoc?.fullName, t('common:user.deleted.label'), 'Mover'),
        phone: moverUserDoc?.phone || null,
        profilePhoto: moverUserDoc?.profilePhoto || null,
        rating: moverProfile.rating || 0,
        totalMoves: moverProfile.totalMoves || 0,
        vehicleType: moverProfile.vehicleType || 'small_van',
        vehicleBrand: moverProfile.vehicleBrand || '',
        vehicleModel: moverProfile.vehicleModel || '',
        vehicleName: [moverProfile.vehicleBrand, moverProfile.vehicleModel].filter(Boolean).join(' ') || 'Vehicle',
        vehiclePlate: moverProfile.vehicleRegistration || '',
        // Stored `crewSize` (driver + active helpers, crew master §4); list + 1 only on unsynced rows.
        crewSize: profileCrewSize(moverProfile) ?? 1,
        maxWeight: moverProfile.vehicleCapacity ? Number(moverProfile.vehicleCapacity) * 50 : 500,
        yearsExperience: moverProfile.yearsExperience || 0,
        languages: moverProfile.languages || [],
        isVerified: moverProfile.verificationStatus === 'verified',
        // The mover's position goes to the mover themselves, and to the client
        // only while the mover is on a job with this move (plan legal/2, P1):
        // not for a booking days away, and not after the move has ended.
        currentLatitude: showMoverPosition ? moverProfile.currentLatitude ?? null : null,
        currentLongitude: showMoverPosition ? moverProfile.currentLongitude ?? null : null,
      } : null,
    }

    return NextResponse.json(response)
  } catch (err) {
    console.error('GET /api/moves/[id]/full error:', err)
    return NextResponse.json({ error: t('errors:generic.internal') }, { status: 500 })
  }
}
