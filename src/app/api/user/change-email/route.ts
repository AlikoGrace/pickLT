import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/appwrite-server'
import { APPWRITE } from '@/lib/constants'
import { getSessionUserId } from '@/lib/auth-session'

/**
 * POST /api/user/change-email
 *
 * Changes the user's email address.
 * Flow:
 * 1. Update the Appwrite Auth account email (via admin SDK)
 * 2. Update the users collection document
 * 3. The client can then call account.createVerification() to send 
 *    a verification email to the new address via the Appwrite client SDK.
 *
 * Body: { email: string }
 */
export async function POST(req: NextRequest) {
  try {
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { email } = await req.json()

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
    }

    const { users, databases } = createAdminClient()

    // Update Appwrite Auth account email
    await users.updateEmail(userId, email)

    // Update our users collection
    await databases.updateDocument(
      APPWRITE.DATABASE_ID,
      APPWRITE.COLLECTIONS.USERS,
      userId,
      {
        email,
        emailVerified: false, // Reset until re-verified
      }
    )

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    console.error('[change-email] Error:', err)
    const message = err instanceof Error ? err.message : 'Failed to change email'

    // Handle Appwrite-specific errors
    if (message.includes('A user with the same email already exists')) {
      return NextResponse.json(
        { error: 'This email is already in use by another account' },
        { status: 409 }
      )
    }

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
