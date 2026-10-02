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
  vehicleOwnership: 'owned',
  vehicleBrand: 'Mercedes-Benz',
  vehicleModel: 'Sprinter',
  vehicleYear: '2022',
  vehicleCapacity: '',
  vehicleRegistration: 'B-AB 1234',
  vehicleType: 'medium_truck',
  hasFrontPlatePhoto: true,
  hasRearPlatePhoto: true,
  hasFullVehiclePhoto: true,
  yearsExperience: '3',
  languages: ['German'],
}

describe('stepsForOwnership', () => {
  it('every driver walks all six steps — a rental is registered with its window during onboarding (wave 2026-10)', () => {
    expect(stepsForOwnership('rented')).toEqual([...ALL_STEPS])
    expect(stepsForOwnership('owned')).toEqual([...ALL_STEPS])
    expect(stepsForOwnership('')).toEqual([...ALL_STEPS])
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
