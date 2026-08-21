import { getTranslations } from '@/lib/i18n-server'
import { getSessionUserId } from '@/lib/auth-session'
import { createAdminClient } from '@/lib/appwrite-server'
import { APPWRITE } from '@/lib/constants'
import { Query } from 'node-appwrite'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/mover/accept-scheduled-move
 *
 * Allows a mover to accept an unassigned scheduled move directly.
 * The move must be a scheduled move with no moverProfileId and status=draft.
 *
 * Body: { moveId: string }
 */
export async function POST(request: NextRequest) {
  const { t } = await getTranslations()
  try {
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: t('errors:auth.unauthorized') }, { status: 401 })
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
      return NextResponse.json({ error: t('errors:mover.profileNotFound') }, { status: 404 })
    }

    // Require verified mover to accept scheduled moves
    if (moverProfile.verificationStatus !== 'verified') {
      return NextResponse.json(
        { error: t('errors:mover.notVerified') },
        { status: 403 }
      )
    }

    // Fetch the move
    const move = await databases.getDocument(
      APPWRITE.DATABASE_ID,
      APPWRITE.COLLECTIONS.MOVES,
      moveId
    )

    // Verify it's a scheduled move
    if (move.moveCategory !== 'scheduled') {
      return NextResponse.json({ error: t('errors:move.scheduledOnly') }, { status: 400 })
    }

    // Verify no mover is already assigned
    const existingMoverProfileId =
      typeof move.moverProfileId === 'string'
        ? move.moverProfileId
        : (move.moverProfileId as Record<string, string>)?.$id || null

    if (existingMoverProfileId) {
      return NextResponse.json({ error: t('errors:move.alreadyAssigned') }, { status: 409 })
    }

    // Verify the move is in a state that can be accepted (draft, booked, or paid)
    if (!['draft', 'booked', 'paid', 'pending_payment'].includes(move.status as string)) {
      return NextResponse.json({ error: t('errors:move.notAvailable') }, { status: 409 })
    }

    // Assign the mover and update status to mover_accepted
    await databases.updateDocument(
      APPWRITE.DATABASE_ID,
      APPWRITE.COLLECTIONS.MOVES,
      moveId,
      {
        moverProfileId: moverProfile.$id,
        status: 'mover_accepted',
      }
    )

    return NextResponse.json({
      success: true,
      moveId,
      moverProfileId: moverProfile.$id,
    })
  } catch (error) {
    console.error('POST /api/mover/accept-scheduled-move error:', error)
    return NextResponse.json({ error: t('errors:generic.internal') }, { status: 500 })
  }
}
