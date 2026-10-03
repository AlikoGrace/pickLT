/**
 * Optional filters on `GET /api/notifications` (pure, so it can be tested
 * without the route): `?type=move_cancelled&since=<iso>`. Anything malformed
 * is dropped rather than rejected, so a bad param widens the list back to the
 * caller's own unfiltered feed and never reaches the query builder raw.
 */
export function notificationListFilters(searchParams: URLSearchParams): { type: string | null; since: string | null } {
  const rawType = searchParams.get('type')
  const type = rawType && /^[a-z_]{1,64}$/.test(rawType) ? rawType : null

  const rawSince = searchParams.get('since')
  const sinceMs = rawSince ? Date.parse(rawSince) : NaN
  const since = Number.isFinite(sinceMs) ? new Date(sinceMs).toISOString() : null

  return { type, since }
}
