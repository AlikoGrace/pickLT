import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/appwrite-server'
import { APPWRITE } from '@/lib/constants'
import { getSessionUserId } from '@/lib/auth-session'
import { ID, Query } from 'node-appwrite'

/**
 * POST /api/mover/submit-profile
 * Creates (or updates an existing) mover profile and sets the user's type to 'mover'.
 *
 * Because `userId` is a one-to-one relationship on `mover_profiles`,
 * attempting to create a second document for the same user would violate
 * the relationship constraint. So we first check whether a profile already
 * exists and upsert accordingly.
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
      driversLicensePhoto,
      socialSecurityNumber,
      taxNumber,
      primaryCity,
      primaryCountry,
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

    // ── Block clients from becoming movers ─────────────────
    let userDoc: Record<string, unknown> | null = null
    try {
      userDoc = await databases.getDocument(
        APPWRITE.DATABASE_ID,
        APPWRITE.COLLECTIONS.USERS,
        userId
      ) as unknown as Record<string, unknown>
    } catch {
      // User doc doesn't exist yet; sync-user should have created it
    }

    if (userDoc?.userType === 'client') {
      return NextResponse.json(
        { error: 'Your account is registered as a client. Client accounts cannot be converted to mover accounts. Please create a new account to register as a mover.' },
        { status: 403 }
      )
    }

    // Update personal info in Appwrite Auth + users collection if provided
    const userUpdates: Record<string, unknown> = { userType: 'mover' }
    if (fullName && typeof fullName === 'string') {
      try { await users.updateName(userId, fullName.trim()) } catch { /* may fail for OAuth users */ }
      userUpdates.fullName = fullName.trim()
    }
    if (phone && typeof phone === 'string') {
      const formattedPhone = phone.startsWith('+') ? phone : `+${phone}`
      try { await users.updatePhone(userId, formattedPhone) } catch { /* may fail if phone already taken */ }
      userUpdates.phone = formattedPhone
    }

    // ── Check for an existing mover profile (handles re-login after partial setup) ──
    const existing = await databases.listDocuments(
      APPWRITE.DATABASE_ID,
      APPWRITE.COLLECTIONS.MOVER_PROFILES,
      [Query.equal('userId', userId), Query.limit(1)]
    )

    const profilePayload: Record<string, unknown> = {
      driversLicense: driversLicense || null,
      driversLicensePhoto: driversLicensePhoto || null,
      socialSecurityNumber: socialSecurityNumber || null,
      taxNumber: taxNumber || null,
      primaryCity: primaryCity || null,
      primaryCountry: primaryCountry || null,
      vehicleBrand: vehicleBrand || null,
      vehicleModel: vehicleModel || null,
      vehicleYear: vehicleYear || null,
      vehicleCapacity: vehicleCapacity || null,
      vehicleRegistration: vehicleRegistration || null,
      vehicleType: vehicleType || null,
      languages: languages || [],
      yearsExperience: yearsExperience ? Number(yearsExperience) : 0,
      baseRate: baseRate ? Number(baseRate) : 0,
    }

    let profile
    if (existing.total > 0) {
      // Update the existing profile instead of creating a duplicate
      profile = await databases.updateDocument(
        APPWRITE.DATABASE_ID,
        APPWRITE.COLLECTIONS.MOVER_PROFILES,
        existing.documents[0].$id,
        {
          ...profilePayload,
          verificationStatus: 'pending_verification',
        }
      )
    } else {
      // Create a brand-new mover profile
      profile = await databases.createDocument(
        APPWRITE.DATABASE_ID,
        APPWRITE.COLLECTIONS.MOVER_PROFILES,
        ID.unique(),
        {
          userId,
          ...profilePayload,
          rating: 0,
          totalMoves: 0,
          verificationStatus: 'pending_verification',
          isOnline: false,
          currentLatitude: null,
          currentLongitude: null,
        }
      )
    }

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
