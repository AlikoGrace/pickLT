/**
 * When may a mover's position be stored and shown? (plan legal/2, P1 + P2)
 *
 * The rule: a mover shares their position only while they are ONLINE or ON A
 * JOB. Being signed in is not enough, and neither is having accepted a move
 * that starts next week.
 *
 * This file is carried, byte-identical, by every function that needs the rule
 * (`check-function-mirrors.sh` SHARED_FILES). The TypeScript source of the
 * rule is `pickltmover/lib/location-sharing.ts`; `on-job-parity.test.ts`
 * compares the two over one table of cases. Edit both together.
 *
 * No imports on purpose: the caller hands in `databases` and `Query`, so this
 * module also loads in a test runner that has no `node-appwrite`.
 */

/** A scheduled move counts as "on a job" from this long before its start. */
export const ON_JOB_ACCEPTED_LEAD_MS = 60 * 60 * 1000;

/** Statuses in which a mover is assigned to a move that has not ended. */
export const TRACKED_STATUSES = [
  'mover_accepted',
  'mover_en_route',
  'mover_arrived',
  'loading',
  'in_transit',
  'arrived_destination',
  'unloading',
  'awaiting_payment',
  'paid',
];

/** The move is under way: the mover set off, or is past that. */
const UNDERWAY_STATUSES = TRACKED_STATUSES.filter((s) => s !== 'mover_accepted');

const DEFAULT_TZ = 'Europe/Berlin';

// ── Timing (mirrors lib/schedule-timing.ts and remindscheduledmoves) ─────────

function parseArrivalWindowMinutes(window) {
  if (!window) return null;
  const m = /^\s*(\d{1,2}):(\d{2})\s*(AM|PM)?\s*$/i.exec(window);
  if (!m) return null;
  let hours = parseInt(m[1], 10);
  const minutes = parseInt(m[2], 10);
  if (minutes > 59) return null;
  const period = m[3] ? m[3].toUpperCase() : null;
  if (period) {
    if (hours < 1 || hours > 12) return null;
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
  } else if (hours > 23) {
    return null;
  }
  return hours * 60 + minutes;
}

function tzOffsetMs(tz, utcMs) {
  // NOT a display locale: 'en-US' is a fixed parsing anchor for formatToParts.
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(new Date(utcMs));
  const get = (type) => {
    const part = parts.find((p) => p.type === type);
    return Number(part ? part.value : NaN);
  };
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour') % 24, get('minute'), get('second'));
  return asUtc - utcMs;
}

function zonedEpoch(year, month, day, minutes, tz) {
  const wallAsUtc = Date.UTC(year, month - 1, day, 0, minutes);
  try {
    const first = tzOffsetMs(tz, wallAsUtc);
    const second = tzOffsetMs(tz, wallAsUtc - first);
    return wallAsUtc - second;
  } catch {
    return wallAsUtc;
  }
}

/** Epoch ms a scheduled move starts, or null when the row has no usable date. */
export function scheduledStartAt(move, tz = DEFAULT_TZ) {
  if (!move || !move.moveDate) return null;
  const base = new Date(move.moveDate);
  if (isNaN(base.getTime())) return null;
  const minutes = parseArrivalWindowMinutes(move.arrivalWindow);
  if (minutes !== null) {
    const isMidnight =
      base.getUTCHours() === 0 && base.getUTCMinutes() === 0 && base.getUTCSeconds() === 0;
    if (isMidnight) {
      return zonedEpoch(base.getUTCFullYear(), base.getUTCMonth() + 1, base.getUTCDate(), minutes, tz);
    }
  }
  return base.getTime();
}

// ── The rule ─────────────────────────────────────────────────────────────────

/**
 * Is the mover on a job with this move right now?
 *
 *  - under way (`mover_en_route` to `paid`): yes;
 *  - `mover_accepted` and instant: yes, the mover is about to set off;
 *  - `mover_accepted` and scheduled: only from 60 minutes before the start.
 *    A scheduled move with no readable date is NOT a job yet; starting the
 *    route (`mover_en_route`) always is.
 */
export function isOnJob(move, nowMs, tz = DEFAULT_TZ) {
  const status = move && typeof move.status === 'string' ? move.status : '';
  if (UNDERWAY_STATUSES.includes(status)) return true;
  if (status !== 'mover_accepted') return false;
  if (move.moveCategory !== 'scheduled') return true;
  const startAt = scheduledStartAt(move, tz);
  if (startAt === null) return false;
  return nowMs >= startAt - ON_JOB_ACCEPTED_LEAD_MS;
}

/** The moves of `moves` the mover is on a job with. */
export function movesOnJob(moves, nowMs, tz = DEFAULT_TZ) {
  return (Array.isArray(moves) ? moves : []).filter((m) => isOnJob(m, nowMs, tz));
}

/** May this mover's position be stored and shared right now? */
export function moverMaySharePosition(input) {
  if (input && input.isOnline === true) return true;
  const moves = input && Array.isArray(input.liveMoves) ? input.liveMoves : [];
  const nowMs = input && typeof input.nowMs === 'number' ? input.nowMs : Date.now();
  return moves.some((m) => isOnJob(m, nowMs, input && input.tz ? input.tz : DEFAULT_TZ));
}

// ── Wiping a position that may no longer be shared ───────────────────────────

/** The profile columns that hold the last known position. */
export const POSITION_WIPE_PATCH = {
  currentLatitude: null,
  currentLongitude: null,
  locationUpdatedAt: null,
};

/**
 * Remove a mover's stored position when they may no longer share it: they are
 * offline and not on a job. Called when a mover goes offline and when one of
 * their moves ends.
 *
 * `ctx`: { databases, Query, databaseId, profilesCollection, movesCollection,
 *          locationsCollection, tz, error }
 * `opts`: { isOnline, nowMs, excludeMoveId }
 *   - `isOnline`: pass it when the caller already knows; otherwise the profile
 *     is read.
 *   - `excludeMoveId`: the move that just ended. Its row can still read back at
 *     the old status for a moment, and must not keep the mover "on a job".
 *
 * Never throws: the caller's own work (going offline, completing a move) has
 * already succeeded and must not be undone by a failed clean-up. A missing
 * collection id skips that part and says so.
 */
export async function wipeMoverPositionIfIdle(ctx, moverProfileId, opts) {
  const options = opts || {};
  const report = typeof ctx.error === 'function' ? ctx.error : () => {};
  const nowMs = typeof options.nowMs === 'number' ? options.nowMs : Date.now();
  if (!moverProfileId || !ctx.databaseId || !ctx.profilesCollection) {
    return { wiped: false, reason: 'misconfigured' };
  }

  try {
    let isOnline = options.isOnline;
    if (typeof isOnline !== 'boolean') {
      const profile = await ctx.databases.getDocument(ctx.databaseId, ctx.profilesCollection, moverProfileId);
      isOnline = profile.isOnline === true;
    }
    if (isOnline) return { wiped: false, reason: 'online' };

    // Fail-CLOSED on the job check: if the moves cannot be read, keep the
    // position. Wiping mid-job would blank a client's tracking map.
    if (!ctx.movesCollection) {
      report('mover-position: APPWRITE_COLLECTION_MOVES missing, position kept');
      return { wiped: false, reason: 'misconfigured' };
    }
    const live = await ctx.databases.listDocuments(ctx.databaseId, ctx.movesCollection, [
      ctx.Query.equal('moverProfileId', moverProfileId),
      ctx.Query.equal('status', TRACKED_STATUSES),
      ctx.Query.limit(10),
    ]);
    const others = live.documents.filter((m) => m.$id !== options.excludeMoveId);
    if (others.some((m) => isOnJob(m, nowMs, ctx.tz || DEFAULT_TZ))) {
      return { wiped: false, reason: 'onJob' };
    }

    await ctx.databases.updateDocument(
      ctx.databaseId,
      ctx.profilesCollection,
      moverProfileId,
      POSITION_WIPE_PATCH,
    );

    if (!ctx.locationsCollection) {
      report('mover-position: APPWRITE_COLLECTION_MOVER_LOCATIONS missing, location row kept');
      return { wiped: true, rowsDeleted: 0 };
    }
    const rows = await ctx.databases.listDocuments(ctx.databaseId, ctx.locationsCollection, [
      ctx.Query.equal('moverProfileId', moverProfileId),
      ctx.Query.limit(5),
    ]);
    let rowsDeleted = 0;
    for (const row of rows.documents) {
      await ctx.databases.deleteDocument(ctx.databaseId, ctx.locationsCollection, row.$id);
      rowsDeleted += 1;
    }
    return { wiped: true, rowsDeleted };
  } catch (e) {
    report(`mover-position: wipe for ${moverProfileId} failed: ${e && e.message ? e.message : e}`);
    return { wiped: false, reason: 'error' };
  }
}
