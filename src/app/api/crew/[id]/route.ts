import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/appwrite-server'
import { APPWRITE } from '@/lib/constants'
import { getSessionUserId } from '@/lib/auth-session'
import { relId } from '@/lib/notify'
import { Query } from 'node-appwrite'

/**
 * Confirm the crew row belongs to the caller's own mover profile.
 *
 * These handlers write with the admin key, so a session check alone is not
 * authorisation — without this, any logged-in account could edit or delete
 * another mover's crew by id. Crew ids are disclosed to clients through the
 * move detail endpoints, so they are not secret.
 */
async function assertOwnsCrew(id: string, userId: string): Promise<string | null> {
  const { databases } = createAdminClient()

  const profiles = await databases.listDocuments(
    APPWRITE.DATABASE_ID,
    APPWRITE.COLLECTIONS.MOVER_PROFILES,
    [Query.equal('userId', [userId])]
  )
  const moverProfile = profiles.documents[0]
  if (!moverProfile) return 'Mover profile not found'

  let crew
  try {
    crew = await databases.getDocument(
      APPWRITE.DATABASE_ID,
      APPWRITE.COLLECTIONS.CREW_MEMBERS,
      id
    )
  } catch {
    return 'Crew member not found'
  }

  if (relId(crew.moverProfileId) !== moverProfile.$id) {
    return 'Crew member not found'
  }

  return null
}

// PATCH - update a crew member
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getSessionUserId()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { databases } = createAdminClient()
    const { id } = await params

    const denied = await assertOwnsCrew(id, userId)
    if (denied) return NextResponse.json({ error: denied }, { status: 404 })

    const body = await req.json()
    const { name, phone, role, isActive } = body

    const updates: Record<string, unknown> = {}
    if (name !== undefined) updates.name = name
    if (phone !== undefined) updates.phone = phone
    if (role !== undefined) updates.role = role
    if (isActive !== undefined) updates.isActive = isActive

    const doc = await databases.updateDocument(
      APPWRITE.DATABASE_ID,
      APPWRITE.COLLECTIONS.CREW_MEMBERS,
      id,
      updates
    )

    return NextResponse.json({ crewMember: doc })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// DELETE - remove a crew member
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getSessionUserId()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { databases } = createAdminClient()
    const { id } = await params

    const denied = await assertOwnsCrew(id, userId)
    if (denied) return NextResponse.json({ error: denied }, { status: 404 })

    await databases.deleteDocument(
      APPWRITE.DATABASE_ID,
      APPWRITE.COLLECTIONS.CREW_MEMBERS,
      id
    )

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
