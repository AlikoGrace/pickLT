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

    if (!isOwner && !isMover) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json({
      move: {
        ...move,
        moverProfileId,
        clientId,
      },
    })
  } catch (err) {
    console.error('GET /api/moves/by-handle/[handle] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
