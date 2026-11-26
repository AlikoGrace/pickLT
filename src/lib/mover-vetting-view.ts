import {
  isCertified,
  residenceGateActive,
  residencePrompt,
  type VettingConfig,
  type VettingProfileFields,
  type VettingPrompt,
} from './vetting'

/**
 * The driver-facing view of their own vetting state, as returned by
 * `GET /api/mover/vetting` (plan legal/7). Pure, and deliberately a projection:
 * the photograph URLs of the identity document and the certificate stay on the
 * server, the browser only learns whether one is on file.
 */

type ReviewStatus = 'none' | 'pending_review' | 'verified' | 'rejected'

export interface VettingView {
  /** Moves per service day for a driver without a verified certificate. */
  cap: number
  /** ISO time from which the residence gate applies; `null` while the owner has not set it. */
  residenceGateFrom: string | null
  /** Whether the gate is being enforced right now. */
  residenceGateActive: boolean
  hasProfile: boolean
  residence: {
    status: ReviewStatus
    /** What the driver should be told; `null` when nothing is outstanding. */
    prompt: VettingPrompt
    docType: 'passport' | 'residence_permit' | null
    expiresAt: string | null
    rejectionReason: string | null
    onFile: boolean
  }
  certificate: {
    status: ReviewStatus
    declared: boolean | null
    rejectionReason: string | null
    onFile: boolean
    certified: boolean
  }
  insurance: { hasBusinessInsurance: boolean | null; declaredAt: string | null }
  /** `null` before a profile exists. `cap: null` means no cap (certified). */
  today: { acceptedToday: number; cap: number | null; reached: boolean } | null
}

const STATUSES: readonly ReviewStatus[] = ['none', 'pending_review', 'verified', 'rejected']
const status = (v: unknown): ReviewStatus => (STATUSES.includes(v as ReviewStatus) ? (v as ReviewStatus) : 'none')
const text = (v: unknown): string | null => (typeof v === 'string' && v.trim() !== '' ? v : null)
const bool = (v: unknown): boolean | null => (typeof v === 'boolean' ? v : null)

export function vettingView(
  profile: (VettingProfileFields & Record<string, unknown>) | null,
  config: VettingConfig,
  today: { ok: boolean; cap: number | null; acceptedToday: number } | null,
  nowMs: number,
): VettingView {
  const docType = profile?.residenceDocType
  return {
    cap: config.uncertifiedDailyMoveCap,
    residenceGateFrom: config.residenceGateFromMs == null ? null : new Date(config.residenceGateFromMs).toISOString(),
    residenceGateActive: residenceGateActive(nowMs, config.residenceGateFromMs),
    hasProfile: !!profile,
    residence: {
      status: status(profile?.residenceStatus),
      prompt: profile ? residencePrompt(profile, nowMs) : 'residenceMissing',
      docType: docType === 'passport' || docType === 'residence_permit' ? docType : null,
      expiresAt: text(profile?.residenceDocExpiresAt),
      rejectionReason: text(profile?.residenceRejectionReason),
      onFile: !!text(profile?.residenceDocFront) && !!text(profile?.residenceDocBack),
    },
    certificate: {
      status: status(profile?.movingCertificateStatus),
      declared: bool(profile?.hasMovingCertificate),
      rejectionReason: text(profile?.movingCertificateRejectionReason),
      onFile: !!text(profile?.movingCertificatePhoto),
      certified: isCertified(profile),
    },
    insurance: {
      hasBusinessInsurance: bool(profile?.hasBusinessInsurance),
      declaredAt: text(profile?.insuranceDeclaredAt),
    },
    today: today ? { acceptedToday: today.acceptedToday, cap: today.cap, reached: !today.ok } : null,
  }
}
