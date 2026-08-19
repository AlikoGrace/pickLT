import { Permission, Role } from 'node-appwrite'

/**
 * Document-level permission builders — the write half of the Appwrite
 * permissions hardening (see
 * `.agent/plans/appwrite-permissions-hardening.md` §2 for the authoritative
 * per-collection model).
 *
 * Context: eleven collections currently carry collection-level
 * `read/create/update/delete("users")` with `documentSecurity: true`, which is
 * the only thing making the apps work today. Before those grants can be
 * dropped, every row must carry its own owner grants. These routes all run with
 * `createAdminClient()` (an API key), so they bypass permissions on read and
 * nothing here changes their own behaviour — the grants exist for the *mobile*
 * clients (pickltmobile / pickltmover) which read the same rows with real user
 * sessions.
 *
 * `Role.user(...)` takes an **auth account id**. A `users` document's `$id` is
 * its auth id, so `users.$id`, `moves.clientId` and `notifications.userId` are
 * directly usable. `mover_profiles.$id` is NOT — resolve it through
 * `mover_profiles.userId` (`moverUserIdFromProfile()` in `./notify`) before
 * passing it here.
 */

/** Drops nulls so a missing counterparty simply contributes no grant. */
function compact(perms: (string | null)[]): string[] {
  return perms.filter((p): p is string => !!p)
}

/** `users` — owner reads/updates/deletes their own row; nobody else. */
export function userDocPermissions(authId: string): string[] {
  return [
    Permission.read(Role.user(authId)),
    Permission.update(Role.user(authId)),
    Permission.delete(Role.user(authId)),
  ]
}

/**
 * `moves` — the client reads and deletes (deleting a draft is the one
 * client-session write on this collection); the assigned mover reads once
 * assigned. No client-session `update` path exists, so no `update` grant.
 */
export function movePermissions(
  clientAuthId: string | null,
  moverAuthId?: string | null,
): string[] {
  return compact([
    clientAuthId ? Permission.read(Role.user(clientAuthId)) : null,
    clientAuthId ? Permission.delete(Role.user(clientAuthId)) : null,
    moverAuthId ? Permission.read(Role.user(moverAuthId)) : null,
  ])
}

/** `move_requests` — the targeted mover's inbox + the client's tracking screen. */
export function moveRequestPermissions(
  moverAuthId: string | null,
  clientAuthId: string | null,
): string[] {
  return compact([
    moverAuthId ? Permission.read(Role.user(moverAuthId)) : null,
    clientAuthId ? Permission.read(Role.user(clientAuthId)) : null,
  ])
}

/** `payments` — both parties settle against the same record; reads only. */
export function paymentPermissions(
  clientAuthId: string | null,
  moverAuthId?: string | null,
): string[] {
  return compact([
    clientAuthId ? Permission.read(Role.user(clientAuthId)) : null,
    moverAuthId ? Permission.read(Role.user(moverAuthId)) : null,
  ])
}

/** `reviews` — the reviewer and the reviewed mover. Public star ratings come
 * from the aggregate `mover_profiles.rating`, not from these rows. */
export function reviewPermissions(
  reviewerAuthId: string | null,
  moverAuthId?: string | null,
): string[] {
  return compact([
    reviewerAuthId ? Permission.read(Role.user(reviewerAuthId)) : null,
    moverAuthId ? Permission.read(Role.user(moverAuthId)) : null,
  ])
}

/** `crew_members` — crew PII belongs to exactly one mover. */
export function crewPermissions(moverAuthId: string): string[] {
  return [
    Permission.read(Role.user(moverAuthId)),
    Permission.update(Role.user(moverAuthId)),
    Permission.delete(Role.user(moverAuthId)),
  ]
}

/** `mover_profiles` — SSN / tax number / licence photo / VAT. Owner read only;
 * every write goes through a server path. */
export function moverProfilePermissions(moverAuthId: string): string[] {
  return [Permission.read(Role.user(moverAuthId))]
}

/**
 * `mover_locations` — the mover always reads their own fixes; the client of the
 * move reads them only while that move is live (rows with no `moveId` are the
 * ambient online heartbeat and stay mover-only).
 */
export function moverLocationPermissions(
  moverAuthId: string | null,
  clientAuthId?: string | null,
): string[] {
  return compact([
    moverAuthId ? Permission.read(Role.user(moverAuthId)) : null,
    clientAuthId ? Permission.read(Role.user(clientAuthId)) : null,
  ])
}

/** `notifications` — addressee only. `update` is genuinely required: the mobile
 * clients flip `isRead` straight from the session. */
export function notificationPermissions(addresseeAuthId: string): string[] {
  return [
    Permission.read(Role.user(addresseeAuthId)),
    Permission.update(Role.user(addresseeAuthId)),
    Permission.delete(Role.user(addresseeAuthId)),
  ]
}

/**
 * `move_status_history` — deliberately empty. Nothing in any client reads this
 * collection; it is a pure server-side audit trail. Passed explicitly so the
 * intent is visible at the call site rather than looking like an omission.
 */
export const MOVE_STATUS_HISTORY_PERMISSIONS: string[] = []
