import { NextRequest, NextResponse } from 'next/server'
import {
  LOCALE_COOKIE,
  LOCALE_COOKIE_MAX_AGE,
  LOCALE_HEADER,
  negotiateLocale,
  normalizeLocale,
  type Locale,
} from '@/lib/i18n-config'

/**
 * Session-based route protection middleware + locale negotiation.
 *
 * Auth: checks for a valid signed picklt_session cookie — if absent or invalid
 * on protected routes, redirects to login.
 *
 * i18n: resolves the request locale (picklt_locale cookie -> Accept-Language ->
 * 'en'), stamps it on the x-picklt-locale request header for the root layout,
 * and persists it as a cookie the first time. Next.js allows exactly one
 * middleware file, hence the two concerns living together here. The i18n code
 * is strictly additive — it never short-circuits, redirects or changes the auth
 * outcome; it only decorates whichever response the auth logic already chose.
 *
 * Uses Web Crypto API (Edge Runtime compatible). i18n-config.ts is pure TS with
 * no Node built-ins, so it is Edge-safe too.
 */

const COOKIE_NAME = 'picklt_session'
const MAX_AGE = 30 * 24 * 60 * 60 // 30 days

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16)
  }
  return bytes
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

async function verifySession(value: string | undefined): Promise<boolean> {
  if (!value) return false

  try {
    const parts = value.split(':')
    if (parts.length !== 3) return false

    const [userId, timestamp, signature] = parts
    if (!userId || !timestamp || !signature) return false

    // Must match getSecret() in src/lib/session.ts.
    const secret = process.env.SESSION_SECRET
    if (!secret) return false

    // HMAC-SHA256 via Web Crypto API (Edge Runtime compatible)
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )
    const mac = await crypto.subtle.sign('HMAC', key, encoder.encode(`${userId}:${timestamp}`))
    const expected = bytesToHex(new Uint8Array(mac))

    // Constant-time compare, matching verifySessionCookie() in lib/session.ts.
    if (signature.length !== expected.length) return false
    let diff = 0
    for (let i = 0; i < signature.length; i++) {
      diff |= signature.charCodeAt(i) ^ expected.charCodeAt(i)
    }
    if (diff !== 0) return false

    // Check expiry
    const age = Date.now() - parseInt(timestamp)
    if (age > MAX_AGE * 1000) return false

    return true
  } catch {
    return false
  }
}

const protectedRoutes = [
  '/dashboard',
  '/available-moves',
  '/active-move',
  '/job-details',
  '/earnings',
  '/my-crew',
  '/settings',
  '/complete-profile',
  '/account',
  '/move-choice',
  '/add-listing',
  '/instant-move',
  '/move-preview',
  '/checkout',
  '/pay-done',
]

function isProtected(pathname: string) {
  return protectedRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  )
}

/**
 * Cookie -> Accept-Language -> 'en'. Pure, and identical to what
 * `resolveLocale()` in src/lib/i18n-server.ts computes — both call
 * `negotiateLocale()` from i18n-config.ts, which is the single source of the
 * rule. The middleware runs first and stamps the answer on a request header so
 * the layout does not have to re-derive it.
 */
function resolveRequestLocale(req: NextRequest): { locale: Locale; hadCookie: boolean } {
  const cookieValue = req.cookies.get(LOCALE_COOKIE)?.value
  const fromCookie = normalizeLocale(cookieValue)
  return {
    locale: fromCookie ?? negotiateLocale(null, req.headers.get('accept-language')),
    hadCookie: fromCookie !== null,
  }
}

/**
 * Decorate whichever response the auth logic already chose with the negotiated
 * locale. Strictly additive: never redirects, never short-circuits, never
 * changes an auth outcome.
 */
function withLocale(res: NextResponse, locale: Locale, hadCookie: boolean): NextResponse {
  // Echo it back so a client that wants to know what was negotiated can read it
  // without re-parsing Accept-Language.
  res.headers.set(LOCALE_HEADER, locale)

  // Pin the negotiated locale on first visit, so a later Accept-Language change
  // (a shared machine, a VPN, a browser update) does not silently move the UI.
  // An existing cookie is left alone — the switcher owns it from then on.
  if (!hadCookie) {
    res.cookies.set(LOCALE_COOKIE, locale, {
      path: '/',
      maxAge: LOCALE_COOKIE_MAX_AGE,
      sameSite: 'lax',
      httpOnly: false, // the client switcher writes it via document.cookie
    })
  }
  return res
}

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const { locale, hadCookie } = resolveRequestLocale(req)

  if (isProtected(pathname)) {
    const cookieValue = req.cookies.get(COOKIE_NAME)?.value
    const isValid = await verifySession(cookieValue)
    if (!isValid) {
      // Determine user type from path
      const isMoverRoute = ['/dashboard', '/available-moves', '/active-move', '/job-details', '/earnings', '/my-crew', '/settings', '/complete-profile'].some(
        (r) => pathname === r || pathname.startsWith(`${r}/`)
      )
      const loginUrl = new URL('/login', req.url)
      loginUrl.searchParams.set('type', isMoverRoute ? 'mover' : 'client')
      loginUrl.searchParams.set('redirect', pathname)
      return withLocale(NextResponse.redirect(loginUrl), locale, hadCookie)
    }
  }

  // Forward the negotiated locale to the render. `resolveLocale()` prefers the
  // cookie and only falls back to this header, so the two agree by construction.
  const requestHeaders = new Headers(req.headers)
  requestHeaders.set(LOCALE_HEADER, locale)

  return withLocale(
    NextResponse.next({ request: { headers: requestHeaders } }),
    locale,
    hadCookie
  )
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}
