import { validateVehicleInput, type VehicleOwnership } from './vehicle-service'

/**
 * Step gating for the driver registration wizard
 * (`app/(mover)/complete-profile/page.tsx`), pulled out of the page so the
 * rule that decides when *Next* lights up is a unit rather than a closure over
 * component state. Pure: no React, no DOM — the page passes booleans for the
 * `File` fields.
 *
 * Master D5/D10: the **ownership** step precedes the vehicle step; a rental
 * driver finishes registration without a vehicle (added later from the
 * dashboard), an owned driver must supply the same evidence the vehicle
 * function demands (front plate, rear plate, full vehicle, plate number,
 * make/model/year/type).
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

/** The wizard's steps for a given ownership choice: rented skips the vehicle step. */
export function stepsForOwnership(ownership: VehicleOwnership | ''): CompleteProfileStep[] {
  return ownership === 'rented' ? ALL_STEPS.filter((s) => s !== 'vehicle') : [...ALL_STEPS]
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
  yearsExperience: string
  languages: string[]
}

const filled = (v: string) => v.trim().length > 0

/**
 * The vehicle step reuses the server's validator so the driver cannot advance
 * with input the submit call would reject (same `fnCode`s). Photo presence is
 * expressed as placeholder URLs — the validator only checks non-emptiness and
 * the real URLs exist only after upload. Year is required at registration,
 * as it always was on this form.
 */
export function vehicleStepValid(f: CompleteProfileFields): boolean {
  if (!filled(f.vehicleYear)) return false
  const codes = validateVehicleInput({
    ownership: 'owned',
    registrationNumber: f.vehicleRegistration,
    brand: f.vehicleBrand,
    model: f.vehicleModel,
    year: f.vehicleYear,
    vehicleType: f.vehicleType,
    capacityM3: f.vehicleCapacity,
    frontPlatePhoto: f.hasFrontPlatePhoto ? 'pending' : '',
    rearPlatePhoto: f.hasRearPlatePhoto ? 'pending' : '',
    fullVehiclePhoto: f.hasFullVehiclePhoto ? 'pending' : '',
  })
  return codes.length === 0
}

export function canGoNext(step: CompleteProfileStep, f: CompleteProfileFields): boolean {
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
      return vehicleStepValid(f)
    case 'experience':
      return filled(f.yearsExperience) && f.languages.length > 0
    default:
      return true
  }
}
