import { getTranslations } from '@/lib/i18n-server'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/appwrite-server'
import { getSessionUserId } from '@/lib/auth-session'
import { confirmVehicleSame, vehicleErrorMessage, VehicleRepoError, webAuditNote } from '@/lib/vehicle-repo'

/**
 * POST /api/mover/vehicle/confirm — the web port of `confirmvehicle`
 * (master §6.2): a rental driver's SAME confirmation for today's service day
 * (or after a completed move). Body: `{ source: 'login'|'post_move', moveId?, note? }`.
 * Returns `{ ok, serviceDate, profile }`; failures carry `fnCode`.
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

    const { serviceDate, profile } = await confirmVehicleSame(databases, {
      userId,
      source: typeof body.source === 'string' ? body.source : 'login',
      moveId: typeof body.moveId === 'string' ? body.moveId : null,
      note: webAuditNote(body.note, req.headers.get('user-agent')),
    })
    return NextResponse.json({
      ok: true,
      serviceDate,
      profile: {
        vehicleOwnership: profile.vehicleOwnership ?? 'owned',
        vehicleStatus: profile.vehicleStatus ?? 'none',
        currentVehicleId: profile.currentVehicleId ?? null,
        vehicleConfirmedAt: profile.vehicleConfirmedAt ?? null,
        vehicleConfirmedServiceDate: profile.vehicleConfirmedServiceDate ?? null,
        vehicleReconfirmRequired: profile.vehicleReconfirmRequired === true,
      },
    })
  } catch (err) {
    if (err instanceof VehicleRepoError) {
      return NextResponse.json(
        { error: vehicleErrorMessage(t, err.fnCode), fnCode: err.fnCode },
        { status: err.status }
      )
    }
    console.error('POST /api/mover/vehicle/confirm error:', err)
    return NextResponse.json({ error: t('errors:generic.internal') }, { status: 500 })
  }
}
