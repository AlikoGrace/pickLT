import { afterEach, describe, expect, it } from 'vitest'
import {
  GOOGLE_BUTTON_MAX_WIDTH,
  GOOGLE_BUTTON_MIN_WIDTH,
  clampGoogleButtonWidth,
  getGoogleClientId,
  loadGoogleIdentity,
} from '../google-identity'

const ENV = 'NEXT_PUBLIC_GOOGLE_CLIENT_ID'
const original = process.env[ENV]

afterEach(() => {
  if (original === undefined) delete process.env[ENV]
  else process.env[ENV] = original
})

describe('getGoogleClientId', () => {
  it('is null when the variable is unset', () => {
    delete process.env[ENV]
    expect(getGoogleClientId()).toBeNull()
  })
  it('is null when the variable is blank', () => {
    process.env[ENV] = ''
    expect(getGoogleClientId()).toBeNull()
    process.env[ENV] = '   '
    expect(getGoogleClientId()).toBeNull()
  })
  it('returns the trimmed id when set', () => {
    process.env[ENV] = '  123-abc.apps.googleusercontent.com \n'
    expect(getGoogleClientId()).toBe('123-abc.apps.googleusercontent.com')
  })
})

describe('clampGoogleButtonWidth', () => {
  it('keeps the width inside the GIS bounds', () => {
    expect(clampGoogleButtonWidth(100)).toBe(GOOGLE_BUTTON_MIN_WIDTH)
    expect(clampGoogleButtonWidth(999)).toBe(GOOGLE_BUTTON_MAX_WIDTH)
    expect(clampGoogleButtonWidth(333.7)).toBe(333)
  })
  it('falls back to the maximum for an unmeasured container', () => {
    expect(clampGoogleButtonWidth(0)).toBe(GOOGLE_BUTTON_MAX_WIDTH)
    expect(clampGoogleButtonWidth(Number.NaN)).toBe(GOOGLE_BUTTON_MAX_WIDTH)
  })
})

describe('loadGoogleIdentity', () => {
  it('rejects instead of throwing outside a browser (node test env)', async () => {
    await expect(loadGoogleIdentity()).rejects.toThrow(/browser only/)
  })
})
