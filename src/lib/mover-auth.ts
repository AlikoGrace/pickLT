import { createAdminClient } from '@/lib/appwrite-server'
import { APPWRITE } from '@/lib/constants'
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

/** Type guard to check if the result is an error response */
export function isErrorResponse(
  result: VerifiedMoverResult | NextResponse
): result is NextResponse {
  return result instanceof NextResponse
}
