import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/appwrite-server'
import { APPWRITE } from '@/lib/constants'
import { getSessionUserId } from '@/lib/auth-session'
import { ID, Query } from 'node-appwrite'

/**
 * POST /api/mover/update-location
 * Receives the mover's current GPS position and updates:
 *  1. mover_locations collection (creates a new record for Realtime)
 *  2. mover_profiles currentLatitude/currentLongitude
 */
export async function POST(req: NextRequest) {
  try {
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { latitude, longitude, heading, speed, moveId } = await req.json()

    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return NextResponse.json(
        { error: 'latitude and longitude are required numbers' },
        { status: 400 }
      )
    }

    const { databases } = createAdminClient()

    // Look up the mover's profile by userId
    const profiles = await databases.listDocuments(
      APPWRITE.DATABASE_ID,
      APPWRITE.COLLECTIONS.MOVER_PROFILES,
      [Query.equal('userId', userId), Query.limit(1)]
    )

    if (profiles.total === 0) {
      return NextResponse.json({ error: 'Mover profile not found' }, { status: 404 })
    }

    const moverProfileId = profiles.documents[0].$id

    // Create location record (Appwrite Realtime will broadcast this)
    await databases.createDocument(
      APPWRITE.DATABASE_ID,
      APPWRITE.COLLECTIONS.MOVER_LOCATIONS,
      ID.unique(),
      {
        moverProfileId,
        moveId: moveId || null,
        latitude,
        longitude,
        heading: heading ?? null,
        speed: speed ?? null,
        timestamp: new Date().toISOString(),
      }
    )

    // Update current position on the mover profile
    await databases.updateDocument(
      APPWRITE.DATABASE_ID,
      APPWRITE.COLLECTIONS.MOVER_PROFILES,
      moverProfileId,
      {
        currentLatitude: latitude,
        currentLongitude: longitude,
      }
    )

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('POST /api/mover/update-location error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
