import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/appwrite-server'
import { APPWRITE } from '@/lib/constants'
import { Query } from 'node-appwrite'
import { getSessionUserId } from '@/lib/auth-session'

/**
 * GET /api/mover/active-move
 * Returns the currently active move for the authenticated mover.
 * Uses admin SDK to bypass permission restrictions on relationship fields.
 */
export async function GET() {
  try {
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { databases } = createAdminClient()

    // Get mover profile for this user
    const profiles = await databases.listDocuments(
      APPWRITE.DATABASE_ID,
      APPWRITE.COLLECTIONS.MOVER_PROFILES,
      [Query.equal('userId', userId)]
    )
    const moverProfile = profiles.documents[0]
    if (!moverProfile) {
      return NextResponse.json({ error: 'Mover profile not found' }, { status: 404 })
    }

    // Fetch active moves for this mover — only statuses in the physical execution pipeline.
    // mover_accepted is intentionally excluded: it means accepted but not yet started,
    // and lives in scheduled-moves until the mover hits Start Route on the move day.
    const ACTIVE_PIPELINE_STATUSES = [
      'mover_en_route',
      'mover_arrived',
      'loading',
      'in_transit',
      'arrived_destination',
      'unloading',
      'awaiting_payment',
    ]
    const moves = await databases.listDocuments(
      APPWRITE.DATABASE_ID,
      APPWRITE.COLLECTIONS.MOVES,
      [
        Query.equal('moverProfileId', moverProfile.$id),
        Query.equal('status', ACTIVE_PIPELINE_STATUSES),
        Query.orderDesc('$updatedAt'),
        Query.limit(1),
      ]
    )

    if (moves.documents.length === 0) {
      return NextResponse.json({ move: null })
    }

    const move = moves.documents[0]

    // Flatten relationship fields to plain IDs for the client
    const clientId = typeof move.clientId === 'string'
      ? move.clientId
      : (move.clientId as Record<string, string>)?.$id || null

    return NextResponse.json({
      move: {
        ...move,
        moverProfileId: moverProfile.$id,
        clientId,
      },
    })
  } catch (err) {
    console.error('GET /api/mover/active-move error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
