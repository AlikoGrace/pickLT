import { auth } from '@clerk/nextjs/server'
import { createAdminClient } from '@/lib/appwrite-server'
import { APPWRITE } from '@/lib/constants'
import { Query } from 'node-appwrite'
import { NextResponse } from 'next/server'

// GET /api/mover/available-moves — Get move requests for the authenticated mover
export async function GET() {
  try {
    const { userId: clerkId } = await auth()
    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { databases } = createAdminClient()

    // Find the user by clerkId
    const users = await databases.listDocuments(
      APPWRITE.DATABASE_ID,
      APPWRITE.COLLECTIONS.USERS,
      [Query.equal('email', [clerkId])]
    )

    // Try matching by email from user doc
    let userDoc = users.documents[0]
    if (!userDoc) {
      // Search differently - find by iterating (clerkId stored as part of doc)
      const allUsers = await databases.listDocuments(
        APPWRITE.DATABASE_ID,
        APPWRITE.COLLECTIONS.USERS,
        [Query.limit(100)]
      )
      userDoc = allUsers.documents.find((u) => u.email?.includes(clerkId) || u.$id === clerkId) as typeof userDoc
    }

    if (!userDoc) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get the mover profile
    const profiles = await databases.listDocuments(
      APPWRITE.DATABASE_ID,
      APPWRITE.COLLECTIONS.MOVER_PROFILES,
      [Query.equal('userId', [userDoc.$id])]
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
