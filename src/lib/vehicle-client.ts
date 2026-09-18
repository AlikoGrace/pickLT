'use client'

import { compressImage } from '@/utils/compressImage'
import { t } from '@/lib/i18n-runtime'
import type { VehicleDoc, VehicleEventDoc } from '@/lib/types'

/**
 * Browser-side calls behind the vehicle screens. Errors carry the server's
 * translated `error` and, when present, the wire `fnCode` (→ `errors:<fnCode>`).
 */

export class VehicleApiError extends Error {
  constructor(
    message: string,
    public readonly fnCode?: string,
    public readonly status?: number,
  ) {
    super(message)
    this.name = 'VehicleApiError'
  }
}

async function readError(res: Response, fallback: string): Promise<VehicleApiError> {
  const data = await res.json().catch(() => ({}))
  return new VehicleApiError(data.error || fallback, data.fnCode, res.status)
}

export interface ProfileVehicleFields {
  profileId: string
  verificationStatus: string | null
  vehicleOwnership: 'owned' | 'rented'
  vehicleStatus: 'none' | 'pending_review' | 'verified' | 'rejected'
  currentVehicleId: string | null
  vehicleConfirmedAt: string | null
  vehicleConfirmedServiceDate: string | null
  vehicleReconfirmRequired: boolean
}

export interface VehicleOverview {
  profile: ProfileVehicleFields
  vehicle: VehicleDoc | null
  history: VehicleEventDoc[]
}

export async function fetchVehicleOverview(): Promise<VehicleOverview> {
  const res = await fetch('/api/mover/vehicle', { cache: 'no-store' })
  if (!res.ok) throw await readError(res, t('web:mover.vehicle.loadFailed.error'))
  return res.json()
}

/** Uploads one evidence photo (`purpose='vehicle'`, owner-read-only) and returns its view URL. */
export async function uploadVehiclePhoto(file: File): Promise<string> {
  const compressed = await compressImage(file)
  const formData = new FormData()
  formData.append('file', compressed)
  formData.append('bucket', 'PROFILE_PHOTOS')
  formData.append('purpose', 'vehicle')
  const res = await fetch('/api/user/upload-photo', { method: 'POST', body: formData })
  if (!res.ok) throw await readError(res, t('web:mover.vehicle.uploadFailed.error'))
  const data = await res.json()
  return data.photoUrl as string
}

export interface SubmitVehiclePayload {
  ownership: 'owned' | 'rented'
  registrationNumber: string
  brand: string
  model: string
  year?: string
  vehicleType: string
  capacityM3?: string | number | null
  frontPlatePhoto: string
  rearPlatePhoto: string
  fullVehiclePhoto: string
  source: 'registration' | 'settings' | 'login' | 'post_move'
  vehicleId?: string | null
}

export async function submitVehicle(payload: SubmitVehiclePayload): Promise<{ vehicle: VehicleDoc; profile: ProfileVehicleFields }> {
  const res = await fetch('/api/mover/vehicle', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw await readError(res, t('web:mover.vehicle.submitFailed.error'))
  return res.json()
}

export async function confirmVehicleSame(source: 'login' | 'post_move', moveId?: string | null): Promise<void> {
  const res = await fetch('/api/mover/vehicle/confirm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ source, moveId: moveId ?? null }),
  })
  if (!res.ok) throw await readError(res, t('web:mover.vehicle.confirmFailed.error'))
}
