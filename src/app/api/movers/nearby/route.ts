import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, withRetry } from '@/lib/appwrite-server'
import { APPWRITE } from '@/lib/constants'
import { Query } from 'node-appwrite'
import { getSessionUserId } from '@/lib/auth-session'

/** Appwrite rows are schemaless at the SDK boundary. */
type AnyDoc = Record<string, any>

const MAX_RADIUS_KM = 50

// ~1.1 km — enough to place a pin and estimate arrival, not enough to track an
// individual driver. The displayed distance is computed from the exact
// coordinates before coarsening, so accuracy is not lost.
const coarsen = (v: unknown): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? Number(v.toFixed(2)) : null

/**
 * Public projection of a mover profile.
 *
 * The raw document carries driversLicense, driversLicensePhoto,
 * socialSecurityNumber, taxNumber, vehicleRegistration and expoPushToken, and
 * its userId relationship hydrates into the full user record (email, phone).
 * None of that may reach a prospective customer, so fields are allow-listed
 * rather than spread — a new sensitive column must be opted in, not remembered.
 */
function publicMover(mover: AnyDoc, distanceKm: number) {
  return {
    id: mover.$id,
    $id: mover.$id,
    vehicleBrand: mover.vehicleBrand,
    vehicleModel: mover.vehicleModel,
    vehicleYear: mover.vehicleYear,
    vehicleCapacity: mover.vehicleCapacity,
    vehicleType: mover.vehicleType,
    rating: mover.rating,
    totalMoves: mover.totalMoves,
    yearsExperience: mover.yearsExperience,
    verificationStatus: mover.verificationStatus,
    isOnline: mover.isOnline,
    languages: mover.languages,
    primaryCity: mover.primaryCity,
    primaryCountry: mover.primaryCountry,
    crewSize: mover.crewSize,
    currentLatitude: coarsen(mover.currentLatitude),
    currentLongitude: coarsen(mover.currentLongitude),
    distanceKm,
  }
}

/**
 * GET /api/movers/nearby
 * Find verified, online movers near a given coordinate
 * Query params: ?lat=52.52&lng=13.405&radiusKm=15
 */
export async function GET(req: NextRequest) {
  try {
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const lat = parseFloat(searchParams.get('lat') || '0')
    const lng = parseFloat(searchParams.get('lng') || '0')
    // Unbounded radius turned this into "list every online mover".
    const requestedRadius = parseFloat(searchParams.get('radiusKm') || '15')
    const radiusKm = Number.isFinite(requestedRadius)
      ? Math.min(Math.max(requestedRadius, 1), MAX_RADIUS_KM)
      : 15

    if (!lat || !lng) {
      return NextResponse.json({ error: 'lat and lng are required' }, { status: 400 })
    }

    const { databases } = createAdminClient()

    // Fetch online, verified movers
    const movers = await withRetry(() =>
      databases.listDocuments(
        APPWRITE.DATABASE_ID,
        APPWRITE.COLLECTIONS.MOVER_PROFILES,
        [
          Query.equal('verificationStatus', ['verified']),
          Query.equal('isOnline', true),
          Query.limit(50),
        ]
      )
    )

    // Filter by distance (Haversine approximation)
    console.log(
      `[nearby] Found ${movers.total} online mover(s), client coords: ${lat},${lng}, radius: ${radiusKm}km`
    )
    const nearbyMovers = movers.documents
      .filter((mover) => {
        if (!mover.currentLatitude || !mover.currentLongitude) return false
        const dist = haversineKm(lat, lng, mover.currentLatitude, mover.currentLongitude)
        return dist <= radiusKm
      })
      .map((mover) => ({
        doc: mover,
        distanceKm: haversineKm(lat, lng, mover.currentLatitude, mover.currentLongitude),
      }))
      .sort((a, b) => a.distanceKm - b.distanceKm)

    // Enrich with the mover's display name and avatar. Only those two fields
    // are taken from the user record — it also holds their email and phone,
    // which a customer has no business seeing before booking.
    const enrichedMovers = await Promise.all(
      nearbyMovers.map(async ({ doc, distanceKm }) => {
        const base = publicMover(doc, distanceKm)
        const crewSize =
          (Array.isArray(doc.crew_members) ? doc.crew_members.length : 0) + 1
        try {
          const moverUserId = typeof doc.userId === 'string' ? doc.userId : doc.userId?.$id
          if (!moverUserId) return { ...base, crewSize }
          const userDoc = await databases.getDocument(
            APPWRITE.DATABASE_ID,
            APPWRITE.COLLECTIONS.USERS,
            moverUserId
          )
          return {
            ...base,
            crewSize,
            fullName: userDoc.fullName || undefined,
            profilePhotoUrl: userDoc.profilePhoto || undefined,
          }
        } catch {
          return { ...base, crewSize }
        }
      })
    )

    return NextResponse.json({
      movers: enrichedMovers,
      total: enrichedMovers.length,
    })
  } catch (err) {
    console.error('GET /api/movers/nearby error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Haversine formula — returns distance in km
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180
}
