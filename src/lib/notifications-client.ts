/**
 * Browser-side notification writes behind the bell (`PATCH /api/notifications`)
 * plus an in-page "read" broadcast: the bell hears a mark-read the moment it
 * succeeds, wherever it was made, instead of waiting for its next fetch.
 * Same contract as the mover app's `onNotificationsRead` / `applyReadChange`
 * (lib/notifications.ts there). `'all'` = every notification read.
 */

export type ReadChange = { ids: readonly string[] } | 'all'

const readListeners = new Set<(change: ReadChange) => void>()

export function onNotificationsRead(listener: (change: ReadChange) => void): () => void {
  readListeners.add(listener)
  return () => {
    readListeners.delete(listener)
  }
}

function emitNotificationsRead(change: ReadChange) {
  readListeners.forEach((listener) => listener(change))
}

/** Apply a read broadcast to a local list (pure). Untouched rows keep their identity. */
export function applyReadChange<T extends { $id: string; isRead?: boolean | null }>(items: T[], change: ReadChange): T[] {
  if (change === 'all') return items.map((n) => (n.isRead ? n : { ...n, isRead: true }))
  const ids = new Set(change.ids)
  return items.map((n) => (ids.has(n.$id) && !n.isRead ? { ...n, isRead: true } : n))
}

async function patchRead(body: { id: string } | { all: true }): Promise<void> {
  const res = await fetch('/api/notifications', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || `HTTP ${res.status}`)
  }
}

export async function markNotificationRead(id: string): Promise<void> {
  await patchRead({ id })
  emitNotificationsRead({ ids: [id] })
}

export async function markAllNotificationsRead(): Promise<void> {
  await patchRead({ all: true })
  emitNotificationsRead('all')
}
