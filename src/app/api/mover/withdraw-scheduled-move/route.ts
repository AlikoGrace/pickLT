import { getSessionUserId } from '@/lib/auth-session'
import { createAdminClient } from '@/lib/appwrite-server'
import { APPWRITE } from '@/lib/constants'
import { Query } from 'node-appwrite'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/mover/withdraw-scheduled-move
 *
 * Allows the assigned mover to withdraw from a scheduled move.
 * Removes their moverProfileId and resets the move status to 'draft'
 * so another mover can accept it.
 *
 * Body: { moveId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { moveId } = body

    if (!moveId) {
      return NextResponse.json({ error: 'moveId is required' }, { status: 400 })
    }

    const { databases } = createAdminClient()

    // Get mover profile for this user
    const profiles = await databases.listDocuments(
      APPWRITE.DATABASE_ID,
      APPWRITE.COLLECTIONS.MOVER_PROFILES,
      [Query.equal('userId', [userId]), Query.limit(1)]
    )
    const moverProfile = profiles.documents[0]
    if (!moverProfile) {
      return NextResponse.json({ error: 'Mover profile not found' }, { status: 404 })
    }

    // Require verified mover to withdraw from moves
    if (moverProfile.verificationStatus !== 'verified') {
      return NextResponse.json(
        { error: 'Your mover profile has not been verified yet' },
        { status: 403 }
      )
    }

    // Fetch the move
    const move = await databases.getDocument(
      APPWRITE.DATABASE_ID,
      APPWRITE.COLLECTIONS.MOVES,
      moveId
    )

    // Verify this mover is assigned to the move
    const existingMoverProfileId =
      typeof move.moverProfileId === 'string'
        ? move.moverProfileId
        : (move.moverProfileId as Record<string, string>)?.$id || null

    if (existingMoverProfileId !== moverProfile.$id) {
      return NextResponse.json({ error: 'You are not assigned to this move' }, { status: 403 })
    }

    // Only allow withdrawal before en_route phase begins
    const withdrawableStatuses = ['mover_accepted', 'mover_assigned', 'draft', 'booked', 'paid', 'pending_payment']
    if (!withdrawableStatuses.includes(move.status as string)) {
      return NextResponse.json(
        { error: 'Cannot withdraw after the move has started (en_route or later)' },
        { status: 409 }
      )
    }

    // Remove mover assignment and reset to draft
    await databases.updateDocument(
      APPWRITE.DATABASE_ID,
      APPWRITE.COLLECTIONS.MOVES,
      moveId,
      {
        moverProfileId: null,
        status: 'booked',
      }
    )

    return NextResponse.json({ success: true, moveId })
  } catch (error) {
    console.error('POST /api/mover/withdraw-scheduled-move error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
