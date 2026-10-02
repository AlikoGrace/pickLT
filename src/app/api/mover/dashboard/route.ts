import { getTranslations } from '@/lib/i18n-server'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/appwrite-server'
import { APPWRITE } from '@/lib/constants'
import { Query } from 'node-appwrite'
import { getSessionUserId } from '@/lib/auth-session'
import { loadPricingConfig } from '@/lib/pricing-server'
import { parseBreakdown } from '@/lib/pricingEngine'
import { moverPayoutEur, moverPayoutFromGross, payoutRatesFrom } from '@/lib/moverPayout'

/**
 * GET /api/mover/dashboard
 * Aggregated dashboard data for a mover
 */
export async function GET() {
  const { t } = await getTranslations()
  try {
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: t('errors:auth.unauthorized') }, { status: 401 })
    }

    const { databases } = createAdminClient()

    // Get mover profile
    const profiles = await databases.listDocuments(
      APPWRITE.DATABASE_ID,
      APPWRITE.COLLECTIONS.MOVER_PROFILES,
      [Query.equal('userId', userId)]
    )

    if (profiles.documents.length === 0) {
      return NextResponse.json({ error: t('errors:mover.profileNotFound') }, { status: 404 })
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
    const moverMoves = [...activeMoves.documents, ...completedMoves.documents]
    const moverMoveById = new Map(moverMoves.map((m) => [m.$id, m]))
    const moverPayments = payments.documents.filter(
      (p) => moverMoveById.has(p.moveId?.$id || p.moveId)
    )

    // Rates for rows booked before the pricing engine (no stored breakdown);
    // engine rows carry their own rates inside `priceBreakdown`.
    const pricingConfig = moverMoves.some((m) => !m.priceBreakdown)
      ? await loadPricingConfig(databases)
      : null

    // What the driver EARNED this month (plan 7): a settled payment is the
    // customer's gross, so strip VAT and the platform fee with the rates the
    // move was priced with.
    const earningsThisMonth = Math.round(
      moverPayments.reduce((sum, p) => {
        const move = moverMoveById.get(p.moveId?.$id || p.moveId)
        const rates = payoutRatesFrom(parseBreakdown(move?.priceBreakdown), pricingConfig)
        return sum + moverPayoutFromGross((p.amount as number) || 0, rates)
      }, 0) * 100,
    ) / 100

    // Active moves count: moves physically in progress (driving or on-site).
    // mover_accepted is intentionally excluded — it means accepted but not yet started;
    // those moves belong in the Scheduled count until the mover hits Start Route.
    const activePhaseStatuses = [
      'mover_en_route', 'mover_arrived',
      'loading', 'in_transit', 'arrived_destination', 'unloading',
    ]
    const activeMovesCount = activeMoves.documents.filter(
      (m) => activePhaseStatuses.includes(m.status as string)
    ).length

    // Scheduled moves count: accepted-but-not-started scheduled moves.
    // accept-scheduled-move sets status = 'mover_accepted' (never 'mover_assigned').
    const scheduledMovesCount = activeMoves.documents.filter(
      (m) => m.moveCategory === 'scheduled' && m.status === 'mover_accepted'
    ).length

    // Shape activeMoves into the RecentMoveFromApi field names the dashboard page expects
    const recentMoves = activeMoves.documents.map((doc) => ({
      $id: doc.$id,
      pickupLabel: doc.pickupLocation || '',
      pickupAddress: doc.pickupStreetAddress || '',
      dropoffLabel: doc.dropoffLocation || '',
      dropoffAddress: doc.dropoffStreetAddress || '',
      scheduledDate: doc.moveDate || null,
      status: doc.status,
      estimatedPrice: doc.estimatedPrice || 0,
      // What the driver earns on this move: net after the platform fee.
      payout: moverPayoutEur(
        {
          estimatedPrice: doc.estimatedPrice as number | null,
          finalPrice: doc.finalPrice as number | null,
          priceBreakdown: doc.priceBreakdown as string | null,
        },
        pricingConfig,
      ),
      moveCategory: doc.moveCategory,
      totalItems: doc.totalItemCount || 0,
      routeDistanceMeters: doc.routeDistanceMeters || null,
    }))

    return NextResponse.json({
      moverProfile,
      activeMoves: activeMoves.documents,
      activeMovesCount,
      scheduledMovesCount,
      completedThisMonth: completedMoves.total,
      pendingRequests: moveRequests.documents,
      crewMembers: crew.documents,
      earningsThisMonth,
      recentMoves,
    })
  } catch (err) {
    console.error('GET /api/mover/dashboard error:', err)
    return NextResponse.json({ error: t('errors:generic.internal') }, { status: 500 })
  }
}
