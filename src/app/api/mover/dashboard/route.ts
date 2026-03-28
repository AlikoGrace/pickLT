import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/appwrite-server'
import { APPWRITE } from '@/lib/constants'
import { Query } from 'node-appwrite'
import { getSessionUserId } from '@/lib/auth-session'

/**
 * GET /api/mover/dashboard
 * Aggregated dashboard data for a mover
 */
export async function GET() {
  try {
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { databases } = createAdminClient()

    // Get mover profile
    const profiles = await databases.listDocuments(
      APPWRITE.DATABASE_ID,
      APPWRITE.COLLECTIONS.MOVER_PROFILES,
      [Query.equal('userId', userId)]
    )

    if (profiles.documents.length === 0) {
      return NextResponse.json({ error: 'Mover profile not found' }, { status: 404 })
    }

    const moverProfile = profiles.documents[0]

    // Get assigned moves (active)
    const activeMoves = await databases.listDocuments(
      APPWRITE.DATABASE_ID,
      APPWRITE.COLLECTIONS.MOVES,
      [
        Query.equal('moverProfileId', moverProfile.$id),
        Query.notEqual('status', 'completed'),
        Query.notEqual('status', 'cancelled_by_client'),
        Query.notEqual('status', 'cancelled_by_mover'),
        Query.orderDesc('$createdAt'),
        Query.limit(10),
      ]
    )

    // Get completed moves count (this month)
    const now = new Date()
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const completedMoves = await databases.listDocuments(
      APPWRITE.DATABASE_ID,
      APPWRITE.COLLECTIONS.MOVES,
      [
        Query.equal('moverProfileId', moverProfile.$id),
        Query.equal('status', 'completed'),
        Query.greaterThanEqual('completedAt', firstOfMonth),
      ]
    )

    // Get pending move requests
    const moveRequests = await databases.listDocuments(
      APPWRITE.DATABASE_ID,
      APPWRITE.COLLECTIONS.MOVE_REQUESTS,
      [
        Query.equal('moverProfileId', moverProfile.$id),
        Query.equal('status', 'pending'),
        Query.orderDesc('sentAt'),
      ]
    )

    // Get crew members
    const crew = await databases.listDocuments(
      APPWRITE.DATABASE_ID,
      APPWRITE.COLLECTIONS.CREW_MEMBERS,
      [Query.equal('moverProfileId', moverProfile.$id)]
    )

    // Get earnings this month
    const payments = await databases.listDocuments(
      APPWRITE.DATABASE_ID,
      APPWRITE.COLLECTIONS.PAYMENTS,
      [
        Query.equal('status', 'completed'),
        Query.greaterThanEqual('$createdAt', firstOfMonth),
      ]
    )

    // Filter payments for this mover's moves
    const moverMoveIds = new Set(
      [...activeMoves.documents, ...completedMoves.documents].map((m) => m.$id)
    )
    const moverPayments = payments.documents.filter(
      (p) => moverMoveIds.has(p.moveId?.$id || p.moveId)
    )
    const earningsThisMonth = moverPayments.reduce(
      (sum, p) => sum + (p.amount || 0),
      0
    )

    // Active moves count: moves assigned to this mover that are actively being worked on
    const activePhaseStatuses = [
      'mover_accepted', 'mover_en_route', 'mover_arrived',
      'loading', 'in_transit', 'arrived_destination', 'unloading',
    ]
    const activeMovesCount = activeMoves.documents.filter(
      (m) => activePhaseStatuses.includes(m.status as string)
    ).length

    // Scheduled moves count: moves assigned to this mover with moveCategory=scheduled and status=mover_assigned
    const scheduledMovesCount = activeMoves.documents.filter(
      (m) => m.moveCategory === 'scheduled' && m.status === 'mover_assigned'
    ).length

    return NextResponse.json({
      moverProfile,
      activeMoves: activeMoves.documents,
      activeMovesCount,
      scheduledMovesCount,
      completedThisMonth: completedMoves.total,
      pendingRequests: moveRequests.documents,
      crewMembers: crew.documents,
      earningsThisMonth,
    })
  } catch (err) {
    console.error('GET /api/mover/dashboard error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
