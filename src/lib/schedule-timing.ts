/**
 * When does a scheduled move actually start? (T6 parity port)
 *
 * Mirrors pickltmover `lib/schedule-timing.ts` and the reminder function —
 * keep the three in sync. `moveDate` (ISO date or datetime) + `arrivalWindow`
 * (wizard label like "03:00 PM") were never combined on web either, so Start
 * Route gating was date-only — and the active-move page auto-started accepted
 * scheduled moves the moment the mover opened it on the move day.
 */

export const START_WINDOW_BEFORE_MS = 5 * 60 * 1000 // Start Route unlocks at T-5 min

/**
 * Arrival windows are wall-clock times where the move happens, not UTC —
 * resolving them in UTC put the start gate off by the UTC offset (1–2 h in
 * Germany).
 */
export const PLATFORM_TZ = 'Europe/Berlin'

function tzOffsetMs(tz: string, utcMs: number): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(utcMs))
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value)
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour') % 24, get('minute'), get('second'))
  return asUtc - utcMs
}

/**
 * Epoch ms of Y-M-D + minutes-since-midnight as wall-clock time in `tz`.
 * Two-pass offset lookup for DST correctness; UTC fallback if Intl lacks tz data.
 */
export function zonedEpoch(year: number, month: number, day: number, minutes: number, tz: string = PLATFORM_TZ): number {
  const wallAsUtc = Date.UTC(year, month - 1, day, 0, minutes)
  try {
    const first = tzOffsetMs(tz, wallAsUtc)
    const second = tzOffsetMs(tz, wallAsUtc - first)
    return wallAsUtc - second
  } catch {
    return wallAsUtc
  }
}

/** "03:00 PM" → minutes since midnight, or null when unparseable. */
export function parseArrivalWindowMinutes(window: string | null | undefined): number | null {
  if (!window) return null
  const m = /^\s*(\d{1,2}):(\d{2})\s*(AM|PM)?\s*$/i.exec(window)
  if (!m) return null
  let hours = parseInt(m[1], 10)
  const minutes = parseInt(m[2], 10)
  if (minutes > 59) return null
  const period = m[3]?.toUpperCase()
  if (period) {
    if (hours < 1 || hours > 12) return null
    if (period === 'PM' && hours !== 12) hours += 12
    if (period === 'AM' && hours === 12) hours = 0
  } else if (hours > 23) {
    return null
  }
  return hours * 60 + minutes
}

/**
 * Epoch ms the move is scheduled to start, or null without a usable date.
 * Unparseable windows degrade to the date alone — timing data must never make
 * a move unstartable.
 */
export function scheduledStartAt(
  move: {
    moveDate?: string | null
    arrivalWindow?: string | null
  },
  tz: string = PLATFORM_TZ,
): number | null {
  if (!move.moveDate) return null
  const base = new Date(move.moveDate)
  if (isNaN(base.getTime())) return null
  const minutes = parseArrivalWindowMinutes(move.arrivalWindow)
  if (minutes !== null) {
    const isMidnight =
      base.getUTCHours() === 0 && base.getUTCMinutes() === 0 && base.getUTCSeconds() === 0
    if (isMidnight) {
      return zonedEpoch(base.getUTCFullYear(), base.getUTCMonth() + 1, base.getUTCDate(), minutes, tz)
    }
  }
  return base.getTime()
}

/** Is Start Route unlocked (now within T-5 min of the start, or past it)? */
export function withinStartWindow(startAtMs: number | null, nowMs: number): boolean {
  if (startAtMs === null) return true // never-block rule
  return nowMs >= startAtMs - START_WINDOW_BEFORE_MS
}

/**
 * Single gating predicate for both mover surfaces (job-details button and the
 * active-move auto-transition previously carried diverging copies).
 */
export function isMoveStartable(
  move: { moveDate?: string | null; arrivalWindow?: string | null },
  nowMs: number,
): boolean {
  return withinStartWindow(scheduledStartAt(move), nowMs)
}
