import { getTranslations } from '@/lib/i18n-server'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/appwrite-server'
import { APPWRITE, PLATFORM_TZ } from '@/lib/constants'
import { getSessionUserId } from '@/lib/auth-session'
import { asText, asTextArray } from '@/lib/move-normalizers'
import { movePermissions, moveRequestPermissions } from '@/lib/doc-permissions'
import { directAssignmentBlock } from '@/lib/mover-gates'
import { relId } from '@/lib/notify'
import { PricingReconcileError } from '@/lib/pricingEngine'
import { BasketCapError, priceMoveFields, type PricedMove } from '@/lib/pricing-server'
import { profileCrewSize } from '@/app/api/crew/crew-size'
import { resolveMoveCountry } from '@/lib/moveCountry'
import { writeDroppingUnknownAttributes } from '@/lib/appwrite-write'
import { ID } from 'node-appwrite'

/**
 * POST /api/moves/create-instant
 *
 * Creates an instant-move document and sends a move_request to the selected mover.
 * Called when the client confirms a mover on the select-mover page.
 *
 * Body:
 *   moverProfileId — the chosen mover's profile ID
 *   pickup / dropoff location strings + coordinates
 *   moveType, inventoryItems, customItems, extraHelpers?
 *   coverPhotoId?, galleryPhotoIds?, routeDistanceMeters?, routeDurationSeconds?
 *
 * The server is the price authority (pricing master D5): a client-sent
 * `estimatedPrice` is ignored. The quote is recomputed here from the request
 * with the chosen mover's vehicle class, and the row carries `estimatedPrice`,
 * `priceBreakdown`, `pricingVersion`, `pricedAt`, `currency`, plus the charged
 * `vehicleType` / `crewSize`. The breakdown is returned for the tracking page.
 *
 * Basket + tier (inventory parity plan; crew master D5): the basket is
 * normalised and capped (400 `inventory.quantityTooHigh`), the server computes
 * the totals (a client `totalItemCount` is ignored) and prices + stores
 * `moveType` = max(client tier, classified tier) with `systemMoveType` the
 * classified one. `extraHelpers` (crew master D2) is clamped and billed;
 * `crewSize` is the whole crew (charged crew + extra helpers).
 *
 * The move's country is the PICKUP country (plan wave-2026-10/4 C2): reverse
 * geocoded server-side, with the client's `pickupCountryCode` hint and the
 * client's own country as fallbacks. It selects the pricing config (VAT,
 * tariff) and is stored on the row and inside the breakdown.
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
      extraHelpers,
      paymentMethod,
      coverPhotoId,
      galleryPhotoIds,
      routeDistanceMeters,
      routeDurationSeconds,
      pickupCountryCode,
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

    // ── Country (plan wave-2026-10/4 C2) ─────────────────────
    let userCountryCode: unknown = null
    try {
      const userDoc = await databases.getDocument(APPWRITE.DATABASE_ID, APPWRITE.COLLECTIONS.USERS, userId)
      userCountryCode = userDoc.countryCode
    } catch {
      /* no user row → the default market */
    }
    const countryCode = await resolveMoveCountry({
      pickupLatitude,
      pickupLongitude,
      pickupCountryCode,
      userCountryCode,
    })

    // ── Price it (master D5) ────────────────────────────────
    // The mover is known, so the vehicle line is their class (master D8). The
    // mover's crew size never changes the price; the crew gate on the list
    // already kept out anyone too small for the load.
    let priced: PricedMove
    try {
      priced = await priceMoveFields(
        databases,
        {
          moveType,
          routeDistanceMeters,
          routeDurationSeconds,
          inventoryItems,
          customItems,
          extraHelpers,
          vehicleType: mover.vehicleType,
        },
        'instant',
        countryCode,
        'regular',
      )
    } catch (err) {
      if (err instanceof BasketCapError) {
        return NextResponse.json(
          { error: err.message, fnCode: err.fnCode, fnParams: { itemId: err.violation.itemId, max: err.violation.max } },
          { status: 400 }
        )
      }
      if (err instanceof PricingReconcileError) {
        console.error('[create-instant] quote did not reconcile:', err)
        return NextResponse.json(
          { error: t('errors:pricing.reconcile'), fnCode: 'pricing.reconcile' },
          { status: 500 },
        )
      }
      throw err
    }
    const { breakdown, classification } = priced

    // Crew gate (master D7), server side: the list hid movers whose crew is
    // smaller than the load requires, but the list is a snapshot. The mover's
    // crew is the stored `crewSize` (driver + active helpers, crew master §4);
    // unknown → no gate, so an unsynced row never refuses every two-person job.
    // Extra helpers are advisory (crew master D3) and do not gate.
    const moverCrew = profileCrewSize(mover)
    if (moverCrew !== null && moverCrew < breakdown.profile.requiredCrew) {
      return NextResponse.json(
        { error: t('errors:instant.moverUnavailable.error'), fnCode: 'mover.crewTooSmall' },
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
    const move = await writeDroppingUnknownAttributes(
      {
        handle,
        // Pickup country (C2) — the market this move is priced and matched in.
        countryCode,
        clientId: userId,
        moverProfileId: moverProfileId,
        status: 'mover_assigned',
        // Snapshot of the vehicle doing the job (master D13) — this path
        // assigns the mover without an accept route in between.
        vehicleId: mover.currentVehicleId ?? null,
        moveCategory: 'instant',
        // Enforced tier + server totals (crew master D5).
        ...classification,
        moveDate: new Date().toISOString(),

        pickupLocation: pickupLocation || null,
        pickupLatitude: pickupLatitude ?? null,
        pickupLongitude: pickupLongitude ?? null,
        dropoffLocation: dropoffLocation || null,
        dropoffLatitude: dropoffLatitude ?? null,
        dropoffLongitude: dropoffLongitude ?? null,

        // The normalised basket (contract shapes, zeros stripped).
        inventoryItems: priced.basket.inventoryItems,
        customItems: priced.basket.customItems,

        // Server-computed quote columns (master D13): estimatedPrice,
        // priceBreakdown, pricingVersion, pricedAt, currency, vehicleType,
        // crewSize (whole crew), extraHelpers (billed count).
        ...priced.columns,
        // Settled at completion; card charges run through the app's Stripe flow.
        paymentMethod: paymentMethod === 'card' ? 'card' : 'cash',
        routeDistanceMeters: routeDistanceMeters ?? null,
        routeDurationSeconds: routeDurationSeconds ?? null,

        coverPhotoId: asText(coverPhotoId),
        galleryPhotoIds: asTextArray(galleryPhotoIds),

        termsAccepted: true,
        privacyAccepted: true,
      },
      (data) =>
        databases.createDocument(
          APPWRITE.DATABASE_ID,
          APPWRITE.COLLECTIONS.MOVES,
          moveId,
          data,
          // `userId` (the session subject) is the client's auth id. `delete` is
          // required by the mobile client's discardDraftMove; no client-session
          // update path exists, so no `update` grant.
          movePermissions(userId, moverUserId),
        ),
      'create-instant',
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
      estimatedPrice: breakdown.total,
      breakdown,
      moveType: classification.moveType,
      systemMoveType: classification.systemMoveType,
      countryCode,
    })
  } catch (err) {
    console.error('POST /api/moves/create-instant error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : t('errors:generic.internal') },
      { status: 500 }
    )
  }
}
