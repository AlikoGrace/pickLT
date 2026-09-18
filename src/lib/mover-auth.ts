import { createAdminClient } from '@/lib/appwrite-server'
import { APPWRITE, PLATFORM_TZ } from '@/lib/constants'
import { vehicleServiceReady } from '@/lib/vehicle-service'
import { getSessionUserId } from '@/lib/auth-session'
import { Query } from 'node-appwrite'
import { NextResponse } from 'next/server'
import { getTranslations } from '@/lib/i18n-server'
import type { Models } from 'node-appwrite'

interface VerifiedMoverResult {
  userId: string
  moverProfile: Models.Document
}

/**
 * Require that the current session belongs to a verified mover.
 * Returns the userId and moverProfile document if verified.
 * Returns a NextResponse error if not authenticated, no profile, or not verified.
 */
export async function requireVerifiedMover(): Promise<
  VerifiedMoverResult | NextResponse
> {
  const { t } = await getTranslations()
  const userId = await getSessionUserId()
  if (!userId) {
    return NextResponse.json({ error: t('errors:auth.unauthorized') }, { status: 401 })
  }

  const { databases } = createAdminClient()

  const profiles = await databases.listDocuments(
    APPWRITE.DATABASE_ID,
    APPWRITE.COLLECTIONS.MOVER_PROFILES,
    [Query.equal('userId', [userId]), Query.limit(1)]
  )
  const moverProfile = profiles.documents[0]
  if (!moverProfile) {
    return NextResponse.json({ error: t('errors:mover.profileNotFound') }, { status: 404 })
  }

  if (moverProfile.verificationStatus !== 'verified') {
    return NextResponse.json(
      { error: t('errors:mover.notVerifiedPendingApproval') },
      { status: 403 }
    )
  }

  return { userId, moverProfile }
}

/**
 * `requireVerifiedMover` plus the vehicle readiness term (master D3/D4): a
 * verified current vehicle, and for rental drivers today's SAME confirmation
 * with no post-move re-confirmation outstanding. Used by the routes that hand
 * out *new* work (accept-move, accept-scheduled-move); a mover mid-move keeps
 * the routes that finish it. The response carries `fnCode` so the driver app
 * can map it to `errors:mover.vehicleNotReady` in its own locale.
 */
export async function requireServiceReadyMover(): Promise<
  VerifiedMoverResult | NextResponse
> {
  const result = await requireVerifiedMover()
  if (isErrorResponse(result)) return result
  if (!vehicleServiceReady(result.moverProfile as Record<string, unknown>, Date.now(), PLATFORM_TZ)) {
    const { t } = await getTranslations()
    return NextResponse.json(
      { error: t('errors:mover.vehicleNotReady'), fnCode: 'mover.vehicleNotReady' },
      { status: 403 }
    )
  }
  return result
}

/** Type guard to check if the result is an error response */
export function isErrorResponse(
  result: VerifiedMoverResult | NextResponse
): result is NextResponse {
  return result instanceof NextResponse
}
