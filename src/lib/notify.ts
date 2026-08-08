import { ID } from 'node-appwrite'

import { createAdminClient } from './appwrite-server'
import { APPWRITE } from './constants'

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
      { ...row, type: params.type }
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
        { ...row, type: 'system' }
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
 */
export const STATUS_NOTIFICATION: Record<string, { type: NotifyType; title: string; body: string }> = {
  mover_accepted: { type: 'move_accepted', title: 'Mover Accepted', body: 'A mover has accepted your move request!' },
  mover_en_route: { type: 'mover_en_route', title: 'Mover En Route', body: 'Your mover is on the way to your pickup location.' },
  mover_arrived: { type: 'mover_arrived', title: 'Mover Arrived', body: 'Your mover has arrived at the pickup location.' },
  loading: { type: 'loading', title: 'Loading Started', body: 'Your items are being loaded.' },
  in_transit: { type: 'in_transit', title: 'In Transit', body: 'Your items are on the way to the destination.' },
  arrived_destination: { type: 'arrived_destination', title: 'Arrived', body: 'Your mover has arrived at the destination.' },
  unloading: { type: 'unloading', title: 'Unloading', body: 'Your items are being unloaded.' },
  awaiting_payment: { type: 'payment', title: 'Payment Due', body: 'Your move is done — please confirm payment.' },
  completed: { type: 'move_completed', title: 'Move Completed', body: 'Your move has been completed! Please leave a review.' },
  cancelled_by_mover: { type: 'move_cancelled', title: 'Move Cancelled', body: 'The mover has cancelled this move.' },
}
