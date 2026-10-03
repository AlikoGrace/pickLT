import { countryToIso2 } from './countryCode'
import { feeStandingAllowsWork } from './feeLedger'
import { vehicleServiceReady, type VehicleOwnership, type VehicleProfileFields } from './vehicle-service'

/**
 * Route-level gate decisions around `vehicleServiceReady`, pulled out of the
 * routes so each rule is a unit rather than a branch inside a handler (the
 * `complete-profile-validation.ts` pattern). Pure: no clock, no I/O — the
 * routes pass `Date.now()` and `PLATFORM_TZ`.
 *
 * Master D4: readiness gates *visibility* and *taking new work* only. Nothing
 * here may block a transition of a move that is already under way.
 */

/** Appwrite rows are schemaless at the SDK boundary. */
type AnyDoc = Record<string, any>

// A fix older than this is a driver who closed the app without going offline.
// Same window as `listnearbymovers` / `broadcastmoverequest` /
// `createpriorityrequest` (`LOCATION_STALE_MS`).
export const LOCATION_FRESHNESS_MS = 3 * 60 * 1000

export function isLocationFresh(mover: AnyDoc | null | undefined, nowMs: number): boolean {
  const at = typeof mover?.locationUpdatedAt === 'string' ? Date.parse(mover.locationUpdatedAt) : NaN
  return Number.isFinite(at) && nowMs - at <= LOCATION_FRESHNESS_MS
}

// --- fee-standing (mirror) ---
/**
 * The fee-balance work gate (plan `fees/0.master.md` §5, D2): a driver whose
 * `feeStanding` is `restricted` cannot go online, is not matched or listed to
 * clients, cannot see the scheduled feed and cannot accept. Refusals carry
 * this `fnCode` (`errors:fees.restricted`). Legacy rows without the field work.
 */
export const FEES_RESTRICTED = 'fees.restricted'

export function feeRestricted(profile: AnyDoc | null | undefined): boolean {
  return !feeStandingAllowsWork(profile)
}
// --- fee-standing (mirror) ---

export type DirectAssignmentBlock =
  | 'mover.notVerified'
  | 'mover.offline'
  | 'mover.vehicleNotReady'
  | typeof FEES_RESTRICTED

/**
 * `POST /api/moves/create-instant` pins a move to a mover the client picked
 * from a list that is a snapshot. Same checks, same order and same `fnCode`s
 * as the `createpriorityrequest` function: KYC, online, location freshness,
 * vehicle readiness, fee standing. `null` means the mover may be assigned.
 */
export function directAssignmentBlock(
  mover: AnyDoc | null | undefined,
  nowMs: number,
  tz: string,
): DirectAssignmentBlock | null {
  if (mover?.verificationStatus !== 'verified') return 'mover.notVerified'
  if (mover.isOnline === false) return 'mover.offline'
  if (!isLocationFresh(mover, nowMs)) return 'mover.offline'
  if (!vehicleServiceReady(mover as VehicleProfileFields, nowMs, tz)) return 'mover.vehicleNotReady'
  if (feeRestricted(mover)) return FEES_RESTRICTED
  return null
}

/**
 * `POST /api/mover/update-move-status`. A `mover_assigned` move was pinned to
 * the mover by the client and never went through an accept route, so leaving
 * that status is the moment the job is taken: it needs the accept gate and the
 * D13 vehicle snapshot. Every other transition is a move already under way
 * and stays ungated (D4).
 */
export function startGate(
  move: AnyDoc,
  profile: AnyDoc | null | undefined,
  nowMs: number,
  tz: string,
): { blocked: boolean; vehicleId: string | null; fnCode?: 'mover.vehicleNotReady' | typeof FEES_RESTRICTED } {
  if (move.status !== 'mover_assigned') return { blocked: false, vehicleId: null }
  if (!vehicleServiceReady(profile as VehicleProfileFields, nowMs, tz)) {
    return { blocked: true, vehicleId: null, fnCode: 'mover.vehicleNotReady' }
  }
  if (feeRestricted(profile)) return { blocked: true, vehicleId: null, fnCode: FEES_RESTRICTED }
  const current = typeof profile?.currentVehicleId === 'string' ? profile.currentVehicleId : null
  return { blocked: false, vehicleId: move.vehicleId ? null : current }
}

/**
 * `POST /api/mover/update-location`. The heartbeat always records the fix, but
 * may only *mark* the driver online when `setmoveronline` would have let them
 * go online. `false` means "leave `isOnline` as it is" — never force it off,
 * the driver may be finishing a move (D4). A fee-restricted driver is never
 * marked online (`settlefees` enforce takes them offline on entering it).
 */
export function mayMarkOnline(profile: AnyDoc | null | undefined, nowMs: number, tz: string): boolean {
  return vehicleServiceReady(profile as VehicleProfileFields, nowMs, tz) && !feeRestricted(profile)
}

/**
 * `POST /api/mover/submit-profile`. `vehicleOwnership` defaults to `'owned'`
 * only when the profile is being created (legacy callers, master §6.4). On an
 * update an absent value means "unchanged" — writing the default there flipped
 * rented drivers to owned. A value that is present but not in the enum is
 * invalid on both paths. Same rule as `functions/submitmoverprofile`.
 */
export function resolveOwnershipWrite(
  raw: unknown,
  isCreate: boolean,
  current?: unknown,
): { ok: true; write: VehicleOwnership | undefined } | { ok: false } {
  if (raw === undefined || raw === null) {
    return { ok: true, write: isCreate ? 'owned' : undefined }
  }
  // Rented → owned is an admin decision (master D16), never a profile re-submit.
  if (raw === 'owned' && !isCreate && current === 'rented') return { ok: true, write: undefined }
  if (raw === 'owned' || raw === 'rented') return { ok: true, write: raw }
  return { ok: false }
}

/**
 * What `mover_profiles.vehicleOwnership` becomes when a vehicle is SUBMITTED
 * (master D16) — mirrors `profileOwnershipOnSubmit` in `functions/submitvehicle`.
 * Rented → owned leaves the daily SAME/CHANGE regime, so the profile stays
 * `rented` until an admin approves the owned vehicle.
 */
export function profileOwnershipOnSubmit(current: unknown, requested: VehicleOwnership): VehicleOwnership {
  if (current === 'rented' && requested === 'owned') return 'rented'
  return requested
}

/**
 * Country-scoped matching (plan `wave-2026-10/4` C6): a mover is offered a move
 * only in their own country. Legacy rows — a mover without `countryCode` or a
 * move whose country is unknown — keep today's radius-only behaviour, so the
 * backfill can land after the code. Same rule as `broadcastmoverequest` /
 * `listnearbymovers`.
 */
export function moverMatchesCountry(mover: AnyDoc | null | undefined, moveCountryCode: unknown): boolean {
  const moverCc = countryToIso2(mover?.countryCode)
  const moveCc = countryToIso2(moveCountryCode)
  return moverCc == null || moveCc == null || moverCc === moveCc
}
