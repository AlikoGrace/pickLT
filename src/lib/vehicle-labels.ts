import type { TFunction } from 'i18next'

import type { VehicleProfileFields, VehicleServiceState } from './vehicle-service'

/**
 * Stored enum → catalog key segment. Value-to-label only; nothing derives a
 * value from a label (catalog conventions §5). The wire values are the
 * `vehicles.status` / `vehicle_events.action` enums from master §4.
 */

const STATUS_KEY: Record<string, string> = {
  none: 'none',
  pending_review: 'pendingReview',
  verified: 'verified',
  rejected: 'rejected',
  retired: 'retired',
}

// i18n-keys: common:vehicleStatus.none.label, common:vehicleStatus.pendingReview.label,
// common:vehicleStatus.verified.label, common:vehicleStatus.rejected.label, common:vehicleStatus.retired.label
export function vehicleStatusLabel(t: TFunction, status: string | null | undefined): string {
  const key = STATUS_KEY[String(status ?? 'none')] ?? 'none'
  return t(`common:vehicleStatus.${key}.label`)
}

const ACTION_KEY: Record<string, string> = {
  submitted: 'submitted',
  resubmitted: 'resubmitted',
  confirmed_same: 'confirmedSame',
  change_requested: 'changeRequested',
  verified: 'verified',
  rejected: 'rejected',
  retired: 'retired',
  reconfirm_required: 'reconfirmRequired',
  // Wave 2026-10 (plan `wave-2026-10/1`): rental windows and the two-vehicle fleet.
  renewed: 'renewed',
  expired: 'expired',
  fallback: 'fallback',
  selected: 'selected',
  expiring_soon: 'expiringSoon',
}

// i18n-keys: common:vehicleEvent.submitted.label, common:vehicleEvent.resubmitted.label,
// common:vehicleEvent.confirmedSame.label, common:vehicleEvent.changeRequested.label,
// common:vehicleEvent.verified.label, common:vehicleEvent.rejected.label,
// common:vehicleEvent.retired.label, common:vehicleEvent.reconfirmRequired.label,
// common:vehicleEvent.renewed.label, common:vehicleEvent.expired.label, common:vehicleEvent.fallback.label,
// common:vehicleEvent.selected.label, common:vehicleEvent.expiringSoon.label
export function vehicleEventLabel(t: TFunction, action: string | null | undefined): string {
  const key = ACTION_KEY[String(action ?? '')]
  return key ? t(`common:vehicleEvent.${key}.label`) : String(action ?? '')
}

// i18n-keys: common:vehicleOwnership.owned.label, common:vehicleOwnership.rented.label
export function vehicleOwnershipLabel(t: TFunction, ownership: string | null | undefined): string {
  return t(`common:vehicleOwnership.${ownership === 'rented' ? 'rented' : 'owned'}.label`)
}

/** `VehicleServiceState` → the `web:mover.vehicle.state.<key>` segment. */
export const STATE_KEY: Record<VehicleServiceState, string> = {
  OWN_VERIFIED: 'ownVerified',
  OWN_PENDING_VEHICLE: 'ownPendingVehicle',
  OWN_VEHICLE_REVIEW: 'ownVehicleReview',
  RENTAL_PENDING_VEHICLE: 'rentalPendingVehicle',
  RENTAL_VEHICLE_REVIEW: 'rentalVehicleReview',
  RENTAL_CHANGE_PENDING: 'rentalChangePending',
  RENTAL_DAILY_CONFIRMATION_REQUIRED: 'rentalDailyConfirmationRequired',
  RENTAL_VERIFIED_TODAY: 'rentalVerifiedToday',
  RENTAL_ACTIVE: 'rentalActive',
  RENTAL_EXPIRING: 'rentalExpiring',
  RENTAL_EXPIRED: 'rentalExpired',
  VEHICLE_REJECTED: 'vehicleRejected',
}

/**
 * The action that restores service in a restricted state, as a setup mode /
 * route (master §5 table, spec §10 "exactly what action restores service").
 */
export type VehicleAction = 'add' | 'change' | 'resubmit' | 'confirm' | 'renew' | 'view' | null

export function vehicleActionFor(state: VehicleServiceState): VehicleAction {
  switch (state) {
    case 'OWN_PENDING_VEHICLE':
    case 'RENTAL_PENDING_VEHICLE':
      return 'add'
    case 'RENTAL_EXPIRED':
      // "Rent again": the same verified plates, only a new window (R5).
      return 'renew'
    case 'VEHICLE_REJECTED':
      return 'resubmit'
    case 'RENTAL_DAILY_CONFIRMATION_REQUIRED':
      return 'confirm'
    case 'OWN_VEHICLE_REVIEW':
    case 'RENTAL_VEHICLE_REVIEW':
    case 'RENTAL_CHANGE_PENDING':
      return 'view'
    default:
      return null
  }
}

/**
 * R4 without an owned vehicle: `expirerentals` clears the profile to
 * `vehicleStatus='none'`, which the shared predicate reads as "no vehicle
 * yet". When the driver's newest rental was retired by expiry, it is
 * `RENTAL_EXPIRED` instead, so the dashboard offers Rent again on that row.
 * Same rule as the mover app's `withExpiredRental` (lib/vehicle-form.ts).
 */
export function withExpiredRental(
  state: VehicleServiceState,
  profile: Pick<VehicleProfileFields, 'vehicleOwnership' | 'currentVehicleId'> | null | undefined,
  expiredRental: { ownership?: string | null; expiredAt?: string | null } | null | undefined,
): VehicleServiceState {
  if (state !== 'RENTAL_PENDING_VEHICLE') return state
  if (profile?.currentVehicleId) return state
  if (!expiredRental || expiredRental.ownership !== 'rented' || !expiredRental.expiredAt) return state
  return 'RENTAL_EXPIRED'
}

/**
 * Whether `withExpiredRental` could change this state, i.e. whether a caller
 * that only has the profile needs the expired-rental row at all. Lets the
 * accept gates skip the vehicle read for every other driver.
 */
export function mayBeExpiredRental(
  state: VehicleServiceState,
  profile: Pick<VehicleProfileFields, 'currentVehicleId'> | null | undefined,
): boolean {
  return state === 'RENTAL_PENDING_VEHICLE' && !!profile && !profile.currentVehicleId
}

/**
 * "Use my own vehicle" after a rental ended, for a driver without a verified
 * owned vehicle: the add form with "Own vehicle" pre-picked (mover-app parity).
 */
export const USE_OWN_ADD_HREF = '/vehicle/setup?mode=add&source=settings&ownership=owned'

/** "Brand Model · PLATE" — proper nouns and a plate, not prose, so no catalog key. */
export function vehicleSummaryLine(
  v: { brand?: string | null; model?: string | null; registrationNumber?: string | null } | null | undefined,
): string | null {
  if (!v) return null
  const name = [v.brand, v.model].filter(Boolean).join(' ')
  return [name, v.registrationNumber].filter(Boolean).join(' · ') || null
}
