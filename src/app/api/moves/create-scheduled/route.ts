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
 * Called from the move-preview page when the user clicks "Proceed to payment".
 * Unlike instant moves, scheduled moves don't have a moverProfileId yet —
 * movers will bid or be assigned later.
 *
 * Body: all the move data collected across steps 1–7 and the preview page.
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
      pickupHaltverbot,
      dropoffFloorLevel,
      dropoffElevatorAvailable,
      dropoffParkingSituation,
      dropoffHaltverbot,
      // Inventory
      inventoryItems,
      customItems,
      totalItemCount,
      // Packing
      packingServiceLevel,
      packingMaterials,
      packingNotes,
      // Timing
      arrivalWindow,
      flexibility,
      // Crew & Vehicle
      crewSize,
      vehicleType,
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
      // Pricing
      estimatedPrice,
      finalPrice,
      // Payment
      paymentMethod,
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
        status: 'booked',
        moveCategory: 'scheduled',
        moveType: moveType || 'regular',
        systemMoveType: moveType || 'regular',
        moveDate: moveDate || null,

        // Pickup
        pickupLocation: pickupLocation || null,
        pickupLatitude: pickupLatitude ?? null,
        pickupLongitude: pickupLongitude ?? null,
        pickupStreetAddress: pickupStreetAddress || null,
        pickupApartmentUnit: pickupApartmentUnit || null,
        pickupFloorLevel: floorLevel || null,
        pickupElevator: elevatorAvailable ?? false,
        pickupParking: parkingSituation || null,
        pickupHaltverbot: pickupHaltverbot ?? false,

        // Dropoff
        dropoffLocation: dropoffLocation || null,
        dropoffLatitude: dropoffLatitude ?? null,
        dropoffLongitude: dropoffLongitude ?? null,
        dropoffStreetAddress: dropoffStreetAddress || null,
        dropoffApartmentUnit: dropoffApartmentUnit || null,
        dropoffFloorLevel: dropoffFloorLevel || null,
        dropoffElevator: dropoffElevatorAvailable ?? false,
        dropoffParking: dropoffParkingSituation || null,
        dropoffHaltverbot: dropoffHaltverbot ?? false,

        // Home/Property
        homeType: homeType || null,

        // Inventory
        inventoryItems: inventoryItems || null,
        customItems: Array.isArray(customItems) ? customItems : [],
        totalItemCount: totalItemCount ?? 0,

        // Packing
        packingServiceLevel: packingServiceLevel || null,
        packingMaterials: Array.isArray(packingMaterials) ? packingMaterials : [],
        packingNotes: packingNotes || null,

        // Timing
        arrivalWindow: arrivalWindow || null,
        flexibility: flexibility || null,

        // Crew & Vehicle
        crewSize: crewSize || null,
        vehicleType: vehicleType || null,

        // Services
        additionalServices: Array.isArray(additionalServices) ? additionalServices : [],
        storageWeeks: storageWeeks ?? 0,

        // Photos
        coverPhotoId: coverPhotoId || null,
        galleryPhotoIds: Array.isArray(galleryPhotoIds) ? galleryPhotoIds : [],

        // Contact
        contactFullName: contactName || null,
        contactPhone: contactPhone || null,
        contactEmail: contactEmail || null,
        contactNotes: contactNotes || null,
        isBusinessMove: isBusinessMove ?? false,
        companyName: companyName || null,
        vatId: vatId || null,

        // Route
        routeDistanceMeters: routeDistanceMeters ?? null,
        routeDurationSeconds: routeDurationSeconds ?? null,

        // Pricing
        estimatedPrice: estimatedPrice ?? null,
        finalPrice: finalPrice ?? null,

        // Payment
        paymentMethod: paymentMethod || null,

        // Legal
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
