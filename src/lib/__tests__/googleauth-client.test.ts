import { describe, expect, it, vi } from 'vitest'

// `@/lib/appwrite` builds an Appwrite Client at import and throws without an
// endpoint; the parser under test never touches it.
vi.mock('@/lib/appwrite', () => ({ functions: {} }))

import { GoogleAuthError, googleAuthErrorKey, parseGoogleAuthResponse } from '../googleauth-client'

const ok = JSON.stringify({
  success: true,
  userId: 'u1',
  secret: 's3cr3t',
  sync: { success: true, user: { $id: 'u1', userType: 'client' }, moverProfile: null, crewMembers: [], isNew: false },
})

describe('parseGoogleAuthResponse', () => {
  it('returns the session credentials and sync block on 200', () => {
    const r = parseGoogleAuthResponse(200, ok)
    expect(r.userId).toBe('u1')
    expect(r.secret).toBe('s3cr3t')
    expect(r.sync?.isNew).toBe(false)
    expect(r.sync?.user).toMatchObject({ $id: 'u1' })
  })

  it('tolerates a 2xx without a sync block', () => {
    const r = parseGoogleAuthResponse(200, JSON.stringify({ userId: 'u1', secret: 's' }))
    expect(r.sync).toBeNull()
  })

  it('carries the function fnCode on a 401', () => {
    const body = JSON.stringify({ error: 'Google email is not verified', fnCode: 'oauth.emailNotVerified' })
    let caught: unknown
    try {
      parseGoogleAuthResponse(401, body)
    } catch (e) {
      caught = e
    }
    expect(caught).toBeInstanceOf(GoogleAuthError)
    const err = caught as GoogleAuthError
    expect(err.fnCode).toBe('oauth.emailNotVerified')
    expect(err.status).toBe(401)
    expect(err.message).toBe('Google email is not verified')
  })

  it('defaults a non-2xx without fnCode to oauth.signInFailed', () => {
    expect(() => parseGoogleAuthResponse(500, '{"error":"boom"}')).toThrowError(
      expect.objectContaining({ fnCode: 'oauth.signInFailed', status: 500 }),
    )
    expect(() => parseGoogleAuthResponse(502, '')).toThrowError(
      expect.objectContaining({ fnCode: 'oauth.signInFailed', status: 502 }),
    )
  })

  it('rejects a malformed body as oauth.signInFailed', () => {
    expect(() => parseGoogleAuthResponse(200, '<html>Bad gateway')).toThrowError(
      expect.objectContaining({ fnCode: 'oauth.signInFailed' }),
    )
    expect(() => parseGoogleAuthResponse(200, 'null')).toThrowError(GoogleAuthError)
    expect(() => parseGoogleAuthResponse(200, '')).toThrowError(GoogleAuthError)
  })

  it('rejects a 2xx that is missing userId or secret', () => {
    expect(() => parseGoogleAuthResponse(200, JSON.stringify({ userId: 'u1' }))).toThrowError(
      expect.objectContaining({ fnCode: 'oauth.signInFailed', status: 200 }),
    )
    expect(() => parseGoogleAuthResponse(200, JSON.stringify({ userId: 7, secret: 's' }))).toThrowError(GoogleAuthError)
  })
})

describe('googleAuthErrorKey', () => {
  it('names the unverified-email and not-configured cases', () => {
    expect(googleAuthErrorKey(new GoogleAuthError('x', 'oauth.emailNotVerified', 401))).toBe(
      'web:auth.google.emailNotVerified.error',
    )
    expect(googleAuthErrorKey(new GoogleAuthError('x', 'oauth.clientNotAuthorized', 401))).toBe(
      'web:auth.google.notConfigured.error',
    )
    expect(googleAuthErrorKey(new GoogleAuthError('x', 'oauth.notConfigured', 500))).toBe(
      'web:auth.google.notConfigured.error',
    )
  })
  it('shows the wrong-account-type message for a role refusal (plan auth/2)', () => {
    expect(googleAuthErrorKey(new GoogleAuthError('x', 'auth.registeredAsClient', 403))).toBe('errors:auth.registeredAsClient')
    expect(googleAuthErrorKey(new GoogleAuthError('x', 'auth.registeredAsMover', 403))).toBe('errors:auth.registeredAsMover')
    expect(googleAuthErrorKey(new GoogleAuthError('x', 'auth.adminAccount', 403))).toBe('errors:auth.adminAccount')
  })
  it('falls back to the generic OAuth message for everything else', () => {
    expect(googleAuthErrorKey(new GoogleAuthError('x', 'oauth.signInFailed', 401))).toBe('auth:login.oauthFailed.error')
    expect(googleAuthErrorKey(new Error('network'))).toBe('auth:login.oauthFailed.error')
    expect(googleAuthErrorKey(undefined)).toBe('auth:login.oauthFailed.error')
  })
})
