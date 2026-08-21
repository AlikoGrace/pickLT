import { getTranslations } from '@/lib/i18n-server'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/appwrite-server'
import { APPWRITE } from '@/lib/constants'
import { getSessionUserId } from '@/lib/auth-session'
import { crewPermissions } from '@/lib/doc-permissions'
import { ID, Query } from 'node-appwrite'

// GET - list crew members for the current mover
export async function GET() {
  const { t } = await getTranslations()
  const userId = await getSessionUserId()
  if (!userId) {
    return NextResponse.json({ error: t('errors:auth.unauthorized') }, { status: 401 })
  }

  try {
    const { databases } = createAdminClient()

    // Find mover profile
    const profiles = await databases.listDocuments(
      APPWRITE.DATABASE_ID,
      APPWRITE.COLLECTIONS.MOVER_PROFILES,
      [Query.equal('userId', userId), Query.limit(1)]
    )

    if (profiles.documents.length === 0) {
      return NextResponse.json({ crewMembers: [] })
    }

    const moverProfileId = profiles.documents[0].$id

    const crewDocs = await databases.listDocuments(
      APPWRITE.DATABASE_ID,
      APPWRITE.COLLECTIONS.CREW_MEMBERS,
      [Query.equal('moverProfileId', moverProfileId), Query.limit(50)]
    )

    return NextResponse.json({ crewMembers: crewDocs.documents })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : t('errors:generic.unknown')
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// POST - add a new crew member
export async function POST(req: NextRequest) {
  const { t } = await getTranslations()
  const userId = await getSessionUserId()
  if (!userId) {
    return NextResponse.json({ error: t('errors:auth.unauthorized') }, { status: 401 })
  }

  try {
    const { databases } = createAdminClient()
    const body = await req.json()
    const { name, phone, role } = body

    if (!name || !phone) {
      return NextResponse.json({ error: t('errors:crew.fieldsRequired') }, { status: 400 })
    }

    // Find mover profile
    const profiles = await databases.listDocuments(
      APPWRITE.DATABASE_ID,
      APPWRITE.COLLECTIONS.MOVER_PROFILES,
      [Query.equal('userId', userId), Query.limit(1)]
    )

    if (profiles.documents.length === 0) {
      return NextResponse.json({ error: t('errors:mover.profileNotFound') }, { status: 404 })
    }

    const moverProfileId = profiles.documents[0].$id

    const doc = await databases.createDocument(
      APPWRITE.DATABASE_ID,
      APPWRITE.COLLECTIONS.CREW_MEMBERS,
      ID.unique(),
      {
        moverProfileId,
        name,
        phone,
        role: role || 'helper',
        isActive: true,
      },
      // `userId` is the session's auth account id; `moverProfileId` is the
      // profile row's $id and is deliberately NOT used as a role here.
      // Mirrors pickltmover/lib/crew.ts:addCrew.
      crewPermissions(userId)
    )

    return NextResponse.json({ crewMember: doc })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : t('errors:generic.unknown')
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
