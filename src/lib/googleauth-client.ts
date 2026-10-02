/**
 * Browser client for the `googleauth` Appwrite function — the same function
 * the mobile apps call from `pickltmobile/lib/oauth.ts`. Body `{ idToken,
 * userType }`; the function verifies the Google ID token against its
 * `GOOGLE_CLIENT_ID` allow-list, finds-or-creates the Appwrite user *by
 * e-mail* (so a Google sign-in on the web lands in the same account the app
 * created), syncs the `users` document and mints `{ userId, secret }` for
 * `account.createSession`.
 *
 * The function is executed as a guest: it must have `any` execute permission,
 * which it already has for the mobile apps.
 */

import { ExecutionMethod } from 'appwrite'
import { functions } from '@/lib/appwrite'
import { APPWRITE } from '@/lib/constants'

export type GoogleAuthUserType = 'client' | 'mover'

/**
 * `fnCode` values `googleauth` emits that the UI distinguishes. Anything else
 * (including a malformed or non-JSON body) is reported as `oauth.signInFailed`.
 */
export type GoogleAuthFnCode =
  | 'oauth.signInFailed'
  | 'oauth.emailNotVerified'
  | 'oauth.clientNotAuthorized'
  | 'oauth.notConfigured'
  | (string & {})

export class GoogleAuthError extends Error {
  readonly fnCode: GoogleAuthFnCode
  readonly status: number

  constructor(message: string, fnCode: GoogleAuthFnCode, status: number) {
    super(message)
    this.name = 'GoogleAuthError'
    this.fnCode = fnCode
    this.status = status
  }
}

/** Same shape as the mobile `GoogleAuthSync`; the web re-syncs through its own API in `loadSession`, so only `userId`/`secret` are load-bearing here. */
export interface GoogleAuthSync {
  success: boolean
  user: Record<string, unknown>
  moverProfile?: Record<string, unknown> | null
  crewMembers?: unknown[]
  isNew: boolean
}

export interface GoogleAuthResult {
  userId: string
  secret: string
  sync: GoogleAuthSync | null
}

/**
 * Pure parser for the function's `(responseStatusCode, responseBody)`.
 * Throws `GoogleAuthError` carrying the function's `fnCode` on any non-2xx
 * status, on a body that is not JSON, and on a 2xx that lacks the credentials.
 */
export function parseGoogleAuthResponse(status: number, body: string): GoogleAuthResult {
  let parsed: unknown
  try {
    parsed = body ? JSON.parse(body) : null
  } catch {
    throw new GoogleAuthError(`googleauth returned a malformed body (HTTP ${status})`, 'oauth.signInFailed', status)
  }
  const obj = parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null

  if (status < 200 || status >= 300) {
    const fnCode = typeof obj?.fnCode === 'string' && obj.fnCode ? obj.fnCode : 'oauth.signInFailed'
    const message = typeof obj?.error === 'string' && obj.error ? obj.error : `googleauth failed (HTTP ${status})`
    throw new GoogleAuthError(message, fnCode, status)
  }

  const userId = typeof obj?.userId === 'string' ? obj.userId : ''
  const secret = typeof obj?.secret === 'string' ? obj.secret : ''
  if (!obj || !userId || !secret) {
    throw new GoogleAuthError('googleauth returned no session credentials', 'oauth.signInFailed', status)
  }

  const sync = obj.sync && typeof obj.sync === 'object' ? (obj.sync as GoogleAuthSync) : null
  return { userId, secret, sync }
}

/**
 * Exchange a Google ID token for Appwrite session credentials. The caller
 * then runs `account.createSession(userId, secret)`.
 */
export async function exchangeGoogleIdToken(
  idToken: string,
  userType: GoogleAuthUserType,
): Promise<GoogleAuthResult> {
  const execution = await functions.createExecution({
    functionId: APPWRITE.FUNCTIONS.GOOGLEAUTH,
    body: JSON.stringify({ idToken, userType }),
    async: false,
    xpath: '/',
    method: ExecutionMethod.POST,
    headers: { 'content-type': 'application/json' },
  })
  return parseGoogleAuthResponse(execution.responseStatusCode, execution.responseBody)
}

/**
 * Catalog key for whatever the Google sign-in path threw, so the pages never
 * show the function's English prose. Pure; the component translates it.
 */
export function googleAuthErrorKey(err: unknown): string {
  const fnCode = err instanceof GoogleAuthError ? err.fnCode : null
  if (fnCode === 'oauth.emailNotVerified') return 'web:auth.google.emailNotVerified.error'
  if (fnCode === 'oauth.clientNotAuthorized' || fnCode === 'oauth.notConfigured') {
    return 'web:auth.google.notConfigured.error'
  }
  return 'auth:login.oauthFailed.error'
}
