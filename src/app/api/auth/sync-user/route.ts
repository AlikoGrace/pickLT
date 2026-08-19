import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, withRetry } from '@/lib/appwrite-server'
import { getSessionUserId } from '@/lib/auth-session'
import { APPWRITE } from '@/lib/constants'
import { userDocPermissions } from '@/lib/doc-permissions'
import { Query } from 'node-appwrite'

/**
 * POST /api/auth/sync-user
 *
 * Syncs an Appwrite-authenticated user to the Appwrite users collection.
 * - If user exists (by authId stored as $id) → update
 * - If user doesn't exist → create
 * - Also returns mover_profiles + crew_members if user is a mover
 *
 * Identity and the verification flags come from the session and the Appwrite
 * Auth record, never from the request body: the body is attacker-controlled and
 * this route writes with the admin key. `userType` is the one caller-supplied
 * field, and it is honoured only when creating the document.
 */
export async function POST(req: NextRequest) {
  try {
    const authId = await getSessionUserId()
    if (!authId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const { profilePhoto, userType: requestedUserType } = body

    const { databases, users } = createAdminClient()

    // Authoritative identity — read from Appwrite Auth rather than the body so
    // a caller cannot self-assert a verified email/phone or overwrite these
    // fields with values that were never verified.
    const authUser = await withRetry(() => users.get(authId))
    const email = authUser.email || ''
    const fullName = authUser.name || ''
    const phone = authUser.phone || ''
    const emailVerified = authUser.emailVerification ?? false
    const phoneVerified = authUser.phoneVerification ?? false

    // eslint-disable-next-line
    let userDoc: any
    let isNew = false

    // Try to find existing user by authId (stored as document $id)
    try {
      userDoc = await withRetry(() =>
        databases.getDocument(
          APPWRITE.DATABASE_ID,
          APPWRITE.COLLECTIONS.USERS,
          authId
        )
      )
    } catch {
      // Document not found — create new
      isNew = true
    }

    if (isNew || !userDoc) {
      // Create new user document with authId as $id
      isNew = true
      userDoc = await withRetry(() =>
        databases.createDocument(
          APPWRITE.DATABASE_ID,
          APPWRITE.COLLECTIONS.USERS,
          authId,
          {
            email: email || '',
            fullName: fullName || (email ? email.split('@')[0] : 'User'),
            phone: phone || null,
            profilePhoto: profilePhoto || null,
            userType: requestedUserType === 'mover' ? 'mover' : 'client',
            emailVerified: emailVerified ?? false,
            phoneVerified: phoneVerified ?? false,
          },
          // The document id IS the auth account id, so the owner grant is the
          // same id. Matches what functions/syncuser and functions/googleauth
          // already write.
          userDocPermissions(authId)
        )
      )
    } else {
      // Update existing user with latest auth data
      userDoc = await withRetry(() =>
        databases.updateDocument(
          APPWRITE.DATABASE_ID,
          APPWRITE.COLLECTIONS.USERS,
          authId,
          {
            email,
            fullName: fullName || userDoc.fullName,
            phone: phone || userDoc.phone,
            profilePhoto: profilePhoto || userDoc.profilePhoto,
            emailVerified,
            phoneVerified,
          }
        )
      )
    }

    // If user is a mover, fetch their profile and crew
    let moverProfile = null
    let crewMembers: unknown[] = []

    if (userDoc.userType === 'mover') {
      // Fetch mover profile via relationship
      try {
        const profiles = await databases.listDocuments(
          APPWRITE.DATABASE_ID,
          APPWRITE.COLLECTIONS.MOVER_PROFILES,
          [Query.equal('userId', authId)]
        )
        if (profiles.documents.length > 0) {
          moverProfile = profiles.documents[0]

          // Fetch crew members
          const crew = await databases.listDocuments(
            APPWRITE.DATABASE_ID,
            APPWRITE.COLLECTIONS.CREW_MEMBERS,
            [Query.equal('moverProfileId', moverProfile.$id)]
          )
          crewMembers = crew.documents
        }
      } catch (err) {
        console.error('Failed to fetch mover profile:', err)
      }
    }

    return NextResponse.json({
      user: userDoc,
      moverProfile,
      crewMembers,
      isNew,
    })
  } catch (err) {
    console.error('sync-user error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
