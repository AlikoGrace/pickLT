'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { client } from '@/lib/appwrite'
import type { RealtimeResponseEvent, Models } from 'appwrite'
import {
  MapPinIcon,
  ClockIcon,
  TruckIcon,
  XMarkIcon,
  CheckIcon,
} from '@heroicons/react/24/outline'

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || ''
const MOVE_REQUESTS_COLLECTION = process.env.NEXT_PUBLIC_COLLECTION_MOVE_REQUESTS || ''

interface IncomingRequest {
  requestId: string
  moveId: string
  pickupLocation?: string
  dropoffLocation?: string
  moveType?: string
  estimatedPrice?: number
  itemCount?: number
  expiresAt?: string
}

interface MoveRequestPopupProps {
  /** The logged-in mover's profile ID (from Appwrite) */
  moverProfileId: string | null
}

// ─── Alert sound generator ──────────────────────────────────
// Creates a looping alert sound using the Web Audio API
function createAlertSound(): { play: () => void; stop: () => void } {
  let ctx: AudioContext | null = null
  let oscillator: OscillatorNode | null = null
  let gainNode: GainNode | null = null
  let intervalId: NodeJS.Timeout | null = null

  const play = () => {
    try {
      ctx = new AudioContext()
      gainNode = ctx.createGain()
      gainNode.connect(ctx.destination)
      gainNode.gain.value = 0

      // Play a repeating two-tone beep pattern
      let isPlaying = true
      const beep = (freq: number, duration: number) => {
        if (!ctx || !gainNode || !isPlaying) return
        const osc = ctx.createOscillator()
        osc.type = 'sine'
        osc.frequency.value = freq
        osc.connect(gainNode)
        gainNode.gain.setValueAtTime(0.5, ctx.currentTime)
        osc.start()
        setTimeout(() => {
          gainNode?.gain.setValueAtTime(0, ctx!.currentTime)
          osc.stop()
          osc.disconnect()
        }, duration)
      }

      // Two-tone alert: high-low pattern every 1.5 seconds
      const playPattern = () => {
        beep(880, 200)
        setTimeout(() => beep(660, 200), 250)
        setTimeout(() => beep(880, 200), 500)
      }

      playPattern()
      intervalId = setInterval(playPattern, 1500)
    } catch {
      // Web Audio API not available
    }
  }

  const stop = () => {
    if (intervalId) {
      clearInterval(intervalId)
      intervalId = null
    }
    if (ctx) {
      ctx.close().catch(() => {})
      ctx = null
    }
  }

  return { play, stop }
}

export default function MoveRequestPopup({ moverProfileId }: MoveRequestPopupProps) {
  const router = useRouter()
  const [incoming, setIncoming] = useState<IncomingRequest | null>(null)
  const [isAccepting, setIsAccepting] = useState(false)
  const [isDeclining, setIsDeclining] = useState(false)
  const [countdown, setCountdown] = useState<number>(60)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const alertRef = useRef<{ play: () => void; stop: () => void } | null>(null)

  // Countdown timer + alert sound
  useEffect(() => {
    if (!incoming) {
      // Stop sound when there's no incoming request
      alertRef.current?.stop()
      return
    }

    // Parse expiry to set countdown
    if (incoming.expiresAt) {
      const expiresMs = new Date(incoming.expiresAt).getTime()
      const nowMs = Date.now()
      const remainingSec = Math.max(0, Math.floor((expiresMs - nowMs) / 1000))
      setCountdown(remainingSec > 0 ? remainingSec : 60)
    } else {
      setCountdown(60)
    }

    // Start alert sound
    alertRef.current = createAlertSound()
    alertRef.current.play()

    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          // Auto-dismiss on timeout
          alertRef.current?.stop()
          setIncoming(null)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      alertRef.current?.stop()
    }
  }, [incoming])

  // Subscribe to realtime move_requests
  useEffect(() => {
    if (!moverProfileId || !DATABASE_ID || !MOVE_REQUESTS_COLLECTION) return

    const channel = `databases.${DATABASE_ID}.collections.${MOVE_REQUESTS_COLLECTION}.documents`

    const unsubscribe = client.subscribe<Models.Document>(
      channel,
      (response: RealtimeResponseEvent<Models.Document>) => {
        const events = response.events || []
        const isCreate = events.some((e) => e.includes('.create'))
        if (!isCreate) return

        const doc = response.payload as Models.Document & Record<string, unknown>
        if (!doc) return

        // Only show requests targeted at this mover
        if (doc.moverProfileId !== moverProfileId) return
        if (doc.status !== 'pending') return

        // Build the incoming request
        const request: IncomingRequest = {
          requestId: doc.$id,
          moveId: typeof doc.moveId === 'string' ? doc.moveId : (doc.moveId as Record<string, string>)?.$id || '',
          pickupLocation: doc.pickupLocation as string | undefined,
          dropoffLocation: doc.dropoffLocation as string | undefined,
          moveType: doc.moveType as string | undefined,
          estimatedPrice: doc.estimatedPrice as number | undefined,
          itemCount: doc.totalItemCount as number | undefined,
          expiresAt: doc.expiresAt as string | undefined,
        }

        setIncoming(request)
      }
    )

    return () => unsubscribe()
  }, [moverProfileId])

  const handleAccept = useCallback(async () => {
    if (!incoming) return
    try {
      setIsAccepting(true)
      alertRef.current?.stop()
      const res = await fetch('/api/mover/accept-move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: incoming.requestId,
          moveId: incoming.moveId,
        }),
      })
      if (res.ok) {
        setIncoming(null)
        // Redirect to active-move tracking page
        router.push('/active-move')
      } else {
        const errData = await res.json().catch(() => ({}))
        alert(errData.error || 'Failed to accept move')
      }
    } catch {
      alert('Network error. Please try again.')
    } finally {
      setIsAccepting(false)
    }
  }, [incoming, router])

  const handleDecline = useCallback(async () => {
    if (!incoming) return
    try {
      setIsDeclining(true)
      alertRef.current?.stop()
      // Call decline API so the server can update the record
      await fetch('/api/mover/decline-move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: incoming.requestId }),
      }).catch(() => {})
      setIncoming(null)
    } finally {
      setIsDeclining(false)
    }
  }, [incoming])

  if (!incoming) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-white dark:bg-neutral-800 rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
        {/* Header with countdown */}
        <div className="relative bg-gradient-to-br from-primary-500 to-primary-600 p-6 text-white">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <TruckIcon className="w-6 h-6" />
              <span className="font-semibold text-lg">New Move Request!</span>
            </div>
            <button
              onClick={handleDecline}
              className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>

          {/* Countdown */}
          <div className="flex items-center gap-2">
            <ClockIcon className="w-4 h-4 opacity-80" />
            <span className="text-sm opacity-90">
              Expires in <span className="font-bold">{countdown}s</span>
            </span>
          </div>

          {/* Progress bar */}
          <div className="mt-3 h-1 bg-white/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-1000 ease-linear"
              style={{ width: `${(countdown / 60) * 100}%` }}
            />
          </div>
        </div>

        {/* Move Details */}
        <div className="p-5 space-y-4">
          {/* Route */}
          <div className="space-y-2">
            <div className="flex items-start gap-3">
              <div className="mt-1 w-2.5 h-2.5 rounded-full bg-green-500 shrink-0" />
              <div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">Pickup</p>
                <p className="text-sm font-medium text-neutral-900 dark:text-white">
                  {incoming.pickupLocation?.split(',')[0] || 'Pickup location'}
                </p>
              </div>
            </div>
            <div className="ml-1 w-px h-3 bg-neutral-300 dark:bg-neutral-600" />
            <div className="flex items-start gap-3">
              <div className="mt-1 w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" />
              <div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">Drop-off</p>
                <p className="text-sm font-medium text-neutral-900 dark:text-white">
                  {incoming.dropoffLocation?.split(',')[0] || 'Drop-off location'}
                </p>
              </div>
            </div>
          </div>

          {/* Info chips */}
          <div className="flex flex-wrap gap-2">
            {incoming.moveType && (
              <span className="text-xs px-2.5 py-1 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-full font-medium">
                {incoming.moveType} Move
              </span>
            )}
            {incoming.itemCount && incoming.itemCount > 0 && (
              <span className="text-xs px-2.5 py-1 bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 rounded-full">
                {incoming.itemCount} items
              </span>
            )}
          </div>

          {/* Price */}
          {incoming.estimatedPrice && incoming.estimatedPrice > 0 && (
            <div className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-neutral-700/50 rounded-xl">
              <span className="text-sm text-neutral-600 dark:text-neutral-300">Estimated earnings</span>
              <span className="text-xl font-bold text-neutral-900 dark:text-white">
                €{incoming.estimatedPrice}
              </span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="px-5 pb-5 flex gap-3">
          <button
            onClick={handleDecline}
            disabled={isDeclining}
            className="flex-1 py-3 px-4 rounded-xl border border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 font-medium text-sm hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors disabled:opacity-50"
          >
            Decline
          </button>
          <button
            onClick={handleAccept}
            disabled={isAccepting}
            className="flex-[2] py-3 px-4 rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isAccepting ? (
              'Accepting...'
            ) : (
              <>
                <CheckIcon className="w-5 h-5" />
                Accept Move
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
