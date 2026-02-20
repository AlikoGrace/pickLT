import { auth } from '@clerk/nextjs/server'
import { createAdminClient } from '@/lib/appwrite-server'
import { APPWRITE } from '@/lib/constants'
import { Query } from 'node-appwrite'
import { NextRequest, NextResponse } from 'next/server'

// POST /api/mover/accept-move — Accept a move request
export async function POST(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth()
    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { requestId, moveId } = body

    if (!requestId || !moveId) {
      return NextResponse.json({ error: 'requestId and moveId are required' }, { status: 400 })
    }

    const { databases } = createAdminClient()

    // Verify the mover owns this request
    const allUsers = await databases.listDocuments(
      APPWRITE.DATABASE_ID,
      APPWRITE.COLLECTIONS.USERS,
      [Query.limit(100)]
    )
    const userDoc = allUsers.documents.find((u) => u.email?.includes(clerkId) || u.$id === clerkId)
    if (!userDoc) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const profiles = await databases.listDocuments(
      APPWRITE.DATABASE_ID,
      APPWRITE.COLLECTIONS.MOVER_PROFILES,
      [Query.equal('userId', [userDoc.$id])]
    )
    const moverProfile = profiles.documents[0]
    if (!moverProfile) {
      return NextResponse.json({ error: 'Mover profile not found' }, { status: 404 })
    }

    // Verify request belongs to this mover
    const moveRequest = await databases.getDocument(
      APPWRITE.DATABASE_ID,
      APPWRITE.COLLECTIONS.MOVE_REQUESTS,
      requestId
    )

    if (moveRequest.moverProfileId !== moverProfile.$id) {
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

    // Decline all other pending requests for this move
    const otherRequests = await databases.listDocuments(
      APPWRITE.DATABASE_ID,
      APPWRITE.COLLECTIONS.MOVE_REQUESTS,
      [
        Query.equal('moveId', [moveId]),
        Query.equal('status', ['pending']),
        Query.notEqual('$id', requestId),
        Query.limit(100),
      ]
    )

    await Promise.all(
      otherRequests.documents.map((req) =>
        databases.updateDocument(
          APPWRITE.DATABASE_ID,
          APPWRITE.COLLECTIONS.MOVE_REQUESTS,
          req.$id,
          { status: 'declined', respondedAt: new Date().toISOString() }
        )
      )
    )

    return NextResponse.json({ success: true, moveId, requestId })
  } catch (error) {
    console.error('Error accepting move:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
