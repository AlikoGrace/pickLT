/**
 * One account, one app (plan pickltmobile/.agent/plans/auth/2). The same rule
 * as `functions/{syncuser,googleauth}/src/role-gate.js`, for the web's own
 * sync-user route and its pages.
 *
 * `existing` is the users doc's `userType` (null on legacy rows), `requested`
 * the side the caller signs in to (`client` | `mover`; anything else is not
 * gated).
 */
export const ROLE_REFUSAL_CODES = ['auth.registeredAsClient', 'auth.registeredAsMover', 'auth.adminAccount'] as const
export type RoleRefusalCode = (typeof ROLE_REFUSAL_CODES)[number]

export type RoleGateResult =
  | { allowed: true; backfill?: 'client' | 'mover' }
  | { allowed: false; code: RoleRefusalCode }

export function roleGate(existing: unknown, requested: unknown): RoleGateResult {
  if (requested !== 'client' && requested !== 'mover') return { allowed: true }
  if (existing == null) return { allowed: true, backfill: requested }
  if (existing === requested) return { allowed: true }
  if (existing === 'admin') return { allowed: false, code: 'auth.adminAccount' }
  if (existing === 'client') return { allowed: false, code: 'auth.registeredAsClient' }
  return { allowed: false, code: 'auth.registeredAsMover' }
}

export function isRoleRefusalCode(code: unknown): code is RoleRefusalCode {
  return typeof code === 'string' && (ROLE_REFUSAL_CODES as readonly string[]).includes(code)
}

/** Thrown by the auth context when sign-in was refused for the wrong account type. */
export class RoleRefusalError extends Error {
  constructor(readonly code: RoleRefusalCode) {
    super(code)
    this.name = 'RoleRefusalError'
  }
}
