import { getTranslations } from '@/lib/i18n-server'
import { getSessionUserId } from '@/lib/auth-session'
import { createAdminClient } from '@/lib/appwrite-server'
import { APPWRITE } from '@/lib/constants'
import { relId, writeNotification } from '@/lib/notify'
import { Query } from 'node-appwrite'
import { NextRequest, NextResponse } from 'next/server'

// A move is assignable when it sits in a pre-assignment status.
// Mirrors functions/acceptmove/src/main.js and pickltmover/lib/move-requests.ts.
const ASSIGNABLE_STATUSES = new Set([
  'draft',
  'pending_payment',
  'paid',
  'booked',
  'mover_assigned',
])

// POST /api/mover/accept-move — Accept a move request
export async function POST(request: NextRequest) {
  const { t } = await getTranslations()
  try {
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: t('errors:auth.unauthorized') }, { status: 401 })
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
      return NextResponse.json({ error: t('errors:mover.profileNotFound') }, { status: 404 })
    }

    // Require verified mover to accept moves
    if (moverProfile.verificationStatus !== 'verified') {
      return NextResponse.json(
        { error: t('errors:mover.notVerified') },
        { status: 403 }
      )
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
      return NextResponse.json({ error: t('errors:request.notOwned') }, { status: 403 })
    }

    if (moveRequest.status !== 'pending') {
      return NextResponse.json({ error: t('errors:request.notPending') }, { status: 409 })
    }

    // The request authorises exactly one move. Without this check a mover
    // holding any pending request could accept an arbitrary moveId and take
    // over a job assigned to someone else — including one already in transit.
    if (relId(moveRequest.moveId) !== moveId) {
      return NextResponse.json(
        { error: t('errors:request.moveMismatch') },
        { status: 403 }
      )
    }

    // Refuse a move that is already claimed or past the assignable stage.
    const targetMove = await databases.getDocument(
      APPWRITE.DATABASE_ID,
      APPWRITE.COLLECTIONS.MOVES,
      moveId
    )
    const existingMover = relId(targetMove.moverProfileId)
    if (existingMover && existingMover !== moverProfile.$id) {
      return NextResponse.json({ error: t('errors:move.alreadyAssigned') }, { status: 409 })
    }
    if (!ASSIGNABLE_STATUSES.has(targetMove.status)) {
      return NextResponse.json(
        // No status word is injected. `"…while it is {{status}}"` put a
        // `moves:status.*` label in a predicative slot: fr/es/it need it to
        // agree in gender with "move", de/pl govern its case, and Turkish
        // built "{{status}} durumundayken" around a label that is often a
        // whole finite clause ("Nakliyeci yolda"). Seventeen statuses × four
        // sentences is not a proportionate key family for a diagnostic the
        // reader cannot act on, so the sentence loses the slot instead —
        // the same repair `errors:move.notCancellableUnknownStage` already is.
        { error: t('errors:move.noLongerAcceptable') },
        { status: 409 }
      )
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
    // Per architecture: move_requests.status = 'accepted', moves.status = 'mover_accepted'
    const move = await databases.updateDocument(
      APPWRITE.DATABASE_ID,
      APPWRITE.COLLECTIONS.MOVES,
      moveId,
      {
        moverProfileId: moverProfile.$id,
        status: 'mover_accepted',
      }
    )

    // Notify the client that a mover accepted their move.
    const clientId = relId(move.clientId)
    if (clientId) {
      await writeNotification({
        userId: clientId,
        type: 'move_accepted',
        title: 'Mover Accepted',
        body: 'A mover has accepted your move request!',
        data: { moveId, handle: move.handle, status: 'mover_accepted' },
        i18n: { key: 'status.moverAccepted', params: { handle: move.handle ?? '' } },
      })
    }

    // Best-effort: Decline all other pending requests for this move.
    // Wrapped in its own try-catch so a failure here doesn't return
    // t('errors:generic.internal') when the accept itself already succeeded.
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
    return NextResponse.json({ error: t('errors:generic.internal') }, { status: 500 })
  }
}
