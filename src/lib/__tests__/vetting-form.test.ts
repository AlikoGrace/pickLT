import { describe, expect, it } from 'vitest'
import {
  EMPTY_VETTING_FIELDS,
  certificateDisplayStatus,
  certificateSectionError,
  dailyCapLine,
  insuranceSectionError,
  isVettingRefusal,
  minExpiryDate,
  residenceBanner,
  residenceDisplayStatus,
  residenceSectionError,
  vettingErrorKey,
  vettingStepErrors,
  vettingStepValid,
  type VettingFormFields,
} from '../vetting-form'

const NOW = Date.parse('2026-11-24T10:00:00Z')

const passport: VettingFormFields = {
  residenceDocType: 'passport',
  hasResidenceDocFront: true,
  hasResidenceDocBack: true,
  residenceDocExpiresAt: '',
  hasMovingCertificate: false,
  hasMovingCertificatePhoto: false,
  hasBusinessInsurance: true,
}

describe('residenceSectionError', () => {
  it('asks for the type first, then the photographs, then the date', () => {
    expect(residenceSectionError(EMPTY_VETTING_FIELDS, NOW)).toBe('vetting.residenceTypeRequired')
    expect(residenceSectionError({ ...passport, hasResidenceDocBack: false }, NOW)).toBe('vetting.residencePhotosRequired')
    expect(residenceSectionError({ ...passport, residenceDocType: 'residence_permit' }, NOW)).toBe(
      'vetting.residenceExpiryRequired',
    )
    expect(
      residenceSectionError({ ...passport, residenceDocType: 'residence_permit', residenceDocExpiresAt: '2026-11-01' }, NOW),
    ).toBe('vetting.residenceExpiryPast')
  })
  it('passes a passport without a date and a permit with a future one', () => {
    expect(residenceSectionError(passport, NOW)).toBeNull()
    expect(
      residenceSectionError({ ...passport, residenceDocType: 'residence_permit', residenceDocExpiresAt: '2027-01-01' }, NOW),
    ).toBeNull()
  })
})

describe('certificateSectionError / insuranceSectionError', () => {
  it('certificate: unanswered, yes without a photo, yes with one, no', () => {
    expect(certificateSectionError({ hasMovingCertificate: null, hasMovingCertificatePhoto: false })).toBe(
      'certificateAnswerRequired',
    )
    expect(certificateSectionError({ hasMovingCertificate: true, hasMovingCertificatePhoto: false })).toBe(
      'vetting.certificatePhotoRequired',
    )
    expect(certificateSectionError({ hasMovingCertificate: true, hasMovingCertificatePhoto: true })).toBeNull()
    expect(certificateSectionError({ hasMovingCertificate: false, hasMovingCertificatePhoto: false })).toBeNull()
  })
  it('insurance: only an unanswered question fails', () => {
    expect(insuranceSectionError({ hasBusinessInsurance: null })).toBe('insuranceAnswerRequired')
    expect(insuranceSectionError({ hasBusinessInsurance: false })).toBeNull()
    expect(insuranceSectionError({ hasBusinessInsurance: true })).toBeNull()
  })
})

describe('vettingStepErrors', () => {
  it('lists one problem per section, in the order the step shows them', () => {
    expect(vettingStepErrors(EMPTY_VETTING_FIELDS, NOW)).toEqual([
      'vetting.residenceTypeRequired',
      'certificateAnswerRequired',
      'insuranceAnswerRequired',
    ])
    expect(vettingStepValid(EMPTY_VETTING_FIELDS, NOW)).toBe(false)
    expect(vettingStepErrors(passport, NOW)).toEqual([])
    expect(vettingStepValid(passport, NOW)).toBe(true)
  })
})

describe('vettingErrorKey', () => {
  it('sends the server codes to errors and the form-only ones to web', () => {
    expect(vettingErrorKey('vetting.residenceExpiryPast')).toBe('errors:vetting.residenceExpiryPast')
    expect(vettingErrorKey('vetting.certificatePhotoRequired')).toBe('errors:vetting.certificatePhotoRequired')
    expect(vettingErrorKey('certificateAnswerRequired')).toBe('web:mover.vetting.certificate.answerRequired.error')
    expect(vettingErrorKey('insuranceAnswerRequired')).toBe('web:mover.vetting.insurance.answerRequired.error')
  })
})

describe('minExpiryDate', () => {
  it('is the day after now', () => {
    expect(minExpiryDate(NOW)).toBe('2026-11-25')
    expect(minExpiryDate(Date.parse('2026-12-31T23:30:00Z'))).toBe('2027-01-01')
  })
})

describe('display status', () => {
  it('residence: expired wins over approved', () => {
    expect(residenceDisplayStatus({ status: 'none', prompt: 'residenceMissing' })).toBe('missing')
    expect(residenceDisplayStatus({ status: 'pending_review', prompt: 'residencePending' })).toBe('review')
    expect(residenceDisplayStatus({ status: 'rejected', prompt: 'residenceRejected' })).toBe('rejected')
    expect(residenceDisplayStatus({ status: 'verified', prompt: null })).toBe('approved')
    expect(residenceDisplayStatus({ status: 'verified', prompt: 'residenceExpired' })).toBe('expired')
  })
  it('certificate', () => {
    expect(certificateDisplayStatus({ status: 'none' })).toBe('missing')
    expect(certificateDisplayStatus({ status: 'pending_review' })).toBe('review')
    expect(certificateDisplayStatus({ status: 'verified' })).toBe('approved')
    expect(certificateDisplayStatus({ status: 'rejected' })).toBe('rejected')
  })
})

describe('residenceBanner', () => {
  const open = { active: false, from: null }
  const deadline = { active: false, from: '2027-01-01T00:00:00.000Z' }
  const active = { active: true, from: '2026-11-01T00:00:00.000Z' }

  it('shows nothing when nothing is outstanding', () => {
    expect(residenceBanner(null, active)).toBeNull()
  })
  it('missing: asks to add; blocks only once the gate applies', () => {
    expect(residenceBanner('residenceMissing', open)).toEqual({ kind: 'missing', tone: 'orange', body: 'open', cta: 'add' })
    expect(residenceBanner('residenceMissing', deadline)).toEqual({ kind: 'missing', tone: 'orange', body: 'deadline', cta: 'add' })
    expect(residenceBanner('residenceMissing', active)).toEqual({ kind: 'missing', tone: 'red', body: 'blocked', cta: 'add' })
  })
  it('pending: a quiet notice with a link to look', () => {
    expect(residenceBanner('residencePending', open)).toEqual({ kind: 'pending', tone: 'amber', body: 'open', cta: 'view' })
    expect(residenceBanner('residencePending', active)).toEqual({ kind: 'pending', tone: 'amber', body: 'blocked', cta: 'view' })
  })
  it('rejected: asks to upload again', () => {
    expect(residenceBanner('residenceRejected', deadline)).toEqual({ kind: 'rejected', tone: 'red', body: 'deadline', cta: 'replace' })
  })
  it('expired: blocks whatever the gate says', () => {
    expect(residenceBanner('residenceExpired', open)).toEqual({ kind: 'expired', tone: 'red', body: 'blocked', cta: 'replace' })
  })
})

describe('dailyCapLine', () => {
  it('is null for a certified driver and before a profile exists', () => {
    expect(dailyCapLine(null)).toBeNull()
    expect(dailyCapLine(undefined)).toBeNull()
    expect(dailyCapLine({ acceptedToday: 5, cap: null, reached: false })).toBeNull()
  })
  it('carries the count, the cap and whether it is reached', () => {
    expect(dailyCapLine({ acceptedToday: 1, cap: 2, reached: false })).toEqual({ acceptedToday: 1, cap: 2, reached: false })
    expect(dailyCapLine({ acceptedToday: 2, cap: 2, reached: true })).toEqual({ acceptedToday: 2, cap: 2, reached: true })
  })
})

describe('isVettingRefusal', () => {
  it('names the three refusals whose fix is on the documents page', () => {
    expect(isVettingRefusal('mover.residenceNotVerified')).toBe(true)
    expect(isVettingRefusal('mover.residenceExpired')).toBe(true)
    expect(isVettingRefusal('mover.dailyCapReached')).toBe(true)
    expect(isVettingRefusal('mover.feeRestricted')).toBe(false)
    expect(isVettingRefusal(undefined)).toBe(false)
  })
})
