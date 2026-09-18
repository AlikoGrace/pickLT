import { getTranslations } from '@/lib/i18n-server'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/appwrite-server'
import { APPWRITE, PLATFORM_TZ } from '@/lib/constants'
import { getSessionUserId } from '@/lib/auth-session'
import { asText, asTextArray } from '@/lib/move-normalizers'
import { movePermissions, moveRequestPermissions } from '@/lib/doc-permissions'
import { directAssignmentBlock } from '@/lib/mover-gates'
import { relId } from '@/lib/notify'
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
  const { t } = await getTranslations()
  try {
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: t('errors:auth.unauthorized') }, { status: 401 })
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
      paymentMethod,
      coverPhotoId,
      galleryPhotoIds,
      routeDistanceMeters,
      routeDurationSeconds,
    } = body

    if (!moverProfileId) {
      return NextResponse.json({ error: 'moverProfileId is required' }, { status: 400 })
    }

    console.log(
      `[create-instant] coverPhotoId=${coverPhotoId ? `"${coverPhotoId.substring(0, 60)}..."` : 'null'}, galleryPhotoIds=${JSON.stringify((galleryPhotoIds || []).map((u: string) => u?.substring(0, 60)))}`
    )

    const { databases } = createAdminClient()

    // This route pins the move to a mover directly, so it is an assignment
    // gate (master D4) — the web counterpart of `createpriorityrequest`, same
    // checks and `fnCode`s: KYC, online, location freshness, vehicle
    // readiness. The client's list is a snapshot; a rental driver's service
    // day can roll over between the fetch and the tap.
    let mover: Record<string, unknown> | null = null
    try {
      mover = await databases.getDocument(
        APPWRITE.DATABASE_ID,
        APPWRITE.COLLECTIONS.MOVER_PROFILES,
        moverProfileId
      )
    } catch {
      // Unknown profile id — same answer as an unverified one.
    }
    const blocked = directAssignmentBlock(mover, Date.now(), PLATFORM_TZ)
    if (!mover || blocked) {
      // The reader is the client, so the sentence is the client-facing one;
      // `fnCode` carries the function contract's reason.
      return NextResponse.json(
        { error: t('errors:instant.moverUnavailable.error'), fnCode: blocked ?? 'mover.notVerified' },
        { status: 400 }
      )
    }

    // Generate a human-readable handle
    const handle = `IM-${Date.now().toString(36).toUpperCase()}`

    // An instant move names its mover up front, so the row can carry the
    // mover's read grant immediately. `moverProfileId` is a mover_profiles $id,
    // NOT an auth id — resolve it through `mover_profiles.userId` first.
    const moverUserId = relId(mover.userId)

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
        // Snapshot of the vehicle doing the job (master D13) — this path
        // assigns the mover without an accept route in between.
        vehicleId: mover.currentVehicleId ?? null,
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

        inventoryItems: asText(inventoryItems),
        customItems: asTextArray(customItems),
        totalItemCount: totalItemCount ?? 0,

        estimatedPrice: estimatedPrice ?? null,
        // Settled at completion; card charges run through the app's Stripe flow.
        paymentMethod: paymentMethod === 'card' ? 'card' : 'cash',
        routeDistanceMeters: routeDistanceMeters ?? null,
        routeDurationSeconds: routeDurationSeconds ?? null,

        coverPhotoId: asText(coverPhotoId),
        galleryPhotoIds: asTextArray(galleryPhotoIds),

        termsAccepted: true,
        privacyAccepted: true,
      },
      // `userId` (the session subject) is the client's auth id. `delete` is
      // required by the mobile client's discardDraftMove; no client-session
      // update path exists, so no `update` grant.
      movePermissions(userId, moverUserId)
    )

    // ── Create a move_request targeting the mover ───────────
    const expiresAt = new Date(Date.now() + 180_000).toISOString() // 3 min countdown
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
      },
      // The targeted mover's inbox + the client's tracking screen.
      moveRequestPermissions(moverUserId, userId)
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
      { error: err instanceof Error ? err.message : t('errors:generic.internal') },
      { status: 500 }
    )
  }
}
