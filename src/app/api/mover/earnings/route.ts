import { auth } from '@clerk/nextjs/server'
import { createAdminClient } from '@/lib/appwrite-server'
import { APPWRITE } from '@/lib/constants'
import { Query } from 'node-appwrite'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/mover/earnings — Get earnings data for the authenticated mover
export async function GET(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth()
    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const period = request.nextUrl.searchParams.get('period') || 'week'

    const { databases } = createAdminClient()

    // Find user
    const allUsers = await databases.listDocuments(
      APPWRITE.DATABASE_ID,
      APPWRITE.COLLECTIONS.USERS,
      [Query.limit(100)]
    )
    const userDoc = allUsers.documents.find((u) => u.email?.includes(clerkId) || u.$id === clerkId)

    if (!userDoc) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get mover profile
    const profiles = await databases.listDocuments(
      APPWRITE.DATABASE_ID,
      APPWRITE.COLLECTIONS.MOVER_PROFILES,
      [Query.equal('userId', [userDoc.$id])]
    )
    const moverProfile = profiles.documents[0]
    if (!moverProfile) {
      return NextResponse.json({ error: 'Mover profile not found' }, { status: 404 })
    }

    // Calculate date range based on period
    const now = new Date()
    let startDate: Date
    switch (period) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        break
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        break
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1)
        break
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    }

    // Get completed moves for this mover in the period
    const completedMoves = await databases.listDocuments(
      APPWRITE.DATABASE_ID,
      APPWRITE.COLLECTIONS.MOVES,
      [
        Query.equal('moverProfileId', [moverProfile.$id]),
        Query.equal('status', ['completed']),
        Query.greaterThan('$createdAt', startDate.toISOString()),
        Query.orderDesc('$createdAt'),
        Query.limit(100),
      ]
    )

    // Get payments for these moves
    const moveIds = completedMoves.documents.map((m) => m.$id)
    let payments: { documents: Array<Record<string, unknown> & { $id: string; $createdAt: string }> } = { documents: [] }
    if (moveIds.length > 0) {
      const paymentResult = await databases.listDocuments(
        APPWRITE.DATABASE_ID,
        APPWRITE.COLLECTIONS.PAYMENTS,
        [
          Query.equal('moveId', moveIds),
          Query.equal('status', ['completed']),
          Query.limit(100),
        ]
      )
      payments = paymentResult as unknown as typeof payments
    }

    const totalEarnings = payments.documents.reduce((sum, p) => sum + ((p.amount as number) || 0), 0)
    const totalMoves = completedMoves.total

    // Build earnings entries from completed moves
    const entries = completedMoves.documents.map((move) => {
      const payment = payments.documents.find(
        (p) => p.moveId === move.$id
      )
      return {
        id: move.$id,
        date: move.$createdAt,
        description: `${(move.pickupLocation as string)?.split(',')[0] || 'Pickup'} → ${(move.dropoffLocation as string)?.split(',')[0] || 'Dropoff'}`,
        amount: (payment?.amount as number) || (move.finalPrice as number) || (move.estimatedPrice as number) || 0,
        type: 'earning' as const,
        moveType: move.moveType,
      }
    })

    return NextResponse.json({
      total: totalEarnings,
      moves: totalMoves,
      entries,
      period,
      averagePerMove: totalMoves > 0 ? Math.round(totalEarnings / totalMoves) : 0,
    })
  } catch (error) {
    console.error('Error fetching earnings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
