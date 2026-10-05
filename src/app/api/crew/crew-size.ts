/**
 * `mover_profiles.crewSize` source of truth (crew master §4): the profile owner
 * (the driver) plus every ACTIVE helper in `crew_members`. Recomputed after
 * every crew add / edit / remove so matching (`broadcastmoverequest`'s
 * required-crew gate) and the client's mover list read one number on both
 * platforms. Mirrors `pickltmover/lib/crew.ts` (`computeCrewSize`,
 * `syncCrewSize`) — keep the two in step.
 */
import { Query } from 'node-appwrite'

import { APPWRITE } from '@/lib/constants'

/** Schema bounds: integer, min 1, max 10. */
export const CREW_SIZE_MIN = 1
export const CREW_SIZE_MAX = 10

interface CrewRow {
  role?: unknown
  isActive?: unknown
}

/** `role: 'driver'` rows are alternate drivers, not extra hands; `isActive: false` rows are benched. */
export function computeCrewSize(members: ReadonlyArray<CrewRow>): number {
  const helpers = members.filter((m) => m.role !== 'driver' && m.isActive !== false).length
  return Math.min(CREW_SIZE_MAX, Math.max(CREW_SIZE_MIN, 1 + helpers))
}

/**
 * The crew size to SHOW for a profile row: the stored `crewSize`, or — only on
 * rows that predate the sync — `1 + crew_members.length` when the relationship
 * is hydrated. Null when neither is known.
 */
export function profileCrewSize(row: object): number | null {
  const profile = row as { crewSize?: unknown; crew_members?: unknown }
  const stored = profile.crewSize
  if (typeof stored === 'number' && Number.isFinite(stored) && stored >= CREW_SIZE_MIN) {
    return Math.round(stored)
  }
  if (Array.isArray(profile.crew_members)) return computeCrewSize(profile.crew_members as CrewRow[])
  return null
}

/** The slice of the admin `Databases` client this module needs. */
export interface CrewSizeDb {
  listDocuments(db: string, col: string, queries?: string[]): Promise<{ documents: unknown[] }>
  getDocument(db: string, col: string, id: string): Promise<unknown>
  updateDocument(db: string, col: string, id: string, data: Record<string, unknown>): Promise<unknown>
}

/**
 * Recompute and write `crewSize` when it changed. Best-effort: the crew change
 * already succeeded, and the next crew change re-syncs, so a failure is logged
 * rather than failing the request.
 */
export async function syncCrewSize(databases: CrewSizeDb, moverProfileId: string): Promise<number | null> {
  try {
    const crew = await databases.listDocuments(
      APPWRITE.DATABASE_ID,
      APPWRITE.COLLECTIONS.CREW_MEMBERS,
      [Query.equal('moverProfileId', moverProfileId), Query.limit(100)]
    )
    const next = computeCrewSize(crew.documents as CrewRow[])
    const profile = (await databases.getDocument(
      APPWRITE.DATABASE_ID,
      APPWRITE.COLLECTIONS.MOVER_PROFILES,
      moverProfileId
    )) as { crewSize?: unknown }
    if (profile.crewSize !== next) {
      await databases.updateDocument(
        APPWRITE.DATABASE_ID,
        APPWRITE.COLLECTIONS.MOVER_PROFILES,
        moverProfileId,
        { crewSize: next }
      )
    }
    return next
  } catch (err) {
    console.warn('[crew] crewSize sync failed', err)
    return null
  }
}
