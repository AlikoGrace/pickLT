import { createAdminClient } from '@/lib/appwrite-server'
import { APPWRITE } from '@/lib/constants'
import { relId } from '@/lib/notify'

/** Appwrite rows are schemaless at the SDK boundary. */
type AnyDoc = Record<string, any>

export type MoveAccess = {
  move: AnyDoc
  isClient: boolean
  isAssignedMover: boolean
}

/**
 * Resolve whether `userId` is a party to `moveId`.
 *
 * Returns null when the move does not exist or the caller is neither the
 * client nor the assigned mover. Callers should treat null as 403/404 without
 * distinguishing the two, so move ids cannot be probed for existence.
 *
 * Relationship attributes come back as either a bare id or a hydrated
 * document, hence relId() on both sides.
 */
export async function getMoveAccess(
  moveId: string,
  userId: string
): Promise<MoveAccess | null> {
  const { databases } = createAdminClient()

  let move: AnyDoc
  try {
    move = await databases.getDocument(
      APPWRITE.DATABASE_ID,
      APPWRITE.COLLECTIONS.MOVES,
      moveId
    )
  } catch {
    return null
  }

  const isClient = relId(move.clientId) === userId

  let isAssignedMover = false
  const moverProfileId = relId(move.moverProfileId)
  if (moverProfileId) {
    try {
      const profile = await databases.getDocument(
        APPWRITE.DATABASE_ID,
        APPWRITE.COLLECTIONS.MOVER_PROFILES,
        moverProfileId
      )
      isAssignedMover = relId(profile.userId) === userId
    } catch {
      // Profile deleted — the caller is not the assigned mover.
    }
  }

  if (!isClient && !isAssignedMover) return null

  return { move, isClient, isAssignedMover }
}
