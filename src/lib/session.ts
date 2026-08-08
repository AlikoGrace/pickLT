import crypto from 'crypto'

/**
 * Server-side session cookie utilities.
 *
 * The Appwrite Web SDK stores its session cookie on the Appwrite domain,
 * which is NOT accessible to our Next.js API routes / middleware.
 *
 * This module provides HMAC-signed cookie utilities so we can maintain
 * our own session cookie on our app's domain.
 *
 * Flow:
 * 1. Client authenticates via Appwrite Web SDK (Google/Email)
 * 2. Client calls POST /api/auth/init-session with { userId }
 * 3. Server verifies user + active session via admin SDK
 * 4. Server sets a signed httpOnly cookie on our domain
 * 5. All API routes verify this cookie via getSessionUserId()
 */

export const COOKIE_NAME = 'picklt_session'
export const MAX_AGE = 30 * 24 * 60 * 60 // 30 days in seconds

/**
 * Signing key for session cookies.
 *
 * This is deliberately NOT the Appwrite API key. Reusing that key here meant a
 * single value both signed sessions and granted full database/user admin — a
 * leak in either direction compromised the other, and rotating the Appwrite key
 * silently invalidated every session.
 *
 * Set SESSION_SECRET to 32+ random bytes, e.g.
 *   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 */
function getSecret(): string {
  const secret = process.env.SESSION_SECRET
  if (!secret) {
    throw new Error(
      'SESSION_SECRET is required for session management. Generate one with: ' +
        'node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    )
  }
  if (secret === process.env.APPWRITE_API_KEY) {
    throw new Error('SESSION_SECRET must not be the same value as APPWRITE_API_KEY')
  }
  return secret
}

/**
 * Create a signed session cookie value: `userId:timestamp:hmac`
 */
export function signSessionCookie(userId: string): string {
  const timestamp = Date.now().toString()
  const payload = `${userId}:${timestamp}`
  const signature = crypto
    .createHmac('sha256', getSecret())
    .update(payload)
    .digest('hex')
  return `${payload}:${signature}`
}

/**
 * Verify a signed session cookie and extract the userId.
 * Returns null if invalid or expired.
 */
export function verifySessionCookie(value: string): string | null {
  try {
    const parts = value.split(':')
    if (parts.length !== 3) return null

    const [userId, timestamp, signature] = parts

    // Verify HMAC signature
    const expected = crypto
      .createHmac('sha256', getSecret())
      .update(`${userId}:${timestamp}`)
      .digest('hex')

    // Constant-time comparison to prevent timing attacks
    const sigBuf = Buffer.from(signature, 'hex')
    const expBuf = Buffer.from(expected, 'hex')
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(new Uint8Array(sigBuf), new Uint8Array(expBuf))) {
      return null
    }

    // Check expiration
    const age = Date.now() - parseInt(timestamp)
    if (age > MAX_AGE * 1000) return null

    return userId
  } catch {
    return null
  }
}
