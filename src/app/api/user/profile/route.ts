import { getTranslations } from '@/lib/i18n-server'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/appwrite-server'
import { APPWRITE } from '@/lib/constants'
import { getSessionUserId } from '@/lib/auth-session'

/**
 * GET /api/user/profile
 * Get the authenticated user's profile from Appwrite
 */
export async function GET() {
  const { t } = await getTranslations()
  try {
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: t('errors:auth.unauthorized') }, { status: 401 })
    }

    const { databases } = createAdminClient()

    const userDoc = await databases.getDocument(
      APPWRITE.DATABASE_ID,
      APPWRITE.COLLECTIONS.USERS,
      userId
    )

    return NextResponse.json({ user: userDoc })
  } catch (err) {
    console.error('GET /api/user/profile error:', err)
    return NextResponse.json({ error: t('errors:generic.internal') }, { status: 500 })
  }
}

/**
 * PATCH /api/user/profile
 * Update user profile fields.
 * - fullName: Updates both the Appwrite Auth account name AND the users collection.
 * - profilePhoto: Updates the users collection.
 * - email/phone: NOT allowed here. Use dedicated /api/user/change-email or /api/user/change-phone.
 */
export async function PATCH(req: NextRequest) {
  const { t } = await getTranslations()
  try {
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: t('errors:auth.unauthorized') }, { status: 401 })
    }

    const body = await req.json()
    // Only allow safe fields — email/phone require verification flows
    const allowedFields = ['fullName', 'profilePhoto']
    const updates: Record<string, unknown> = {}

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field]
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: t('errors:validation.noFields') }, { status: 400 })
    }

    const { databases, users } = createAdminClient()

    // If fullName changed, also update the Appwrite Auth account name
    // so that loadSession → account.get() picks up the new name
    if (updates.fullName) {
      try {
        await users.updateName(userId, updates.fullName as string)
      } catch (err) {
        console.error('Failed to update Appwrite Auth name:', err)
      }
    }

    const updatedUser = await databases.updateDocument(
      APPWRITE.DATABASE_ID,
      APPWRITE.COLLECTIONS.USERS,
      userId,
      updates
    )

    return NextResponse.json({ user: updatedUser })
  } catch (err) {
    console.error('PATCH /api/user/profile error:', err)
    return NextResponse.json({ error: t('errors:generic.internal') }, { status: 500 })
  }
}
