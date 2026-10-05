import { describe, expect, it } from 'vitest'
import {
  CallApiError,
  callErrorKey,
  callOutcomeKey,
  callPhaseFor,
  canCallOnMove,
  formatDuration,
  isIncomingRing,
  isLiveCall,
  isRingExpired,
  micErrorCode,
  parseFunctionResponse,
  toCallRow,
  type CallRow,
} from '../call-state'

const NOW = Date.parse('2026-10-05T12:00:00.000Z')

function row(over: Partial<CallRow> = {}): CallRow {
  return {
    $id: 'call1',
    moveId: 'move1',
    callerId: 'alice',
    calleeId: 'bob',
    callerRole: 'client',
    status: 'ringing',
    room: 'call_call1',
    ringExpiresAt: new Date(NOW + 30_000).toISOString(),
    answeredAt: null,
    endedAt: null,
    durationSec: null,
    ...over,
  }
}

describe('toCallRow', () => {
  it('accepts a function / realtime payload', () => {
    const c = toCallRow({ ...row(), $collectionId: 'calls', endedBy: null })
    expect(c).toEqual(row())
  })

  it('rejects partial payloads and unknown statuses', () => {
    expect(toCallRow(null)).toBeNull()
    expect(toCallRow({ $id: 'x' })).toBeNull()
    expect(toCallRow({ ...row(), status: 'weird' })).toBeNull()
    expect(toCallRow({ ...row(), calleeId: '' })).toBeNull()
  })

  it('tolerates relationship-shaped ids and defaults the role', () => {
    const c = toCallRow({ ...row(), callerId: { $id: 'alice' }, callerRole: undefined })
    expect(c?.callerId).toBe('alice')
    expect(c?.callerRole).toBe('client')
  })
})

describe('ring expiry / liveness', () => {
  it('a ring is live until ringExpiresAt', () => {
    expect(isRingExpired(row(), NOW)).toBe(false)
    expect(isLiveCall(row(), NOW)).toBe(true)
    const late = row({ ringExpiresAt: new Date(NOW - 1).toISOString() })
    expect(isRingExpired(late, NOW)).toBe(true)
    expect(isLiveCall(late, NOW)).toBe(false)
  })

  it('accepted is live regardless of the ring expiry; terminal is not', () => {
    expect(isLiveCall(row({ status: 'accepted', ringExpiresAt: new Date(NOW - 99_000).toISOString() }), NOW)).toBe(true)
    for (const status of ['declined', 'cancelled', 'missed', 'ended', 'failed'] as const) {
      expect(isLiveCall(row({ status }), NOW)).toBe(false)
    }
    expect(isLiveCall(null, NOW)).toBe(false)
  })

  it('an unparseable expiry is not treated as run out', () => {
    expect(isRingExpired(row({ ringExpiresAt: null }), NOW)).toBe(false)
  })
})

describe('callPhaseFor', () => {
  it('caller sees calling, callee sees incoming while ringing', () => {
    expect(callPhaseFor(row(), 'alice', NOW)).toBe('calling')
    expect(callPhaseFor(row(), 'bob', NOW)).toBe('incoming')
    expect(isIncomingRing(row(), 'bob', NOW)).toBe(true)
    expect(isIncomingRing(row(), 'alice', NOW)).toBe(false)
  })

  it('accepted is connected for both; terminal and run-out rings are ended', () => {
    expect(callPhaseFor(row({ status: 'accepted' }), 'alice', NOW)).toBe('connected')
    expect(callPhaseFor(row({ status: 'accepted' }), 'bob', NOW)).toBe('connected')
    expect(callPhaseFor(row({ status: 'missed' }), 'bob', NOW)).toBe('ended')
    expect(callPhaseFor(row({ ringExpiresAt: new Date(NOW - 1).toISOString() }), 'bob', NOW)).toBe('ended')
  })

  it('a stranger is not a party', () => {
    expect(callPhaseFor(row(), 'eve', NOW)).toBeNull()
    expect(isIncomingRing(row(), 'eve', NOW)).toBe(false)
  })
})

describe('formatDuration', () => {
  it('formats m:ss and h:mm:ss', () => {
    expect(formatDuration(0)).toBe('0:00')
    expect(formatDuration(5)).toBe('0:05')
    expect(formatDuration(65)).toBe('1:05')
    expect(formatDuration(600)).toBe('10:00')
    expect(formatDuration(3661)).toBe('1:01:01')
  })

  it('clamps junk to 0:00 and floors fractions', () => {
    expect(formatDuration(-3)).toBe('0:00')
    expect(formatDuration(Number.NaN)).toBe('0:00')
    expect(formatDuration(59.9)).toBe('0:59')
  })
})

describe('callOutcomeKey', () => {
  it('reads from the viewer side', () => {
    expect(callOutcomeKey(row({ status: 'declined' }), 'alice')).toBe('web:call.outcome.declined')
    expect(callOutcomeKey(row({ status: 'missed' }), 'alice')).toBe('web:call.outcome.noAnswer')
    expect(callOutcomeKey(row({ status: 'missed' }), 'bob')).toBe('web:call.outcome.missed')
    expect(callOutcomeKey(row({ status: 'cancelled' }), 'bob')).toBe('web:call.outcome.missed')
    expect(callOutcomeKey(row({ status: 'ended' }), 'bob')).toBe('web:call.outcome.ended')
    expect(callOutcomeKey(row({ status: 'failed' }), 'alice')).toBe('web:call.outcome.failed')
  })
})

describe('canCallOnMove', () => {
  it('needs a counterpart and an open move', () => {
    expect(canCallOnMove('mover_en_route', true)).toBe(true)
    expect(canCallOnMove('mover_accepted', false)).toBe(false)
    expect(canCallOnMove(null, true)).toBe(false)
    for (const s of ['completed', 'cancelled_by_client', 'cancelled_by_mover', 'cancelled']) {
      expect(canCallOnMove(s, true)).toBe(false)
    }
  })
})

describe('callErrorKey', () => {
  it('maps server fnCodes, falling back to the generic message', () => {
    expect(callErrorKey('call.busy')).toBe('web:call.error.busy')
    expect(callErrorKey('call.moveClosed')).toBe('web:call.error.moveClosed')
    expect(callErrorKey('message.noMoverYet')).toBe('web:call.error.noMover')
    expect(callErrorKey('call.expired')).toBe('web:call.error.ended')
    expect(callErrorKey('call.micDenied')).toBe('web:call.error.micDenied')
    expect(callErrorKey('nope')).toBe('web:call.error.generic')
    expect(callErrorKey(undefined)).toBe('web:call.error.generic')
  })
})

describe('parseFunctionResponse', () => {
  it('returns the body on a 2xx ok', () => {
    expect(parseFunctionResponse(200, JSON.stringify({ ok: true, call: { $id: 'c' } }))).toEqual({ ok: true, call: { $id: 'c' } })
  })

  it('throws the fnCode on a failure', () => {
    try {
      parseFunctionResponse(409, JSON.stringify({ ok: false, error: 'Already in a call', fnCode: 'call.busy' }))
      expect.unreachable()
    } catch (err) {
      expect(err).toBeInstanceOf(CallApiError)
      expect((err as CallApiError).fnCode).toBe('call.busy')
      expect((err as CallApiError).status).toBe(409)
    }
  })

  it('treats ok:false on a 200 and malformed bodies as failures', () => {
    expect(() => parseFunctionResponse(200, JSON.stringify({ ok: false, fnCode: 'call.notFound' }))).toThrow(CallApiError)
    expect(() => parseFunctionResponse(200, 'not json')).toThrow(CallApiError)
    expect(() => parseFunctionResponse(500, '')).toThrow(CallApiError)
  })
})

describe('micErrorCode', () => {
  it('separates a denied permission from a missing device', () => {
    expect(micErrorCode({ name: 'NotAllowedError' })).toBe('call.micDenied')
    expect(micErrorCode({ name: 'NotFoundError' })).toBe('call.micUnavailable')
    expect(micErrorCode(new Error('x'))).toBe('call.micUnavailable')
  })
})
