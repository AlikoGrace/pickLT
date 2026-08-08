import { createAdminClient } from '@/lib/appwrite-server'
import { requireVerifiedMover, isErrorResponse } from '@/lib/mover-auth'
import { APPWRITE } from '@/lib/constants'
import { Query } from 'node-appwrite'
import { NextRequest, NextResponse } from 'next/server'

const RADIUS_KM = 30

// ~1.1 km of precision — enough to place an approximate pin and judge
// distance, not enough to identify a specific building before the job is won.
const COARSE_DP = 2
const coarsen = (v: unknown): number | null =>
  typeof v === 'number' && Number.isFinite(v)
    ? Number(v.toFixed(COARSE_DP))
    : null
const DEG_PER_KM_LAT = 1 / 111.32
const DEG_PER_KM_LNG = (lat: number) => 1 / (111.32 * Math.cos((lat * Math.PI) / 180))

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/**
 * GET /api/mover/nearby-moves?lat=...&lng=...
 *
 * Fetches scheduled moves with status "draft" whose pickup location is
 * within 30 km of the provided coordinates. Uses a bounding-box query
 * on pickupLatitude/pickupLongitude, then refines with Haversine.
 */
export async function GET(req: NextRequest) {
  try {
    // This is a pre-acceptance marketplace feed over other people's homes.
    // A bare session check let any account sweep a coordinate grid and harvest
    // addresses, dates and contents, so it requires a verified mover.
    const auth = await requireVerifiedMover()
    if (isErrorResponse(auth)) return auth
    const { userId } = auth

    const { searchParams } = req.nextUrl
    let lat = parseFloat(searchParams.get('lat') || '')
    let lng = parseFloat(searchParams.get('lng') || '')

    const { databases } = createAdminClient()

    // If no valid coordinates provided, fall back to the mover's stored profile location
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      const profiles = await databases.listDocuments(
        APPWRITE.DATABASE_ID,
        APPWRITE.COLLECTIONS.MOVER_PROFILES,
        [Query.equal('userId', userId), Query.limit(1)]
      )
      if (profiles.total > 0) {
        const profile = profiles.documents[0]
        lat = profile.currentLatitude as number
        lng = profile.currentLongitude as number
      }
      if (!lat || !lng || Number.isNaN(lat) || Number.isNaN(lng)) {
        return NextResponse.json(
          { error: 'No location available. Please enable location services or update your location.' },
          { status: 400 }
        )
      }
    }

    // Bounding box for ~30 km (applied in JS since no DB indexes for range queries)
    const dLat = RADIUS_KM * DEG_PER_KM_LAT
    const dLng = RADIUS_KM * DEG_PER_KM_LNG(lat)

    // Fetch all draft scheduled moves — geographic filtering done in JS
    const docs = await databases.listDocuments(
      APPWRITE.DATABASE_ID,
      APPWRITE.COLLECTIONS.MOVES,
      [
        Query.equal('moveCategory', 'scheduled'),
        Query.equal('status', ['draft', 'booked']),
        // Exclude in-progress mobile booking wizards (`wizardDraft: true` until
        // submit). The isNull branch matters: adding `wizardDraft` with
        // `default: false` did NOT backfill existing rows, and `null != true` is
        // null in SQL, so a bare notEqual dropped every pre-existing move.
        // Those rows were backfilled 2026-07-27; the branch stays as insurance.
        Query.or([Query.notEqual('wizardDraft', true), Query.isNull('wizardDraft')]),
        Query.orderDesc('$createdAt'),
        Query.limit(200),
      ]
    )

    console.log(
      `[nearby-moves] mover coords: ${lat.toFixed(4)},${lng.toFixed(4)} | total draft scheduled: ${docs.total}`
    )

    // Refine with bounding box, exact haversine distance, exclude mover's own moves, and filter out past moves
    const nowIso = new Date().toISOString()
    const moves = docs.documents
      .filter((doc) => {
        const pLat = doc.pickupLatitude as number
        const pLng = doc.pickupLongitude as number
        if (pLat == null || pLng == null) return false
        // Quick bounding-box pre-filter
        if (pLat < lat - dLat || pLat > lat + dLat) return false
        if (pLng < lng - dLng || pLng > lng + dLng) return false
        // Exclude mover's own moves
        const docClientId =
          typeof doc.clientId === 'string'
            ? doc.clientId
            : (doc.clientId as Record<string, string>)?.$id || null
        if (docClientId === userId) return false
        // Filter out moves with a past moveDate
        if (doc.moveDate && doc.moveDate < nowIso) return false
        // Exact distance check
        return haversineKm(lat, lng, pLat, pLng) <= RADIUS_KM
      })

    console.log(
      `[nearby-moves] after filtering: ${moves.length} moves within ${RADIUS_KM}km`
    )

    // Pre-acceptance projection. Street addresses, exact coordinates and the
    // client's free-text notes are deliberately withheld until a mover is
    // assigned — the mover needs enough to price and accept the job, not
    // enough to identify the household. The full record is served by
    // /api/moves/[id]/full, which checks assignment.
    const result = moves.map((doc) => ({
        id: doc.$id,
        handle: doc.handle,
        moveType: doc.moveType,
        moveCategory: doc.moveCategory,
        status: doc.status,
        pickupLocation: doc.pickupLocation,
        pickupLatitude: coarsen(doc.pickupLatitude),
        pickupLongitude: coarsen(doc.pickupLongitude),
        pickupFloorLevel: doc.pickupFloorLevel,
        pickupElevator: doc.pickupElevator,
        dropoffLocation: doc.dropoffLocation,
        dropoffLatitude: coarsen(doc.dropoffLatitude),
        dropoffLongitude: coarsen(doc.dropoffLongitude),
        dropoffFloorLevel: doc.dropoffFloorLevel,
        dropoffElevator: doc.dropoffElevator,
        homeType: doc.homeType,
        totalItemCount: doc.totalItemCount,
        inventoryItems: doc.inventoryItems,
        customItems: doc.customItems,
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
        packingServiceLevel: doc.packingServiceLevel,
        paymentMethod: doc.paymentMethod,
        createdAt: doc.$createdAt,
        distanceFromMover: haversineKm(
          lat,
          lng,
          doc.pickupLatitude as number,
          doc.pickupLongitude as number
        ),
      }))

    return NextResponse.json({ moves: result, total: result.length })
  } catch (error) {
    console.error('Error fetching nearby moves:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
