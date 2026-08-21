import type { TFunction } from 'i18next'
import { ID } from 'node-appwrite'

import { createAdminClient } from './appwrite-server'
import { APPWRITE } from './constants'
import { notificationPermissions } from './doc-permissions'

export type NotifyType =
  | 'move_request'
  | 'move_accepted'
  | 'mover_en_route'
  | 'mover_arrived'
  | 'loading'
  | 'in_transit'
  | 'arrived_destination'
  | 'unloading'
  | 'move_completed'
  | 'move_cancelled'
  | 'payment'
  | 'review'
  // T6/T8 pipeline types (written by remindscheduledmoves / generatetaxstatements —
  // listed here so web display code can label them once a notifications UI exists).
  | 'move_reminder'
  | 'move_starting'
  | 'tax_statement'
  | 'system'

/**
 * Writes a `notifications` row. The deployed `sendpush` function fires on
 * notifications create and fans out an OS push (Appwrite Messaging / FCM) to
 * the recipient — so web actions push to mobile with no extra web code.
 *
 * Best-effort: never throws (a notification failure must not fail the action
 * that triggered it), mirroring the mobile cloud functions.
 */
export async function writeNotification(params: {
  userId: string
  type: NotifyType
  title: string
  body: string
  data?: Record<string, unknown>
}): Promise<void> {
  const { databases } = createAdminClient()
  const row = {
    userId: params.userId,
    title: params.title,
    body: params.body,
    data: params.data ? JSON.stringify(params.data) : null,
    isRead: false,
  }

  try {
    await databases.createDocument(
      APPWRITE.DATABASE_ID,
      APPWRITE.COLLECTIONS.NOTIFICATIONS,
      ID.unique(),
      { ...row, type: params.type },
      // Addressee-only. `params.userId` is the recipient's auth account id
      // (`users.$id` === auth `$id`), so it is usable as a Role.user directly.
      notificationPermissions(params.userId)
    )
  } catch (err) {
    // `notifications.type` is an ENUM. The in-progress step types
    // (loading / in_transit / arrived_destination / unloading) are not in it
    // yet, and writing an unlisted value throws — which would cost the user the
    // in-app row as well as the push, strictly worse than a silent row. Retry
    // as `system`, which is always valid. Self-healing: once the enum is
    // widened these start pushing with no code change.
    if (params.type === 'system') {
      console.warn('[notify] writeNotification failed:', err)
      return
    }
    console.warn(
      `[notify] type '${params.type}' rejected (enum not widened yet), retrying as system:`,
      err
    )
    try {
      await databases.createDocument(
        APPWRITE.DATABASE_ID,
        APPWRITE.COLLECTIONS.NOTIFICATIONS,
        ID.unique(),
        { ...row, type: 'system' },
        notificationPermissions(params.userId)
      )
    } catch (err2) {
      console.warn('[notify] writeNotification fallback failed:', err2)
    }
  }
}

/** Relationship/string id normalizer. */
export function relId(v: unknown): string | null {
  if (!v) return null
  if (typeof v === 'string') return v
  return (v as Record<string, string>)?.$id ?? null
}

/** Resolve a mover profile id → the mover's user (auth) id, or null. */
export async function moverUserIdFromProfile(moverProfileId: string): Promise<string | null> {
  try {
    const { databases } = createAdminClient()
    const profile = await databases.getDocument(
      APPWRITE.DATABASE_ID,
      APPWRITE.COLLECTIONS.MOVER_PROFILES,
      moverProfileId
    )
    return relId(profile.userId)
  } catch {
    return null
  }
}

/**
 * Status → client notification. Every status the client cares about now maps to
 * its own pushable type — the in-progress steps used to be pinned to `system`
 * (silent), so a client got nothing for loading / in_transit /
 * arrived_destination / unloading. Keep in step with the mobile
 * updatemovestatus STATUS_PUSH_TYPE, sendpush PUSHABLE_TYPES, and the
 * notifications.type enum (the four step types still need adding there —
 * `writeNotification` falls back to `system` until they are).
 *
 * Copy is keyed, not literal. This module is server-only (it opens an admin
 * Appwrite client), so there is no ambient locale to read — one process serves
 * every language at once. `statusNotification` therefore takes the caller's
 * request-scoped `t`; a module-level constant would freeze whichever language
 * happened to load first into every user's push.
 */
const STATUS_NOTIFICATION: Record<string, { type: NotifyType; titleKey: string; bodyKey: string }> = {
  mover_accepted: { type: 'move_accepted', titleKey: 'track:notify.accepted.shortTitle', bodyKey: 'track:notify.accepted.shortBody' },
  mover_en_route: { type: 'mover_en_route', titleKey: 'track:notify.enRoute.shortTitle', bodyKey: 'track:notify.enRoute.shortBody' },
  mover_arrived: { type: 'mover_arrived', titleKey: 'track:notify.arrived.shortTitle', bodyKey: 'track:notify.arrived.shortBody' },
  loading: { type: 'loading', titleKey: 'track:notify.loading.shortTitle', bodyKey: 'track:notify.loading.shortBody' },
  in_transit: { type: 'in_transit', titleKey: 'track:notify.inTransit.shortTitle', bodyKey: 'track:notify.inTransit.shortBody' },
  arrived_destination: { type: 'arrived_destination', titleKey: 'track:notify.arrivedDestination.shortTitle', bodyKey: 'track:notify.arrivedDestination.shortBody' },
  unloading: { type: 'unloading', titleKey: 'track:notify.unloading.shortTitle', bodyKey: 'track:notify.unloading.shortBody' },
  awaiting_payment: { type: 'payment', titleKey: 'track:notify.paymentDue.shortTitle', bodyKey: 'track:notify.paymentDue.shortBody' },
  completed: { type: 'move_completed', titleKey: 'track:notify.completed.shortTitle', bodyKey: 'track:notify.completed.shortBody' },
  cancelled_by_mover: { type: 'move_cancelled', titleKey: 'track:notify.cancelled.shortTitle', bodyKey: 'track:notify.cancelled.shortBody' },
}

/**
 * The notification for a move status, rendered with `t`, or null when the
 * status carries none.
 *
 * TODO (wave 4, D8): the recipient is the *client*, but the only locale a
 * mover-initiated route can resolve is the *mover's*. Once `users` carries a
 * language attribute, callers should pass `getTranslationsForLocale(client.language).t`
 * instead of the request's `t`.
 */
export function statusNotification(
  status: string,
  t: TFunction
): { type: NotifyType; title: string; body: string } | null {
  const spec = STATUS_NOTIFICATION[status]
  if (!spec) return null
  return { type: spec.type, title: t(spec.titleKey), body: t(spec.bodyKey) }
}
