import { getTranslations } from '@/lib/i18n-server'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/appwrite-server'
import { getSessionUserId } from '@/lib/auth-session'
import {
  getCurrentVehicle,
  getFleet,
  getLastExpiredRental,
  getMoverProfileByUserId,
  getVehicleHistory,
  getVehiclesByIds,
  submitVehicle,
  VehicleRepoError,
  webAuditNote,
  withoutPhotoPlaceholders,
} from '@/lib/vehicle-repo'
import { profileVehicleFields, repoErrorResponse } from '@/lib/vehicle-route-utils'

/**
 * `/api/mover/vehicle` — the web port of the `submitvehicle` cloud function
 * (master §6.1) plus the read the vehicle pages need.
 *
 * POST body: `{ ownership, registrationNumber, brand, model, year?, vehicleType,
 * capacityM3?, frontPlatePhoto, rearPlatePhoto, fullVehiclePhoto, source, vehicleId?,
 * rental?: { startAt?, endAt | hours, provider? } }` — `rental` is required for a
 * rented vehicle (plan wave-2026-10/1 R1; 400 `vehicle.rentalWindow*`).
 * Photo values are the view URLs returned by `/api/user/upload-photo`
 * (`purpose='vehicle'`). Failures carry `fnCode` (→ `errors:<fnCode>`) next to
 * the translated `error`, the existing convention.
 *
 * GET: `{ profile, vehicle, fleet, history, expiredRental, historyVehicles }` —
 * the profile's vehicle fields (incl. the rental window of the vehicle in
 * service and the owned fallback), the current `vehicles` row (or null), the
 * fleet (owned + rental rows, R3), the newest-first audit trail, the rental the
 * cron retired last when nothing is current (R4 — the profile is cleared then,
 * so the client needs the row to read the state as RENTAL_EXPIRED), and the
 * rows the history names (retired included) as `{ [id]: { brand, model,
 * registrationNumber } }`.
 */

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
    const [vehicle, fleet, history] = await Promise.all([
      getCurrentVehicle(databases, profile.$id),
      getFleet(databases, profile.$id),
      getVehicleHistory(databases, profile.$id),
    ])
    // Both refine the view only; a failure degrades to the profile-only state / bare labels.
    const [expiredRental, named] = await Promise.all([
      vehicle ? null : getLastExpiredRental(databases, profile.$id).catch(() => null),
      getVehiclesByIds(databases, profile.$id, history.map((e) => e.vehicleId)).catch(() => []),
    ])
    const historyVehicles = Object.fromEntries(
      named.map((v) => [v.$id, { brand: v.brand ?? null, model: v.model ?? null, registrationNumber: v.registrationNumber ?? null }]),
    )
    return NextResponse.json({
      profile: profileVehicleFields(profile),
      vehicle: withoutPhotoPlaceholders(vehicle),
      fleet: fleet.map((v) => withoutPhotoPlaceholders(v)),
      history,
      expiredRental: withoutPhotoPlaceholders(expiredRental),
      historyVehicles,
    })
  } catch (err) {
    console.error('GET /api/mover/vehicle error:', err)
    return NextResponse.json({ error: t('errors:generic.internal') }, { status: 500 })
  }
}
