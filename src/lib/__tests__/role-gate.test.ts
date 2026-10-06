import { describe, expect, it } from 'vitest'

import { isRoleRefusalCode, roleGate } from '../role-gate'

// Same table as pickltmobile/__tests__/role-gate.test.ts (plan auth/2).
describe('roleGate', () => {
  it('lets an account in on its own side, with no role change', () => {
    expect(roleGate('client', 'client')).toEqual({ allowed: true })
    expect(roleGate('mover', 'mover')).toEqual({ allowed: true })
  })
  it('refuses a client on the mover side and a mover on the client side', () => {
    expect(roleGate('client', 'mover')).toEqual({ allowed: false, code: 'auth.registeredAsClient' })
    expect(roleGate('mover', 'client')).toEqual({ allowed: false, code: 'auth.registeredAsMover' })
  })
  it('refuses an admin on both sides', () => {
    expect(roleGate('admin', 'client')).toEqual({ allowed: false, code: 'auth.adminAccount' })
    expect(roleGate('admin', 'mover')).toEqual({ allowed: false, code: 'auth.adminAccount' })
  })
  it('gives a legacy row without a role the side it signs in to', () => {
    expect(roleGate(null, 'mover')).toEqual({ allowed: true, backfill: 'mover' })
    expect(roleGate(undefined, 'client')).toEqual({ allowed: true, backfill: 'client' })
  })
  it('does not gate a caller that names no side', () => {
    expect(roleGate('admin', undefined)).toEqual({ allowed: true })
    expect(roleGate('mover', 'admin')).toEqual({ allowed: true })
  })
  it('recognises only the three refusal codes', () => {
    expect(isRoleRefusalCode('auth.registeredAsClient')).toBe(true)
    expect(isRoleRefusalCode('auth.adminAccount')).toBe(true)
    expect(isRoleRefusalCode('oauth.signInFailed')).toBe(false)
    expect(isRoleRefusalCode(undefined)).toBe(false)
  })
})
