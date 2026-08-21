import { getTranslations } from '@/lib/i18n-server'
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
  const { t } = await getTranslations()
  try {
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: t('errors:auth.unauthorized') }, { status: 401 })
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
      return NextResponse.json({ error: t('errors:mover.profileNotFound') }, { status: 404 })
    }

    // Require verified mover to decline move requests
    if (moverProfile.verificationStatus !== 'verified') {
      return NextResponse.json(
        { error: t('errors:mover.notVerified') },
        { status: 403 }
      )
    }

    const moveRequest = await databases.getDocument(
      APPWRITE.DATABASE_ID,
      APPWRITE.COLLECTIONS.MOVE_REQUESTS,
      requestId,
    )

    if (moveRequest.moverProfileId !== moverProfile.$id) {
      return NextResponse.json({ error: t('errors:request.notOwned') }, { status: 403 })
    }

    if (moveRequest.status !== 'pending') {
      return NextResponse.json({ error: t('errors:request.notPending') }, { status: 409 })
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
      { error: err instanceof Error ? err.message : t('errors:generic.internal') },
      { status: 500 }
    )
  }
}
