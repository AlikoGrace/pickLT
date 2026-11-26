import { createAdminClient } from '@/lib/appwrite-server'
import { APPWRITE, PLATFORM_TZ } from '@/lib/constants'
import { vehicleServiceReady } from '@/lib/vehicle-service'
import { FEES_RESTRICTED, feeRestricted, residenceBlock } from '@/lib/mover-gates'
import { dailyCapCheck, loadVettingConfig } from '@/lib/mover-vetting'
import type { VettingConfig } from '@/lib/vetting'
import { getSessionUserId } from '@/lib/auth-session'
import { Query } from 'node-appwrite'
import { NextResponse } from 'next/server'
import { getTranslations } from '@/lib/i18n-server'
import type { Models } from 'node-appwrite'

interface VerifiedMoverResult {
  userId: string
  moverProfile: Models.Document
  /** Set by `requireServiceReadyMover`: the cap and gate date it read (plan legal/7). */
  vettingConfig?: VettingConfig
}

/**
 * The session's own mover profile, whatever its verification status — for the
 * driver's fee balance, which a suspended or unverified driver must still be
 * able to read and pay (plan `fees/0.master.md` §6).
 */
export async function requireMoverProfile(): Promise<VerifiedMoverResult | NextResponse> {
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
  return { userId, moverProfile }
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
 *
 * Also the fee-balance gate (plan `fees/0.master.md` §5): a `restricted`
 * driver cannot accept → 403 `fees.restricted`.
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
  if (feeRestricted(result.moverProfile)) {
    return feeRestrictedResponse()
  }
  // Residence gate (plan legal/7, V1): no verified residence document, no new
  // work once the gate date has passed.
  const { databases } = createAdminClient()
  const vettingConfig = await loadVettingConfig(databases)
  const residence = residenceBlock(result.moverProfile, Date.now(), vettingConfig.residenceGateFromMs)
  if (residence) return vettingRefusalResponse(residence)
  return { ...result, vettingConfig }
}

/** A vetting refusal with the same `fnCode` the functions return. */
export async function vettingRefusalResponse(
  fnCode: 'mover.residenceNotVerified' | 'mover.residenceExpired' | 'mover.dailyCapReached',
): Promise<NextResponse> {
  const { t } = await getTranslations()
  return NextResponse.json({ error: t(`errors:${fnCode}`), fnCode }, { status: 403 })
}

/**
 * The daily cap for a driver without a verified certificate (plan legal/7,
 * V2), checked by every route that takes a job. `null` when the driver may
 * accept; otherwise the refusal. `excludeMoveId` is the move being accepted,
 * so a repeated tap on the same move is not counted against itself.
 */
export async function dailyCapRefusal(
  moverProfile: Models.Document,
  vettingConfig: VettingConfig | undefined,
  excludeMoveId: string | null,
): Promise<NextResponse | null> {
  const { databases } = createAdminClient()
  const config = vettingConfig ?? (await loadVettingConfig(databases))
  const check = await dailyCapCheck(databases, moverProfile, config, Date.now(), PLATFORM_TZ, excludeMoveId)
  return check.ok ? null : vettingRefusalResponse('mover.dailyCapReached')
}

/** The fee-balance refusal every work-handing route returns (`errors:fees.restricted`). */
export async function feeRestrictedResponse(): Promise<NextResponse> {
  const { t } = await getTranslations()
  return NextResponse.json({ error: t('errors:fees.restricted'), fnCode: FEES_RESTRICTED }, { status: 403 })
}

/** Type guard to check if the result is an error response */
export function isErrorResponse(
  result: VerifiedMoverResult | NextResponse
): result is NextResponse {
  return result instanceof NextResponse
}
