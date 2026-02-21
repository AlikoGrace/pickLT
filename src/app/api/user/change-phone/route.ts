import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/appwrite-server'
import { APPWRITE } from '@/lib/constants'
import { getSessionUserId } from '@/lib/auth-session'

/**
 * POST /api/user/change-phone
 *
 * Changes the user's phone number.
 * Flow:
 * 1. Update the Appwrite Auth account phone (via admin SDK)
 * 2. Update the users collection document, mark phoneVerified = false
 * 3. The client then calls account.createPhoneVerification() to send OTP
 * 4. After OTP confirmed, auth context refreshes and picks up phoneVerified = true
 *
 * Body: { phone: string }
 */
export async function POST(req: NextRequest) {
  try {
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { phone } = await req.json()

    if (!phone || typeof phone !== 'string') {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 })
    }

    const formattedPhone = phone.startsWith('+') ? phone : `+${phone}`

    // Basic phone format validation
    if (!/^\+\d{7,15}$/.test(formattedPhone)) {
      return NextResponse.json(
        { error: 'Invalid phone number. Use international format (e.g. +491234567890)' },
        { status: 400 }
      )
    }

    const { users, databases } = createAdminClient()

    // Update Appwrite Auth account phone
    await users.updatePhone(userId, formattedPhone)

    // Update our users collection 
    await databases.updateDocument(
      APPWRITE.DATABASE_ID,
      APPWRITE.COLLECTIONS.USERS,
      userId,
      {
        phone: formattedPhone,
        phoneVerified: false, // Reset until re-verified via OTP
      }
    )

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    console.error('[change-phone] Error:', err)
    const message = err instanceof Error ? err.message : 'Failed to change phone'

    if (message.includes('A user with the same phone already exists')) {
      return NextResponse.json(
        { error: 'This phone number is already in use by another account' },
        { status: 409 }
      )
    }

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
