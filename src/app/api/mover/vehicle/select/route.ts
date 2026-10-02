import { getTranslations } from '@/lib/i18n-server'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/appwrite-server'
import { getSessionUserId } from '@/lib/auth-session'
import { selectVehicle, VehicleRepoError, webAuditNote, withoutPhotoPlaceholders } from '@/lib/vehicle-repo'
import { profileVehicleFields, repoErrorResponse } from '@/lib/vehicle-route-utils'

/**
 * POST /api/mover/vehicle/select — the "Vehicle in service" control (plan
 * wave-2026-10/1 R6): puts one of the mover's verified vehicles in service.
 * Body: `{ vehicleId, note? }`. 403 `vehicle.notOwnVehicle`, 409
 * `vehicle.notVerified` / `vehicle.notInWindow`. Returns `{ ok, vehicle, profile }`.
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
    const { vehicle, profile } = await selectVehicle(databases, {
      userId,
      vehicleId: typeof body.vehicleId === 'string' ? body.vehicleId : '',
      note: webAuditNote(body.note, req.headers.get('user-agent')),
    })
    return NextResponse.json({ ok: true, vehicle: withoutPhotoPlaceholders(vehicle), profile: profileVehicleFields(profile) })
  } catch (err) {
    if (err instanceof VehicleRepoError) return repoErrorResponse(err, t)
    console.error('POST /api/mover/vehicle/select error:', err)
    return NextResponse.json({ error: t('errors:generic.internal') }, { status: 500 })
  }
}
