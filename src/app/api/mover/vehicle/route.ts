import { getTranslations, type ServerTranslation } from '@/lib/i18n-server'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/appwrite-server'
import { getSessionUserId } from '@/lib/auth-session'
import {
  getCurrentVehicle,
  getMoverProfileByUserId,
  getVehicleHistory,
  submitVehicle,
  vehicleErrorMessage,
  VehicleRepoError,
  webAuditNote,
  withoutPhotoPlaceholders,
} from '@/lib/vehicle-repo'

/**
 * `/api/mover/vehicle` — the web port of the `submitvehicle` cloud function
 * (master §6.1) plus the read the vehicle pages need.
 *
 * POST body: `{ ownership, registrationNumber, brand, model, year?, vehicleType,
 * capacityM3?, frontPlatePhoto, rearPlatePhoto, fullVehiclePhoto, source, vehicleId? }`.
 * Photo values are the view URLs returned by `/api/user/upload-photo`
 * (`purpose='vehicle'`). Failures carry `fnCode` (→ `errors:<fnCode>`) next to
 * the translated `error`, the existing convention.
 *
 * GET: `{ profile, vehicle, history }` — the profile's vehicle fields, the
 * current `vehicles` row (or null) and the newest-first audit trail.
 */

/** The profile fields the driver surfaces read; nothing KYC-grade leaves here. */
function profileVehicleFields(profile: Record<string, unknown>) {
  return {
    profileId: profile.$id,
    verificationStatus: profile.verificationStatus ?? null,
    vehicleOwnership: profile.vehicleOwnership ?? 'owned',
    vehicleStatus: profile.vehicleStatus ?? 'none',
    currentVehicleId: profile.currentVehicleId ?? null,
    vehicleConfirmedAt: profile.vehicleConfirmedAt ?? null,
    vehicleConfirmedServiceDate: profile.vehicleConfirmedServiceDate ?? null,
    vehicleReconfirmRequired: profile.vehicleReconfirmRequired === true,
  }
}

function repoErrorResponse(err: VehicleRepoError, t: ServerTranslation['t']) {
  return NextResponse.json(
    { error: vehicleErrorMessage(t, err.fnCode), fnCode: err.fnCode, ...(err.codes ? { codes: err.codes } : {}) },
    { status: err.status }
  )
}

export async function POST(req: NextRequest) {
  const { t } = await getTranslations()
  try {
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: t('errors:auth.unauthorized') }, { status: 401 })
    }
    const body = await req.json().catch(() => ({}))
    const { databases } = createAdminClient()

    const { vehicle, profile } = await submitVehicle(databases, {
      userId,
      body: { ...body, note: webAuditNote(body?.note, req.headers.get('user-agent')) },
    })
    return NextResponse.json({ ok: true, vehicle, profile: profileVehicleFields(profile) })
  } catch (err) {
    if (err instanceof VehicleRepoError) return repoErrorResponse(err, t)
    console.error('POST /api/mover/vehicle error:', err)
    return NextResponse.json({ error: t('errors:generic.internal') }, { status: 500 })
  }
}

export async function GET() {
  const { t } = await getTranslations()
  try {
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: t('errors:auth.unauthorized') }, { status: 401 })
    }
    const { databases } = createAdminClient()
    const profile = await getMoverProfileByUserId(databases, userId)
    if (!profile) {
      return NextResponse.json({ error: t('errors:mover.profileNotFound') }, { status: 404 })
    }
    const [vehicle, history] = await Promise.all([
      getCurrentVehicle(databases, profile.$id),
      getVehicleHistory(databases, profile.$id),
    ])
    return NextResponse.json({ profile: profileVehicleFields(profile), vehicle: withoutPhotoPlaceholders(vehicle), history })
  } catch (err) {
    console.error('GET /api/mover/vehicle error:', err)
    return NextResponse.json({ error: t('errors:generic.internal') }, { status: 500 })
  }
}
