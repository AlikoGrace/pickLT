import { getSessionUserId } from '@/lib/auth-session'
import { createAdminClient } from '@/lib/appwrite-server'
import { APPWRITE } from '@/lib/constants'
import { Query } from 'node-appwrite'
import { NextRequest, NextResponse } from 'next/server'

// POST /api/mover/accept-move — Accept a move request
export async function POST(request: NextRequest) {
  try {
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { requestId, moveId } = body

    if (!requestId || !moveId) {
      return NextResponse.json({ error: 'requestId and moveId are required' }, { status: 400 })
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

    // Verify request belongs to this mover
    // Handle moverProfileId as string or relationship object
    const moveRequest = await databases.getDocument(
      APPWRITE.DATABASE_ID,
      APPWRITE.COLLECTIONS.MOVE_REQUESTS,
      requestId
    )

    const reqMoverProfileId = typeof moveRequest.moverProfileId === 'string'
      ? moveRequest.moverProfileId
      : (moveRequest.moverProfileId as Record<string, string>)?.$id || ''

    if (reqMoverProfileId !== moverProfile.$id) {
      return NextResponse.json({ error: 'Request does not belong to this mover' }, { status: 403 })
    }

    if (moveRequest.status !== 'pending') {
      return NextResponse.json({ error: 'Request is no longer pending' }, { status: 409 })
    }

    // Accept the request
    await databases.updateDocument(
      APPWRITE.DATABASE_ID,
      APPWRITE.COLLECTIONS.MOVE_REQUESTS,
      requestId,
      {
        status: 'accepted',
        respondedAt: new Date().toISOString(),
      }
    )

    // Update the move to assign this mover
    await databases.updateDocument(
      APPWRITE.DATABASE_ID,
      APPWRITE.COLLECTIONS.MOVES,
      moveId,
      {
        moverProfileId: moverProfile.$id,
        status: 'accepted',
      }
    )

    // Best-effort: Decline all other pending requests for this move.
    // Wrapped in its own try-catch so a failure here doesn't return
    // "Internal server error" when the accept itself already succeeded.
    try {
      const otherRequests = await databases.listDocuments(
        APPWRITE.DATABASE_ID,
        APPWRITE.COLLECTIONS.MOVE_REQUESTS,
        [
          Query.equal('status', ['pending']),
          Query.limit(100),
        ]
      )

      // Filter in application code to avoid Query issues with relationship fields
      const toDecline = otherRequests.documents.filter((req) => {
        if (req.$id === requestId) return false
        const reqMoveId = typeof req.moveId === 'string'
          ? req.moveId
          : (req.moveId as Record<string, string>)?.$id || ''
        return reqMoveId === moveId
      })

      await Promise.all(
        toDecline.map((req) =>
          databases.updateDocument(
            APPWRITE.DATABASE_ID,
            APPWRITE.COLLECTIONS.MOVE_REQUESTS,
            req.$id,
            { status: 'declined', respondedAt: new Date().toISOString() }
          ).catch((e) => console.warn('Failed to decline request', req.$id, e))
        )
      )
    } catch (declineErr) {
      // Non-fatal — the move was already accepted successfully
      console.warn('Failed to decline other requests (non-fatal):', declineErr)
    }

    return NextResponse.json({ success: true, moveId, requestId })
  } catch (error) {
    console.error('Error accepting move:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
