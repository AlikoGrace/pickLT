/**
 * When may a mover's position be stored and shown? (plan `legal/2`, P1 to P3)
 *
 * A mover shares their position only while they are ONLINE or ON A JOB. Being
 * signed in is not enough, an open dashboard tab is not enough, and neither is
 * having accepted a move that starts next week.
 *
 * Web port of `pickltmover/lib/location-sharing.ts` (`isOnJob`,
 * `moverMaySharePosition`) and of the functions' `mover-position.js`. Same
 * rule, same table of cases in the tests; edit the three together.
 *
 * Pure: no clock and no I/O. The server half lives in
 * `mover-position-server.ts`.
 */
import { scheduledStartAt } from './schedule-timing'

/** A scheduled move counts as "on a job" from this long before its start. */
export const ON_JOB_ACCEPTED_LEAD_MS = 60 * 60 * 1000

/** Statuses in which a mover is assigned to a move that has not ended. */
export const TRACKED_STATUSES: readonly string[] = [
  'mover_accepted',
  'mover_en_route',
  'mover_arrived',
  'loading',
  'in_transit',
  'arrived_destination',
  'unloading',
  'awaiting_payment',
  'paid',
]

const UNDERWAY_STATUSES = TRACKED_STATUSES.filter((s) => s !== 'mover_accepted')

/** The subset of a `moves` row the rule looks at. */
export interface JobMove {
  status?: string | null
  moveCategory?: string | null
  moveDate?: string | null
  arrivalWindow?: string | null
}

/**
 * Is the mover on a job with this move right now?
 *
 *  - under way (`mover_en_route` to `paid`): yes;
 *  - `mover_accepted` and instant: yes, the mover is about to set off;
 *  - `mover_accepted` and scheduled: only from 60 minutes before the start.
 *    A scheduled move with no readable date is NOT a job yet; starting the
 *    route (`mover_en_route`) always is.
 */
export function isOnJob(move: JobMove | null | undefined, nowMs: number, tz?: string): boolean {
  const status = typeof move?.status === 'string' ? move.status : ''
  if (UNDERWAY_STATUSES.includes(status)) return true
  if (!move || status !== 'mover_accepted') return false
  if (move.moveCategory !== 'scheduled') return true
  const startAt = scheduledStartAt(move, tz)
  if (startAt === null) return false
  return nowMs >= startAt - ON_JOB_ACCEPTED_LEAD_MS
}

/** The moves of `moves` the mover is on a job with. */
export function movesOnJob<T extends JobMove>(moves: readonly T[], nowMs: number, tz?: string): T[] {
  return moves.filter((m) => isOnJob(m, nowMs, tz))
}

/** May this mover's position be sent and stored right now? */
export function moverMaySharePosition(input: {
  isOnline: boolean
  liveMoves: readonly JobMove[]
  nowMs: number
  tz?: string
}): boolean {
  if (input.isOnline === true) return true
  return input.liveMoves.some((m) => isOnJob(m, input.nowMs, input.tz))
}

/** Discovery shows a mover to within about 1 km, never closer. */
export function coarseCoordinate(value: number): number {
  return Math.round(value * 100) / 100
}
