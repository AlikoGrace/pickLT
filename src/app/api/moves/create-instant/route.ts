import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/appwrite-server'
import { APPWRITE } from '@/lib/constants'
import { getSessionUserId } from '@/lib/auth-session'
import { ID, Query } from 'node-appwrite'

/**
 * POST /api/moves/create-instant
 *
 * Creates an instant-move document and sends a move_request to the selected mover.
 * Called when the client confirms a mover on the select-mover page.
 *
 * Body:
 *   moverProfileId — the chosen mover's profile ID
 *   pickup / dropoff location strings + coordinates
 *   moveType, inventoryItems, customItems, totalItemCount, estimatedPrice
 *   coverPhotoId?, galleryPhotoIds?, routeDistanceMeters?, routeDurationSeconds?
 */
export async function POST(req: NextRequest) {
  try {
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const {
      moverProfileId,
      pickupLocation,
      pickupLatitude,
      pickupLongitude,
      dropoffLocation,
      dropoffLatitude,
      dropoffLongitude,
      moveType,
      inventoryItems,
      customItems,
      totalItemCount,
      estimatedPrice,
      coverPhotoId,
      galleryPhotoIds,
      routeDistanceMeters,
      routeDurationSeconds,
    } = body

    if (!moverProfileId) {
      return NextResponse.json({ error: 'moverProfileId is required' }, { status: 400 })
    }

    const { databases } = createAdminClient()

    // Generate a human-readable handle
    const handle = `IM-${Date.now().toString(36).toUpperCase()}`

    // ── Create the move document ────────────────────────────
    const moveId = ID.unique()
    const move = await databases.createDocument(
      APPWRITE.DATABASE_ID,
      APPWRITE.COLLECTIONS.MOVES,
      moveId,
      {
        handle,
        clientId: userId,
        moverProfileId: moverProfileId,
        status: 'mover_assigned',
        moveCategory: 'instant',
        moveType: moveType || 'regular',
        systemMoveType: moveType || 'regular',
        moveDate: new Date().toISOString(),

        pickupLocation: pickupLocation || null,
        pickupLatitude: pickupLatitude ?? null,
        pickupLongitude: pickupLongitude ?? null,
        dropoffLocation: dropoffLocation || null,
        dropoffLatitude: dropoffLatitude ?? null,
        dropoffLongitude: dropoffLongitude ?? null,

        inventoryItems: inventoryItems || null,
        customItems: customItems || [],
        totalItemCount: totalItemCount ?? 0,

        estimatedPrice: estimatedPrice ?? null,
        routeDistanceMeters: routeDistanceMeters ?? null,
        routeDurationSeconds: routeDurationSeconds ?? null,

        coverPhotoId: coverPhotoId || null,
        galleryPhotoIds: galleryPhotoIds || [],

        termsAccepted: true,
        privacyAccepted: true,
      }
    )

    // ── Create a move_request targeting the mover ───────────
    const expiresAt = new Date(Date.now() + 60_000).toISOString() // 60 s countdown
    const moveRequestId = ID.unique()
    await databases.createDocument(
      APPWRITE.DATABASE_ID,
      APPWRITE.COLLECTIONS.MOVE_REQUESTS,
      moveRequestId,
      {
        moveId: moveId,
        moverProfileId: moverProfileId,
        status: 'pending',
        sentAt: new Date().toISOString(),
        expiresAt,
      }
    )

    return NextResponse.json({
      success: true,
      moveId: move.$id,
      moveRequestId,
      handle,
    })
  } catch (err) {
    console.error('POST /api/moves/create-instant error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
