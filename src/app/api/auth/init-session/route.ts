import { getTranslations } from '@/lib/i18n-server'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/appwrite-server'
import { signSessionCookie, COOKIE_NAME, MAX_AGE } from '@/lib/session'

/**
 * POST /api/auth/init-session
 *
 * Called by the client after any successful Appwrite auth action.
 * Verifies the user exists and has an active Appwrite session,
 * then sets a signed httpOnly cookie on our domain so that
 * API routes and middleware can identify the user.
 */
export async function POST(req: Request) {
  const { t } = await getTranslations()
  try {
    const { userId } = await req.json()

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
    }

    const { users } = createAdminClient()

    // Verify user exists in Appwrite
    await users.get(userId)

    // Verify the user has at least one active session
    const sessions = await users.listSessions(userId)
    if (sessions.total === 0) {
      return NextResponse.json({ error: t('errors:auth.noActiveSession') }, { status: 401 })
    }

    // Create signed cookie
    const cookieValue = signSessionCookie(userId)

    const response = NextResponse.json({ success: true })
    response.cookies.set(COOKIE_NAME, cookieValue, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: MAX_AGE,
    })

    return response
  } catch (err: unknown) {
    console.error('[init-session] Error:', err)
    const message = err instanceof Error ? err.message : t('errors:auth.initSessionFailed')
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
