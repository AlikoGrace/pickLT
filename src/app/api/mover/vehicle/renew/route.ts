import { getTranslations } from '@/lib/i18n-server'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/appwrite-server'
import { getSessionUserId } from '@/lib/auth-session'
import { renewRental, VehicleRepoError, webAuditNote, withoutPhotoPlaceholders } from '@/lib/vehicle-repo'
import { profileVehicleFields, repoErrorResponse } from '@/lib/vehicle-route-utils'

/**
 * POST /api/mover/vehicle/renew — "Rent again" / "Extend" for the same rental
 * (plan wave-2026-10/1 R5). Body: `{ vehicleId, rental: { startAt?, endAt | hours,
 * provider? }, frontPlatePhoto?, rearPlatePhoto?, fullVehiclePhoto?, note? }`.
 * Returns `{ ok, autoVerified, vehicle, profile }`; `autoVerified: false` means
 * the renewal went back to review. Failures carry `fnCode`.
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
    const { vehicle, profile, autoVerified } = await renewRental(databases, {
      userId,
      vehicleId: typeof body.vehicleId === 'string' ? body.vehicleId : '',
      rental: body.rental ?? null,
      frontPlatePhoto: body.frontPlatePhoto ?? null,
      rearPlatePhoto: body.rearPlatePhoto ?? null,
      fullVehiclePhoto: body.fullVehiclePhoto ?? null,
      note: webAuditNote(body.note, req.headers.get('user-agent')),
    })
    return NextResponse.json({
      ok: true,
      autoVerified,
      vehicle: withoutPhotoPlaceholders(vehicle),
      profile: profileVehicleFields(profile),
    })
  } catch (err) {
    if (err instanceof VehicleRepoError) return repoErrorResponse(err, t)
    console.error('POST /api/mover/vehicle/renew error:', err)
    return NextResponse.json({ error: t('errors:generic.internal') }, { status: 500 })
  }
}
