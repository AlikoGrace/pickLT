import {
  validateVehicleInput,
  type ValidateVehicleOptions,
  type VehicleFormInput,
  type VehicleValidationCode,
} from './vehicle-service'

/**
 * Form-side vehicle validation (twin of the mover app's `lib/vehicle-form.ts`).
 *
 * The shared `validateVehicleInput` (`vehicle-service.ts`, byte-identical
 * across the apps) knows nothing of the motor-insurance declaration (plan
 * `legal/7.driver-vetting.md` V3): the server checks it beside the validator
 * and answers `vehicle.insuranceRequired`. This adds the same rule in front of
 * the network call. Pure.
 */

export type VehicleFormCode = VehicleValidationCode | 'vehicle.insuranceRequired'

export type VehicleFormState = Partial<VehicleFormInput> & {
  /** "Does this vehicle have motor liability insurance?" `null` until answered. */
  hasMotorInsurance?: boolean | null
}

/**
 * The shared codes plus the insurance question. Either answer passes: a
 * vehicle declared uninsured may be submitted (it cannot be approved, and the
 * form says so before submitting); an unanswered question may not.
 */
export function validateVehicleForm(input: VehicleFormState, opts: ValidateVehicleOptions = {}): VehicleFormCode[] {
  const codes: VehicleFormCode[] = validateVehicleInput(input, opts)
  if (typeof input.hasMotorInsurance !== 'boolean') codes.push('vehicle.insuranceRequired')
  return codes
}

/** A new vehicle answered "no": the notice shown before submitting. */
export function showsUninsuredNotice(answer: boolean | null | undefined): boolean {
  return answer === false
}

/**
 * The renew form's insurance question. A renewed rental is a new contract, so
 * it is asked again, and a renewal can put the vehicle straight back into
 * service, so "no" is refused (the server answers `vehicle.insuranceRequired`
 * to the same body). `null` when the renewal may be sent.
 */
export function renewInsuranceError(answer: boolean | null | undefined): 'unanswered' | 'uninsured' | null {
  if (answer === true) return null
  return answer === false ? 'uninsured' : 'unanswered'
}
