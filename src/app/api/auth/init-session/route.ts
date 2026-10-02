import { getTranslations } from '@/lib/i18n-server'
import { NextResponse } from 'next/server'
import { Account, Client } from 'node-appwrite'
import { signSessionCookie, COOKIE_NAME, MAX_AGE } from '@/lib/session'

/**
 * POST /api/auth/init-session
 *
 * Called by the client after any successful Appwrite auth action. The browser
 * sends a short-lived Appwrite **JWT** minted from its own session
 * (`account.createJWT()`); we resolve that JWT against Appwrite to learn whose
 * session it is, then set a signed httpOnly cookie on our domain so API routes
 * and middleware can identify the user.
 *
 * The JWT is the proof of ownership. The previous version accepted a bare
 * `userId` and only checked that *some* session existed for it, which let any
 * caller mint a cookie for any signed-in user.
 */
export async function POST(req: Request) {
  const { t } = await getTranslations()
  try {
    const body = await req.json().catch(() => ({}))
    const jwt = typeof body?.jwt === 'string' ? body.jwt.trim() : ''
    if (!jwt) {
      return NextResponse.json({ error: 'Missing jwt' }, { status: 400 })
    }

    // A client scoped to the caller's JWT: `account.get()` answers only for the
    // user who owns that session, and 401s for anything forged or expired.
    const userClient = new Client()
      .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
      .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
      .setJWT(jwt)
    let userId: string
    try {
      userId = (await new Account(userClient).get()).$id
    } catch {
      return NextResponse.json({ error: t('errors:auth.noActiveSession') }, { status: 401 })
    }

    const response = NextResponse.json({ success: true })
    response.cookies.set(COOKIE_NAME, signSessionCookie(userId), {
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
