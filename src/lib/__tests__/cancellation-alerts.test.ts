import { afterEach, describe, expect, it } from 'vitest'

import {
  CANCEL_ALERT_MAX_AGE_MS,
  CANCEL_ALERTS_SHOWN_KEY,
  CLAIM_GRACE_MS,
  EXPLAINED_WINDOW_MS,
  MAX_SHOWN_IDS,
  cancellationDisposition,
  claimMoveCancellation,
  isMoveCancellationClaimed,
  loadShownIds,
  markMoveCancellationExplained,
  onCancellationCheckRequested,
  pendingCancellations,
  recentCancellationsUrl,
  requestCancellationCheck,
  resetCancellationClaims,
  saveShownIds,
} from '../cancellation-alerts'
import { notificationListFilters } from '../notification-list-query'

const NOW = Date.parse('2026-10-03T12:00:00.000Z')
const ago = (ms: number) => new Date(NOW - ms).toISOString()

function row(id: string, createdAt: string, extra: Partial<{ type: string; isRead: boolean }> = {}) {
  return { $id: id, type: 'move_cancelled', isRead: false, $createdAt: createdAt, ...extra }
}

describe('pendingCancellations', () => {
  it('keeps unread, unshown move_cancelled rows from the last day, oldest first', () => {
    const items = [
      row('new', ago(1000)),
      row('old', ago(60_000)),
      row('read', ago(2000), { isRead: true }),
      row('other', ago(2000), { type: 'move_accepted' }),
      row('shown', ago(3000)),
      row('stale', ago(CANCEL_ALERT_MAX_AGE_MS + 1)),
      row('bad-date', 'not a date'),
    ]
    expect(pendingCancellations(items, new Set(['shown']), NOW).map((n) => n.$id)).toEqual(['old', 'new'])
  })

  it('a row exactly at the age limit still counts', () => {
    expect(pendingCancellations([row('edge', ago(CANCEL_ALERT_MAX_AGE_MS))], new Set(), NOW)).toHaveLength(1)
  })
})

describe('claim registry', () => {
  afterEach(() => resetCancellationClaims())

  it('claims are counted and released per mount', () => {
    const r1 = claimMoveCancellation('m1')
    const r2 = claimMoveCancellation('m1')
    expect(isMoveCancellationClaimed('m1')).toBe(true)
    r1()
    expect(isMoveCancellationClaimed('m1')).toBe(true)
    r2()
    expect(isMoveCancellationClaimed('m1')).toBe(false)
    expect(isMoveCancellationClaimed(null)).toBe(false)
  })

  it('unclaimed moves and rows without a move show', () => {
    expect(cancellationDisposition('m1', NOW - 1000, NOW)).toBe('show')
    expect(cancellationDisposition(null, NOW - 1000, NOW)).toBe('show')
  })

  it('a claimed move defers within the grace, then shows', () => {
    const release = claimMoveCancellation('m1')
    expect(cancellationDisposition('m1', NOW - 1000, NOW)).toBe('defer')
    expect(cancellationDisposition('m1', NOW - CLAIM_GRACE_MS, NOW)).toBe('show')
    release()
    expect(cancellationDisposition('m1', NOW - 1000, NOW)).toBe('show')
  })

  it('an explained move retires rows written near the explanation, even after unmount', () => {
    const release = claimMoveCancellation('m1')
    markMoveCancellationExplained('m1', NOW)
    release()
    expect(cancellationDisposition('m1', NOW + 2000, NOW + 3000)).toBe('retire')
    expect(cancellationDisposition('m1', NOW - EXPLAINED_WINDOW_MS, NOW)).toBe('retire')
    // A later, separate cancellation of the same move (re-dropped) still shows.
    expect(cancellationDisposition('m1', NOW + EXPLAINED_WINDOW_MS + 1, NOW + EXPLAINED_WINDOW_MS + 2)).toBe('show')
  })
})

describe('shown ids storage', () => {
  function memoryStorage(initial: Record<string, string> = {}) {
    const data = { ...initial }
    return {
      data,
      getItem: (k: string) => (k in data ? data[k] : null),
      setItem: (k: string, v: string) => {
        data[k] = v
      },
    }
  }

  it('round-trips and keeps only the newest ids', () => {
    const s = memoryStorage()
    const ids = Array.from({ length: MAX_SHOWN_IDS + 5 }, (_, i) => `n${i}`)
    saveShownIds(s, ids)
    const loaded = loadShownIds(s)
    expect(loaded.size).toBe(MAX_SHOWN_IDS)
    expect(loaded.has('n0')).toBe(false)
    expect(loaded.has(`n${MAX_SHOWN_IDS + 4}`)).toBe(true)
  })

  it('tolerates missing, broken and throwing stores', () => {
    expect(loadShownIds(null).size).toBe(0)
    expect(loadShownIds(memoryStorage({ [CANCEL_ALERTS_SHOWN_KEY]: '{oops' })).size).toBe(0)
    expect([...loadShownIds(memoryStorage({ [CANCEL_ALERTS_SHOWN_KEY]: '["a",1,null]' }))]).toEqual(['a'])
    const throwing = {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('blocked')
      },
    }
    expect(loadShownIds(throwing).size).toBe(0)
    expect(() => saveShownIds(throwing, ['a'])).not.toThrow()
  })
})

describe('feed query', () => {
  it('asks for unread cancellations since a day ago', () => {
    const url = new URL(recentCancellationsUrl(NOW), 'http://x')
    expect(url.pathname).toBe('/api/notifications')
    expect(url.searchParams.get('type')).toBe('move_cancelled')
    expect(url.searchParams.get('unreadOnly')).toBe('true')
    expect(url.searchParams.get('since')).toBe(ago(CANCEL_ALERT_MAX_AGE_MS))
  })

  it('the route accepts those filters and drops malformed ones', () => {
    const ok = notificationListFilters(new URL(recentCancellationsUrl(NOW), 'http://x').searchParams)
    expect(ok).toEqual({ type: 'move_cancelled', since: ago(CANCEL_ALERT_MAX_AGE_MS) })
    expect(notificationListFilters(new URLSearchParams())).toEqual({ type: null, since: null })
    expect(notificationListFilters(new URLSearchParams({ type: 'x") OR 1', since: 'yesterday' }))).toEqual({
      type: null,
      since: null,
    })
  })
})

describe('check nudges', () => {
  it('reach subscribers until they unsubscribe', () => {
    let calls = 0
    const off = onCancellationCheckRequested(() => calls++)
    requestCancellationCheck()
    off()
    requestCancellationCheck()
    expect(calls).toBe(1)
  })
})
