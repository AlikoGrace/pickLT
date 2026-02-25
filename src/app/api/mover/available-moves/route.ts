import { getSessionUserId } from '@/lib/auth-session'
import { createAdminClient } from '@/lib/appwrite-server'
import { APPWRITE } from '@/lib/constants'
import { Query } from 'node-appwrite'
import { NextResponse } from 'next/server'

// GET /api/mover/available-moves — Get move requests for the authenticated mover
export async function GET() {
  try {
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { databases } = createAdminClient()

    // Get the mover profile for this user
    const profiles = await databases.listDocuments(
      APPWRITE.DATABASE_ID,
      APPWRITE.COLLECTIONS.MOVER_PROFILES,
      [Query.equal('userId', [userId])]
    )

    const moverProfile = profiles.documents[0]
    if (!moverProfile) {
      return NextResponse.json({ error: 'Mover profile not found' }, { status: 404 })
    }

    // Get pending move requests for this mover
    const moveRequests = await databases.listDocuments(
      APPWRITE.DATABASE_ID,
      APPWRITE.COLLECTIONS.MOVE_REQUESTS,
      [
        Query.equal('moverProfileId', [moverProfile.$id]),
        Query.equal('status', ['pending']),
        Query.orderDesc('$createdAt'),
        Query.limit(50),
      ]
    )

    // For each move request, fetch the associated move details
    const movesWithDetails = await Promise.all(
      moveRequests.documents.map(async (request) => {
        try {
          const moveId = typeof request.moveId === 'string' ? request.moveId : request.moveId?.$id
          if (!moveId) return null

          const move = await databases.getDocument(
            APPWRITE.DATABASE_ID,
            APPWRITE.COLLECTIONS.MOVES,
            moveId
          )

          // Only include scheduled moves on the available-moves page
          if (move.moveCategory !== 'scheduled') return null

          return {
            requestId: request.$id,
            requestStatus: request.status,
            expiresAt: request.expiresAt,
            move: {
              id: move.$id,
              handle: move.handle,
              moveType: move.moveType,
              moveCategory: move.moveCategory,
              status: move.status,
              // Pickup
              pickupLocation: move.pickupLocation,
              pickupStreetAddress: move.pickupStreetAddress,
              pickupLatitude: move.pickupLatitude,
              pickupLongitude: move.pickupLongitude,
              pickupFloorLevel: move.pickupFloorLevel,
              pickupElevator: move.pickupElevator,
              // Dropoff
              dropoffLocation: move.dropoffLocation,
              dropoffStreetAddress: move.dropoffStreetAddress,
              dropoffLatitude: move.dropoffLatitude,
              dropoffLongitude: move.dropoffLongitude,
              dropoffFloorLevel: move.dropoffFloorLevel,
              dropoffElevator: move.dropoffElevator,
              // Details
              homeType: move.homeType,
              totalItemCount: move.totalItemCount,
              estimatedPrice: move.estimatedPrice,
              additionalServices: move.additionalServices || [],
              contactNotes: move.contactNotes,
              crewSize: move.crewSize,
              moveDate: move.moveDate,
              arrivalWindow: move.arrivalWindow,
              routeDistanceMeters: move.routeDistanceMeters,
              routeDurationSeconds: move.routeDurationSeconds,
              coverPhotoId: move.coverPhotoId || null,
              galleryPhotoIds: move.galleryPhotoIds || [],
              createdAt: move.$createdAt,
            },
          }
        } catch {
          return null
        }
      })
    )

    return NextResponse.json({
      moves: movesWithDetails.filter(Boolean),
      total: moveRequests.total,
    })
  } catch (error) {
    console.error('Error fetching available moves:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
