import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/appwrite-server'
import { APPWRITE } from '@/lib/constants'
import { Query } from 'node-appwrite'
import { getSessionUserId } from '@/lib/auth-session'

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
    const radiusKm = parseFloat(searchParams.get('radiusKm') || '15')

    if (!lat || !lng) {
      return NextResponse.json({ error: 'lat and lng are required' }, { status: 400 })
    }

    const { databases } = createAdminClient()

    // Fetch verified & online movers
    const movers = await databases.listDocuments(
      APPWRITE.DATABASE_ID,
      APPWRITE.COLLECTIONS.MOVER_PROFILES,
      [
        Query.equal('verificationStatus', 'verified'),
        Query.equal('isOnline', true),
        Query.limit(50),
      ]
    )

    // Filter by distance (Haversine approximation)
    const nearbyMovers = movers.documents
      .filter((mover) => {
        if (!mover.currentLatitude || !mover.currentLongitude) return false
        const dist = haversineKm(lat, lng, mover.currentLatitude, mover.currentLongitude)
        return dist <= radiusKm
      })
      .map((mover) => ({
        ...mover,
        distanceKm: haversineKm(lat, lng, mover.currentLatitude, mover.currentLongitude),
      }))
      .sort((a, b) => a.distanceKm - b.distanceKm)

    // Enrich with user info (profilePhoto, fullName) from users collection
    const enrichedMovers = await Promise.all(
      nearbyMovers.map(async (mover) => {
        try {
          const moverUserId = (mover as Record<string, unknown>).userId as string
          if (!moverUserId) return mover
          const userDoc = await databases.getDocument(
            APPWRITE.DATABASE_ID,
            APPWRITE.COLLECTIONS.USERS,
            moverUserId
          )
          return {
            ...mover,
            fullName: userDoc.fullName || undefined,
            profilePhotoUrl: userDoc.profilePhoto || undefined,
          }
        } catch {
          return mover
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
