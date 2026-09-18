import { getTranslations } from '@/lib/i18n-server'
import { createAdminClient } from '@/lib/appwrite-server'
import { APPWRITE } from '@/lib/constants'
import { isErrorResponse, requireServiceReadyMover } from '@/lib/mover-auth'
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
    // Verified driver AND service-ready vehicle (master D4).
    const auth = await requireServiceReadyMover()
    if (isErrorResponse(auth)) return auth
    const { moverProfile } = auth

    const body = await request.json()
    const { moveId } = body

    if (!moveId) {
      return NextResponse.json({ error: 'moveId is required' }, { status: 400 })
    }

    const { databases } = createAdminClient()

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
        // Vehicle snapshot at assignment (master D13).
        vehicleId: (moverProfile as Record<string, unknown>).currentVehicleId ?? null,
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
