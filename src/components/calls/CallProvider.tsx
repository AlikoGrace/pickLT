'use client'

/**
 * In-app audio calls on the web (plan `pickltmobile/.agent/plans/calls/0.master.md`
 * §5): the incoming-call modal, the floating active-call bar and the LiveKit
 * media, for both the client and the mover side. Mounted once inside
 * `NotificationWrapper`, so every page under either layout can place a call
 * through `useCall().startCall(moveId, name)`.
 *
 * Signalling is the `calls` row (written only by the `calls` Appwrite function,
 * read here over realtime); media is a LiveKit room per call. LiveKit is loaded
 * with a dynamic import inside effects/handlers, never during SSR.
 *
 * Incoming ring: a realtime `calls` row with `calleeId === me`, `ringing` and
 * not past `ringExpiresAt` opens the modal and loops a soft ring; a hidden tab
 * also gets a browser `Notification` when permission was granted. Any change to
 * that row (answered elsewhere, cancelled, missed) or the expiry closes it.
 */

import { useAuth } from '@/context/auth'
import {
  acceptCall,
  callAction,
  CallApiError,
  callErrorKey,
  callOutcomeKey,
  declineCall,
  fetchCallToken,
  formatDuration,
  getCall,
  isIncomingRing,
  isLiveCall,
  listRingingFor,
  micErrorCode,
  startCall as startCallApi,
  subscribeToCalls,
  type CallRow,
} from '@/lib/calls'
import { MicrophoneIcon, PhoneIcon, PhoneXMarkIcon } from '@heroicons/react/24/solid'
import type { Room } from 'livekit-client'
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { startRing, stopRing } from './ringtone'

type MediaState = 'idle' | 'connecting' | 'connected' | 'reconnecting'

interface ActiveCall {
  /** Null while `start` is in flight. */
  call: CallRow | null
  name: string
  media: MediaState
  /** The other party is in the LiveKit room. */
  remotePresent: boolean
  muted: boolean
  /** Local clock when both sides were first in the room (drives the timer). */
  connectedAt: number | null
  /** Set once the call is over: the outcome / error line shown before the bar closes. */
  endedKey: string | null
  endedIsError: boolean
}

interface Incoming {
  call: CallRow
  name: string
}

interface CallContextValue {
  /** False outside a provider or while signed out — entry points hide. */
  available: boolean
  /** A call is ringing or in progress here; a second one can't start. */
  busy: boolean
  startCall: (moveId: string, counterpartName: string) => Promise<void>
}

const CallContext = createContext<CallContextValue>({
  available: false,
  busy: false,
  startCall: async () => {},
})

export function useCall(): CallContextValue {
  return useContext(CallContext)
}

/** Callee answered but the caller never showed up in the room (tab closed mid-ring). */
const NO_PEER_TIMEOUT_MS = 30_000
/** How long the outcome line stays on the bar. */
const ENDED_LINGER_MS = 3_500
const ERROR_LINGER_MS = 7_000
/** Row re-read while a call is live, in case a realtime event was dropped. */
const POLL_MS = 5_000

let livekitModule: Promise<typeof import('livekit-client')> | null = null
function loadLiveKit() {
  if (!livekitModule) {
    livekitModule = import('livekit-client').catch((err) => {
      livekitModule = null
      throw err
    })
  }
  return livekitModule
}

/** Ask for the mic up front so a denial never leaves the other side ringing / connected to nobody. */
async function ensureMicrophone(): Promise<void> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    throw new CallApiError('no mediaDevices', 'call.micUnavailable', 0)
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    stream.getTracks().forEach((track) => track.stop())
  } catch (err) {
    throw new CallApiError('microphone', micErrorCode(err), 0)
  }
}

function errorKeyOf(err: unknown): string {
  return callErrorKey(err instanceof CallApiError ? err.fnCode : null)
}

function showBrowserNotification(tag: string, title: string, body: string): Notification | null {
  if (typeof window === 'undefined' || !('Notification' in window)) return null
  if (Notification.permission !== 'granted') return null
  try {
    const n = new Notification(title, {
      body,
      icon: '/favicon.ico',
      tag,
      requireInteraction: true,
    } as NotificationOptions)
    n.onclick = () => {
      window.focus()
      n.close()
    }
    return n
  } catch {
    return null
  }
}

export default function CallProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const me = user?.authId ?? null

  const [active, setActiveState] = useState<ActiveCall | null>(null)
  const [incoming, setIncomingState] = useState<Incoming | null>(null)
  const [now, setNow] = useState(() => Date.now())

  // Mirrors for event handlers that outlive a render.
  const activeRef = useRef<ActiveCall | null>(null)
  const incomingRef = useRef<Incoming | null>(null)
  const roomRef = useRef<Room | null>(null)
  const audioBoxRef = useRef<HTMLDivElement | null>(null)
  /** Bumped on every teardown; async flows bail when theirs is stale. */
  const sessionRef = useRef(0)
  const cancelRequestedRef = useRef(false)
  const lingerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const notificationRef = useRef<Notification | null>(null)

  const setActive = useCallback((next: ActiveCall | null | ((prev: ActiveCall | null) => ActiveCall | null)) => {
    const value = typeof next === 'function' ? next(activeRef.current) : next
    activeRef.current = value
    setActiveState(value)
  }, [])

  const setIncoming = useCallback((value: Incoming | null) => {
    incomingRef.current = value
    setIncomingState(value)
  }, [])

  const patchActive = useCallback(
    (patch: Partial<ActiveCall>) => setActive((prev) => (prev ? { ...prev, ...patch } : prev)),
    [setActive],
  )

  // Preload LiveKit once signed in, so the click → connect chain has no module fetch in it.
  useEffect(() => {
    if (me) loadLiveKit().catch(() => {})
  }, [me])

  // ── Media teardown ──────────────────────────────────────────────────────
  const disconnectRoom = useCallback(() => {
    const room = roomRef.current
    roomRef.current = null
    if (room) room.disconnect().catch(() => {})
    if (audioBoxRef.current) audioBoxRef.current.replaceChildren()
  }, [])

  /** Close the call locally and show `key` on the bar for a moment. */
  const finish = useCallback(
    (key: string, isError = false) => {
      sessionRef.current += 1
      disconnectRoom()
      if (lingerTimerRef.current) clearTimeout(lingerTimerRef.current)
      setActive((prev) =>
        prev
          ? { ...prev, media: 'idle', remotePresent: false, endedKey: key, endedIsError: isError }
          : { call: null, name: '', media: 'idle', remotePresent: false, muted: false, connectedAt: null, endedKey: key, endedIsError: isError },
      )
      lingerTimerRef.current = setTimeout(() => setActive(null), isError ? ERROR_LINGER_MS : ENDED_LINGER_MS)
    },
    [disconnectRoom, setActive],
  )

  // ── LiveKit ─────────────────────────────────────────────────────────────
  /** Join the call's room with the mic on. Throws `CallApiError` (mic / connect). */
  const connectMedia = useCallback(
    async (callId: string, session: number) => {
      const lk = await loadLiveKit()
      const { url, token } = await fetchCallToken(callId)
      if (sessionRef.current !== session) return

      const room = new lk.Room({ adaptiveStream: false, dynacast: false })
      roomRef.current = room
      const stale = () => sessionRef.current !== session || roomRef.current !== room

      room
        .on(lk.RoomEvent.TrackSubscribed, (track) => {
          if (track.kind !== lk.Track.Kind.Audio) return
          const el = track.attach()
          el.style.display = 'none'
          audioBoxRef.current?.appendChild(el)
        })
        .on(lk.RoomEvent.TrackUnsubscribed, (track) => {
          track.detach().forEach((el) => el.remove())
        })
        .on(lk.RoomEvent.ParticipantConnected, () => {
          if (stale()) return
          setActive((prev) =>
            prev
              ? {
                  ...prev,
                  remotePresent: true,
                  connectedAt: prev.connectedAt ?? (prev.call?.status === 'accepted' ? Date.now() : null),
                }
              : prev,
          )
        })
        .on(lk.RoomEvent.ParticipantDisconnected, () => {
          if (stale() || room.remoteParticipants.size > 0) return
          const a = activeRef.current
          // The other side left an answered call: hang up for both.
          if (a?.call?.status === 'accepted') {
            const callId = a.call.$id
            finish('web:call.outcome.ended')
            callAction('end', callId).catch(() => {})
          } else {
            patchActive({ remotePresent: false })
          }
        })
        .on(lk.RoomEvent.Reconnecting, () => {
          if (!stale()) patchActive({ media: 'reconnecting' })
        })
        .on(lk.RoomEvent.Reconnected, () => {
          if (!stale()) patchActive({ media: 'connected' })
        })
        .on(lk.RoomEvent.Disconnected, () => {
          if (stale()) return
          const callId = activeRef.current?.call?.$id
          finish('web:call.error.connectFailed', true)
          if (callId) callAction('end', callId).catch(() => {})
        })

      try {
        await room.connect(url, token)
      } catch {
        throw new CallApiError('connect', 'call.connectFailed', 0)
      }
      if (stale()) {
        room.disconnect().catch(() => {})
        return
      }
      // Autoplay: we're still inside the Answer / Call click's activation window.
      await room.startAudio().catch(() => {})
      try {
        await room.localParticipant.setMicrophoneEnabled(true)
      } catch (err) {
        throw new CallApiError('microphone', micErrorCode(err), 0)
      }
      if (stale()) return
      const present = room.remoteParticipants.size > 0
      setActive((prev) =>
        prev
          ? {
              ...prev,
              media: 'connected',
              remotePresent: present,
              connectedAt: prev.connectedAt ?? (present && prev.call?.status === 'accepted' ? Date.now() : null),
            }
          : prev,
      )
    },
    [finish, patchActive, setActive],
  )

  // ── Row updates (realtime + polling) ────────────────────────────────────
  const resolveName = useCallback(
    async (call: CallRow): Promise<string | null> => {
      try {
        const res = await fetch(`/api/moves/${encodeURIComponent(call.moveId)}/full`, { cache: 'no-store' })
        if (!res.ok) return null
        const data = await res.json()
        const name = call.callerRole === 'mover' ? data?.mover?.name : data?.move?.contactFullName
        return typeof name === 'string' && name.trim() ? name.trim() : null
      } catch {
        return null
      }
    },
    [],
  )

  const handleRow = useCallback(
    (call: CallRow) => {
      if (!me) return
      const a = activeRef.current

      // The call on the bar.
      if (a && !a.endedKey && a.call?.$id === call.$id) {
        if (!isLiveCall(call)) {
          finish(callOutcomeKey(call, me))
          return
        }
        setActive((prev) =>
          prev
            ? {
                ...prev,
                call,
                connectedAt:
                  prev.connectedAt ?? (call.status === 'accepted' && prev.remotePresent ? Date.now() : null),
              }
            : prev,
        )
        return
      }

      // The ring on the modal.
      const inc = incomingRef.current
      if (inc && inc.call.$id === call.$id) {
        if (!isIncomingRing(call, me)) setIncoming(null)
        return
      }

      // A new ring. One call at a time: the server refuses `busy`, this is belt and braces.
      if (isIncomingRing(call, me) && !(a && !a.endedKey) && !inc) {
        const fallback = t(call.callerRole === 'mover' ? 'web:call.party.mover' : 'web:call.party.client')
        setIncoming({ call, name: fallback })
        resolveName(call).then((name) => {
          if (name && incomingRef.current?.call.$id === call.$id) setIncoming({ call: incomingRef.current.call, name })
        })
      }
    },
    [me, finish, setActive, setIncoming, resolveName, t],
  )

  // Realtime.
  useEffect(() => {
    if (!me) return
    return subscribeToCalls(me, handleRow)
  }, [me, handleRow])

  // Catch-up on mount and whenever the tab comes back: a ring sent while the socket was down.
  useEffect(() => {
    if (!me) return
    const check = () => {
      if (document.visibilityState !== 'visible') return
      listRingingFor(me).then((rows) => rows.forEach(handleRow))
    }
    check()
    document.addEventListener('visibilitychange', check)
    return () => document.removeEventListener('visibilitychange', check)
  }, [me, handleRow])

  // Poll the live call's row as a fallback for a dropped realtime event.
  const activeCallId = active && !active.endedKey ? active.call?.$id ?? null : null
  useEffect(() => {
    if (!activeCallId) return
    const id = setInterval(() => {
      getCall(activeCallId).then((row) => row && handleRow(row))
    }, POLL_MS)
    return () => clearInterval(id)
  }, [activeCallId, handleRow])

  // Signed out mid-call: drop everything.
  useEffect(() => {
    if (me) return
    sessionRef.current += 1
    disconnectRoom()
    stopRing()
    setActive(null)
    setIncoming(null)
  }, [me, disconnectRoom, setActive, setIncoming])

  // Unmount (layout switch): leave the room.
  useEffect(
    () => () => {
      sessionRef.current += 1
      disconnectRoom()
      stopRing()
      if (lingerTimerRef.current) clearTimeout(lingerTimerRef.current)
    },
    [disconnectRoom],
  )

  // ── Incoming: ring, expiry, hidden-tab notification ────────────────────
  const incomingId = incoming?.call.$id ?? null
  const incomingExpiry = incoming?.call.ringExpiresAt ?? null
  useEffect(() => {
    if (!incomingId) return
    startRing()
    const exp = incomingExpiry ? Date.parse(incomingExpiry) : NaN
    const timer = Number.isFinite(exp)
      ? setTimeout(() => {
          if (incomingRef.current?.call.$id === incomingId) setIncoming(null)
        }, Math.max(0, exp - Date.now()))
      : null
    return () => {
      stopRing()
      if (timer) clearTimeout(timer)
      notificationRef.current?.close()
      notificationRef.current = null
    }
  }, [incomingId, incomingExpiry, setIncoming])

  const incomingName = incoming?.name ?? ''
  useEffect(() => {
    if (!incomingId) return
    const notify = () => {
      if (document.visibilityState !== 'hidden' || notificationRef.current) return
      notificationRef.current = showBrowserNotification(
        `picklt-call-${incomingId}`,
        t('web:call.notify.incoming.title'),
        t('web:call.notify.incoming.body', { name: incomingName }),
      )
    }
    notify()
    document.addEventListener('visibilitychange', notify)
    return () => document.removeEventListener('visibilitychange', notify)
  }, [incomingId, incomingName, t])

  // ── Callee actions ──────────────────────────────────────────────────────
  const answer = useCallback(async () => {
    const inc = incomingRef.current
    if (!inc) return
    stopRing()
    setIncoming(null)
    if (lingerTimerRef.current) clearTimeout(lingerTimerRef.current)
    const session = ++sessionRef.current
    cancelRequestedRef.current = false
    setActive({
      call: inc.call,
      name: inc.name,
      media: 'connecting',
      remotePresent: false,
      muted: false,
      connectedAt: null,
      endedKey: null,
      endedIsError: false,
    })
    let accepted = false
    try {
      await ensureMicrophone()
      if (sessionRef.current !== session) return
      const call = await acceptCall(inc.call.$id)
      accepted = true
      if (sessionRef.current !== session) return
      patchActive({ call })
      await connectMedia(call.$id, session)
    } catch (err) {
      if (sessionRef.current !== session) return
      finish(errorKeyOf(err), true)
      // A mic failure before accepting declines; after, it ends the call.
      callAction(accepted ? 'end' : 'decline', inc.call.$id).catch(() => {})
    }
  }, [setIncoming, setActive, patchActive, connectMedia, finish])

  const decline = useCallback(() => {
    const inc = incomingRef.current
    if (!inc) return
    stopRing()
    setIncoming(null)
    declineCall(inc.call.$id).catch(() => {})
  }, [setIncoming])

  // ── Caller ──────────────────────────────────────────────────────────────
  const startCall = useCallback(
    async (moveId: string, counterpartName: string) => {
      if (!me) return
      const a = activeRef.current
      if ((a && !a.endedKey) || incomingRef.current) return
      if (lingerTimerRef.current) clearTimeout(lingerTimerRef.current)
      const session = ++sessionRef.current
      cancelRequestedRef.current = false
      setActive({
        call: null,
        name: counterpartName,
        media: 'idle',
        remotePresent: false,
        muted: false,
        connectedAt: null,
        endedKey: null,
        endedIsError: false,
      })
      let callId: string | null = null
      try {
        await ensureMicrophone()
        if (sessionRef.current !== session) return
        const { call } = await startCallApi(moveId)
        callId = call.$id
        if (cancelRequestedRef.current || sessionRef.current !== session) {
          callAction('cancel', call.$id).catch(() => {})
          return
        }
        setActive((prev) => (prev ? { ...prev, call, media: 'connecting' } : prev))
        await connectMedia(call.$id, session)
      } catch (err) {
        if (sessionRef.current !== session) return
        finish(errorKeyOf(err), true)
        if (callId) callAction('cancel', callId).catch(() => {})
      }
    },
    [me, setActive, connectMedia, finish],
  )

  const hangUp = useCallback(() => {
    const a = activeRef.current
    if (!a || a.endedKey) return
    if (!a.call) {
      // `start` still in flight: cancel it the moment it returns.
      cancelRequestedRef.current = true
      finish('web:call.outcome.ended')
      return
    }
    const action = a.call.status === 'ringing' && a.call.callerId === me ? 'cancel' : 'end'
    const callId = a.call.$id
    finish('web:call.outcome.ended')
    callAction(action, callId).catch(() => {})
  }, [me, finish])

  const toggleMute = useCallback(() => {
    const room = roomRef.current
    const a = activeRef.current
    if (!room || !a) return
    const muted = !a.muted
    patchActive({ muted })
    room.localParticipant.setMicrophoneEnabled(!muted).catch(() => patchActive({ muted: !muted }))
  }, [patchActive])

  /** Any tap on the bar retries audio playback a browser blocked. */
  const unlockAudio = useCallback(() => {
    const room = roomRef.current
    if (room && !room.canPlaybackAudio) room.startAudio().catch(() => {})
  }, [])

  // Answered elsewhere and nobody ever joined: don't sit in an empty room.
  const waitingForPeer =
    !!active && !active.endedKey && active.call?.status === 'accepted' && active.media === 'connected' && !active.remotePresent
  useEffect(() => {
    if (!waitingForPeer) return
    const timer = setTimeout(() => hangUp(), NO_PEER_TIMEOUT_MS)
    return () => clearTimeout(timer)
  }, [waitingForPeer, hangUp])

  // Timer tick while connected.
  const ticking = !!active?.connectedAt && !active.endedKey
  useEffect(() => {
    if (!ticking) return
    setNow(Date.now())
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [ticking])

  const busy = !!incoming || (!!active && !active.endedKey)
  const value = useMemo<CallContextValue>(() => ({ available: !!me, busy, startCall }), [me, busy, startCall])

  // ── Render ──────────────────────────────────────────────────────────────
  let statusLine = ''
  if (active) {
    if (active.endedKey) statusLine = t(active.endedKey)
    else if (active.media === 'reconnecting') statusLine = t('web:call.status.reconnecting')
    else if (!active.call) statusLine = t('web:call.status.calling')
    else if (active.call.status === 'ringing') statusLine = t('web:call.status.ringing')
    else if (active.connectedAt) statusLine = formatDuration((now - active.connectedAt) / 1000)
    else statusLine = t('web:call.status.connecting')
  }
  const live = !!active && !active.endedKey

  return (
    <CallContext.Provider value={value}>
      {children}

      {/* Remote audio elements live here, out of sight. */}
      <div ref={audioBoxRef} aria-hidden className="hidden" />

      {incoming && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="incoming-call-title">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl dark:bg-neutral-900">
            <div className="mx-auto mb-4 flex h-20 w-20 animate-pulse items-center justify-center rounded-full bg-primary-100 text-3xl font-semibold text-primary-700 dark:bg-primary-900/40 dark:text-primary-300">
              {incoming.name.trim().charAt(0).toUpperCase() || <PhoneIcon className="h-8 w-8" />}
            </div>
            <p id="incoming-call-title" className="text-sm font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              {t('web:call.incoming.title')}
            </p>
            <p className="mt-1 truncate text-xl font-semibold text-neutral-900 dark:text-white">{incoming.name}</p>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{t('web:call.incoming.subtitle')}</p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={decline}
                className="flex flex-1 items-center justify-center gap-2 rounded-full bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-700"
              >
                <PhoneXMarkIcon className="h-5 w-5" />
                {t('web:call.decline.cta')}
              </button>
              <button
                type="button"
                onClick={answer}
                className="flex flex-1 items-center justify-center gap-2 rounded-full bg-green-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-green-700"
              >
                <PhoneIcon className="h-5 w-5" />
                {t('web:call.answer.cta')}
              </button>
            </div>
          </div>
        </div>
      )}

      {active && (
        <div
          role="region"
          aria-label={t('web:call.bar.label')}
          onClick={unlockAudio}
          className="fixed inset-x-4 top-4 z-[150] sm:inset-x-auto sm:right-6 sm:bottom-6 sm:top-auto sm:w-80"
        >
          <div className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white/95 p-3 shadow-xl backdrop-blur-sm dark:border-neutral-700 dark:bg-neutral-800/95">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                active.endedKey
                  ? active.endedIsError
                    ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                    : 'bg-neutral-100 text-neutral-500 dark:bg-neutral-700 dark:text-neutral-300'
                  : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              }`}
            >
              <PhoneIcon className={`h-5 w-5 ${live && !active.connectedAt ? 'animate-pulse' : ''}`} />
            </div>
            <div className="min-w-0 flex-1">
              {active.name && <p className="truncate text-sm font-semibold text-neutral-900 dark:text-white">{active.name}</p>}
              <p
                className={`text-xs ${active.endedIsError ? 'text-red-600 dark:text-red-400' : 'text-neutral-500 dark:text-neutral-400'} ${
                  active.connectedAt && !active.endedKey ? 'tabular-nums' : ''
                }`}
                aria-live="polite"
              >
                {statusLine}
              </p>
            </div>
            {live && (
              <>
                <button
                  type="button"
                  onClick={toggleMute}
                  disabled={active.media !== 'connected' && active.media !== 'reconnecting'}
                  aria-pressed={active.muted}
                  aria-label={active.muted ? t('web:call.unmute.cta') : t('web:call.mute.cta')}
                  title={active.muted ? t('web:call.unmute.cta') : t('web:call.mute.cta')}
                  className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition disabled:opacity-40 ${
                    active.muted
                      ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                      : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-700 dark:text-neutral-200'
                  }`}
                >
                  <MicrophoneIcon className="h-5 w-5" />
                  {active.muted && <span className="absolute h-0.5 w-6 rotate-45 rounded bg-current" aria-hidden />}
                </button>
                <button
                  type="button"
                  onClick={hangUp}
                  aria-label={t('web:call.hangUp.cta')}
                  title={t('web:call.hangUp.cta')}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-600 text-white transition hover:bg-red-700"
                >
                  <PhoneXMarkIcon className="h-5 w-5" />
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </CallContext.Provider>
  )
}
