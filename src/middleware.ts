import { NextRequest, NextResponse } from 'next/server'

/**
 * Session-based route protection middleware.
 * Checks for a valid signed picklt_session cookie — if absent or invalid
 * on protected routes, redirects to login.
 *
 * Uses Web Crypto API (Edge Runtime compatible).
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

    const secret = process.env.APPWRITE_API_KEY
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

    if (signature !== expected) return false

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

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (isProtected(pathname)) {
    const cookieValue = req.cookies.get(COOKIE_NAME)?.value
    const isValid = await verifySession(cookieValue)
    if (!isValid) {
      // Determine user type from path
      const isMoverRoute = ['/dashboard', '/available-moves', '/earnings', '/my-crew', '/settings', '/complete-profile'].some(
        (r) => pathname === r || pathname.startsWith(`${r}/`)
      )
      const loginUrl = new URL('/login', req.url)
      loginUrl.searchParams.set('type', isMoverRoute ? 'mover' : 'client')
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}
