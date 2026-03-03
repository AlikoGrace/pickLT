import { getSessionUserId } from '@/lib/auth-session'
import { createAdminClient } from '@/lib/appwrite-server'
import { APPWRITE } from '@/lib/constants'
import { Query } from 'node-appwrite'
import { NextRequest, NextResponse } from 'next/server'

// Valid status transitions for moves
const VALID_TRANSITIONS: Record<string, string[]> = {
  accepted: ['mover_en_route'],
  mover_assigned: ['mover_en_route'],
  mover_accepted: ['mover_en_route'],
  mover_en_route: ['mover_arrived'],
  mover_arrived: ['loading'],
  loading: ['in_transit'],
  in_transit: ['arrived_destination'],
  arrived_destination: ['completed'],
}

// POST /api/mover/update-move-status — Update the status of an active move
export async function POST(request: NextRequest) {
  try {
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { moveId, status } = body

    if (!moveId || !status) {
      return NextResponse.json({ error: 'moveId and status are required' }, { status: 400 })
    }

    const { databases } = createAdminClient()

    // Get mover profile for this user
    const profiles = await databases.listDocuments(
      APPWRITE.DATABASE_ID,
      APPWRITE.COLLECTIONS.MOVER_PROFILES,
      [Query.equal('userId', [userId])]
    )
    const moverProfile = profiles.documents[0]
    if (!moverProfile) {
      return NextResponse.json({ error: 'Mover profile not found' }, { status: 404 })
    }

    // Get the move document
    const move = await databases.getDocument(
      APPWRITE.DATABASE_ID,
      APPWRITE.COLLECTIONS.MOVES,
      moveId
    )

    // Verify this mover is assigned to the move
    if (move.moverProfileId !== moverProfile.$id) {
      return NextResponse.json({ error: 'Not assigned to this move' }, { status: 403 })
    }

    // Validate status transition
    const allowedNext = VALID_TRANSITIONS[move.status as string]
    if (!allowedNext || !allowedNext.includes(status)) {
      return NextResponse.json(
        { error: `Invalid transition from "${move.status}" to "${status}"` },
        { status: 400 }
      )
    }

    // Update the move status
    await databases.updateDocument(
      APPWRITE.DATABASE_ID,
      APPWRITE.COLLECTIONS.MOVES,
      moveId,
      { status }
    )

    return NextResponse.json({ success: true, moveId, status })
  } catch (error) {
    console.error('Error updating move status:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
