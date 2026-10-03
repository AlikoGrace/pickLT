/**
 * In-app popup for a cancelled move, on top of the push (owner 2026-10-03):
 * whoever cancels, the other party sees it while the site is open. The server
 * writes a `move_cancelled` notification to the other party on every cancel
 * path (client cancel, mover drop, status cancel, scheduled withdraw);
 * `components/CancellationAlerts.tsx` shows each one once, oldest first.
 *
 * The pure parts live here so they can be tested without a DOM. Same contract
 * as the two React Native apps (`lib/notifications.ts` there).
 */

/** A cancellation older than this is history, not news: no popup for it. */
export const CANCEL_ALERT_MAX_AGE_MS = 24 * 60 * 60 * 1000

/** Notification ids already popped up on this browser (localStorage). */
export const CANCEL_ALERTS_SHOWN_KEY = 'picklt_cancel_alerts_shown'

/** Shown ids kept; a day of cancellations never comes close. */
export const MAX_SHOWN_IDS = 50

/**
 * How long a mounted page that claimed a move gets to explain that move's
 * cancellation in its own words before the global popup shows it anyway.
 * The status write lands before the notification row, so the page's realtime
 * event normally wins by far; this only bounds a page that never explains it.
 */
export const CLAIM_GRACE_MS = 30 * 1000

/** A page's own notice covers a notification written this close to it. */
export const EXPLAINED_WINDOW_MS = 5 * 60 * 1000

type CancellationRow = { $id: string; type?: string | null; isRead?: boolean | null; $createdAt: string }

/**
 * The cancellations to pop up, oldest first: unread `move_cancelled` rows from
 * the last day that this browser has not shown yet. Pure.
 */
export function pendingCancellations<T extends CancellationRow>(
  items: T[],
  shownIds: ReadonlySet<string>,
  nowMs: number,
  maxAgeMs: number = CANCEL_ALERT_MAX_AGE_MS
): T[] {
  return items
    .filter((n) => n.type === 'move_cancelled' && !n.isRead && !shownIds.has(n.$id))
    .filter((n) => {
      const at = Date.parse(n.$createdAt)
      return Number.isFinite(at) && nowMs - at <= maxAgeMs
    })
    .sort((a, b) => Date.parse(a.$createdAt) - Date.parse(b.$createdAt))
}

// ─── Claim registry ──────────────────────────────────────
// Pages that explain a cancellation for their own move (the mover's active
// move, the client's instant-move tracking) claim that move while mounted and
// note when they have actually explained it. The global popup then retires
// the row instead of stacking a second notice on top.

const claimedCancellations = new Map<string, number>()
const explainedCancellations = new Map<string, number>()

/** Claim a move's cancellation while the page is mounted; returns the release. */
export function claimMoveCancellation(moveId: string): () => void {
  claimedCancellations.set(moveId, (claimedCancellations.get(moveId) ?? 0) + 1)
  return () => {
    const n = (claimedCancellations.get(moveId) ?? 1) - 1
    if (n <= 0) claimedCancellations.delete(moveId)
    else claimedCancellations.set(moveId, n)
  }
}

export function isMoveCancellationClaimed(moveId: string | null | undefined): boolean {
  return !!moveId && claimedCancellations.has(moveId)
}

/**
 * The page has just told the user about this move's cancellation itself. Kept
 * past the page's unmount (it may navigate away right after its notice).
 */
export function markMoveCancellationExplained(moveId: string, nowMs: number = Date.now()): void {
  explainedCancellations.set(moveId, nowMs)
}

/**
 * What the popup does with one pending row:
 *  - `retire`: a page already explained it — mark shown + read, no popup;
 *  - `defer`:  a mounted page claims the move and may still explain it — skip
 *              this round, look again on the next check;
 *  - `show`:   pop it up.
 */
export function cancellationDisposition(
  moveId: string | null | undefined,
  createdAtMs: number,
  nowMs: number
): 'show' | 'retire' | 'defer' {
  if (!moveId) return 'show'
  const explainedAt = explainedCancellations.get(moveId)
  if (explainedAt !== undefined && Math.abs(explainedAt - createdAtMs) <= EXPLAINED_WINDOW_MS) return 'retire'
  if (claimedCancellations.has(moveId) && nowMs - createdAtMs < CLAIM_GRACE_MS) return 'defer'
  return 'show'
}

/** Test hook: forget every claim and explanation. */
export function resetCancellationClaims(): void {
  claimedCancellations.clear()
  explainedCancellations.clear()
}

// ─── Shown ids (localStorage) ────────────────────────────

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>

/** Read the shown ids; a missing, blocked or broken store yields an empty set. */
export function loadShownIds(storage: StorageLike | null | undefined): Set<string> {
  try {
    const raw = storage?.getItem(CANCEL_ALERTS_SHOWN_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : []
    if (Array.isArray(parsed)) return new Set(parsed.filter((v): v is string => typeof v === 'string'))
  } catch {
    // A broken store only risks one repeated popup.
  }
  return new Set()
}

/** Persist the newest `MAX_SHOWN_IDS` ids. Best effort. */
export function saveShownIds(storage: StorageLike | null | undefined, ids: Iterable<string>): void {
  try {
    storage?.setItem(CANCEL_ALERTS_SHOWN_KEY, JSON.stringify([...ids].slice(-MAX_SHOWN_IDS)))
  } catch {
    // Best effort.
  }
}

// ─── Fetch ───────────────────────────────────────────────

/** The feed query: this user's unread cancellations from the last day. */
export function recentCancellationsUrl(nowMs: number): string {
  const params = new URLSearchParams({
    type: 'move_cancelled',
    unreadOnly: 'true',
    since: new Date(nowMs - CANCEL_ALERT_MAX_AGE_MS).toISOString(),
    limit: '10',
  })
  return `/api/notifications?${params.toString()}`
}

// ─── Check nudges ────────────────────────────────────────
// An existing realtime listener (NotificationWrapper's moves socket) asks for
// an early check when one of the user's moves is cancelled, instead of a new
// socket on the notifications collection.

const checkListeners = new Set<() => void>()

export function onCancellationCheckRequested(listener: () => void): () => void {
  checkListeners.add(listener)
  return () => {
    checkListeners.delete(listener)
  }
}

export function requestCancellationCheck(): void {
  checkListeners.forEach((listener) => listener())
}
