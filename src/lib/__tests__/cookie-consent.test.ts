import { describe, expect, it } from 'vitest'
import {
  CONSENT_COOKIE,
  consentCookieString,
  monitoringAllowed,
  needsPrompt,
  parseConsent,
  serialiseConsent,
} from '../cookie-consent'

const AT = '2026-11-27T10:00:00.000Z'
const cookie = (value: string) => `picklt_locale=de; ${CONSENT_COOKIE}=${value}; other=1`
const json = (obj: unknown) => encodeURIComponent(JSON.stringify(obj))

describe('parseConsent', () => {
  it('reads a valid cookie among others', () => {
    expect(parseConsent(cookie(json({ v: 1, monitoring: true, at: AT })))).toEqual({ v: 1, monitoring: true, at: AT })
    expect(parseConsent(cookie(json({ v: 1, monitoring: false, at: AT })))).toEqual({ v: 1, monitoring: false, at: AT })
  })

  it('accepts unencoded JSON too', () => {
    expect(parseConsent(`${CONSENT_COOKIE}={"v":1,"monitoring":true,"at":"${AT}"}`)?.monitoring).toBe(true)
  })

  it('returns null when the cookie is missing', () => {
    expect(parseConsent('')).toBeNull()
    expect(parseConsent(undefined)).toBeNull()
    expect(parseConsent(null)).toBeNull()
    expect(parseConsent('picklt_locale=de')).toBeNull()
    expect(needsPrompt('picklt_locale=de')).toBe(true)
  })

  it('returns null when the cookie is malformed', () => {
    expect(parseConsent(cookie('not-json'))).toBeNull()
    expect(parseConsent(cookie('%E0%A4%A'))).toBeNull()
    expect(parseConsent(cookie(json('a string')))).toBeNull()
    expect(parseConsent(cookie(json({ v: 1, monitoring: 'yes', at: AT })))).toBeNull()
    expect(parseConsent(cookie(json({ v: 1, monitoring: true })))).toBeNull()
    expect(parseConsent(cookie(json({ v: 1, monitoring: true, at: 'yesterday' })))).toBeNull()
  })

  it('returns null for another version, so the banner asks again', () => {
    const old = cookie(json({ v: 0, monitoring: true, at: AT }))
    expect(parseConsent(old)).toBeNull()
    expect(needsPrompt(old)).toBe(true)
    expect(monitoringAllowed(old)).toBe(false)
    expect(parseConsent(cookie(json({ v: 2, monitoring: true, at: AT })))).toBeNull()
  })
})

describe('serialiseConsent', () => {
  it('round-trips through parseConsent', () => {
    const now = new Date(AT)
    for (const monitoring of [true, false]) {
      const parsed = parseConsent(cookie(serialiseConsent(monitoring, now)))
      expect(parsed).toEqual({ v: 1, monitoring, at: AT })
      expect(needsPrompt(cookie(serialiseConsent(monitoring, now)))).toBe(false)
    }
  })

  it('builds a six-month, SameSite=Lax, site-wide cookie', () => {
    const s = consentCookieString(true, new Date(AT))
    expect(s.startsWith(`${CONSENT_COOKIE}=`)).toBe(true)
    expect(s).toContain('path=/')
    expect(s).toContain('samesite=lax')
    const maxAge = Number(/max-age=(\d+)/.exec(s)?.[1])
    expect(maxAge / 86400).toBeGreaterThanOrEqual(180)
    expect(maxAge / 86400).toBeLessThanOrEqual(184)
  })
})

describe('monitoringAllowed (Sentry gate)', () => {
  it('is false without consent', () => {
    expect(monitoringAllowed('')).toBe(false)
    expect(monitoringAllowed(undefined)).toBe(false)
    expect(monitoringAllowed(cookie('garbage'))).toBe(false)
  })

  it('is false after "Only necessary"', () => {
    expect(monitoringAllowed(cookie(serialiseConsent(false)))).toBe(false)
  })

  it('is true after "Accept all"', () => {
    expect(monitoringAllowed(cookie(serialiseConsent(true)))).toBe(true)
  })
})
