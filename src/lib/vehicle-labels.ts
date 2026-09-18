import type { TFunction } from 'i18next'

import type { VehicleServiceState } from './vehicle-service'

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
}

// i18n-keys: common:vehicleEvent.submitted.label, common:vehicleEvent.resubmitted.label,
// common:vehicleEvent.confirmedSame.label, common:vehicleEvent.changeRequested.label,
// common:vehicleEvent.verified.label, common:vehicleEvent.rejected.label,
// common:vehicleEvent.retired.label, common:vehicleEvent.reconfirmRequired.label
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
  VEHICLE_REJECTED: 'vehicleRejected',
}

/**
 * The action that restores service in a restricted state, as a setup mode /
 * route (master §5 table, spec §10 "exactly what action restores service").
 */
export type VehicleAction = 'add' | 'change' | 'resubmit' | 'confirm' | 'view' | null

export function vehicleActionFor(state: VehicleServiceState): VehicleAction {
  switch (state) {
    case 'OWN_PENDING_VEHICLE':
    case 'RENTAL_PENDING_VEHICLE':
      return 'add'
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
