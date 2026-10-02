import { resolveRentalWindow, validateVehicleInput, type VehicleOwnership } from './vehicle-service'

/**
 * Step gating for the driver registration wizard
 * (`app/(mover)/complete-profile/page.tsx`), pulled out of the page so the
 * rule that decides when *Next* lights up is a unit rather than a closure over
 * component state. Pure: no React, no DOM — the page passes booleans for the
 * `File` fields.
 *
 * Master D5/D10: the **ownership** step precedes the vehicle step; an owned
 * driver must supply the same evidence the vehicle function demands (front
 * plate, rear plate, full vehicle, plate number, make/model/year/type).
 *
 * Wave 2026-10 (plan `wave-2026-10/1` §7): a rental driver now registers the
 * rented vehicle WITH its rental period during onboarding, on the same step.
 * The step stays skippable for them — leave every vehicle field empty and the
 * rental is added later from the dashboard (`vehicleStatus` stays `none`).
 */

export type CompleteProfileStep = 'personal' | 'verification' | 'ownership' | 'vehicle' | 'experience' | 'review'

export const ALL_STEPS: readonly CompleteProfileStep[] = [
  'personal',
  'verification',
  'ownership',
  'vehicle',
  'experience',
  'review',
]

/** The wizard's steps for a given ownership choice — every driver walks all six since wave 2026-10. */
export function stepsForOwnership(_ownership: VehicleOwnership | ''): CompleteProfileStep[] {
  return [...ALL_STEPS]
}

export interface CompleteProfileFields {
  fullName: string
  phone: string
  driversLicense: string
  primaryCity: string
  primaryCountry: string
  socialSecurityNumber: string
  taxNumber: string
  hasSelfiePhoto: boolean
  vehicleOwnership: VehicleOwnership | ''
  vehicleBrand: string
  vehicleModel: string
  vehicleYear: string
  vehicleCapacity: string
  vehicleRegistration: string
  vehicleType: string
  hasFrontPlatePhoto: boolean
  hasRearPlatePhoto: boolean
  hasFullVehiclePhoto: boolean
  /** Rental window (rented drivers): one of the two must resolve — see `resolveRentalWindow`. */
  rentalHours?: string
  rentalEndAt?: string
  yearsExperience: string
  languages: string[]
}

const filled = (v: string) => v.trim().length > 0

/** True when a rental driver left the vehicle step untouched — the rental is added later (D10). */
export function vehicleStepSkipped(f: CompleteProfileFields): boolean {
  return (
    f.vehicleOwnership === 'rented' &&
    !filled(f.vehicleBrand) &&
    !filled(f.vehicleModel) &&
    !filled(f.vehicleYear) &&
    !filled(f.vehicleRegistration) &&
    !filled(f.vehicleType) &&
    !f.hasFrontPlatePhoto &&
    !f.hasRearPlatePhoto &&
    !f.hasFullVehiclePhoto
  )
}

/**
 * The vehicle step reuses the server's validator so the driver cannot advance
 * with input the submit call would reject (same `fnCode`s). Photo presence is
 * expressed as placeholder URLs — the validator only checks non-emptiness and
 * the real URLs exist only after upload. Year is required at registration,
 * as it always was on this form.
 */
export function vehicleStepValid(f: CompleteProfileFields, nowMs: number = Date.now()): boolean {
  if (!filled(f.vehicleYear)) return false
  const rented = f.vehicleOwnership === 'rented'
  const codes = validateVehicleInput(
    {
      ownership: rented ? 'rented' : 'owned',
      registrationNumber: f.vehicleRegistration,
      brand: f.vehicleBrand,
      model: f.vehicleModel,
      year: f.vehicleYear,
      vehicleType: f.vehicleType,
      capacityM3: f.vehicleCapacity,
      frontPlatePhoto: f.hasFrontPlatePhoto ? 'pending' : '',
      rearPlatePhoto: f.hasRearPlatePhoto ? 'pending' : '',
      fullVehiclePhoto: f.hasFullVehiclePhoto ? 'pending' : '',
      rental: rented ? { hours: f.rentalHours || null, endAt: f.rentalEndAt || null } : null,
    },
    { requireRentalWindow: true, nowMs },
  )
  return codes.length === 0
}

/** The window a rented driver entered, resolved — null when it does not resolve or the driver is not rented. */
export function onboardingRentalWindow(f: CompleteProfileFields, nowMs: number = Date.now()) {
  if (f.vehicleOwnership !== 'rented') return null
  const r = resolveRentalWindow({ hours: f.rentalHours || null, endAt: f.rentalEndAt || null }, nowMs)
  return r.ok ? r.window : null
}

export function canGoNext(step: CompleteProfileStep, f: CompleteProfileFields, nowMs: number = Date.now()): boolean {
  switch (step) {
    case 'personal':
      return filled(f.fullName) && filled(f.phone) && filled(f.driversLicense)
    case 'verification':
      return (
        filled(f.primaryCity) &&
        filled(f.primaryCountry) &&
        filled(f.socialSecurityNumber) &&
        filled(f.taxNumber) &&
        f.hasSelfiePhoto
      )
    case 'ownership':
      return f.vehicleOwnership === 'owned' || f.vehicleOwnership === 'rented'
    case 'vehicle':
      // Rented: a filled-in vehicle needs its window; an untouched step is a skip (added later).
      return vehicleStepValid(f, nowMs) || vehicleStepSkipped(f)
    case 'experience':
      return filled(f.yearsExperience) && f.languages.length > 0
    default:
      return true
  }
}
