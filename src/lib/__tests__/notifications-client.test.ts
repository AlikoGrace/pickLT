import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  applyReadChange,
  markAllNotificationsRead,
  markNotificationRead,
  onNotificationsRead,
} from '../notifications-client'

describe('read broadcast — the bell dot drops without waiting on a refetch', () => {
  const items = [
    { $id: 'a', isRead: false },
    { $id: 'b', isRead: false },
    { $id: 'c', isRead: true },
  ]

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('applyReadChange flips only the named rows, or all of them', () => {
    expect(applyReadChange(items, { ids: ['a'] }).filter((n) => !n.isRead).map((n) => n.$id)).toEqual(['b'])
    expect(applyReadChange(items, 'all').every((n) => n.isRead)).toBe(true)
    // Untouched rows keep their identity (no needless re-render).
    expect(applyReadChange(items, { ids: ['a'] })[2]).toBe(items[2])
    expect(applyReadChange(items, 'all')[2]).toBe(items[2])
  })

  it('mark one / mark all PATCH the route and notify listeners after the write', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const heard: unknown[] = []
    const off = onNotificationsRead((c) => heard.push(c))
    await markNotificationRead('a')
    await markAllNotificationsRead()
    off()
    await markNotificationRead('c')
    expect(heard).toEqual([{ ids: ['a'] }, 'all'])
    expect(fetchMock).toHaveBeenCalledTimes(3)
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('/api/notifications')
    expect(init.method).toBe('PATCH')
    expect(JSON.parse(String(init.body))).toEqual({ id: 'a' })
    expect(JSON.parse(String((fetchMock.mock.calls[1] as unknown as [string, RequestInit])[1].body))).toEqual({ all: true })
  })

  it('a failed write throws and broadcasts nothing', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: 'nope' }), { status: 500 })))
    const heard: unknown[] = []
    const off = onNotificationsRead((c) => heard.push(c))
    await expect(markNotificationRead('a')).rejects.toThrow('nope')
    off()
    expect(heard).toEqual([])
  })
})
