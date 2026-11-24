import { describe, expect, it } from 'vitest'

import {
  ACCOUNT_BLOCKERS,
  classifyDeleteResponse,
  displayNameOf,
  outcomeMessageKey,
} from '../account-delete'

/** Plan `legal/3.account-deletion`, phase B on the web. */
describe('classifyDeleteResponse', () => {
  it('is deleted only on a 2xx with an explicit ok', () => {
    expect(classifyDeleteResponse(200, '{"ok":true,"summary":null}')).toEqual({ status: 'deleted' })
    expect(classifyDeleteResponse(200, '{}')).toEqual({ status: 'failed' })
    expect(classifyDeleteResponse(500, '{"ok":true}')).toEqual({ status: 'failed' })
  })

  it.each(ACCOUNT_BLOCKERS)('passes the blocker %s through', (code) => {
    const outcome = classifyDeleteResponse(409, JSON.stringify({ ok: false, fnCode: code, blockers: [code] }))
    expect(outcome).toEqual({ status: 'blocked', code })
    expect(outcomeMessageKey(outcome as never)).toBe(`errors:${code}`)
  })

  it('asks for a fresh sign-in', () => {
    const outcome = classifyDeleteResponse(401, '{"ok":false,"fnCode":"account.reauthRequired"}')
    expect(outcome).toEqual({ status: 'reauth' })
    expect(outcomeMessageKey(outcome as never)).toBe('errors:account.reauthRequired')
  })

  it('treats anything else as a failure that can be retried', () => {
    for (const [status, body] of [
      [500, '{"ok":false,"fnCode":"account.deletionIncomplete","resumable":true}'],
      [500, 'not json'],
      [200, ''],
      [200, '[]'],
      [403, '{"ok":false,"fnCode":"fees.restricted"}'],
    ] as const) {
      const outcome = classifyDeleteResponse(status, body)
      expect(outcome).toEqual({ status: 'failed' })
      expect(outcomeMessageKey(outcome as never)).toBe('errors:account.deletionIncomplete')
    }
  })
})

describe('displayNameOf', () => {
  it('names a tombstone with the translated label', () => {
    expect(displayNameOf('deleted', 'Deleted user', 'Mover')).toBe('Deleted user')
    expect(displayNameOf('Anna Becker', 'Deleted user', 'Mover')).toBe('Anna Becker')
    expect(displayNameOf(null, 'Deleted user', 'Mover')).toBe('Mover')
    expect(displayNameOf('  ', 'Deleted user', 'Mover')).toBe('Mover')
  })
})
