import { residenceSubmissionError, type ResidenceDocType, type ResidenceSubmissionError, type VettingPrompt } from './vetting'

/**
 * The driver-vetting forms (plan `legal/7.driver-vetting.md`): the "Residence
 * status" step of registration and the documents page of a registered driver.
 * Pure: no React, no DOM, no clock. The pages pass presence booleans for the
 * `File` fields and `nowMs`.
 *
 * The residence rule is the server's own (`residenceSubmissionError`), so the
 * driver cannot advance with input the submit call would refuse. The two
 * "answer the question" codes are form-only: the server stores whichever
 * sections it is sent, the forms are what make them compulsory.
 */

export interface VettingFormFields {
  residenceDocType: ResidenceDocType | ''
  hasResidenceDocFront: boolean
  hasResidenceDocBack: boolean
  /** `YYYY-MM-DD` from the date input; '' when not entered. */
  residenceDocExpiresAt: string
  /** `null` until the driver answers. */
  hasMovingCertificate: boolean | null
  hasMovingCertificatePhoto: boolean
  hasBusinessInsurance: boolean | null
}

export const EMPTY_VETTING_FIELDS: VettingFormFields = {
  residenceDocType: '',
  hasResidenceDocFront: false,
  hasResidenceDocBack: false,
  residenceDocExpiresAt: '',
  hasMovingCertificate: null,
  hasMovingCertificatePhoto: false,
  hasBusinessInsurance: null,
}

export type VettingFormError =
  | ResidenceSubmissionError
  | 'vetting.certificatePhotoRequired'
  | 'certificateAnswerRequired'
  | 'insuranceAnswerRequired'

/** The server's residence rule over the form's fields. */
export function residenceSectionError(f: VettingFormFields, nowMs: number): ResidenceSubmissionError | null {
  return residenceSubmissionError(
    {
      docType: f.residenceDocType,
      front: f.hasResidenceDocFront ? 'pending' : '',
      back: f.hasResidenceDocBack ? 'pending' : '',
      expiresAt: f.residenceDocExpiresAt,
    },
    nowMs,
  )
}

/** The certificate question must be answered; "yes" needs the photograph. */
export function certificateSectionError(
  f: Pick<VettingFormFields, 'hasMovingCertificate' | 'hasMovingCertificatePhoto'>,
): 'vetting.certificatePhotoRequired' | 'certificateAnswerRequired' | null {
  if (typeof f.hasMovingCertificate !== 'boolean') return 'certificateAnswerRequired'
  return f.hasMovingCertificate && !f.hasMovingCertificatePhoto ? 'vetting.certificatePhotoRequired' : null
}

/** Either answer passes; an unanswered question does not. */
export function insuranceSectionError(f: Pick<VettingFormFields, 'hasBusinessInsurance'>): 'insuranceAnswerRequired' | null {
  return typeof f.hasBusinessInsurance === 'boolean' ? null : 'insuranceAnswerRequired'
}

/** Every problem on the registration step, in the order the step shows its sections. */
export function vettingStepErrors(f: VettingFormFields, nowMs: number): VettingFormError[] {
  const errors: VettingFormError[] = []
  const residence = residenceSectionError(f, nowMs)
  if (residence) errors.push(residence)
  const certificate = certificateSectionError(f)
  if (certificate) errors.push(certificate)
  const insurance = insuranceSectionError(f)
  if (insurance) errors.push(insurance)
  return errors
}

export function vettingStepValid(f: VettingFormFields, nowMs: number): boolean {
  return vettingStepErrors(f, nowMs).length === 0
}

/**
 * The catalog key for a form error. The `vetting.*` codes are the server's
 * refusal codes and resolve in `errors`; the two form-only ones live in `web`.
 */
// i18n-keys: errors:vetting.residenceTypeRequired, errors:vetting.residencePhotosRequired,
// errors:vetting.residenceExpiryRequired, errors:vetting.residenceExpiryPast, errors:vetting.certificatePhotoRequired,
// web:mover.vetting.certificate.answerRequired.error, web:mover.vetting.insurance.answerRequired.error
export function vettingErrorKey(code: VettingFormError): string {
  if (code === 'certificateAnswerRequired') return 'web:mover.vetting.certificate.answerRequired.error'
  if (code === 'insuranceAnswerRequired') return 'web:mover.vetting.insurance.answerRequired.error'
  return `errors:${code}`
}

/** The earliest date the "valid until" input accepts: the day after `nowMs` (UTC), as `YYYY-MM-DD`. */
export function minExpiryDate(nowMs: number): string {
  return new Date(nowMs + 86400000).toISOString().slice(0, 10)
}

// ── What the driver's screens show ───────────────────────────────────────

type ReviewStatus = 'none' | 'pending_review' | 'verified' | 'rejected'

export type DocumentDisplayStatus = 'missing' | 'review' | 'approved' | 'rejected' | 'expired'

/** The residence card's status. `prompt` already folds the expiry in (server clock). */
export function residenceDisplayStatus(residence: { status: ReviewStatus; prompt: VettingPrompt }): DocumentDisplayStatus {
  if (residence.prompt === 'residenceExpired') return 'expired'
  if (residence.status === 'verified') return 'approved'
  if (residence.status === 'pending_review') return 'review'
  if (residence.status === 'rejected') return 'rejected'
  return 'missing'
}

/** The certificate card's status. A certificate never expires here. */
export function certificateDisplayStatus(certificate: { status: ReviewStatus }): Exclude<DocumentDisplayStatus, 'expired'> {
  if (certificate.status === 'verified') return 'approved'
  if (certificate.status === 'pending_review') return 'review'
  if (certificate.status === 'rejected') return 'rejected'
  return 'missing'
}

export type ResidenceBannerKind = 'missing' | 'pending' | 'rejected' | 'expired'

export interface ResidenceBanner {
  kind: ResidenceBannerKind
  tone: 'red' | 'orange' | 'amber'
  /**
   * Which body sentence: `blocked` when the driver cannot take work right now,
   * `deadline` when a date is set from which they cannot, `open` otherwise.
   */
  body: 'blocked' | 'deadline' | 'open'
  cta: 'add' | 'view' | 'replace'
}

/**
 * The dashboard banner for the residence document, or `null` when nothing is
 * outstanding. An expired document blocks whatever the gate says; the other
 * states block only once the gate date has arrived.
 */
export function residenceBanner(
  prompt: VettingPrompt,
  gate: { active: boolean; from: string | null },
): ResidenceBanner | null {
  if (!prompt) return null
  if (prompt === 'residenceExpired') return { kind: 'expired', tone: 'red', body: 'blocked', cta: 'replace' }
  const body = gate.active ? 'blocked' : gate.from ? 'deadline' : 'open'
  if (prompt === 'residenceRejected') return { kind: 'rejected', tone: 'red', body, cta: 'replace' }
  if (prompt === 'residencePending') return { kind: 'pending', tone: 'amber', body, cta: 'view' }
  return { kind: 'missing', tone: gate.active ? 'red' : 'orange', body, cta: 'add' }
}

export interface DailyCapLine {
  acceptedToday: number
  cap: number
  reached: boolean
}

/**
 * "x of y moves today" for a driver without a verified certificate; `null` for
 * a certified driver (no cap) and before a profile exists.
 */
export function dailyCapLine(
  today: { acceptedToday: number; cap: number | null; reached: boolean } | null | undefined,
): DailyCapLine | null {
  if (!today || typeof today.cap !== 'number') return null
  return { acceptedToday: Math.max(0, today.acceptedToday), cap: today.cap, reached: today.reached }
}

/** Refusal codes whose fix is on the documents page. */
export const VETTING_REFUSAL_CODES: readonly string[] = [
  'mover.residenceNotVerified',
  'mover.residenceExpired',
  'mover.dailyCapReached',
]

export function isVettingRefusal(fnCode: unknown): boolean {
  return typeof fnCode === 'string' && VETTING_REFUSAL_CODES.includes(fnCode)
}

export const DOCUMENTS_HREF = '/settings/documents'
