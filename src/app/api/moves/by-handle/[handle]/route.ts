import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/appwrite-server'
import { APPWRITE } from '@/lib/constants'
import { Query } from 'node-appwrite'
import { getSessionUserId } from '@/lib/auth-session'

/**
 * GET /api/moves/by-handle/[handle]
 * Look up a move by its handle string. Returns enriched move data.
 * Accessible by the move owner (client) or the assigned mover.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ handle: string }> }
) {
  try {
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { handle } = await params
    if (!handle) {
      return NextResponse.json({ error: 'Handle is required' }, { status: 400 })
    }

    const { databases } = createAdminClient()

    const result = await databases.listDocuments(
      APPWRITE.DATABASE_ID,
      APPWRITE.COLLECTIONS.MOVES,
      [Query.equal('handle', handle), Query.limit(1)]
    )

    if (result.documents.length === 0) {
      return NextResponse.json({ error: 'Move not found' }, { status: 404 })
    }

    const move = result.documents[0]

    // Verify the user owns this move or is the assigned mover
    const clientId =
      typeof move.clientId === 'string'
        ? move.clientId
        : (move.clientId as Record<string, string>)?.$id || null

    const moverProfileId =
      typeof move.moverProfileId === 'string'
        ? move.moverProfileId
        : (move.moverProfileId as Record<string, string>)?.$id || null

    const isOwner = clientId === userId

    // Check if user is the assigned mover
    let isMover = false
    let moverProfileDocForUser: Record<string, unknown> | null = null
    if (moverProfileId) {
      try {
        const moverProfile = await databases.getDocument(
          APPWRITE.DATABASE_ID,
          APPWRITE.COLLECTIONS.MOVER_PROFILES,
          moverProfileId
        )
        const moverUserId =
          typeof moverProfile.userId === 'string'
            ? moverProfile.userId
            : (moverProfile.userId as Record<string, string>)?.$id || null
        isMover = moverUserId === userId
      } catch {
        // Profile may not exist
      }
    }

    // Check if the requesting user is a mover (even if not assigned to this move)
    let isUserAMover = isMover
    if (!isUserAMover) {
      try {
        const profiles = await databases.listDocuments(
          APPWRITE.DATABASE_ID,
          APPWRITE.COLLECTIONS.MOVER_PROFILES,
          [Query.equal('userId', [userId]), Query.limit(1)]
        )
        if (profiles.documents.length > 0) {
          isUserAMover = true
          moverProfileDocForUser = profiles.documents[0]
        }
      } catch {
        // ignore
      }
    }

    // Allow access if:
    // 1. User is the move owner (client), OR
    // 2. User is the assigned mover, OR
    // 3. Move is a scheduled move with no mover assigned and user is a mover
    const isUnassignedScheduled = move.moveCategory === 'scheduled' && !moverProfileId
    if (!isOwner && !isMover && !(isUnassignedScheduled && isUserAMover)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // ── Enrich with mover profile + user info ────────────────
    let moverProfile: Record<string, unknown> | null = null
    let moverUserDoc: Record<string, unknown> | null = null

    if (moverProfileId) {
      try {
        moverProfile = await databases.getDocument(
          APPWRITE.DATABASE_ID,
          APPWRITE.COLLECTIONS.MOVER_PROFILES,
          moverProfileId
        )
      } catch {
        // Profile may not exist
      }
    }

    if (moverProfile) {
      const moverUserId = typeof moverProfile.userId === 'string'
        ? moverProfile.userId
        : (moverProfile.userId as Record<string, string>)?.$id || null
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

    return NextResponse.json({
      move: {
        ...move,
        moverProfileId,
        clientId,
        rawStatus: move.status,
        moveCategory: move.moveCategory ?? null,
      },
      isAssignedMover: isMover,
      viewerMoverProfileId: isMover
        ? moverProfileId
        : (moverProfileDocForUser?.$id as string) ?? null,
      mover: moverProfile ? {
        id: moverProfile.$id,
        name: moverUserDoc?.fullName || 'Mover',
        phone: moverUserDoc?.phone || null,
        profilePhoto: moverUserDoc?.profilePhoto || null,
        rating: moverProfile.rating || 0,
        totalMoves: moverProfile.totalMoves || 0,
        vehicleType: moverProfile.vehicleType || null,
        vehicleBrand: moverProfile.vehicleBrand || '',
        vehicleModel: moverProfile.vehicleModel || '',
        vehicleName: [moverProfile.vehicleBrand, moverProfile.vehicleModel].filter(Boolean).join(' ') || 'Vehicle',
        vehiclePlate: moverProfile.vehicleRegistration || '',
        vehicleCapacity: moverProfile.vehicleCapacity || null,
        crewSize: ((moverProfile.crew_members as unknown[])?.length ?? 0) + 1,
        yearsExperience: moverProfile.yearsExperience || 0,
        languages: moverProfile.languages || [],
        isVerified: moverProfile.verificationStatus === 'verified',
        baseRate: moverProfile.baseRate || 0,
      } : null,
    })
  } catch (err) {
    console.error('GET /api/moves/by-handle/[handle] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
