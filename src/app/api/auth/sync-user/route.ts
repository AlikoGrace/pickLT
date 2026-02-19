import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/appwrite-server'
import { APPWRITE } from '@/lib/constants'
import { Query } from 'node-appwrite'

/**
 * POST /api/auth/sync-user
 *
 * Syncs a Clerk-authenticated user to the Appwrite users collection.
 * - If user exists (by clerkId stored as $id) → update
 * - If user doesn't exist → create
 * - Also returns mover_profiles + crew_members if user is a mover
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      clerkId,
      email,
      fullName,
      phone,
      profilePhoto,
      emailVerified,
      phoneVerified,
    } = body

    if (!clerkId || !email) {
      return NextResponse.json({ error: 'Missing clerkId or email' }, { status: 400 })
    }

    const { databases } = createAdminClient()

    // eslint-disable-next-line
    let userDoc: any
    let isNew = false

    // Try to find existing user by clerkId (stored as document $id)
    try {
      userDoc = await databases.getDocument(
        APPWRITE.DATABASE_ID,
        APPWRITE.COLLECTIONS.USERS,
        clerkId
      )
    } catch {
      // Document not found — create new
      isNew = true
    }

    if (isNew || !userDoc) {
      // Create new user document with clerkId as $id
      isNew = true
      userDoc = await databases.createDocument(
        APPWRITE.DATABASE_ID,
        APPWRITE.COLLECTIONS.USERS,
        clerkId,
        {
          email,
          fullName: fullName || email.split('@')[0],
          phone: phone || null,
          profilePhoto: profilePhoto || null,
          userType: 'client',
          emailVerified: emailVerified ?? false,
          phoneVerified: phoneVerified ?? false,
        }
      )
    } else {
      // Update existing user with latest Clerk data
      userDoc = await databases.updateDocument(
        APPWRITE.DATABASE_ID,
        APPWRITE.COLLECTIONS.USERS,
        clerkId,
        {
          email,
          fullName: fullName || userDoc.fullName,
          phone: phone || userDoc.phone,
          profilePhoto: profilePhoto || userDoc.profilePhoto,
          emailVerified: emailVerified ?? userDoc.emailVerified,
          phoneVerified: phoneVerified ?? userDoc.phoneVerified,
        }
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
          [Query.equal('userId', clerkId)]
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
