import type { TFunction } from 'i18next'
import { ID } from 'node-appwrite'

import { createAdminClient } from './appwrite-server'
import { APPWRITE } from './constants'
import { notificationPermissions } from './doc-permissions'
import { createI18nInstance, DEFAULT_LOCALE } from './i18n'
import { getResources } from './i18n-catalog'

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
 * i18n wire contract (plan 11 §S1/S2), the same one the Appwrite functions
 * emit — see `pickltmobile/functions/cancelmove/src/main.js`. A notification
 * row carries a KEY, not a finished sentence: `sendpush` resolves it in the
 * recipient's locale before it reaches FCM, and the in-app list re-resolves it
 * at read time so notification history follows a language switch.
 *
 *   key       base key in the `notifications` namespace;
 *             title = `<key>.title`, body = `<key>.body`
 *   titleKey  optional full key, when the title is not `<key>.title`
 *   bodyKey   optional full key; `null` means "never translate the body"
 *             (it is user-authored text) — use the stored one
 *   params    interpolation params, pre-formatted per conventions §3.4
 *
 * The row's `title`/`body` keep an English rendering as the wire-compatible
 * fallback: a missing key, a missing user document or an absent locale all
 * land on it, and a push is never lost to a translation problem.
 */
export interface NotifyI18n {
  key: string
  titleKey?: string
  bodyKey?: string | null
  params?: Record<string, unknown>
}

/**
 * Writes a `notifications` row. The deployed `sendpush` function fires on
 * notifications create and fans out an OS push (Appwrite Messaging / FCM) to
 * the recipient — so web actions push to mobile with no extra web code.
 *
 * `title`/`body` must be ENGLISH. They are the fallback of last resort, read by
 * consumers that cannot resolve `i18n.key`; rendering them in the *acting*
 * user's language (which is the only locale a request scope knows, and is the
 * mover's on every mover-initiated route here) would freeze the wrong language
 * into the recipient's row.
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
  i18n?: NotifyI18n
}): Promise<void> {
  const { databases } = createAdminClient()

  // `i18nKey` and friends ride inside the existing `data` text column — no
  // schema change. `bodyKey` is spread on presence, not truthiness: an explicit
  // `null` is meaningful ("this body is user text, never translate it").
  let data: Record<string, unknown> | null = params.data ?? null
  if (params.i18n) {
    data = {
      ...(params.data ?? {}),
      i18nKey: params.i18n.key,
      ...(params.i18n.titleKey !== undefined ? { i18nTitleKey: params.i18n.titleKey } : {}),
      ...(params.i18n.bodyKey !== undefined ? { i18nBodyKey: params.i18n.bodyKey } : {}),
      i18nParams: params.i18n.params ?? {},
    }
  }

  const row = {
    userId: params.userId,
    title: params.title,
    body: params.body,
    data: data ? JSON.stringify(data) : null,
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
 * Copy is keyed, not literal, and the key travels *with the row* (`i18nKey`)
 * rather than being resolved here. This module is server-only (it opens an
 * admin Appwrite client) and the only locale a request scope can see is the
 * ACTING user's — on every route below that is the mover, while the recipient
 * is the client. Resolving here could therefore only ever have produced the
 * wrong language; the recipient's locale is known to `sendpush` and to the
 * in-app list, and that is where the key is now rendered.
 *
 * `i18nKey` is the base key in the shared `notifications` namespace, whose
 * copy is identical in all four repos. The `track:notify.*.short*` pair is kept
 * for the English fallback rendering only.
 */
const STATUS_NOTIFICATION: Record<
  string,
  { type: NotifyType; i18nKey: string; titleKey: string; bodyKey: string }
> = {
  mover_accepted: { type: 'move_accepted', i18nKey: 'status.moverAccepted', titleKey: 'track:notify.accepted.shortTitle', bodyKey: 'track:notify.accepted.shortBody' },
  mover_en_route: { type: 'mover_en_route', i18nKey: 'status.moverEnRoute', titleKey: 'track:notify.enRoute.shortTitle', bodyKey: 'track:notify.enRoute.shortBody' },
  mover_arrived: { type: 'mover_arrived', i18nKey: 'status.moverArrived', titleKey: 'track:notify.arrived.shortTitle', bodyKey: 'track:notify.arrived.shortBody' },
  loading: { type: 'loading', i18nKey: 'status.loading', titleKey: 'track:notify.loading.shortTitle', bodyKey: 'track:notify.loading.shortBody' },
  in_transit: { type: 'in_transit', i18nKey: 'status.inTransit', titleKey: 'track:notify.inTransit.shortTitle', bodyKey: 'track:notify.inTransit.shortBody' },
  arrived_destination: { type: 'arrived_destination', i18nKey: 'status.arrivedDestination', titleKey: 'track:notify.arrivedDestination.shortTitle', bodyKey: 'track:notify.arrivedDestination.shortBody' },
  unloading: { type: 'unloading', i18nKey: 'status.unloading', titleKey: 'track:notify.unloading.shortTitle', bodyKey: 'track:notify.unloading.shortBody' },
  awaiting_payment: { type: 'payment', i18nKey: 'status.awaitingPayment', titleKey: 'track:notify.paymentDue.shortTitle', bodyKey: 'track:notify.paymentDue.shortBody' },
  completed: { type: 'move_completed', i18nKey: 'status.completed', titleKey: 'track:notify.completed.shortTitle', bodyKey: 'track:notify.completed.shortBody' },
  cancelled_by_mover: { type: 'move_cancelled', i18nKey: 'status.cancelledByMover', titleKey: 'track:notify.cancelled.shortTitle', bodyKey: 'track:notify.cancelled.shortBody' },
}

/**
 * An English-pinned `t`, for rendering the wire-compatible fallback only.
 *
 * A module-level instance is safe *because* it is pinned: nothing here calls
 * `changeLanguage`, so there is no mutable language state for one request to
 * leak into another. Request-scoped copy still goes through `getTranslations()`.
 */
let englishT: TFunction | null = null
function enT(): TFunction {
  if (!englishT) {
    const instance = createI18nInstance(DEFAULT_LOCALE, getResources(DEFAULT_LOCALE))
    englishT = instance.t.bind(instance) as TFunction
  }
  return englishT
}

/**
 * The notification for a move status, or null when the status carries none.
 *
 * `title`/`body` come back in English — they are the stored fallback, not what
 * the recipient reads. `i18nKey` is what the recipient reads, resolved in
 * *their* locale by `sendpush` (push) and by the notification list (in-app).
 */
export function statusNotification(
  status: string
): { type: NotifyType; title: string; body: string; i18nKey: string } | null {
  const spec = STATUS_NOTIFICATION[status]
  if (!spec) return null
  const t = enT()
  return { type: spec.type, title: t(spec.titleKey), body: t(spec.bodyKey), i18nKey: spec.i18nKey }
}
