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
    const lat = parseFloat(searchParams.get('lat') || '')
    const lng = parseFloat(searchParams.get('lng') || '')

    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return NextResponse.json(
        { error: 'Missing or invalid lat/lng query parameters' },
        { status: 400 }
      )
    }

    const { databases } = createAdminClient()

    // Bounding box for ~30 km
    const dLat = RADIUS_KM * DEG_PER_KM_LAT
    const dLng = RADIUS_KM * DEG_PER_KM_LNG(lat)

    const docs = await databases.listDocuments(
      APPWRITE.DATABASE_ID,
      APPWRITE.COLLECTIONS.MOVES,
      [
        Query.equal('moveCategory', ['scheduled']),
        Query.equal('status', ['draft']),
        Query.greaterThanEqual('pickupLatitude', lat - dLat),
        Query.lessThanEqual('pickupLatitude', lat + dLat),
        Query.greaterThanEqual('pickupLongitude', lng - dLng),
        Query.lessThanEqual('pickupLongitude', lng + dLng),
        Query.orderDesc('$createdAt'),
        Query.limit(100),
      ]
    )

    // Refine with exact haversine distance and exclude mover's own moves
    const moves = docs.documents
      .filter((doc) => {
        if (doc.clientId === userId) return false
        const pLat = doc.pickupLatitude as number
        const pLng = doc.pickupLongitude as number
        if (pLat == null || pLng == null) return false
        return haversineKm(lat, lng, pLat, pLng) <= RADIUS_KM
      })
      .map((doc) => ({
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

    return NextResponse.json({ moves, total: moves.length })
  } catch (error) {
    console.error('Error fetching nearby moves:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
