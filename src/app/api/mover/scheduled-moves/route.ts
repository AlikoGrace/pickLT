import { getSessionUserId } from '@/lib/auth-session'
import { createAdminClient } from '@/lib/appwrite-server'
import { APPWRITE } from '@/lib/constants'
import { Query } from 'node-appwrite'
import { NextResponse } from 'next/server'

/**
 * GET /api/mover/scheduled-moves
 *
 * Returns scheduled moves assigned to the current mover
 * with status 'mover_assigned'.
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
      [Query.equal('userId', userId), Query.limit(1)],
    )

    if (profiles.documents.length === 0) {
      return NextResponse.json({ error: 'Mover profile not found' }, { status: 404 })
    }

    const moverProfile = profiles.documents[0]

    const docs = await databases.listDocuments(
      APPWRITE.DATABASE_ID,
      APPWRITE.COLLECTIONS.MOVES,
      [
        Query.equal('moverProfileId', moverProfile.$id),
        Query.equal('moveCategory', 'scheduled'),
        Query.equal('status', 'mover_accepted'),
        Query.orderAsc('moveDate'),
        Query.limit(100),
      ],
    )

    const moves = docs.documents.map((doc) => ({
      id: doc.$id,
      handle: doc.handle,
      moveType: doc.moveType,
      moveCategory: doc.moveCategory,
      status: doc.status,
      pickupLocation: doc.pickupLocation,
      pickupStreetAddress: doc.pickupStreetAddress,
      pickupLatitude: doc.pickupLatitude,
      pickupLongitude: doc.pickupLongitude,
      dropoffLocation: doc.dropoffLocation,
      dropoffStreetAddress: doc.dropoffStreetAddress,
      dropoffLatitude: doc.dropoffLatitude,
      dropoffLongitude: doc.dropoffLongitude,
      homeType: doc.homeType,
      totalItemCount: doc.totalItemCount,
      estimatedPrice: doc.estimatedPrice,
      additionalServices: doc.additionalServices || [],
      crewSize: doc.crewSize,
      vehicleType: doc.vehicleType,
      moveDate: doc.moveDate,
      arrivalWindow: doc.arrivalWindow,
      routeDistanceMeters: doc.routeDistanceMeters,
      routeDurationSeconds: doc.routeDurationSeconds,
      coverPhotoId: doc.coverPhotoId || null,
      galleryPhotoIds: doc.galleryPhotoIds || [],
      createdAt: doc.$createdAt,
    }))

    return NextResponse.json({ moves, total: moves.length })
  } catch (error) {
    console.error('GET /api/mover/scheduled-moves error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
