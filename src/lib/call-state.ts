/**
 * Pure state for in-app audio calls (plan `pickltmobile/.agent/plans/calls/0.master.md`
 * §4). No Appwrite client, no LiveKit, no DOM, so it runs under vitest; the
 * browser wrappers live in `@/lib/calls`.
 *
 * A call is a `calls` row written only by the `calls` Appwrite function:
 * `ringing → accepted | declined (callee) | cancelled (caller) | missed (timeout)`,
 * `accepted → ended`. Terminal states are final. The ring lasts 45 s; the
 * server sweeper marks a run-out ring `missed`, but realtime may deliver that
 * late, so the expiry is also checked here against the row's `ringExpiresAt`.
 */

export type CallStatus = 'ringing' | 'accepted' | 'declined' | 'cancelled' | 'missed' | 'ended' | 'failed'
export type CallRole = 'client' | 'mover'

export interface CallRow {
  $id: string
  moveId: string
  callerId: string
  calleeId: string
  callerRole: CallRole
  status: CallStatus
  room: string
  ringExpiresAt: string | null
  answeredAt: string | null
  endedAt: string | null
  durationSec: number | null
  /** Who rang, written by `start` (null on rows from before it was). */
  callerName: string | null
  callerPhoto: string | null
}

export const LIVE_CALL_STATUSES: readonly CallStatus[] = ['ringing', 'accepted']

/** Move statuses the server refuses to call on (`call.moveClosed`). */
export const CALL_CLOSED_MOVE_STATUSES: readonly string[] = [
  'completed',
  'cancelled_by_client',
  'cancelled_by_mover',
  'cancelled',
]

const CALL_STATUSES = new Set<string>(['ringing', 'accepted', 'declined', 'cancelled', 'missed', 'ended', 'failed'])

/**
 * A realtime payload or function body as a `CallRow`, or null when it is not
 * one (wrong collection, partial payload). Relationship-shaped ids are not
 * expected here — the function writes plain auth ids — but tolerated.
 */
export function toCallRow(raw: unknown): CallRow | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const id = (v: unknown): string | null => {
    if (typeof v === 'string' && v) return v
    if (v && typeof v === 'object' && typeof (v as { $id?: unknown }).$id === 'string') return (v as { $id: string }).$id
    return null
  }
  const $id = id(r.$id)
  const moveId = id(r.moveId)
  const callerId = id(r.callerId)
  const calleeId = id(r.calleeId)
  if (!$id || !moveId || !callerId || !calleeId) return null
  if (typeof r.status !== 'string' || !CALL_STATUSES.has(r.status)) return null
  const str = (v: unknown) => (typeof v === 'string' && v ? v : null)
  return {
    $id,
    moveId,
    callerId,
    calleeId,
    callerRole: r.callerRole === 'mover' ? 'mover' : 'client',
    status: r.status as CallStatus,
    room: typeof r.room === 'string' ? r.room : '',
    ringExpiresAt: str(r.ringExpiresAt),
    answeredAt: str(r.answeredAt),
    endedAt: str(r.endedAt),
    callerName: str(r.callerName),
    callerPhoto: str(r.callerPhoto),
    durationSec: typeof r.durationSec === 'number' && Number.isFinite(r.durationSec) ? r.durationSec : null,
  }
}

/** A `ringing` row whose `ringExpiresAt` has passed. An unparseable expiry is treated as not yet expired (the server sweeper still ends it). */
export function isRingExpired(call: Pick<CallRow, 'status' | 'ringExpiresAt'>, nowMs: number): boolean {
  if (call.status !== 'ringing') return false
  const exp = call.ringExpiresAt ? Date.parse(call.ringExpiresAt) : NaN
  return Number.isFinite(exp) && exp <= nowMs
}

/** Ringing (and not run out) or accepted. */
export function isLiveCall(call: Pick<CallRow, 'status' | 'ringExpiresAt'> | null | undefined, nowMs = Date.now()): boolean {
  if (!call) return false
  if (!LIVE_CALL_STATUSES.includes(call.status)) return false
  return !isRingExpired(call, nowMs)
}

/**
 * Where `me` stands in `call`:
 *  - `calling`  — I placed it, it is still ringing on the other side
 *  - `incoming` — it is ringing on my side
 *  - `connected`— accepted
 *  - `ended`    — terminal, or a ring that ran out
 *  - `null`     — I am not a party
 */
export type CallPhase = 'calling' | 'incoming' | 'connected' | 'ended'

export function callPhaseFor(call: CallRow, me: string, nowMs = Date.now()): CallPhase | null {
  const isCaller = call.callerId === me
  const isCallee = call.calleeId === me
  if (!isCaller && !isCallee) return null
  if (call.status === 'accepted') return 'connected'
  if (call.status === 'ringing' && !isRingExpired(call, nowMs)) return isCaller ? 'calling' : 'incoming'
  return 'ended'
}

/** A ring the user should be shown an incoming-call modal for right now. */
export function isIncomingRing(call: CallRow, me: string, nowMs = Date.now()): boolean {
  return callPhaseFor(call, me, nowMs) === 'incoming'
}

/** `m:ss`, or `h:mm:ss` from one hour. Negative / non-finite → `0:00`. */
export function formatDuration(totalSeconds: number): string {
  const s = Number.isFinite(totalSeconds) && totalSeconds > 0 ? Math.floor(totalSeconds) : 0
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`
}

/**
 * The `web:call.outcome.*` key for a finished call as `me` sees it. A ring
 * that ran out is "no answer" for the caller and "missed" for the callee.
 */
export function callOutcomeKey(call: Pick<CallRow, 'status' | 'callerId'>, me: string): string {
  const isCaller = call.callerId === me
  switch (call.status) {
    case 'declined':
      return isCaller ? 'web:call.outcome.declined' : 'web:call.outcome.ended'
    case 'missed':
      return isCaller ? 'web:call.outcome.noAnswer' : 'web:call.outcome.missed'
    case 'cancelled':
      return isCaller ? 'web:call.outcome.ended' : 'web:call.outcome.missed'
    case 'failed':
      return 'web:call.outcome.failed'
    default:
      return 'web:call.outcome.ended'
  }
}

/** Whether the "Call in app" entry point should be offered for a move. */
/**
 * Moves on which the phone line is offered as a fallback (calls plan 4 in
 * pickltmobile): only while the move is live — the mover has accepted and the
 * client has not paid yet. Before and after, calls go through PickLte.
 */
const PHONE_FALLBACK_STATUSES: ReadonlySet<string> = new Set([
  'mover_accepted',
  'mover_en_route',
  'mover_arrived',
  'loading',
  'in_transit',
  'arrived_destination',
  'unloading',
  'awaiting_payment',
])

export function isPhoneFallbackOpen(status: string | null | undefined): boolean {
  return !!status && PHONE_FALLBACK_STATUSES.has(status)
}

export function canCallOnMove(moveStatus: string | null | undefined, hasCounterpart: boolean): boolean {
  if (!hasCounterpart) return false
  if (!moveStatus) return false
  return !CALL_CLOSED_MOVE_STATUSES.includes(moveStatus)
}

/** fnCode → `web:call.error.*`. Anything unknown is the generic failure. */
const ERROR_KEYS: Record<string, string> = {
  'call.busy': 'web:call.error.busy',
  'call.moveClosed': 'web:call.error.moveClosed',
  'message.noMoverYet': 'web:call.error.noMover',
  'move.notAuthorized': 'web:call.error.notAuthorized',
  'call.notParty': 'web:call.error.notAuthorized',
  'call.notCallee': 'web:call.error.notAuthorized',
  'move.notFound': 'web:call.error.notFound',
  'call.notFound': 'web:call.error.notFound',
  'call.notRinging': 'web:call.error.ended',
  'call.expired': 'web:call.error.ended',
  'api.unauthorized': 'web:call.error.signedOut',
  'generic.misconfigured': 'web:call.error.unavailable',
  'call.micDenied': 'web:call.error.micDenied',
  'call.micUnavailable': 'web:call.error.micUnavailable',
  'call.connectFailed': 'web:call.error.connectFailed',
}

export function callErrorKey(fnCode: string | null | undefined): string {
  return (fnCode && ERROR_KEYS[fnCode]) || 'web:call.error.generic'
}

export class CallApiError extends Error {
  readonly fnCode: string
  readonly status: number

  constructor(message: string, fnCode: string, status: number) {
    super(message)
    this.name = 'CallApiError'
    this.fnCode = fnCode
    this.status = status
  }
}

/**
 * Parse a function execution's `(responseStatusCode, responseBody)`. Throws
 * `CallApiError` with the function's `fnCode` on a non-2xx, `ok:false`, or a
 * body that is not a JSON object.
 */
export function parseFunctionResponse(status: number, body: string): Record<string, unknown> {
  let parsed: unknown
  try {
    parsed = body ? JSON.parse(body) : null
  } catch {
    throw new CallApiError(`calls returned a malformed body (HTTP ${status})`, 'generic.unexpected', status)
  }
  const obj = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : null
  if (!obj) throw new CallApiError(`calls returned no body (HTTP ${status})`, 'generic.unexpected', status)
  if (status < 200 || status >= 300 || obj.ok === false) {
    const fnCode = typeof obj.fnCode === 'string' && obj.fnCode ? obj.fnCode : 'generic.unexpected'
    const message = typeof obj.error === 'string' && obj.error ? obj.error : `call failed (HTTP ${status})`
    throw new CallApiError(message, fnCode, status)
  }
  return obj
}

/** Classify a `getUserMedia` / `setMicrophoneEnabled` failure. */
export function micErrorCode(err: unknown): 'call.micDenied' | 'call.micUnavailable' {
  const name = err && typeof err === 'object' && 'name' in err ? String((err as { name: unknown }).name) : ''
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || name === 'SecurityError') return 'call.micDenied'
  return 'call.micUnavailable'
}
