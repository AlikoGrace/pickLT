import { getTranslations } from '@/lib/i18n-server'
import { getSessionUserId } from '@/lib/auth-session'
import { createAdminClient } from '@/lib/appwrite-server'
import { APPWRITE } from '@/lib/constants'
import { Query } from 'node-appwrite'
import { NextRequest, NextResponse } from 'next/server'
import { loadPricingConfig } from '@/lib/pricing-server'
import { parseBreakdown } from '@/lib/pricingEngine'
import { moverPayoutFromGross, payoutRatesFrom } from '@/lib/moverPayout'

const round2 = (n: number): number => Math.round(n * 100) / 100

/** A relationship column may arrive as the id string or the related document. */
const refId = (v: unknown): string | null =>
  typeof v === 'string' ? v : ((v as { $id?: string } | null)?.$id ?? null)

// GET /api/mover/earnings — Get earnings data for the authenticated mover
export async function GET(request: NextRequest) {
  const { t } = await getTranslations()
  try {
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: t('errors:auth.unauthorized') }, { status: 401 })
    }

    const period = request.nextUrl.searchParams.get('period') || 'week'

    const { databases } = createAdminClient()

    // Get mover profile
    const profiles = await databases.listDocuments(
      APPWRITE.DATABASE_ID,
      APPWRITE.COLLECTIONS.MOVER_PROFILES,
      [Query.equal('userId', [userId])]
    )
    const moverProfile = profiles.documents[0]
    if (!moverProfile) {
      return NextResponse.json({ error: t('errors:mover.profileNotFound') }, { status: 404 })
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

    const totalMoves = completedMoves.total

    // Rates for rows booked before the pricing engine (no stored breakdown);
    // engine rows carry their own rates inside `priceBreakdown`.
    const pricingConfig = completedMoves.documents.some((m) => !m.priceBreakdown)
      ? await loadPricingConfig(databases)
      : null

    // What the driver EARNED (plan 7): the settled payment (else the final or
    // estimated price) is the customer's gross — strip VAT and the platform
    // fee with the rates the move was priced with. The total is the sum of the
    // entries, so the list and the headline cannot disagree.
    const entries = completedMoves.documents.map((move) => {
      const payment = payments.documents.find((p) => refId(p.moveId) === move.$id)
      const gross =
        (payment?.amount as number) || (move.finalPrice as number) || (move.estimatedPrice as number) || 0
      const rates = payoutRatesFrom(parseBreakdown(move.priceBreakdown), pricingConfig)
      return {
        id: move.$id,
        date: move.$createdAt,
        description: `${(move.pickupLocation as string)?.split(',')[0] || 'Pickup'} → ${(move.dropoffLocation as string)?.split(',')[0] || 'Dropoff'}`,
        amount: moverPayoutFromGross(gross, rates),
        type: 'earning' as const,
        moveType: move.moveType,
      }
    })
    const totalEarnings = round2(entries.reduce((sum, e) => sum + e.amount, 0))

    return NextResponse.json({
      total: totalEarnings,
      moves: totalMoves,
      entries,
      period,
      averagePerMove: totalMoves > 0 ? round2(totalEarnings / totalMoves) : 0,
    })
  } catch (error) {
    console.error('Error fetching earnings:', error)
    return NextResponse.json({ error: t('errors:generic.internal') }, { status: 500 })
  }
}
