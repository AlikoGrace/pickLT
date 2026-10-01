import { describe, expect, it } from 'vitest'
import { oauthErrorMessageKey, parseOAuthErrorParam } from '../oauth-error'

describe('parseOAuthErrorParam', () => {
  it('parses the JSON Appwrite puts on the failure URL', () => {
    const raw = '{"message":"A user with the same id, email, or phone already exists in this project.","type":"user_already_exists","code":409}'
    expect(parseOAuthErrorParam(raw)).toEqual({
      type: 'user_already_exists',
      code: 409,
      message: 'A user with the same id, email, or phone already exists in this project.',
    })
  })
  it('returns null for an absent or empty parameter', () => {
    expect(parseOAuthErrorParam(null)).toBeNull()
    expect(parseOAuthErrorParam('')).toBeNull()
    expect(parseOAuthErrorParam('   ')).toBeNull()
  })
  it('keeps a bare string as the message', () => {
    expect(parseOAuthErrorParam('access_denied')).toEqual({ type: null, code: null, message: 'access_denied' })
  })
})

describe('oauthErrorMessageKey', () => {
  it('names the existing-account case so the user is told which method to use', () => {
    expect(oauthErrorMessageKey({ type: 'user_already_exists', code: 409, message: null })).toBe(
      'auth:login.oauthExistingAccount.error',
    )
    expect(oauthErrorMessageKey({ type: null, code: 409, message: null })).toBe('auth:login.oauthExistingAccount.error')
  })
  it('falls back to the generic message otherwise', () => {
    expect(oauthErrorMessageKey({ type: 'general_unknown', code: 500, message: 'x' })).toBe('auth:login.oauthFailed.error')
    expect(oauthErrorMessageKey(null)).toBeNull()
  })
})
