/**
 * Server half of the location rule (plan `legal/2`, P2 + P3): the web ports of
 * the `updatemoverlocation` and `setmoveronline` functions.
 *
 *  - `recordMoverPosition`: a position ping. Dropped, storing nothing, when the
 *    mover is neither online nor on a job. Never changes `isOnline`: being
 *    online is the mover's choice (`setMoverOnline`), not a side effect of an
 *    open tab.
 *  - `setMoverOnline`: the online switch. Going online passes the same gates
 *    as the function (verified, service-ready vehicle, fee standing); going
 *    offline always succeeds and removes the stored position unless the mover
 *    is on a job.
 *
 * The routes are thin wrappers; everything testable is here.
 */
import { ID, Permission, Query, Role } from 'node-appwrite'

import { withRetry } from './appwrite-server'
import { APPWRITE } from './constants'
import { FEES_RESTRICTED, feeRestricted } from './mover-gates'
import { TRACKED_STATUSES, isOnJob, moverMaySharePosition, movesOnJob } from './mover-position'
import { relId } from './notify'
import { vehicleServiceReady, type VehicleProfileFields } from './vehicle-service'

type AnyDoc = Record<string, any>

/** The slice of `Databases` these operations use (a fake in the tests). */
export interface PositionDb {
  listDocuments(db: string, collection: string, queries?: string[]): Promise<{ documents: AnyDoc[] }>
  getDocument(db: string, collection: string, id: string): Promise<AnyDoc>
  createDocument(db: string, collection: string, id: string, data: AnyDoc, permissions?: string[]): Promise<AnyDoc>
  updateDocument(db: string, collection: string, id: string, data: AnyDoc, permissions?: string[]): Promise<AnyDoc>
  deleteDocument(db: string, collection: string, id: string): Promise<unknown>
}

const DB = () => APPWRITE.DATABASE_ID
const COL = () => APPWRITE.COLLECTIONS

async function moverProfileOf(databases: PositionDb, userId: string): Promise<AnyDoc | null> {
  const profiles = await withRetry(() =>
    databases.listDocuments(DB(), COL().MOVER_PROFILES, [Query.equal('userId', userId), Query.limit(1)]),
  )
  return profiles.documents[0] ?? null
}

function trackedMovesOf(databases: PositionDb, moverProfileId: string): Promise<AnyDoc[]> {
  return withRetry(() =>
    databases.listDocuments(DB(), COL().MOVES, [
      Query.equal('moverProfileId', moverProfileId),
      Query.equal('status', [...TRACKED_STATUSES]),
      Query.limit(10),
    ]),
  ).then((r) => r.documents)
}

// ── Wipe ─────────────────────────────────────────────────────────────────────

export const POSITION_WIPE_PATCH = {
  currentLatitude: null,
  currentLongitude: null,
  locationUpdatedAt: null,
} as const

/**
 * Remove a mover's stored position when they may no longer share it: offline
 * and not on a job. Never throws; the caller's own work has already succeeded.
 * `excludeMoveId` is the move that just ended, which can still read back live.
 */
export async function wipeMoverPositionIfIdle(
  databases: PositionDb,
  moverProfileId: string,
  opts: { isOnline: boolean; nowMs: number; tz?: string; excludeMoveId?: string | null },
): Promise<{ wiped: boolean; reason?: 'online' | 'onJob' | 'error'; rowsDeleted?: number }> {
  if (opts.isOnline) return { wiped: false, reason: 'online' }
  try {
    // Fail-closed on the job check: unreadable moves keep the position.
    const live = (await trackedMovesOf(databases, moverProfileId)).filter((m) => m.$id !== opts.excludeMoveId)
    if (live.some((m) => isOnJob(m, opts.nowMs, opts.tz))) return { wiped: false, reason: 'onJob' }

    await databases.updateDocument(DB(), COL().MOVER_PROFILES, moverProfileId, { ...POSITION_WIPE_PATCH })
    const rows = await databases.listDocuments(DB(), COL().MOVER_LOCATIONS, [
      Query.equal('moverProfileId', moverProfileId),
      Query.limit(5),
    ])
    let rowsDeleted = 0
    for (const row of rows.documents) {
      await databases.deleteDocument(DB(), COL().MOVER_LOCATIONS, row.$id)
      rowsDeleted += 1
    }
    return { wiped: true, rowsDeleted }
  } catch (err) {
    console.error(`[mover-position] wipe for ${moverProfileId} failed:`, err)
    return { wiped: false, reason: 'error' }
  }
}

/**
 * A move just ended (completed or cancelled). If its mover is offline and has
 * no other job, their last position goes. Reads the profile itself; never
 * throws. No-op for a move that had no mover, or a status that is still live.
 */
export async function wipeAfterMoveEnded(
  databases: PositionDb,
  move: { $id: string; moverProfileId?: unknown },
  newStatus: string,
  nowMs: number,
  tz?: string,
): Promise<void> {
  if (TRACKED_STATUSES.includes(newStatus)) return
  const moverProfileId = relId(move.moverProfileId as string | { $id?: string } | null | undefined)
  if (!moverProfileId) return
  try {
    const profile = await databases.getDocument(DB(), COL().MOVER_PROFILES, moverProfileId)
    await wipeMoverPositionIfIdle(databases, moverProfileId, {
      isOnline: profile.isOnline === true,
      nowMs,
      tz,
      excludeMoveId: move.$id,
    })
  } catch (err) {
    console.error(`[mover-position] end-of-move wipe for ${moverProfileId} failed:`, err)
  }
}

// ── Position ping ────────────────────────────────────────────────────────────

export interface PositionPing {
  userId: string
  latitude: number
  longitude: number
  heading?: number | null
  speed?: number | null
  /** Screen intent only. Honoured when it is one of the mover's own jobs. */
  moveId?: string | null
  nowMs: number
  tz?: string
}

export type PositionResult =
  | { ok: false; reason: 'notAMover' }
  | { ok: true; shared: false; reason: 'offline' }
  | { ok: true; shared: true; locationId: string }

export async function recordMoverPosition(databases: PositionDb, ping: PositionPing): Promise<PositionResult> {
  const profile = await moverProfileOf(databases, ping.userId)
  if (!profile) return { ok: false, reason: 'notAMover' }
  const moverProfileId = profile.$id as string

  // The moves this mover is assigned to, read HERE. The row's tag and its
  // readers used to come from a body-supplied `moveId`, which let a mover name
  // any move and hand its client a read on their position row.
  let liveMoves: AnyDoc[] = []
  try {
    liveMoves = await trackedMovesOf(databases, moverProfileId)
  } catch (err) {
    // An online mover's ping still lands (mover-only read). An offline mover's
    // is dropped below: with no moves in hand there is no proof of a job.
    console.error('[mover-position] live-move lookup failed:', err)
  }

  if (!moverMaySharePosition({ isOnline: profile.isOnline === true, liveMoves, nowMs: ping.nowMs, tz: ping.tz })) {
    return { ok: true, shared: false, reason: 'offline' }
  }

  // Only the client of a job in progress may follow the mover. A booking for
  // next week is assigned, but its client reads nothing until the hour before.
  const jobMoves = movesOnJob(liveMoves, ping.nowMs, ping.tz)
  const rank = (m: AnyDoc) => TRACKED_STATUSES.indexOf(m.status)
  const stated = ping.moveId ? jobMoves.find((m) => m.$id === ping.moveId) : null
  const tagged = stated ?? [...jobMoves].sort((a, b) => rank(b) - rank(a))[0] ?? null

  const timestamp = new Date(ping.nowMs).toISOString()
  const payload = {
    moverProfileId,
    moveId: tagged ? tagged.$id : null,
    latitude: ping.latitude,
    longitude: ping.longitude,
    heading: ping.heading ?? null,
    speed: ping.speed ?? null,
    timestamp,
  }
  // `userId` is the mover's auth account id; `moverProfileId` is a row id and
  // not a usable role. Appwrite replaces the permission array on every write,
  // so the full reader set is recomputed each ping.
  const readers = new Set<string>([ping.userId])
  for (const m of jobMoves) {
    const clientAuthId = relId(m.clientId)
    if (clientAuthId) readers.add(clientAuthId)
  }
  const permissions = [...readers].map((id) => Permission.read(Role.user(id)))

  const findRow = async () =>
    (
      await withRetry(() =>
        databases.listDocuments(DB(), COL().MOVER_LOCATIONS, [
          Query.equal('moverProfileId', moverProfileId),
          Query.orderDesc('$updatedAt'),
          Query.limit(1),
        ]),
      )
    ).documents[0]?.$id ?? null
  const update = (rowId: string) =>
    withRetry(() => databases.updateDocument(DB(), COL().MOVER_LOCATIONS, rowId, payload, permissions))

  let rowId: string | null = await findRow()
  if (rowId) {
    await update(rowId)
  } else {
    try {
      const created = await databases.createDocument(DB(), COL().MOVER_LOCATIONS, ID.unique(), payload, permissions)
      rowId = created.$id as string
    } catch (err) {
      // Two first pings can race (the oneToOne moveId constraint answers 409):
      // update whichever row landed first.
      if ((err as { code?: number })?.code !== 409) throw err
      rowId = await findRow()
      if (!rowId) throw err
      await update(rowId)
    }
  }

  // The profile mirror: the freshness stamp every visibility gate reads
  // (3 min). `isOnline` is NOT touched: a ping never puts a mover online.
  await withRetry(() =>
    databases.updateDocument(DB(), COL().MOVER_PROFILES, moverProfileId, {
      currentLatitude: ping.latitude,
      currentLongitude: ping.longitude,
      locationUpdatedAt: timestamp,
    }),
  )

  return { ok: true, shared: true, locationId: rowId as string }
}

// ── Online switch ────────────────────────────────────────────────────────────

export type OnlineBlock = 'mover.notAMover' | 'mover.notVerified' | 'mover.vehicleNotReady' | typeof FEES_RESTRICTED

export type OnlineResult =
  | { ok: false; fnCode: OnlineBlock; status: 403 | 404 }
  | { ok: true; isOnline: boolean; positionWiped: boolean }

/**
 * Why this mover may not go online, or `null`. Same checks, order and codes as
 * the `setmoveronline` function. Going offline is never blocked.
 */
export function goOnlineBlock(profile: AnyDoc, nowMs: number, tz: string): OnlineBlock | null {
  if (profile.verificationStatus !== 'verified') return 'mover.notVerified'
  if (!vehicleServiceReady(profile as VehicleProfileFields, nowMs, tz)) return 'mover.vehicleNotReady'
  if (feeRestricted(profile)) return FEES_RESTRICTED
  return null
}

export async function setMoverOnline(
  databases: PositionDb,
  input: { userId: string; isOnline: boolean; nowMs: number; tz: string },
): Promise<OnlineResult> {
  const profile = await moverProfileOf(databases, input.userId)
  if (!profile) return { ok: false, fnCode: 'mover.notAMover', status: 404 }

  if (input.isOnline) {
    const block = goOnlineBlock(profile, input.nowMs, input.tz)
    if (block) return { ok: false, fnCode: block, status: 403 }
  }

  await withRetry(() =>
    databases.updateDocument(DB(), COL().MOVER_PROFILES, profile.$id, { isOnline: input.isOnline }),
  )

  let positionWiped = false
  if (!input.isOnline) {
    const wipe = await wipeMoverPositionIfIdle(databases, profile.$id, {
      isOnline: false,
      nowMs: input.nowMs,
      tz: input.tz,
    })
    positionWiped = wipe.wiped
  }
  return { ok: true, isOnline: input.isOnline, positionWiped }
}
