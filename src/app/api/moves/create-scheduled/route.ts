import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/appwrite-server'
import { APPWRITE } from '@/lib/constants'
import { getSessionUserId } from '@/lib/auth-session'
import { ID } from 'node-appwrite'

export const runtime = 'nodejs'
export const maxDuration = 60

/**
 * POST /api/moves/create-scheduled
 *
 * Creates a scheduled-move document in the MOVES collection.
 * Called at the end of the add-listing flow (step 7) after the user fills contact info.
 * Unlike instant moves, scheduled moves don't have a moverProfileId yet —
 * movers will bid or be assigned later.
 *
 * Body: all the move data collected across steps 1–7.
 */
export async function POST(req: NextRequest) {
  try {
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const {
      // Locations
      pickupLocation,
      pickupLatitude,
      pickupLongitude,
      pickupStreetAddress,
      pickupApartmentUnit,
      pickupAccessNotes,
      dropoffLocation,
      dropoffLatitude,
      dropoffLongitude,
      dropoffStreetAddress,
      dropoffApartmentUnit,
      // Move details
      moveDate,
      moveType,
      homeType,
      floorLevel,
      elevatorAvailable,
      parkingSituation,
      dropoffFloorLevel,
      dropoffElevatorAvailable,
      dropoffParkingSituation,
      // Inventory
      inventoryItems,
      customItems,
      totalItemCount,
      // Services
      additionalServices,
      storageWeeks,
      disposalItems,
      // Photos (already uploaded URLs)
      coverPhotoId,
      galleryPhotoIds,
      // Contact
      contactName,
      contactEmail,
      contactPhone,
      contactNotes,
      isBusinessMove,
      companyName,
      vatId,
      // Route
      routeDistanceMeters,
      routeDurationSeconds,
    } = body

    const { databases } = createAdminClient()

    const handle = `SM-${Date.now().toString(36).toUpperCase()}`

    const moveId = ID.unique()
    const move = await databases.createDocument(
      APPWRITE.DATABASE_ID,
      APPWRITE.COLLECTIONS.MOVES,
      moveId,
      {
        handle,
        clientId: userId,
        status: 'pending',
        moveCategory: 'scheduled',
        moveType: moveType || 'regular',
        systemMoveType: moveType || 'regular',
        moveDate: moveDate || null,

        pickupLocation: pickupLocation || null,
        pickupLatitude: pickupLatitude ?? null,
        pickupLongitude: pickupLongitude ?? null,
        dropoffLocation: dropoffLocation || null,
        dropoffLatitude: dropoffLatitude ?? null,
        dropoffLongitude: dropoffLongitude ?? null,

        inventoryItems: inventoryItems || null,
        customItems: customItems || [],
        totalItemCount: totalItemCount ?? 0,

        coverPhotoId: coverPhotoId || null,
        galleryPhotoIds: galleryPhotoIds || [],

        routeDistanceMeters: routeDistanceMeters ?? null,
        routeDurationSeconds: routeDurationSeconds ?? null,

        termsAccepted: true,
        privacyAccepted: true,
      }
    )

    return NextResponse.json({
      success: true,
      moveId: move.$id,
      handle,
    })
  } catch (err) {
    console.error('POST /api/moves/create-scheduled error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
