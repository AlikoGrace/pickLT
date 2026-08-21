import { getTranslations } from '@/lib/i18n-server'
import { NextResponse } from 'next/server'
import { getSessionUserId } from '@/lib/auth-session'
import { createAdminClient } from '@/lib/appwrite-server'

/**
 * POST /api/auth/set-phone
 *
 * Sets the phone number on the Appwrite auth account using the admin SDK.
 * This is needed because `account.updatePhone()` requires a password,
 * which Google OAuth users don't have.
 *
 * After this, the client can call `account.createPhoneVerification()`
 * to trigger the OTP SMS via Twilio.
 */
export async function POST(req: Request) {
  const { t } = await getTranslations()
  try {
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: t('errors:auth.unauthorized') }, { status: 401 })
    }

    const { phone } = await req.json()

    if (!phone || typeof phone !== 'string') {
      return NextResponse.json({ error: 'Missing phone number' }, { status: 400 })
    }

    // Ensure phone starts with +
    const formattedPhone = phone.startsWith('+') ? phone : `+${phone}`

    const { users } = createAdminClient()

    // Set phone on the Appwrite auth account (admin — no password required)
    await users.updatePhone(userId, formattedPhone)

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    console.error('[set-phone] Error:', err)
    const message = err instanceof Error ? err.message : t('errors:auth.setPhoneFailed')
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
