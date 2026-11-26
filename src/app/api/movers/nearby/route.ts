import { getTranslations } from '@/lib/i18n-server'
import { EXTENDED_RADIUS_KM, NEAR_RADIUS_KM } from '@/lib/search-radius'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, withRetry } from '@/lib/appwrite-server'
import { APPWRITE, PLATFORM_TZ } from '@/lib/constants'
import { Query } from 'node-appwrite'
import { getSessionUserId } from '@/lib/auth-session'
import { feeRestricted, isLocationFresh, moverMatchesCountry, residenceBlock } from '@/lib/mover-gates'
import { filterUnderDailyCap, loadVettingConfig } from '@/lib/mover-vetting'
import { compareCandidates, isCertified } from '@/lib/vetting'
import { countryToIso2 } from '@/lib/countryCode'
import { vehicleServiceReady } from '@/lib/vehicle-service'
import { profileCrewSize } from '@/app/api/crew/crew-size'

/** Appwrite rows are schemaless at the SDK boundary. */
type AnyDoc = Record<string, any>

const MAX_RADIUS_KM = EXTENDED_RADIUS_KM

// Freshness (`isLocationFresh`, 3 min) is the same window as `listnearbymovers`
// / `broadcastmoverequest` — this route used to skip the term and list stale
// drivers the functions had already dropped. Shared with create-instant.

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
    countryCode: mover.countryCode ?? null,
    crewSize: mover.crewSize,
    // A moving certificate an admin approved, as one boolean (plan legal/7,
    // V2). The certificate photo and the residence columns never cross.
    certified: isCertified(mover),
    currentLatitude: coarsen(mover.currentLatitude),
    currentLongitude: coarsen(mover.currentLongitude),
    distanceKm,
  }
}

/**
 * GET /api/movers/nearby
 * Find verified, online movers near a given coordinate
 * Query params: ?lat=52.52&lng=13.405&radiusKm=20&country=DE
 * `country` (ISO2, plan wave-2026-10/4 C6) is the PICKUP country; movers in
 * another country are left out, movers/moves without a country keep the
 * radius-only behaviour.
 */
export async function GET(req: NextRequest) {
  const { t } = await getTranslations()
  try {
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: t('errors:auth.unauthorized') }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const lat = parseFloat(searchParams.get('lat') || '0')
    const lng = parseFloat(searchParams.get('lng') || '0')
    // Unbounded radius turned this into "list every online mover".
    const requestedRadius = parseFloat(searchParams.get('radiusKm') || String(NEAR_RADIUS_KM))
    const radiusKm = Number.isFinite(requestedRadius)
      ? Math.min(Math.max(requestedRadius, 1), MAX_RADIUS_KM)
      : 15

    if (!lat || !lng) {
      return NextResponse.json({ error: 'lat and lng are required' }, { status: 400 })
    }
    const moveCountry = countryToIso2(searchParams.get('country'))

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
    const nowMs = Date.now()
    // Driver vetting (plan legal/7): the residence gate date and the daily cap.
    const vettingConfig = await loadVettingConfig(databases)
    const inRange = movers.documents
      // Freshness + vehicle readiness (master D3/D4): a verified current
      // vehicle, and for rental drivers today's SAME confirmation. Every mover
      // that reaches the client therefore carries a verified vehicle.
      .filter((mover) => isLocationFresh(mover, nowMs) && vehicleServiceReady(mover as AnyDoc, nowMs, PLATFORM_TZ))
      // Fee balance (plan fees §5): a restricted driver is never listed.
      .filter((mover) => !feeRestricted(mover))
      // Residence gate (V1): no verified residence document, no new work.
      .filter((mover) => residenceBlock(mover, nowMs, vettingConfig.residenceGateFromMs) === null)
      // Country segregation (C6): the mover's market must be the pickup's.
      .filter((mover) => moverMatchesCountry(mover, moveCountry))
      .filter((mover) => {
        if (!mover.currentLatitude || !mover.currentLongitude) return false
        const dist = haversineKm(lat, lng, mover.currentLatitude, mover.currentLongitude)
        return dist <= radiusKm
      })

    // Daily cap (V2): a driver without a verified certificate who has used
    // today's allowance is not offered to clients.
    const underCap = await filterUnderDailyCap(databases, inRange, vettingConfig, nowMs, PLATFORM_TZ)
    const nearbyMovers = underCap
      .map((mover) => ({
        doc: mover,
        certified: isCertified(mover as AnyDoc),
        distanceKm: haversineKm(lat, lng, mover.currentLatitude, mover.currentLongitude),
      }))
      // Certified first among equally near movers, then distance (V2).
      .sort(compareCandidates)

    // Enrich with the mover's display name and avatar. Only those two fields
    // are taken from the user record — it also holds their email and phone,
    // which a customer has no business seeing before booking.
    const enrichedMovers = await Promise.all(
      nearbyMovers.map(async ({ doc, distanceKm }) => {
        const base = publicMover(doc, distanceKm)
        // The synced `mover_profiles.crewSize` (crew master §4) — the same
        // number the mover app and matching read. `crew_members` only fills in
        // for rows that predate the sync.
        const crewSize = profileCrewSize(doc) ?? 1
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
    return NextResponse.json({ error: t('errors:generic.internal') }, { status: 500 })
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
