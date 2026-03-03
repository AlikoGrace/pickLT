import { getSessionUserId } from '@/lib/auth-session'
import { createAdminClient } from '@/lib/appwrite-server'
import { APPWRITE } from '@/lib/constants'
import { Query } from 'node-appwrite'
import { NextRequest, NextResponse } from 'next/server'

// Statuses from which the client is allowed to cancel
const CANCELLABLE_STATUSES = [
  'draft',
  'pending_payment',
  'paid',
  'mover_assigned',
  'mover_accepted',
  'mover_en_route',
]

// POST /api/moves/cancel — Cancel a move on behalf of the client
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

    // Fetch the move document
    const move = await databases.getDocument(
      APPWRITE.DATABASE_ID,
      APPWRITE.COLLECTIONS.MOVES,
      moveId
    )

    // Verify the requesting user owns this move
    if (move.clientUserId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Verify the move is in a cancellable state
    if (!CANCELLABLE_STATUSES.includes(move.status)) {
      return NextResponse.json(
        { error: `Cannot cancel a move with status "${move.status}"` },
        { status: 400 }
      )
    }

    // Update the move status to cancelled_by_client
    await databases.updateDocument(
      APPWRITE.DATABASE_ID,
      APPWRITE.COLLECTIONS.MOVES,
      moveId,
      { status: 'cancelled_by_client' }
    )

    // Also expire/decline any pending move_requests linked to this move
    try {
      const pendingRequests = await databases.listDocuments(
        APPWRITE.DATABASE_ID,
        APPWRITE.COLLECTIONS.MOVE_REQUESTS,
        [
          Query.equal('moveId', [moveId]),
          Query.equal('status', ['pending']),
        ]
      )

      await Promise.all(
        pendingRequests.documents.map((req) =>
          databases.updateDocument(
            APPWRITE.DATABASE_ID,
            APPWRITE.COLLECTIONS.MOVE_REQUESTS,
            req.$id,
            { status: 'expired' }
          )
        )
      )
    } catch (err) {
      // Non-critical — the move itself is already cancelled
      console.warn('Failed to expire related move requests:', err)
    }

    return NextResponse.json({ success: true, moveId, status: 'cancelled_by_client' })
  } catch (error) {
    console.error('Error cancelling move:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
