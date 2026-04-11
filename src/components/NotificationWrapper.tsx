'use client'

import { ReactNode, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '@/context/auth'
import { client } from '@/lib/appwrite'

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || ''
const MOVES_COLLECTION = process.env.NEXT_PUBLIC_COLLECTION_MOVES || ''
const MOVE_REQUESTS_COLLECTION = process.env.NEXT_PUBLIC_COLLECTION_MOVE_REQUESTS || ''

// ─── Pleasant notification chime ─────────────────────────
// Generates a gentle 3-note ascending chime (C5→E5→G5) as a WAV data-URL.
// Much nicer than a harsh siren — suitable for both mover and client notifications.

let _chimeDataUrl: string | null = null

function getChimeDataUrl(): string {
  if (_chimeDataUrl) return _chimeDataUrl

  const sampleRate = 44100
  const duration = 2.0
  const samples = Math.floor(sampleRate * duration)
  const buffer = new ArrayBuffer(44 + samples * 2)
  const dv = new DataView(buffer)

  // WAV header
  const ws = (o: number, s: string) => {
    for (let i = 0; i < s.length; i++) dv.setUint8(o + i, s.charCodeAt(i))
  }
  ws(0, 'RIFF')
  dv.setUint32(4, 36 + samples * 2, true)
  ws(8, 'WAVE')
  ws(12, 'fmt ')
  dv.setUint32(16, 16, true)
  dv.setUint16(20, 1, true)
  dv.setUint16(22, 1, true)
  dv.setUint32(24, sampleRate, true)
  dv.setUint32(28, sampleRate * 2, true)
  dv.setUint16(32, 2, true)
  dv.setUint16(34, 16, true)
  ws(36, 'data')
  dv.setUint32(40, samples * 2, true)

  // 3-note ascending chime: C5 (523Hz) → E5 (659Hz) → G5 (784Hz)
  // Each note ~0.5s with overlap, gentle sine with decay
  const notes = [
    { freq: 523.25, start: 0, dur: 0.7 },
    { freq: 659.25, start: 0.35, dur: 0.7 },
    { freq: 783.99, start: 0.7, dur: 1.0 },
  ]

  for (let i = 0; i < samples; i++) {
    const t = i / sampleRate
    let sample = 0

    for (const note of notes) {
      const noteT = t - note.start
      if (noteT < 0 || noteT > note.dur) continue
      // Exponential decay envelope
      const env = Math.exp(-noteT * 3.5) * Math.min(1, noteT * 50)
      // Pure tone with soft harmonic
      const s1 = Math.sin(2 * Math.PI * note.freq * noteT) * 0.5
      const s2 = Math.sin(2 * Math.PI * note.freq * 2 * noteT) * 0.1
      sample += (s1 + s2) * env
    }

    // Clamp
    sample = Math.max(-1, Math.min(1, sample * 0.8))
    dv.setInt16(44 + i * 2, Math.max(-32768, Math.min(32767, sample * 32767)), true)
  }

  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  _chimeDataUrl = 'data:audio/wav;base64,' + btoa(binary)
  return _chimeDataUrl
}

let _chimeAudio: HTMLAudioElement | null = null

function getChimeAudio(): HTMLAudioElement {
  if (!_chimeAudio) {
    _chimeAudio = new Audio(getChimeDataUrl())
    _chimeAudio.loop = false
    _chimeAudio.volume = 0.8
  }
  return _chimeAudio
}

// Pre-warm audio on first user interaction (Chrome autoplay policy)
if (typeof window !== 'undefined') {
  const warmUp = () => {
    const audio = getChimeAudio()
    audio.play().then(() => audio.pause()).catch(() => {})
    audio.currentTime = 0
    window.removeEventListener('click', warmUp)
    window.removeEventListener('touchstart', warmUp)
    window.removeEventListener('keydown', warmUp)
  }
  window.addEventListener('click', warmUp, { once: true })
  window.addEventListener('touchstart', warmUp, { once: true })
  window.addEventListener('keydown', warmUp, { once: true })
}

function playChime(durationMs = 5000) {
  const audio = getChimeAudio()
  audio.loop = true
  audio.currentTime = 0
  audio.play().catch(() => {})
  // Stop after durationMs
  setTimeout(() => {
    audio.pause()
    audio.currentTime = 0
    audio.loop = false
  }, durationMs)
}

// ─── Browser notification helpers ────────────────────────

function requestNotificationPermission() {
  if (typeof window === 'undefined') return
  if (!('Notification' in window)) return
  if (Notification.permission === 'default') {
    Notification.requestPermission()
  }
}

function showBrowserNotification(title: string, body: string, icon?: string) {
  if (typeof window === 'undefined') return
  if (!('Notification' in window)) return
  if (Notification.permission !== 'granted') return

  try {
    new Notification(title, {
      body,
      icon: icon || '/favicon.ico',
      badge: '/favicon.ico',
      tag: 'picklt-notification',
      renotify: true,
    } as unknown as NotificationOptions)
  } catch {
    // Notification constructor not available (e.g. some mobile browsers)
  }
}

// ─── The wrapper component ───────────────────────────────

interface NotificationWrapperProps {
  children: ReactNode
  /** 'client' listens for mover_arrived on their moves, 'mover' listens for move_requests */
  role: 'client' | 'mover'
}

export default function NotificationWrapper({ children, role }: NotificationWrapperProps) {
  const { user } = useAuth()
  const permissionRequested = useRef(false)
  const processedEvents = useRef<Set<string>>(new Set())

  // Request notification permission on mount
  useEffect(() => {
    if (!permissionRequested.current) {
      permissionRequested.current = true
      requestNotificationPermission()
    }
  }, [])

  // ─── Client-side: listen for move status changes ───────
  const handleClientNotification = useCallback(() => {
    if (!user || role !== 'client' || !DATABASE_ID || !MOVES_COLLECTION) return

    // Subscribe to changes on the MOVES collection
    const channel = `databases.${DATABASE_ID}.collections.${MOVES_COLLECTION}.documents`
    const unsubscribe = client.subscribe(channel, (event) => {
      const payload = event.payload as Record<string, any>
      if (!payload) return

      // clientId may be a plain string or an Appwrite relationship object { $id: '...' }
      const moveClientId =
        typeof payload.clientId === 'string'
          ? payload.clientId
          : (payload.clientId as Record<string, string>)?.$id || null
      // Only react to moves belonging to this client
      if (!moveClientId || (moveClientId !== user.authId && moveClientId !== user.appwriteId)) return

      const eventKey = `${payload.$id}-${payload.status}`
      if (processedEvents.current.has(eventKey)) return
      processedEvents.current.add(eventKey)

      if (payload.status === 'mover_accepted') {
        playChime(5000)
        showBrowserNotification(
          'Mover accepted your move! ✅',
          'A mover has accepted your scheduled move. They will start the route soon.',
        )
      } else if (payload.status === 'mover_arrived') {
        playChime(5000)
        showBrowserNotification(
          'Your mover has arrived! 🚛',
          `Your mover has arrived at the pickup location. Please meet them at the entrance.`,
        )
      } else if (payload.status === 'mover_en_route') {
        showBrowserNotification(
          'Mover is on the way! 🚚',
          'Your mover is heading to the pickup location.',
        )
      } else if (payload.status === 'loading') {
        showBrowserNotification(
          'Loading in progress 📦',
          'Your mover has started loading your items.',
        )
      } else if (payload.status === 'in_transit') {
        showBrowserNotification(
          'On the move! 🛣️',
          'Your items are being transported to the destination.',
        )
      } else if (payload.status === 'arrived_destination') {
        playChime(5000)
        showBrowserNotification(
          'Arrived at destination! 🏠',
          'Your mover has arrived at the drop-off location.',
        )
      } else if (payload.status === 'completed') {
        showBrowserNotification(
          'Move completed! ✅',
          'Your move has been completed successfully.',
        )
      }
    })

    return unsubscribe
  }, [user, role])

  // ─── Mover-side: listen for new move_requests ──────────
  const handleMoverRequestNotification = useCallback(() => {
    if (!user || role !== 'mover' || !DATABASE_ID || !MOVE_REQUESTS_COLLECTION) return
    if (!user.moverDetails?.profileId) return

    // Subscribe to changes on the MOVE_REQUESTS collection
    const channel = `databases.${DATABASE_ID}.collections.${MOVE_REQUESTS_COLLECTION}.documents`
    const unsubscribe = client.subscribe(channel, (event) => {
      const payload = event.payload as Record<string, any>
      if (!payload) return

      // Only react to requests for this mover
      if (payload.moverProfileId !== user.moverDetails?.profileId) return

      const eventKey = `${payload.$id}-${payload.status}`
      if (processedEvents.current.has(eventKey)) return
      processedEvents.current.add(eventKey)

      if (payload.status === 'pending') {
        showBrowserNotification(
          'New move request! 📋',
          'You have a new move request. Open the app to view details and accept.',
        )
      }
    })

    return unsubscribe
  }, [user, role])

  // ─── Mover-side: listen for move status changes (scheduled moves) ──
  const handleMoverMoveNotification = useCallback(() => {
    if (!user || role !== 'mover' || !DATABASE_ID || !MOVES_COLLECTION) return
    if (!user.moverDetails?.profileId) return

    const channel = `databases.${DATABASE_ID}.collections.${MOVES_COLLECTION}.documents`
    const unsubscribe = client.subscribe(channel, (event) => {
      const payload = event.payload as Record<string, any>
      if (!payload) return

      // Only react to moves assigned to this mover
      const moveMoverProfileId =
        typeof payload.moverProfileId === 'string'
          ? payload.moverProfileId
          : payload.moverProfileId?.$id || null
      if (moveMoverProfileId !== user.moverDetails?.profileId) return

      const eventKey = `${payload.$id}-${payload.status}`
      if (processedEvents.current.has(eventKey)) return
      processedEvents.current.add(eventKey)

      if (payload.status === 'cancelled_by_client') {
        playChime(5000)
        showBrowserNotification(
          'Move Cancelled by Client ❌',
          'The client has cancelled this move.',
        )
      }
    })

    return unsubscribe
  }, [user, role])

  useEffect(() => {
    const unsubs: (() => void)[] = []

    if (role === 'client') {
      const u = handleClientNotification()
      if (u) unsubs.push(u)
    } else {
      const u1 = handleMoverRequestNotification()
      if (u1) unsubs.push(u1)
      const u2 = handleMoverMoveNotification()
      if (u2) unsubs.push(u2)
    }

    return () => {
      unsubs.forEach((u) => u())
    }
  }, [role, handleClientNotification, handleMoverRequestNotification, handleMoverMoveNotification])

  return <>{children}</>
}
