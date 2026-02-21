import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/appwrite-server'
import { APPWRITE } from '@/lib/constants'
import { getSessionUserId } from '@/lib/auth-session'
import { ID } from 'node-appwrite'

/**
 * POST /api/mover/submit-profile
 * Creates a mover profile and updates the user's type to 'mover'.
 * This mirrors what the submitmoverprofile cloud function does,
 * but is called from the client-side profile setup form.
 */
export async function POST(req: NextRequest) {
  try {
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const {
      fullName,
      phone,
      driversLicense,
      vehicleBrand,
      vehicleModel,
      vehicleYear,
      vehicleCapacity,
      vehicleRegistration,
      vehicleType,
      languages,
      yearsExperience,
      baseRate,
    } = body

    const { databases, users } = createAdminClient()

    // Update personal info in Appwrite Auth + users collection if provided
    const userUpdates: Record<string, unknown> = { userType: 'mover' }
    if (fullName && typeof fullName === 'string') {
      await users.updateName(userId, fullName.trim())
      userUpdates.fullName = fullName.trim()
    }
    if (phone && typeof phone === 'string') {
      const formattedPhone = phone.startsWith('+') ? phone : `+${phone}`
      await users.updatePhone(userId, formattedPhone)
      userUpdates.phone = formattedPhone
    }

    // Create the mover_profiles document
    const profile = await databases.createDocument(
      APPWRITE.DATABASE_ID,
      APPWRITE.COLLECTIONS.MOVER_PROFILES,
      ID.unique(),
      {
        userId,
        driversLicense: driversLicense || null,
        vehicleBrand: vehicleBrand || null,
        vehicleModel: vehicleModel || null,
        vehicleYear: vehicleYear || null,
        vehicleCapacity: vehicleCapacity || null,
        vehicleRegistration: vehicleRegistration || null,
        vehicleType: vehicleType || null,
        languages: languages || [],
        yearsExperience: yearsExperience ? Number(yearsExperience) : 0,
        baseRate: baseRate ? Number(baseRate) : 0,
        rating: 0,
        totalMoves: 0,
        verificationStatus: 'pending_verification',
        isOnline: false,
        currentLatitude: null,
        currentLongitude: null,
      }
    )

    // Update user type (+ personal info) in users collection
    await databases.updateDocument(
      APPWRITE.DATABASE_ID,
      APPWRITE.COLLECTIONS.USERS,
      userId,
      userUpdates
    )

    // Create a notification for the user
    try {
      await databases.createDocument(
        APPWRITE.DATABASE_ID,
        APPWRITE.COLLECTIONS.NOTIFICATIONS,
        ID.unique(),
        {
          userId,
          type: 'system',
          title: 'Profile Submitted',
          body: 'Your mover profile is under review. We will notify you once it is verified.',
          data: JSON.stringify({ moverProfileId: profile.$id }),
          isRead: false,
        }
      )
    } catch {
      // Notification is non-critical
    }

    return NextResponse.json({ success: true, profile })
  } catch (err) {
    console.error('POST /api/mover/submit-profile error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
