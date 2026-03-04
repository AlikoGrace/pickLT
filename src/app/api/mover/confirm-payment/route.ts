import { getSessionUserId } from '@/lib/auth-session'
import { createAdminClient } from '@/lib/appwrite-server'
import { APPWRITE } from '@/lib/constants'
import { Query, ID } from 'node-appwrite'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/mover/confirm-payment
 * Mover confirms they have received the payment from the client.
 * Body: { moveId: string }
 *
 * If both client and mover have confirmed, the payment is marked as completed,
 * the move transitions to 'completed', and mover stats are updated.
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { moveId } = await request.json()
    if (!moveId) {
      return NextResponse.json({ error: 'moveId is required' }, { status: 400 })
    }

    const { databases } = createAdminClient()

    // Get mover profile
    const profiles = await databases.listDocuments(
      APPWRITE.DATABASE_ID,
      APPWRITE.COLLECTIONS.MOVER_PROFILES,
      [Query.equal('userId', [userId])]
    )
    const moverProfile = profiles.documents[0]
    if (!moverProfile) {
      return NextResponse.json({ error: 'Mover profile not found' }, { status: 404 })
    }

    // Get the move
    const move = await databases.getDocument(
      APPWRITE.DATABASE_ID,
      APPWRITE.COLLECTIONS.MOVES,
      moveId
    )

    // Verify this mover is assigned to the move
    const moveMoverProfileId = typeof move.moverProfileId === 'string'
      ? move.moverProfileId
      : move.moverProfileId?.$id
    if (moveMoverProfileId !== moverProfile.$id) {
      return NextResponse.json({ error: 'Not assigned to this move' }, { status: 403 })
    }

    // Move must be in awaiting_payment status
    if (move.status !== 'awaiting_payment') {
      return NextResponse.json(
        { error: `Move is not awaiting payment (current: ${move.status})` },
        { status: 400 }
      )
    }

    // Find the pending payment for this move (or any payment)
    let payments = await databases.listDocuments(
      APPWRITE.DATABASE_ID,
      APPWRITE.COLLECTIONS.PAYMENTS,
      [
        Query.equal('moveId', [moveId]),
        Query.equal('status', ['pending']),
        Query.limit(1),
      ]
    )

    // If no pending payment exists, create one now
    // (the payment record creation in update-move-status may have failed)
    let payment = payments.documents[0]
    if (!payment) {
      const finalPrice = move.finalPrice || move.estimatedPrice || 0
      payment = await databases.createDocument(
        APPWRITE.DATABASE_ID,
        APPWRITE.COLLECTIONS.PAYMENTS,
        ID.unique(),
        {
          moveId: moveId,
          amount: finalPrice,
          currency: 'EUR',
          status: 'pending',
          paymentMethod: 'cash',
        }
      )
    }

    // Update mover confirmation
    await databases.updateDocument(
      APPWRITE.DATABASE_ID,
      APPWRITE.COLLECTIONS.PAYMENTS,
      payment.$id,
      { moverConfirmedAt: new Date().toISOString() }
    )

    // Check if client has also confirmed
    const clientConfirmed = !!payment.clientConfirmedAt
    if (clientConfirmed) {
      // Both confirmed — complete the payment and the move
      await databases.updateDocument(
        APPWRITE.DATABASE_ID,
        APPWRITE.COLLECTIONS.PAYMENTS,
        payment.$id,
        { status: 'completed' }
      )

      // Complete the move
      await databases.updateDocument(
        APPWRITE.DATABASE_ID,
        APPWRITE.COLLECTIONS.MOVES,
        moveId,
        {
          status: 'completed',
          completedAt: new Date().toISOString(),
          paidAt: new Date().toISOString(),
          finalPrice: payment.amount,
        }
      )

      // Increment mover's totalMoves
      try {
        await databases.updateDocument(
          APPWRITE.DATABASE_ID,
          APPWRITE.COLLECTIONS.MOVER_PROFILES,
          moverProfile.$id,
          { totalMoves: (moverProfile.totalMoves || 0) + 1 }
        )
      } catch {
        // Non-critical
      }

      return NextResponse.json({
        success: true,
        paymentStatus: 'completed',
        moveStatus: 'completed',
        moveCompleted: true,
      })
    }

    return NextResponse.json({
      success: true,
      paymentStatus: 'pending',
      message: 'Mover payment confirmed. Waiting for client confirmation.',
    })
  } catch (error) {
    console.error('POST /api/mover/confirm-payment error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
