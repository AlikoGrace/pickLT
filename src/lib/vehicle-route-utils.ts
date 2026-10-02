import { NextResponse } from 'next/server'

import type { ServerTranslation } from './i18n-server'
import { vehicleErrorMessage, VehicleRepoError } from './vehicle-repo'

/**
 * Shared by the `/api/mover/vehicle*` routes. Lives outside the route files
 * because Next.js only lets a `route.ts` export HTTP handlers.
 */

/** The profile fields the driver surfaces read; nothing KYC-grade leaves here. */
export function profileVehicleFields(profile: Record<string, unknown>) {
  return {
    profileId: profile.$id,
    verificationStatus: profile.verificationStatus ?? null,
    vehicleOwnership: profile.vehicleOwnership ?? 'owned',
    vehicleStatus: profile.vehicleStatus ?? 'none',
    currentVehicleId: profile.currentVehicleId ?? null,
    vehicleConfirmedAt: profile.vehicleConfirmedAt ?? null,
    vehicleConfirmedServiceDate: profile.vehicleConfirmedServiceDate ?? null,
    vehicleReconfirmRequired: profile.vehicleReconfirmRequired === true,
    // Rental window of the vehicle in service + the owned fallback (plan wave-2026-10/1).
    vehicleRentalStartAt: profile.vehicleRentalStartAt ?? null,
    vehicleRentalEndAt: profile.vehicleRentalEndAt ?? null,
    vehicleRentalHours: typeof profile.vehicleRentalHours === 'number' ? profile.vehicleRentalHours : null,
    ownedVehicleId: profile.ownedVehicleId ?? null,
  }
}

/** `VehicleRepoError` → the route's JSON: translated `error`, wire `fnCode`, every `codes` entry. */
export function repoErrorResponse(err: VehicleRepoError, t: ServerTranslation['t']) {
  return NextResponse.json(
    { error: vehicleErrorMessage(t, err.fnCode), fnCode: err.fnCode, ...(err.codes ? { codes: err.codes } : {}) },
    { status: err.status },
  )
}
