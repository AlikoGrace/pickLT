/**
 * Business constants that used to be typed into catalog values.
 *
 * Every number here was, until this pass, a literal inside one or more English
 * strings — and therefore inside seven translations of each of them. `30 km`
 * appeared in `moves:available.withinRadiusCount` and in
 * `web:mover.availableMoves.empty.subtitle`; `100m` in
 * `web:mover.activeMove.proximity.helper`; `10MB` in three upload hints; the three
 * arrival windows carried a **12-hour clock** that all seven translators
 * independently rewrote to 24-hour, because no European market reads am/pm.
 *
 * A threshold in a catalog cannot be changed without re-translating, disagrees with
 * the code that enforces it the moment either moves, and — when it carries a unit or
 * a clock — is simply wrong in some locale. So the numbers live here, the units and
 * clock formats come from `lib/format.ts`, and the catalog keeps the words.
 */

/**
 * How far a mover's available-moves feed reaches. Enforced in
 * `app/api/mover/nearby-moves/route.ts`, which imports this rather than declaring
 * its own copy.
 */
export const NEARBY_MOVES_RADIUS_KM = 30

/** How often the available-moves page re-polls that feed. */
export const AVAILABLE_MOVES_POLL_SECONDS = 30

/**
 * How close a mover must be to the pickup before "Arrived at pickup" unlocks.
 * `pickltmover/lib/mover-status.ts` calls the same constant `GEOFENCE_RADIUS_M`
 * and holds the same value.
 */
export const ARRIVAL_GEOFENCE_M = 100

/**
 * Largest file `app/api/user/upload-photo/route.ts` accepts, in megabytes. The
 * route compresses after this check, so it is a ceiling on the *raw* upload.
 */
export const UPLOAD_MAX_MB = 10

/**
 * The client-side pre-check on avatar pickers — deliberately tighter than the
 * route's ceiling, so an obviously oversized file is rejected without a round trip.
 */
export const AVATAR_UPLOAD_MAX_MB = 5

/**
 * The three named arrival windows, as `[startHour, endHour]` on a 24-hour clock.
 *
 * These are the hours the operation actually offers; the *clock convention* the
 * reader sees is `Intl`'s decision, not ours (`formatTimeRange`). English renders
 * `8:00 AM – 12:00 PM`, German `08:00–12:00 Uhr`, French `08:00 – 12:00` — from
 * this one pair of numbers.
 */
export const ARRIVAL_WINDOW_HOURS: Record<ArrivalWindowSlug, [number, number]> = {
  morning: [8, 12],
  afternoon: [12, 17],
  evening: [17, 21],
}

export type ArrivalWindowSlug = 'morning' | 'afternoon' | 'evening'

/** The slugs, in the order they are offered. */
export const ARRIVAL_WINDOW_SLUGS: ArrivalWindowSlug[] = ['morning', 'afternoon', 'evening']
