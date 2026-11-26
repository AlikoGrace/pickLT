import { describe, expect, it } from 'vitest'
import { renewInsuranceError, showsUninsuredNotice, validateVehicleForm, type VehicleFormState } from '../vehicle-form'

const valid: VehicleFormState = {
  ownership: 'owned',
  registrationNumber: 'B-AB 1234',
  brand: 'Mercedes-Benz',
  model: 'Sprinter',
  year: '2022',
  vehicleType: 'medium_truck',
  grossWeightKg: '3500',
  hasTrailer: false,
  frontPlatePhoto: 'pending',
  rearPlatePhoto: 'pending',
  fullVehiclePhoto: 'pending',
  hasMotorInsurance: true,
}

describe('validateVehicleForm (plan legal/7 V3)', () => {
  it('passes a complete form with either insurance answer', () => {
    expect(validateVehicleForm(valid)).toEqual([])
    expect(validateVehicleForm({ ...valid, hasMotorInsurance: false })).toEqual([])
  })
  it('refuses an unanswered insurance question with the server code', () => {
    expect(validateVehicleForm({ ...valid, hasMotorInsurance: null })).toEqual(['vehicle.insuranceRequired'])
    expect(validateVehicleForm({ ...valid, hasMotorInsurance: undefined })).toEqual(['vehicle.insuranceRequired'])
  })
  it('keeps the shared codes, and lists the insurance one after them', () => {
    expect(validateVehicleForm({ ...valid, brand: '', hasMotorInsurance: null })).toEqual([
      'vehicle.fieldsRequired',
      'vehicle.insuranceRequired',
    ])
    expect(validateVehicleForm({ ...valid, frontPlatePhoto: '' })).toEqual(['vehicle.photosRequired'])
  })
  it('passes the options through (a rental needs its window)', () => {
    const rented: VehicleFormState = { ...valid, ownership: 'rented', rental: null }
    expect(validateVehicleForm(rented, { requireRentalWindow: true, nowMs: Date.parse('2026-11-24T10:00:00Z') })).toContain(
      'vehicle.rentalWindowRequired',
    )
    expect(
      validateVehicleForm(
        { ...rented, rental: { hours: 8, endAt: null } },
        { requireRentalWindow: true, nowMs: Date.parse('2026-11-24T10:00:00Z') },
      ),
    ).toEqual([])
  })
})

describe('showsUninsuredNotice', () => {
  it('only for a "no"', () => {
    expect(showsUninsuredNotice(false)).toBe(true)
    expect(showsUninsuredNotice(true)).toBe(false)
    expect(showsUninsuredNotice(null)).toBe(false)
  })
})

describe('renewInsuranceError', () => {
  it('a renewal needs a "yes"', () => {
    expect(renewInsuranceError(true)).toBeNull()
    expect(renewInsuranceError(false)).toBe('uninsured')
    expect(renewInsuranceError(null)).toBe('unanswered')
    expect(renewInsuranceError(undefined)).toBe('unanswered')
  })
})
