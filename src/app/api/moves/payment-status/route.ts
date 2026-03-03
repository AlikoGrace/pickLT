import { getSessionUserId } from '@/lib/auth-session'
import { createAdminClient } from '@/lib/appwrite-server'
import { APPWRITE } from '@/lib/constants'
import { Query } from 'node-appwrite'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/moves/payment-status?moveId=xxx
 * Returns the payment status for a given move, including who has confirmed.
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const moveId = request.nextUrl.searchParams.get('moveId')
    if (!moveId) {
      return NextResponse.json({ error: 'moveId is required' }, { status: 400 })
    }

    const { databases } = createAdminClient()

    const payments = await databases.listDocuments(
      APPWRITE.DATABASE_ID,
      APPWRITE.COLLECTIONS.PAYMENTS,
      [
        Query.equal('moveId', [moveId]),
        Query.orderDesc('$createdAt'),
        Query.limit(1),
      ]
    )

    if (payments.documents.length === 0) {
      return NextResponse.json({ payment: null })
    }

    const payment = payments.documents[0]

    return NextResponse.json({
      payment: {
        id: payment.$id,
        moveId: payment.moveId,
        amount: payment.amount,
        currency: payment.currency || 'EUR',
        status: payment.status,
        paymentMethod: payment.paymentMethod || 'cash',
        clientConfirmedAt: payment.clientConfirmedAt || null,
        moverConfirmedAt: payment.moverConfirmedAt || null,
        createdAt: payment.$createdAt,
      },
    })
  } catch (error) {
    console.error('GET /api/moves/payment-status error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
