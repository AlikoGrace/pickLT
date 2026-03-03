import { getSessionUserId } from '@/lib/auth-session'
import { createAdminClient } from '@/lib/appwrite-server'
import { APPWRITE } from '@/lib/constants'
import { Query } from 'node-appwrite'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/moves/confirm-payment
 * Client confirms they have paid the mover.
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

    // Get the move
    const move = await databases.getDocument(
      APPWRITE.DATABASE_ID,
      APPWRITE.COLLECTIONS.MOVES,
      moveId
    )

    // Verify the client owns this move
    const clientId = typeof move.clientId === 'string' ? move.clientId : move.clientId?.$id
    if (clientId !== userId) {
      return NextResponse.json({ error: 'Not authorized for this move' }, { status: 403 })
    }

    // Move must be in awaiting_payment status
    if (move.status !== 'awaiting_payment') {
      return NextResponse.json(
        { error: `Move is not awaiting payment (current: ${move.status})` },
        { status: 400 }
      )
    }

    // Find the pending payment for this move
    const payments = await databases.listDocuments(
      APPWRITE.DATABASE_ID,
      APPWRITE.COLLECTIONS.PAYMENTS,
      [
        Query.equal('moveId', [moveId]),
        Query.equal('status', ['pending']),
        Query.limit(1),
      ]
    )

    if (payments.documents.length === 0) {
      return NextResponse.json({ error: 'No pending payment found' }, { status: 404 })
    }

    const payment = payments.documents[0]

    // Update client confirmation
    await databases.updateDocument(
      APPWRITE.DATABASE_ID,
      APPWRITE.COLLECTIONS.PAYMENTS,
      payment.$id,
      { clientConfirmedAt: new Date().toISOString() }
    )

    // Check if mover has also confirmed
    const moverConfirmed = !!payment.moverConfirmedAt
    if (moverConfirmed) {
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
      const moverProfileId = typeof move.moverProfileId === 'string'
        ? move.moverProfileId
        : move.moverProfileId?.$id
      if (moverProfileId) {
        try {
          const profile = await databases.getDocument(
            APPWRITE.DATABASE_ID,
            APPWRITE.COLLECTIONS.MOVER_PROFILES,
            moverProfileId
          )
          await databases.updateDocument(
            APPWRITE.DATABASE_ID,
            APPWRITE.COLLECTIONS.MOVER_PROFILES,
            moverProfileId,
            { totalMoves: (profile.totalMoves || 0) + 1 }
          )
        } catch {
          // Non-critical — don't fail the request
        }
      }

      return NextResponse.json({
        success: true,
        paymentStatus: 'completed',
        moveStatus: 'completed',
      })
    }

    return NextResponse.json({
      success: true,
      paymentStatus: 'pending',
      message: 'Client payment confirmed. Waiting for mover confirmation.',
    })
  } catch (error) {
    console.error('POST /api/moves/confirm-payment error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
