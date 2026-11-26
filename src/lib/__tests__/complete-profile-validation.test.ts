import { describe, expect, it } from 'vitest'
import {
  ALL_STEPS,
  canGoNext,
  onboardingRentalWindow,
  stepsForOwnership,
  vehicleStepSkipped,
  type CompleteProfileFields,
} from '../complete-profile-validation'

const complete: CompleteProfileFields = {
  fullName: 'Ada Lovelace',
  phone: '+49 30 1234',
  driversLicense: 'B123',
  primaryCity: 'Berlin',
  primaryCountry: 'Germany',
  socialSecurityNumber: '12 345',
  taxNumber: 'DE123',
  hasSelfiePhoto: true,
  // A passport with no date entered: valid whatever the clock says.
  residenceDocType: 'passport',
  hasResidenceDocFront: true,
  hasResidenceDocBack: true,
  residenceDocExpiresAt: '',
  hasMovingCertificate: false,
  hasMovingCertificatePhoto: false,
  hasBusinessInsurance: true,
  vehicleOwnership: 'owned',
  vehicleBrand: 'Mercedes-Benz',
  vehicleModel: 'Sprinter',
  vehicleYear: '2022',
  vehicleCapacity: '',
  vehicleGrossWeightKg: '3500',
  vehicleHasTrailer: false,
  vehicleTrailerGrossWeightKg: '',
  vehicleRegistration: 'B-AB 1234',
  vehicleType: 'medium_truck',
  hasFrontPlatePhoto: true,
  hasRearPlatePhoto: true,
  hasFullVehiclePhoto: true,
  vehicleHasMotorInsurance: true,
  yearsExperience: '3',
  languages: ['German'],
}

describe('stepsForOwnership', () => {
  it('every driver walks every step — a rental is registered with its window during onboarding (wave 2026-10)', () => {
    expect(stepsForOwnership('rented')).toEqual([...ALL_STEPS])
    expect(stepsForOwnership('owned')).toEqual([...ALL_STEPS])
    expect(stepsForOwnership('')).toEqual([...ALL_STEPS])
  })
  it('residence status comes directly after verification (plan legal/7)', () => {
    expect(ALL_STEPS.indexOf('residence')).toBe(ALL_STEPS.indexOf('verification') + 1)
  })
})

describe('rented vehicle step (plan wave-2026-10/1 §7)', () => {
  const NOW = Date.parse('2026-10-02T10:00:00Z')
  const rented: CompleteProfileFields = { ...complete, vehicleOwnership: 'rented' }
  const empty: CompleteProfileFields = {
    ...rented,
    vehicleBrand: '',
    vehicleModel: '',
    vehicleYear: '',
    vehicleCapacity: '',
    vehicleRegistration: '',
    vehicleType: '',
    hasFrontPlatePhoto: false,
    hasRearPlatePhoto: false,
    hasFullVehiclePhoto: false,
  }
  it('a filled-in rental needs a window', () => {
    expect(canGoNext('vehicle', rented, NOW)).toBe(false)
    expect(canGoNext('vehicle', { ...rented, rentalHours: '8' }, NOW)).toBe(true)
    expect(canGoNext('vehicle', { ...rented, rentalEndAt: '2026-10-03T10:00:00Z' }, NOW)).toBe(true)
    expect(canGoNext('vehicle', { ...rented, rentalEndAt: '2026-10-01T10:00:00Z' }, NOW)).toBe(false)
    expect(onboardingRentalWindow({ ...rented, rentalHours: '8' }, NOW)?.endAt).toBe('2026-10-02T18:00:00.000Z')
    expect(onboardingRentalWindow(complete, NOW)).toBeNull()
  })
  it('an untouched step is a skip for a rental driver only', () => {
    expect(vehicleStepSkipped(empty)).toBe(true)
    expect(canGoNext('vehicle', empty, NOW)).toBe(true)
    expect(vehicleStepSkipped({ ...empty, vehicleBrand: 'VW' })).toBe(false)
    expect(canGoNext('vehicle', { ...empty, vehicleBrand: 'VW' }, NOW)).toBe(false)
    expect(canGoNext('vehicle', { ...empty, vehicleOwnership: 'owned' }, NOW)).toBe(false)
  })
  it('the insurance answer alone does not un-skip the step', () => {
    expect(vehicleStepSkipped({ ...empty, vehicleHasMotorInsurance: null })).toBe(true)
    expect(vehicleStepSkipped({ ...empty, vehicleHasMotorInsurance: false })).toBe(true)
    expect(canGoNext('vehicle', { ...empty, vehicleHasMotorInsurance: null }, NOW)).toBe(true)
  })
})

describe('canGoNext', () => {
  it('passes every step on a complete form', () => {
    for (const step of ALL_STEPS) expect(canGoNext(step, complete)).toBe(true)
  })

  it('personal needs name, phone and licence number', () => {
    expect(canGoNext('personal', { ...complete, driversLicense: '  ' })).toBe(false)
  })

  it('verification needs the selfie', () => {
    expect(canGoNext('verification', { ...complete, hasSelfiePhoto: false })).toBe(false)
    expect(canGoNext('verification', { ...complete, taxNumber: '' })).toBe(false)
  })

  it('ownership must be chosen', () => {
    expect(canGoNext('ownership', { ...complete, vehicleOwnership: '' })).toBe(false)
    expect(canGoNext('ownership', { ...complete, vehicleOwnership: 'rented' })).toBe(true)
  })

  it('vehicle needs all three photos, a valid plate, a four-digit year, make/model/type', () => {
    expect(canGoNext('vehicle', { ...complete, hasRearPlatePhoto: false })).toBe(false)
    expect(canGoNext('vehicle', { ...complete, vehicleRegistration: '-' })).toBe(false)
    expect(canGoNext('vehicle', { ...complete, vehicleYear: '' })).toBe(false)
    expect(canGoNext('vehicle', { ...complete, vehicleYear: '22' })).toBe(false)
    expect(canGoNext('vehicle', { ...complete, vehicleType: 'bus' })).toBe(false)
    expect(canGoNext('vehicle', { ...complete, vehicleModel: '' })).toBe(false)
  })

  it('vehicle needs an answer to the motor-insurance question; either answer passes (plan legal/7 V3)', () => {
    expect(canGoNext('vehicle', { ...complete, vehicleHasMotorInsurance: null })).toBe(false)
    expect(canGoNext('vehicle', { ...complete, vehicleHasMotorInsurance: false })).toBe(true)
    expect(canGoNext('vehicle', { ...complete, vehicleHasMotorInsurance: true })).toBe(true)
  })

  it('capacity is optional but must be within 1–120 m³ when typed', () => {
    expect(canGoNext('vehicle', { ...complete, vehicleCapacity: '15' })).toBe(true)
    expect(canGoNext('vehicle', { ...complete, vehicleCapacity: '500' })).toBe(false)
  })

  it('experience needs years and at least one language', () => {
    expect(canGoNext('experience', { ...complete, languages: [] })).toBe(false)
    expect(canGoNext('experience', { ...complete, yearsExperience: '' })).toBe(false)
  })

  it('review always passes', () => {
    expect(canGoNext('review', { ...complete, fullName: '' })).toBe(true)
  })
})

describe('residence status step (plan legal/7)', () => {
  const NOW = Date.parse('2026-11-24T10:00:00Z')
  const permit: CompleteProfileFields = {
    ...complete,
    residenceDocType: 'residence_permit',
    residenceDocExpiresAt: '2027-06-30',
  }

  it('needs the document type', () => {
    expect(canGoNext('residence', { ...complete, residenceDocType: '' }, NOW)).toBe(false)
  })

  it('needs both photographs', () => {
    expect(canGoNext('residence', { ...complete, hasResidenceDocFront: false }, NOW)).toBe(false)
    expect(canGoNext('residence', { ...complete, hasResidenceDocBack: false }, NOW)).toBe(false)
  })

  it('a passport passes without a date; a date, when entered, must be in the future', () => {
    expect(canGoNext('residence', complete, NOW)).toBe(true)
    expect(canGoNext('residence', { ...complete, residenceDocExpiresAt: '2030-01-01' }, NOW)).toBe(true)
    expect(canGoNext('residence', { ...complete, residenceDocExpiresAt: '2026-01-01' }, NOW)).toBe(false)
  })

  it('a permit needs a valid-until date in the future', () => {
    expect(canGoNext('residence', permit, NOW)).toBe(true)
    expect(canGoNext('residence', { ...permit, residenceDocExpiresAt: '' }, NOW)).toBe(false)
    expect(canGoNext('residence', { ...permit, residenceDocExpiresAt: '2026-11-23' }, NOW)).toBe(false)
    expect(canGoNext('residence', { ...permit, residenceDocExpiresAt: 'soon' }, NOW)).toBe(false)
  })

  it('the certificate question must be answered; yes needs the photograph', () => {
    expect(canGoNext('residence', { ...complete, hasMovingCertificate: null }, NOW)).toBe(false)
    expect(canGoNext('residence', { ...complete, hasMovingCertificate: true }, NOW)).toBe(false)
    expect(
      canGoNext('residence', { ...complete, hasMovingCertificate: true, hasMovingCertificatePhoto: true }, NOW),
    ).toBe(true)
    expect(canGoNext('residence', { ...complete, hasMovingCertificate: false }, NOW)).toBe(true)
  })

  it('the business-insurance question must be answered; either answer passes', () => {
    expect(canGoNext('residence', { ...complete, hasBusinessInsurance: null }, NOW)).toBe(false)
    expect(canGoNext('residence', { ...complete, hasBusinessInsurance: false }, NOW)).toBe(true)
  })
})
