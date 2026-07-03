import { getSessionUserId } from '@/lib/auth-session'
import { createAdminClient } from '@/lib/appwrite-server'
import { APPWRITE } from '@/lib/constants'
import { moverUserIdFromProfile, relId, writeNotification } from '@/lib/notify'
import { ID, Query } from 'node-appwrite'
import { NextRequest, NextResponse } from 'next/server'

// Statuses from which the client is allowed to cancel. Must stay in lockstep
// with the Appwrite `cancelmove` function (the mobile app's cancel path) —
// cancel is permitted from booking through the moment items start moving.
// Once items are `in_transit` (or beyond), cancel is no longer offered.
const CANCELLABLE_STATUSES = [
  'draft',
  'booked',
  'pending_payment',
  'paid',
  'awaiting_payment',
  'mover_assigned',
  'mover_accepted',
  'mover_en_route',
  'mover_arrived',
  'loading',
]

// Human-friendly labels so a rejection never leaks a raw enum token like
// "mover_en_route" to the user. Mirrors the `cancelmove` function's map.
const STATUS_LABELS: Record<string, string> = {
  in_transit: 'In Transit',
  arrived_destination: 'Arrived',
  unloading: 'Unloading',
  completed: 'Completed',
  cancelled_by_client: 'Cancelled',
  cancelled_by_mover: 'Cancelled',
  disputed: 'Disputed',
}

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
    const clientId = typeof move.clientId === 'string' ? move.clientId : move.clientId?.$id
    if (clientId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Verify the move is in a cancellable state
    if (!CANCELLABLE_STATUSES.includes(move.status)) {
      const friendly = STATUS_LABELS[move.status] ?? 'its current stage'
      return NextResponse.json(
        {
          error: `This move can no longer be cancelled (${friendly}). Your items may already be in transit — please contact your mover directly.`,
        },
        { status: 400 }
      )
    }

    // Update the move status to cancelled_by_client
    const fromStatus = move.status
    await databases.updateDocument(
      APPWRITE.DATABASE_ID,
      APPWRITE.COLLECTIONS.MOVES,
      moveId,
      { status: 'cancelled_by_client' }
    )

    // Status-history breadcrumb (mirrors the Appwrite `cancelmove` function).
    try {
      await databases.createDocument(
        APPWRITE.DATABASE_ID,
        APPWRITE.COLLECTIONS.MOVE_STATUS_HISTORY,
        ID.unique(),
        {
          moveId,
          fromStatus,
          toStatus: 'cancelled_by_client',
          changedBy: userId ?? 'unknown',
          changedAt: new Date().toISOString(),
          note: 'Cancelled by user',
        }
      )
    } catch (err) {
      // Non-critical — the move itself is already cancelled.
      console.warn('Failed to write cancel status-history:', err)
    }

    // Notify the assigned mover so they stop heading to the pickup (fires an OS
    // push via the sendpush function). Critical once cancel is allowed while the
    // mover is en route. Best-effort — must not fail the cancel itself.
    const moverProfileId = relId(move.moverProfileId)
    if (moverProfileId) {
      const moverUserId = await moverUserIdFromProfile(moverProfileId)
      if (moverUserId) {
        await writeNotification({
          userId: moverUserId,
          type: 'move_cancelled',
          title: 'Move Cancelled',
          body: 'The client has cancelled this move.',
          data: { moveId, handle: move.handle, status: 'cancelled_by_client' },
        })
      }
    }

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
