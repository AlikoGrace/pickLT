/**
 * What the mover's active-job screen should do with a move in a given status
 * (realtime event or reconcile read). The socket can die after a successful
 * `subscribe()` without throwing and Appwrite replays nothing on reconnect, so
 * a client cancel during the gap was lost and the screen stayed on
 * "Accepted" (mover-app device pass 2026-10-03). The page therefore also
 * re-reads on focus / visibility and every `ACTIVE_MOVE_RECONCILE_MS`, and
 * routes the result through this one rule.
 */
export const ACTIVE_MOVE_RECONCILE_MS = 15_000

export type ActiveMoveOutcome = 'active' | 'completed' | 'cancelled_by_client' | 'ended'

const ACTIVE = new Set([
  'accepted',
  'mover_accepted',
  'mover_assigned',
  'mover_en_route',
  'mover_arrived',
  'loading',
  'in_transit',
  'arrived_destination',
  'unloading',
  'awaiting_payment',
])

export function activeMoveOutcome(status: string | null | undefined): ActiveMoveOutcome {
  if (status === 'completed') return 'completed'
  if (status === 'cancelled_by_client') return 'cancelled_by_client'
  if (status && ACTIVE.has(status)) return 'active'
  // cancelled / cancelled_by_mover / disputed / back to pending after a withdraw / unknown.
  return 'ended'
}
