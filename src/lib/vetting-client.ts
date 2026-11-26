'use client'

import { compressImage } from '@/utils/compressImage'
import { t } from '@/lib/i18n-runtime'
import type { VettingView } from '@/lib/mover-vetting-view'
import { DEFAULT_UNCERTIFIED_DAILY_MOVE_CAP, type ResidenceDocType } from '@/lib/vetting'

/**
 * Browser-side calls behind the driver-vetting screens (plan legal/7). Errors
 * carry the server's translated `error` and, when present, the wire `fnCode`.
 */

export class VettingApiError extends Error {
  constructor(
    message: string,
    public readonly fnCode?: string,
    public readonly status?: number,
  ) {
    super(message)
    this.name = 'VettingApiError'
  }
}

async function readError(res: Response, fallback: string): Promise<VettingApiError> {
  const data = await res.json().catch(() => ({}))
  return new VettingApiError(data.error || fallback, data.fnCode, res.status)
}

export async function fetchVettingView(): Promise<VettingView> {
  const res = await fetch('/api/mover/vetting', { cache: 'no-store' })
  if (!res.ok) throw await readError(res, t('web:mover.vetting.loadFailed.error'))
  return res.json()
}

/**
 * The daily limit stated on the registration form. Falls back to the default
 * when the call fails, so the notice always names a number.
 */
export async function fetchDailyCap(): Promise<number> {
  try {
    const view = await fetchVettingView()
    return typeof view.cap === 'number' ? view.cap : DEFAULT_UNCERTIFIED_DAILY_MOVE_CAP
  } catch {
    return DEFAULT_UNCERTIFIED_DAILY_MOVE_CAP
  }
}

/**
 * Uploads one identity-document or certificate photograph. Both purposes are
 * stored readable by the uploader only; the review team reads them through
 * the admin app.
 */
export async function uploadVettingPhoto(file: File, purpose: 'residence' | 'certificate'): Promise<string> {
  const compressed = await compressImage(file)
  const formData = new FormData()
  formData.append('file', compressed)
  formData.append('bucket', 'PROFILE_PHOTOS')
  formData.append('purpose', purpose)
  const res = await fetch('/api/user/upload-photo', { method: 'POST', body: formData })
  if (!res.ok) throw await readError(res, t('web:mover.vetting.uploadFailed.error'))
  const data = await res.json()
  return data.photoUrl as string
}

/** The vetting sections of the `submit-profile` body. Send only the sections being changed. */
export interface VettingPayload {
  residenceDocType?: ResidenceDocType
  residenceDocFront?: string
  residenceDocBack?: string
  /** `YYYY-MM-DD`. */
  residenceDocExpiresAt?: string
  hasMovingCertificate?: boolean
  movingCertificatePhoto?: string
  hasBusinessInsurance?: boolean
}

/** A registered driver submits or replaces a section; the verification status is left alone. */
export async function submitVetting(payload: VettingPayload): Promise<void> {
  const res = await fetch('/api/mover/submit-profile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'vetting', ...payload }),
  })
  if (!res.ok) throw await readError(res, t('web:mover.vetting.submitFailed.error'))
}
