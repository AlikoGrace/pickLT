/**
 * Who may see a move's photos? (plan legal/4.private-photos, decision 2)
 *
 * Web port of `functions/getphotourls/src/access.js`. Same rule, same table of
 * tests; edit the two together. Pure: the route reads the rows and asks here.
 *
 * Allowed: the client of the move; the mover assigned to it; a mover holding
 * an offer while nobody else has taken it; for a scheduled move in the open
 * pool, a verified mover in the move's country whose fee standing allows work.
 */
import { feeRestricted, moverMatchesCountry } from './mover-gates'
import { toFileId } from './move-photo-url'
import { relId } from './notify'

type AnyDoc = Record<string, any>

export const BROWSABLE_STATUSES = ['draft', 'booked']
export const LIVE_OFFER_STATUSES = ['pending', 'accepted']

export function inOpenPool(move: AnyDoc | null | undefined): boolean {
  return (
    !!move &&
    move.moveCategory === 'scheduled' &&
    BROWSABLE_STATUSES.includes(move.status) &&
    !relId(move.moverProfileId) &&
    move.wizardDraft !== true
  )
}

export function mayViewMovePhotos(input: {
  callerId: string | null | undefined
  move: AnyDoc | null | undefined
  profile: AnyDoc | null | undefined
  hasOffer: boolean
}): boolean {
  const { callerId, move, profile } = input
  if (!callerId || !move) return false
  if (relId(move.clientId) === callerId) return true
  if (!profile?.$id) return false

  const assignedTo = relId(move.moverProfileId)
  if (assignedTo) return assignedTo === profile.$id

  if (profile.verificationStatus !== 'verified') return false
  if (input.hasOffer === true) return true

  if (!inOpenPool(move)) return false
  if (feeRestricted(profile)) return false
  return moverMatchesCountry(profile, move.countryCode)
}

function asList(value: unknown): unknown[] {
  if (Array.isArray(value)) return value
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed: unknown = JSON.parse(value)
      if (Array.isArray(parsed)) return parsed
    } catch {
      // A single bare value.
    }
    return [value]
  }
  return []
}

/** Is `fileId` one of this move's photos? The route serves nothing else. */
export function moveHasPhoto(move: AnyDoc | null | undefined, fileId: string): boolean {
  if (!move || !fileId) return false
  const refs = [move.coverPhotoId, ...asList(move.galleryPhotoIds)]
  return refs.some((ref) => typeof ref === 'string' && toFileId(ref) === fileId)
}

// ── The route's decision, with its reads injected ────────────────────────────

export interface PhotoAccessDeps {
  /** The move with this document id or handle, or null. */
  findMove(key: string): Promise<AnyDoc | null>
  /** The caller's `mover_profiles` row, or null for a client. */
  findProfile(userId: string): Promise<AnyDoc | null>
  /** Does this profile hold a live offer for the move? */
  hasOffer(moverProfileId: string, moveId: string): Promise<boolean>
}

export type PhotoAccess = { ok: true; moveId: string } | { ok: false; status: 401 | 403 | 404 }

/**
 * May `userId` load `fileId` as a photo of the move named `moveKey`?
 *
 * 404, not 403, for a move that does not exist or a file that is not on it:
 * the answer must not confirm that an id is real. Lookups that fail leave the
 * caller with less access, never more.
 */
export async function authorizeMovePhoto(
  deps: PhotoAccessDeps,
  input: { userId: string | null; moveKey: string | null; fileId: string | null },
): Promise<PhotoAccess> {
  if (!input.userId) return { ok: false, status: 401 }
  if (!input.moveKey || !input.fileId) return { ok: false, status: 404 }

  const move = await deps.findMove(input.moveKey).catch(() => null)
  if (!move) return { ok: false, status: 404 }

  let allowed = relId(move.clientId) === input.userId
  if (!allowed) {
    const profile = await deps.findProfile(input.userId).catch(() => null)
    const hasOffer =
      profile?.$id && !relId(move.moverProfileId)
        ? await deps.hasOffer(profile.$id, move.$id).catch(() => false)
        : false
    allowed = mayViewMovePhotos({ callerId: input.userId, move, profile, hasOffer })
  }
  if (!allowed) return { ok: false, status: 403 }
  if (!moveHasPhoto(move, input.fileId)) return { ok: false, status: 404 }
  return { ok: true, moveId: move.$id }
}
