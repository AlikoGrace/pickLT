import { ID } from 'node-appwrite'

import { createAdminClient } from './appwrite-server'
import { APPWRITE } from './constants'

export type NotifyType =
  | 'move_request'
  | 'move_accepted'
  | 'mover_en_route'
  | 'mover_arrived'
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
  try {
    const { databases } = createAdminClient()
    await databases.createDocument(
      APPWRITE.DATABASE_ID,
      APPWRITE.COLLECTIONS.NOTIFICATIONS,
      ID.unique(),
      {
        userId: params.userId,
        type: params.type,
        title: params.title,
        body: params.body,
        data: params.data ? JSON.stringify(params.data) : null,
        isRead: false,
      }
    )
  } catch (err) {
    console.warn('[notify] writeNotification failed:', err)
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
 * Status → client notification. Pushable statuses use their own type; the
 * granular in-progress steps stay `system` (silent) since the client is
 * watching the live track screen. Keep in step with the mobile
 * updatemovestatus STATUS_PUSH_TYPE + notifications.type enum.
 */
export const STATUS_NOTIFICATION: Record<string, { type: NotifyType; title: string; body: string }> = {
  mover_en_route: { type: 'mover_en_route', title: 'Mover En Route', body: 'Your mover is on the way to your pickup location.' },
  mover_arrived: { type: 'mover_arrived', title: 'Mover Arrived', body: 'Your mover has arrived at the pickup location.' },
  loading: { type: 'system', title: 'Loading Started', body: 'Your items are being loaded.' },
  in_transit: { type: 'system', title: 'In Transit', body: 'Your items are on the way to the destination.' },
  arrived_destination: { type: 'system', title: 'Arrived', body: 'Your mover has arrived at the destination.' },
  unloading: { type: 'system', title: 'Unloading', body: 'Your items are being unloaded.' },
  awaiting_payment: { type: 'payment', title: 'Payment Due', body: 'Your move is done — please confirm payment.' },
  completed: { type: 'move_completed', title: 'Move Completed', body: 'Your move has been completed! Please leave a review.' },
}
