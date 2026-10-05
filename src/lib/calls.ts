/**
 * Browser client for in-app calls. Every action goes straight to the `calls`
 * Appwrite function with the signed-in user's own Appwrite session (the same
 * path `googleauth-client.ts` uses), so the function sees the caller through
 * `x-appwrite-user-id` — no Next API route in between. Tokens come from the
 * `livekittoken` function, rows arrive over Appwrite realtime.
 *
 * Pure helpers (phase, duration, error keys) live in `@/lib/call-state` and
 * are re-exported here for convenience.
 */

import { ExecutionMethod, Query } from 'appwrite'
import { client, databases, functions } from '@/lib/appwrite'
import { parseFunctionResponse, toCallRow, type CallRow } from '@/lib/call-state'

export * from '@/lib/call-state'

const CALLS_FUNCTION = process.env.NEXT_PUBLIC_FUNCTION_CALLS || 'calls'
const LIVEKIT_TOKEN_FUNCTION = process.env.NEXT_PUBLIC_FUNCTION_LIVEKIT_TOKEN || 'livekittoken'
const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || ''
const CALLS_COLLECTION = process.env.NEXT_PUBLIC_COLLECTION_CALLS || 'calls'

async function execute(functionId: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const execution = await functions.createExecution({
    functionId,
    body: JSON.stringify(body),
    async: false,
    xpath: '/',
    method: ExecutionMethod.POST,
    headers: { 'content-type': 'application/json' },
  })
  return parseFunctionResponse(execution.responseStatusCode, execution.responseBody)
}

function callFrom(obj: Record<string, unknown>): CallRow {
  const call = toCallRow(obj.call)
  if (!call) throw new Error('calls returned no call')
  return call
}

export async function startCall(moveId: string): Promise<{ call: CallRow; callerName: string }> {
  const res = await execute(CALLS_FUNCTION, { action: 'start', moveId })
  return { call: callFrom(res), callerName: typeof res.callerName === 'string' ? res.callerName : '' }
}

export type CallAction = 'accept' | 'decline' | 'cancel' | 'end'

export async function callAction(action: CallAction, callId: string): Promise<CallRow> {
  return callFrom(await execute(CALLS_FUNCTION, { action, callId }))
}

export const acceptCall = (callId: string) => callAction('accept', callId)
export const declineCall = (callId: string) => callAction('decline', callId)
export const cancelCall = (callId: string) => callAction('cancel', callId)
export const endCall = (callId: string) => callAction('end', callId)

export interface CallToken {
  url: string
  token: string
  room: string
}

/** LiveKit credentials for `callId`: the caller while ringing, both parties once accepted. */
export async function fetchCallToken(callId: string): Promise<CallToken> {
  const res = await execute(LIVEKIT_TOKEN_FUNCTION, { callId })
  const url = typeof res.url === 'string' ? res.url : ''
  const token = typeof res.token === 'string' ? res.token : ''
  if (!url || !token) throw new Error('livekittoken returned no credentials')
  return { url, token, room: typeof res.room === 'string' ? res.room : '' }
}

/** One call row, read with the user's session (row-readable by caller + callee). */
export async function getCall(callId: string): Promise<CallRow | null> {
  if (!DATABASE_ID) return null
  try {
    return toCallRow(await databases.getDocument(DATABASE_ID, CALLS_COLLECTION, callId))
  } catch {
    return null
  }
}

/** Rows still ringing for `userId` as the callee — the catch-up after a missed realtime event. */
export async function listRingingFor(userId: string): Promise<CallRow[]> {
  if (!DATABASE_ID) return []
  try {
    const res = await databases.listDocuments(DATABASE_ID, CALLS_COLLECTION, [
      Query.equal('calleeId', userId),
      Query.equal('status', 'ringing'),
      Query.orderDesc('$createdAt'),
      Query.limit(5),
    ])
    return res.documents.map(toCallRow).filter((c): c is CallRow => c !== null)
  } catch {
    return []
  }
}

/**
 * Realtime on the `calls` collection, filtered to rows where `userId` is a
 * party. Returns the unsubscribe.
 */
export function subscribeToCalls(userId: string, cb: (call: CallRow) => void): () => void {
  if (!DATABASE_ID || !userId) return () => {}
  const channel = `databases.${DATABASE_ID}.collections.${CALLS_COLLECTION}.documents`
  return client.subscribe(channel, (event) => {
    const call = toCallRow(event.payload)
    if (!call) return
    if (call.callerId !== userId && call.calleeId !== userId) return
    cb(call)
  })
}
