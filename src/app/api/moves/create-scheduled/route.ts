import { getTranslations } from '@/lib/i18n-server'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/appwrite-server'
import { APPWRITE } from '@/lib/constants'
import { getSessionUserId } from '@/lib/auth-session'
import { asText, asTextArray } from '@/lib/move-normalizers'
import { movePermissions } from '@/lib/doc-permissions'
import { PricingReconcileError, type QuoteBreakdown } from '@/lib/pricingEngine'
import { quoteColumns, quoteMoveFields } from '@/lib/pricing-server'
import { resolveMoveCountry } from '@/lib/moveCountry'
import { writeDroppingUnknownAttributes } from '@/lib/appwrite-write'
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
 *
 * The server is the price authority (pricing master D5): client-sent
 * `estimatedPrice` / `finalPrice` are ignored. The quote is recomputed here —
 * no mover yet, so the vehicle class is the smallest that holds the load, never
 * below the tier's minimum (master D8) — and the row carries `estimatedPrice`,
 * `priceBreakdown`, `pricingVersion`, `pricedAt`, `currency`, plus the charged
 * `vehicleType` / `crewSize` (which replace the wizard's guesses).
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
      // Payment
      paymentMethod,
      // Country hint from the geocoder (C2)
      pickupCountryCode,
    } = body

    const { databases } = createAdminClient()

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
    // Row-shaped field names, so this quote and a later re-quote from the
    // stored row read exactly the same inputs. The wizard's `vehicleType` is a
    // preference, not a mover's class — `'multiple'` and the like are not
    // classes, so the engine resolves the class from the load instead.
    let breakdown: QuoteBreakdown
    try {
      breakdown = await quoteMoveFields(
        databases,
        {
          moveType,
          routeDistanceMeters,
          routeDurationSeconds,
          inventoryItems,
          customItems,
          vehicleType: null,
          pickupFloorLevel: floorLevel,
          pickupElevator: elevatorAvailable,
          dropoffFloorLevel,
          dropoffElevator: dropoffElevatorAvailable,
          pickupHaltverbot,
          dropoffHaltverbot,
          packingServiceLevel,
          additionalServices,
          storageWeeks,
        },
        'scheduled',
        countryCode,
      )
    } catch (err) {
      if (err instanceof PricingReconcileError) {
        console.error('[create-scheduled] quote did not reconcile:', err)
        return NextResponse.json(
          { error: t('errors:pricing.reconcile'), fnCode: 'pricing.reconcile' },
          { status: 500 },
        )
      }
      throw err
    }
    const priced = quoteColumns(breakdown)

    const handle = `SM-${Date.now().toString(36).toUpperCase()}`

    const moveId = ID.unique()
    const move = await writeDroppingUnknownAttributes(
      {
        handle,
        clientId: userId,
        // Pickup country (C2) — the market this move is priced and matched in.
        countryCode,
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
        inventoryItems: asText(inventoryItems),
        customItems: asTextArray(customItems),
        totalItemCount: totalItemCount ?? 0,

        // Packing
        packingServiceLevel: packingServiceLevel || null,
        packingMaterials: asTextArray(packingMaterials),
        packingNotes: packingNotes || null,

        // Timing
        arrivalWindow: arrivalWindow || null,
        flexibility: flexibility || null,

        // Crew & Vehicle — the *charged* class and crew from the quote
        // (master D13), written below with the other quote columns. The
        // wizard's `crewSize` / `vehicleType` are kept only when the engine
        // produced nothing, which it never does.
        crewSize: priced.crewSize || crewSize || null,
        vehicleType: priced.vehicleType || vehicleType || null,

        // Services
        additionalServices: asTextArray(additionalServices),
        storageWeeks: storageWeeks ?? 0,

        // Photos
        coverPhotoId: asText(coverPhotoId),
        galleryPhotoIds: asTextArray(galleryPhotoIds),

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

        // Pricing — server-computed (master D5/D13): estimatedPrice,
        // priceBreakdown, pricingVersion, pricedAt, currency (+ the
        // vehicleType / crewSize above). `finalPrice` is set at completion.
        estimatedPrice: priced.estimatedPrice,
        priceBreakdown: priced.priceBreakdown,
        pricingVersion: priced.pricingVersion,
        pricedAt: priced.pricedAt,
        currency: priced.currency,
        finalPrice: null,

        // Payment
        paymentMethod: paymentMethod || null,

        // Legal
        termsAccepted: true,
        privacyAccepted: true,
      },
      (data) =>
        databases.createDocument(
          APPWRITE.DATABASE_ID,
          APPWRITE.COLLECTIONS.MOVES,
          moveId,
          data,
          // No mover is chosen yet, so only the client is granted. The mover's read
          // is added when acceptance sets `moverProfileId` (plan Task 2.2), and
          // browsing unassigned work goes through the redacting `listavailablemoves`
          // function (plan hard case A) rather than a direct read.
          movePermissions(userId),
        ),
      'create-scheduled',
    )

    return NextResponse.json({
      success: true,
      moveId: move.$id,
      handle,
      estimatedPrice: breakdown.total,
      breakdown,
      countryCode,
    })
  } catch (err) {
    console.error('POST /api/moves/create-scheduled error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : t('errors:generic.internal') },
      { status: 500 }
    )
  }
}
