import { getSessionUserId } from '@/lib/auth-session'
import { createAdminClient } from '@/lib/appwrite-server'
import { APPWRITE } from '@/lib/constants'
import { Query } from 'node-appwrite'
import { NextRequest, NextResponse } from 'next/server'

const RADIUS_KM = 30
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
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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
        Query.equal('status', 'draft'),
        Query.orderDesc('$createdAt'),
        Query.limit(200),
      ]
    )

    console.log(
      `[nearby-moves] mover coords: ${lat.toFixed(4)},${lng.toFixed(4)} | total draft scheduled: ${docs.total}`
    )

    // Refine with bounding box, exact haversine distance, and exclude mover's own moves
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
        // Exact distance check
        return haversineKm(lat, lng, pLat, pLng) <= RADIUS_KM
      })

    console.log(
      `[nearby-moves] after filtering: ${moves.length} moves within ${RADIUS_KM}km`
    )

    const result = moves.map((doc) => ({
        id: doc.$id,
        handle: doc.handle,
        moveType: doc.moveType,
        moveCategory: doc.moveCategory,
        status: doc.status,
        pickupLocation: doc.pickupLocation,
        pickupStreetAddress: doc.pickupStreetAddress,
        pickupLatitude: doc.pickupLatitude,
        pickupLongitude: doc.pickupLongitude,
        pickupFloorLevel: doc.pickupFloorLevel,
        pickupElevator: doc.pickupElevator,
        dropoffLocation: doc.dropoffLocation,
        dropoffStreetAddress: doc.dropoffStreetAddress,
        dropoffLatitude: doc.dropoffLatitude,
        dropoffLongitude: doc.dropoffLongitude,
        dropoffFloorLevel: doc.dropoffFloorLevel,
        dropoffElevator: doc.dropoffElevator,
        homeType: doc.homeType,
        totalItemCount: doc.totalItemCount,
        inventoryItems: doc.inventoryItems,
        customItems: doc.customItems,
        estimatedPrice: doc.estimatedPrice,
        additionalServices: doc.additionalServices || [],
        contactNotes: doc.contactNotes,
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
