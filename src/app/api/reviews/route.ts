import { getSessionUserId } from '@/lib/auth-session'
import { createAdminClient } from '@/lib/appwrite-server'
import { APPWRITE } from '@/lib/constants'
import { Query, ID } from 'node-appwrite'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/reviews
 * Client submits a review for a completed move.
 * Body: { moveId, rating (1-5), comment }
 *
 * - Creates a review document
 * - Recalculates and updates the mover's average rating
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { moveId, rating, comment } = body

    if (!moveId || !rating) {
      return NextResponse.json({ error: 'moveId and rating are required' }, { status: 400 })
    }

    if (typeof rating !== 'number' || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 })
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

    // Move must be completed
    if (move.status !== 'completed') {
      return NextResponse.json({ error: 'Move is not completed' }, { status: 400 })
    }

    // Check if a review already exists for this move
    const existingReviews = await databases.listDocuments(
      APPWRITE.DATABASE_ID,
      APPWRITE.COLLECTIONS.REVIEWS,
      [
        Query.equal('moveId', [moveId]),
        Query.equal('reviewerId', [userId]),
        Query.limit(1),
      ]
    )

    if (existingReviews.documents.length > 0) {
      return NextResponse.json({ error: 'Review already submitted for this move' }, { status: 409 })
    }

    const moverProfileId = typeof move.moverProfileId === 'string'
      ? move.moverProfileId
      : move.moverProfileId?.$id

    if (!moverProfileId) {
      return NextResponse.json({ error: 'No mover assigned to this move' }, { status: 400 })
    }

    // Create the review
    const review = await databases.createDocument(
      APPWRITE.DATABASE_ID,
      APPWRITE.COLLECTIONS.REVIEWS,
      ID.unique(),
      {
        moveId: moveId,
        reviewerId: userId,
        moverProfileId: moverProfileId,
        rating: Math.round(rating),
        comment: comment || '',
      }
    )

    // Recalculate mover's average rating
    try {
      const allReviews = await databases.listDocuments(
        APPWRITE.DATABASE_ID,
        APPWRITE.COLLECTIONS.REVIEWS,
        [
          Query.equal('moverProfileId', [moverProfileId]),
          Query.limit(500),
        ]
      )

      const totalRating = allReviews.documents.reduce(
        (sum, r) => sum + (r.rating || 0),
        0
      )
      const averageRating =
        allReviews.total > 0
          ? Math.round((totalRating / allReviews.total) * 10) / 10
          : 0

      await databases.updateDocument(
        APPWRITE.DATABASE_ID,
        APPWRITE.COLLECTIONS.MOVER_PROFILES,
        moverProfileId,
        { rating: averageRating }
      )
    } catch (err) {
      console.error('Failed to update mover rating:', err)
      // Non-critical — review is still created
    }

    return NextResponse.json({
      success: true,
      review: {
        id: review.$id,
        rating: review.rating,
        comment: review.comment,
      },
    })
  } catch (error) {
    console.error('POST /api/reviews error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
