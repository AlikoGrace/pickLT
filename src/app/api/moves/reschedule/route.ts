import { getSessionUserId } from '@/lib/auth-session'
import { createAdminClient } from '@/lib/appwrite-server'
import { APPWRITE } from '@/lib/constants'
import { NextRequest, NextResponse } from 'next/server'

// Statuses where a client can reschedule (no mover has started yet)
const RESCHEDULABLE_STATUSES = ['draft', 'booked']

/**
 * POST /api/moves/reschedule
 *
 * Allows the client to update the date/time for a booked move
 * that hasn't been assigned to a mover yet.
 *
 * Body: { moveId: string, moveDate: string, arrivalWindow?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { moveId, moveDate, arrivalWindow } = body

    if (!moveId || !moveDate) {
      return NextResponse.json(
        { error: 'moveId and moveDate are required' },
        { status: 400 },
      )
    }

    // Validate moveDate is in the future
    if (new Date(moveDate) <= new Date()) {
      return NextResponse.json(
        { error: 'Move date must be in the future' },
        { status: 400 },
      )
    }

    const { databases } = createAdminClient()

    const move = await databases.getDocument(
      APPWRITE.DATABASE_ID,
      APPWRITE.COLLECTIONS.MOVES,
      moveId,
    )

    // Verify ownership
    const clientId =
      typeof move.clientId === 'string' ? move.clientId : move.clientId?.$id
    if (clientId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Verify the move is in a reschedulable state
    if (!RESCHEDULABLE_STATUSES.includes(move.status as string)) {
      return NextResponse.json(
        { error: `Cannot reschedule a move with status "${move.status}"` },
        { status: 400 },
      )
    }

    // Build the update payload
    const update: Record<string, unknown> = { moveDate }
    if (arrivalWindow !== undefined) {
      update.arrivalWindow = arrivalWindow
    }

    await databases.updateDocument(
      APPWRITE.DATABASE_ID,
      APPWRITE.COLLECTIONS.MOVES,
      moveId,
      update,
    )

    return NextResponse.json({ success: true, moveId, moveDate, arrivalWindow })
  } catch (error) {
    console.error('POST /api/moves/reschedule error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}
