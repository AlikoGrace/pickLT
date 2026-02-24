import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/appwrite-server'
import { APPWRITE } from '@/lib/constants'
import { getSessionUserId } from '@/lib/auth-session'
import { Query } from 'node-appwrite'

/**
 * POST /api/mover/decline-move
 *
 * Declines a move request. The move status stays as 'mover_assigned'
 * so the client-side can detect the decline and search for the next mover.
 *
 * Body: { requestId }
 */
export async function POST(req: NextRequest) {
  try {
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { requestId } = await req.json()

    if (!requestId) {
      return NextResponse.json({ error: 'requestId is required' }, { status: 400 })
    }

    const { databases } = createAdminClient()

    // Verify the request belongs to this mover
    const profiles = await databases.listDocuments(
      APPWRITE.DATABASE_ID,
      APPWRITE.COLLECTIONS.MOVER_PROFILES,
      [Query.equal('userId', [userId])]
    )
    const moverProfile = profiles.documents[0]
    if (!moverProfile) {
      return NextResponse.json({ error: 'Mover profile not found' }, { status: 404 })
    }

    const moveRequest = await databases.getDocument(
      APPWRITE.DATABASE_ID,
      APPWRITE.COLLECTIONS.MOVE_REQUESTS,
      requestId,
    )

    if (moveRequest.moverProfileId !== moverProfile.$id) {
      return NextResponse.json({ error: 'Request does not belong to this mover' }, { status: 403 })
    }

    if (moveRequest.status !== 'pending') {
      return NextResponse.json({ error: 'Request is no longer pending' }, { status: 409 })
    }

    // Mark the request as declined
    await databases.updateDocument(
      APPWRITE.DATABASE_ID,
      APPWRITE.COLLECTIONS.MOVE_REQUESTS,
      requestId,
      {
        status: 'declined',
        respondedAt: new Date().toISOString(),
      }
    )

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('POST /api/mover/decline-move error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
