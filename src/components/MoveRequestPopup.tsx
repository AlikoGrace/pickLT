'use client'

import { useEffect, useRef, useState, useCallback, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/auth'
import { client, databases } from '@/lib/appwrite'
import { Query } from 'appwrite'
import type { RealtimeResponseEvent, Models } from 'appwrite'
import GallerySlider from '@/components/GallerySlider'
import {
  MapPinIcon,
  ClockIcon,
  TruckIcon,
  XMarkIcon,
  CheckIcon,
  CubeIcon,
  UserGroupIcon,
  EyeIcon,
  ArrowLeftIcon,
  HomeIcon,
  CalendarIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline'

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || ''
const MOVE_REQUESTS_COLLECTION = process.env.NEXT_PUBLIC_COLLECTION_MOVE_REQUESTS || ''
const MOVES_COLLECTION = process.env.NEXT_PUBLIC_COLLECTION_MOVES || ''
const BUCKET_MOVE_PHOTOS = process.env.NEXT_PUBLIC_BUCKET_MOVE_PHOTOS || ''
const APPWRITE_ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || ''
const PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || ''

interface MoveDetails {
  $id: string
  handle: string | null
  status: string
  moveType: string | null
  moveCategory: string | null
  moveDate: string | null
  pickupLocation: string | null
  pickupStreetAddress: string | null
  dropoffLocation: string | null
  dropoffStreetAddress: string | null
  totalItemCount: number | null
  totalWeightKg: number | null
  estimatedPrice: number | null
  crewSize: string | null
  vehicleType: string | null
  coverPhotoId: string | null
  galleryPhotoIds: string[]
  routeDistanceMeters: number | null
  routeDurationSeconds: number | null
  homeType: string | null
  contactFullName: string | null
  packingServiceLevel: string | null
  additionalServices: string[]
}

interface IncomingRequest {
  requestId: string
  moveId: string
  expiresAt?: string
  move: MoveDetails | null
}

// ─── Helper functions ───────────────────────────────────
const formatLabel = (value: string | null | undefined): string => {
  if (!value) return 'Not specified'
  return value
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return ''
  try {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-GB', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return dateStr
  }
}

const formatDistance = (meters: number | null): string => {
  if (!meters) return ''
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`
  return `${Math.round(meters)} m`
}

const formatDuration = (seconds: number | null): string => {
  if (!seconds) return ''
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.ceil((seconds % 3600) / 60)
  if (hours > 0) return `${hours}h ${minutes}min`
  return `${minutes} min`
}

const getPhotoUrl = (fileIdOrUrl: string): string => {
  if (!fileIdOrUrl) return ''
  // If already a full URL, return as-is
  if (fileIdOrUrl.startsWith('http://') || fileIdOrUrl.startsWith('https://')) return fileIdOrUrl
  // Otherwise construct from file ID
  if (!APPWRITE_ENDPOINT || !PROJECT_ID || !BUCKET_MOVE_PHOTOS) return ''
  return `${APPWRITE_ENDPOINT}/storage/buckets/${BUCKET_MOVE_PHOTOS}/files/${fileIdOrUrl}/view?project=${PROJECT_ID}`
}

// ─── Alarm sound using inline WAV (reliable across all browsers) ─────────
// Generates a short, urgent two-tone siren WAV and plays it via <audio>.
// Much more reliable than Web Audio API oscillators for autoplay.

let _alarmDataUrl: string | null = null

/** Generate a ~2 s urgent two-tone siren as a WAV data-URL */
function getAlarmDataUrl(): string {
  if (_alarmDataUrl) return _alarmDataUrl

  const sampleRate = 44100
  const duration = 2.0
  const samples = Math.floor(sampleRate * duration)
  const buffer = new ArrayBuffer(44 + samples * 2)
  const dv = new DataView(buffer)

  // ── WAV header ──
  const ws = (o: number, s: string) => {
    for (let i = 0; i < s.length; i++) dv.setUint8(o + i, s.charCodeAt(i))
  }
  ws(0, 'RIFF')
  dv.setUint32(4, 36 + samples * 2, true)
  ws(8, 'WAVE')
  ws(12, 'fmt ')
  dv.setUint32(16, 16, true) // chunk size
  dv.setUint16(20, 1, true) // PCM
  dv.setUint16(22, 1, true) // mono
  dv.setUint32(24, sampleRate, true)
  dv.setUint32(28, sampleRate * 2, true) // byte rate
  dv.setUint16(32, 2, true) // block align
  dv.setUint16(34, 16, true) // bits per sample
  ws(36, 'data')
  dv.setUint32(40, samples * 2, true)

  // ── Audio data: urgent two-tone siren (880 Hz ↔ 1320 Hz) ──
  for (let i = 0; i < samples; i++) {
    const t = i / sampleRate
    // Alternate between 1320 Hz and 880 Hz every 0.15 s
    const freq = t % 0.3 < 0.15 ? 1320 : 880
    // Fade in/out envelope
    const env = Math.min(1, Math.min(t * 15, (duration - t) * 15))
    // Fundamental + harmonic for richer tone
    const s1 = Math.sin(2 * Math.PI * freq * t) * 0.55
    const s2 = Math.sin(2 * Math.PI * freq * 2 * t) * 0.15
    // Slight pulse modulation for urgency
    const pulse = 0.85 + 0.15 * Math.sin(2 * Math.PI * 8 * t)
    const sample = (s1 + s2) * env * pulse
    dv.setInt16(44 + i * 2, Math.max(-32768, Math.min(32767, sample * 32767)), true)
  }

  // Convert to base64 data URL
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  _alarmDataUrl = 'data:audio/wav;base64,' + btoa(binary)
  return _alarmDataUrl
}

let _alarmAudio: HTMLAudioElement | null = null

function getAlarmAudio(): HTMLAudioElement {
  if (!_alarmAudio) {
    _alarmAudio = new Audio(getAlarmDataUrl())
    _alarmAudio.loop = true
    _alarmAudio.volume = 1.0
  }
  return _alarmAudio
}

// Pre-warm the Audio element on first user interaction so browser
// allows programmatic playback later (Chrome autoplay policy).
if (typeof window !== 'undefined') {
  const warmUp = () => {
    const audio = getAlarmAudio()
    // Play + immediately pause to "unlock" the element
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

function createAlarmSound(): { play: () => void; stop: () => void } {
  return {
    play: () => {
      const audio = getAlarmAudio()
      audio.currentTime = 0
      audio.play().catch(() => {})
    },
    stop: () => {
      const audio = getAlarmAudio()
      audio.pause()
      audio.currentTime = 0
    },
  }
}

export default function MoveRequestPopup({ children }: { children: ReactNode }) {
  const { user } = useAuth()

  const moverProfileId = user?.moverDetails?.profileId
  const router = useRouter()
  const [incoming, setIncoming] = useState<IncomingRequest | null>(null)
  const [isAccepting, setIsAccepting] = useState(false)
  const [isDeclining, setIsDeclining] = useState(false)
  const [countdown, setCountdown] = useState<number>(180)
  const [showDetails, setShowDetails] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const alertRef = useRef<{ play: () => void; stop: () => void } | null>(null)
  const incomingRef = useRef<IncomingRequest | null>(null)

  // Keep incomingRef in sync
  useEffect(() => { incomingRef.current = incoming }, [incoming])

  // Countdown timer + alarm sound
  useEffect(() => {
    if (!incoming) {
      alertRef.current?.stop()
      return
    }

    // Parse expiry to set countdown
    if (incoming.expiresAt) {
      const expiresMs = new Date(incoming.expiresAt).getTime()
      const nowMs = Date.now()
      const remainingSec = Math.max(0, Math.floor((expiresMs - nowMs) / 1000))
      setCountdown(remainingSec > 0 ? remainingSec : 180)
    } else {
      setCountdown(180)
    }

    // Start alarm sound
    alertRef.current = createAlarmSound()
    alertRef.current.play()

    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          alertRef.current?.stop()
          setIncoming(null)
          setShowDetails(false)
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

  // Fetch full move details via the SERVER API route (uses admin SDK, bypasses permissions)
  const fetchMoveDetails = useCallback(async (moveId: string): Promise<MoveDetails | null> => {
    if (!moveId) return null
    try {
      const res = await fetch(`/api/moves/${moveId}/full`)
      if (!res.ok) {
        console.warn('[MoveRequestPopup] API returned', res.status, 'for move', moveId)
        return null
      }
      const data = await res.json()
      // The API returns { move, mover }. We only need the move.
      return (data.move as MoveDetails) || null
    } catch (err) {
      console.warn('[MoveRequestPopup] Failed to fetch move details:', err)
      return null
    }
  }, [])

  // Subscribe to realtime move_requests
  useEffect(() => {
    console.log('moverProfileId', moverProfileId, 'databaseId', DATABASE_ID, 'requestId', MOVE_REQUESTS_COLLECTION)
    if (!moverProfileId || !DATABASE_ID || !MOVE_REQUESTS_COLLECTION) return

    // Helper: extract moverProfileId from a doc field (handles string or relationship object)
    const extractMoverProfileId = (field: unknown): string => {
      if (typeof field === 'string') return field
      if (field && typeof field === 'object' && '$id' in (field as Record<string, unknown>)) {
        return (field as Record<string, string>).$id || ''
      }
      return ''
    }

    // Helper: extract moveId from a doc field (handles string or relationship object)
    const extractMoveId = (field: unknown): string => {
      if (typeof field === 'string') return field
      if (field && typeof field === 'object' && '$id' in (field as Record<string, unknown>)) {
        return (field as Record<string, string>).$id || ''
      }
      return ''
    }

    // Check for existing pending requests on mount
    const checkForPendingRequests = async () => {
      if (incomingRef.current) return // Already showing
      try {
        const res = await databases.listDocuments(
          DATABASE_ID,
          MOVE_REQUESTS_COLLECTION,
          [
            Query.equal('moverProfileId', moverProfileId),
            Query.equal('status', 'pending'),
            Query.orderDesc('$createdAt'),
            Query.limit(1),
          ]
        )
        if (res.total > 0) {
          const doc = res.documents[0] as Models.Document & Record<string, unknown>
          const expiresAt = doc.expiresAt as string | undefined
          if (expiresAt && new Date(expiresAt).getTime() > Date.now()) {
            const moveId = extractMoveId(doc.moveId)
            if (moveId) {
              const move = await fetchMoveDetails(moveId)
              setIncoming({
                requestId: doc.$id,
                moveId,
                expiresAt,
                move,
              })
            }
          }
        }
      } catch (err) {
        console.warn('[MoveRequestPopup] Failed to check existing requests:', err)
      }
    }

    // Check on mount
    checkForPendingRequests()

    // Poll every 5 seconds as a fallback in case Realtime misses events
    const pollIntervalId = setInterval(checkForPendingRequests, 5000)

    // Also subscribe to Realtime for instant notification
    const channel = `databases.${DATABASE_ID}.collections.${MOVE_REQUESTS_COLLECTION}.documents`

    const unsubscribe = client.subscribe<Models.Document>(
      channel,
      async (response: RealtimeResponseEvent<Models.Document>) => {
        const events = response.events || []
        const isCreate = events.some((e) => e.includes('.create'))
        if (!isCreate) return

        const doc = response.payload as Models.Document & Record<string, unknown>
        if (!doc) return

        // Compare moverProfileId — handle both string and relationship object
        const docMoverProfileId = extractMoverProfileId(doc.moverProfileId)
        if (docMoverProfileId !== moverProfileId) return
        if (doc.status !== 'pending') return

        const moveId = extractMoveId(doc.moveId)

        // Fetch the full move details via server API
        const move = await fetchMoveDetails(moveId)

        setIncoming({
          requestId: doc.$id,
          moveId,
          expiresAt: doc.expiresAt as string | undefined,
          move,
        })
      }
    )

    return () => {
      clearInterval(pollIntervalId)
      unsubscribe()
    }
  }, [moverProfileId, fetchMoveDetails])

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
        setShowDetails(false)
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
      await fetch('/api/mover/decline-move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: incoming.requestId }),
      }).catch(() => {})
      setIncoming(null)
      setShowDetails(false)
    } finally {
      setIsDeclining(false)
    }
  }, [incoming])

  const renderPopup = () => {
    if (!incoming) return null

    const move = incoming.move

    // Build gallery images from the move
    const galleryImages: string[] = []
    if (move?.coverPhotoId) galleryImages.push(getPhotoUrl(move.coverPhotoId))
    if (move?.galleryPhotoIds) {
      move.galleryPhotoIds.forEach((id) => {
        const url = getPhotoUrl(id)
        if (url) galleryImages.push(url)
      })
    }

    const pickupDisplay = move?.pickupStreetAddress || move?.pickupLocation?.split(',')[0] || 'Pickup location'
    const dropoffDisplay = move?.dropoffStreetAddress || move?.dropoffLocation?.split(',')[0] || 'Drop-off location'

    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Pulsing border effect for urgency */}
      <div className="w-full max-w-md animate-in zoom-in-95 duration-300">
        <div className="bg-white dark:bg-neutral-800 rounded-3xl overflow-hidden shadow-2xl ring-2 ring-red-500/50 animate-pulse-ring">

          {/* Header with countdown — red gradient for urgency */}
          <div className="relative bg-gradient-to-br from-red-500 via-red-600 to-orange-500 p-5 text-white">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center animate-bounce">
                  <TruckIcon className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-bold text-lg block leading-tight">New Move Request!</span>
                  <span className="text-xs opacity-80">{move?.moveCategory === 'instant' ? 'Instant' : 'Scheduled'} · {formatLabel(move?.moveType)}</span>
                </div>
              </div>
              <button
                onClick={handleDecline}
                className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>

            {/* Countdown */}
            <div className="flex items-center gap-2 mt-3">
              <ClockIcon className="w-4 h-4 opacity-80" />
              <span className="text-sm opacity-90">
                Respond within <span className="font-bold text-lg">{countdown}s</span>
              </span>
            </div>

            {/* Progress bar */}
            <div className="mt-2 h-1.5 bg-white/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all duration-1000 ease-linear"
                style={{ width: `${(countdown / 180) * 100}%` }}
              />
            </div>
          </div>

          {/* Gallery / Cover Photo — GallerySlider like MoveCard */}
          {galleryImages.length > 0 && (
            <div className="relative">
              <GallerySlider
                galleryImgs={galleryImages}
                ratioClass="aspect-w-16 aspect-h-9"
                href="#"
                imageClass="rounded-none"
                galleryClass="rounded-none"
                navigation={galleryImages.length > 1}
              />
              {/* Photo count badge */}
              <div className="absolute top-2 right-2 z-10 bg-black/50 backdrop-blur-sm text-white text-xs px-2 py-0.5 rounded-full">
                {galleryImages.length} photo{galleryImages.length !== 1 ? 's' : ''}
              </div>
            </div>
          )}

          {/* Move Details — styled like MoveCard */}
          <div className="p-4 space-y-3">
            {/* Route */}
            <div className="space-y-2">
              <div className="flex items-start gap-3">
                <div className="mt-1.5 w-2.5 h-2.5 rounded-full bg-green-500 shrink-0 ring-2 ring-green-500/30" />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-neutral-400">Pickup</p>
                  <p className="text-sm font-semibold text-neutral-900 dark:text-white truncate">
                    {pickupDisplay}
                  </p>
                </div>
              </div>
              <div className="ml-1 w-px h-2 bg-neutral-300 dark:bg-neutral-600" />
              <div className="flex items-start gap-3">
                <div className="mt-1.5 w-2.5 h-2.5 rounded-full bg-red-500 shrink-0 ring-2 ring-red-500/30" />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-neutral-400">Drop-off</p>
                  <p className="text-sm font-semibold text-neutral-900 dark:text-white truncate">
                    {dropoffDisplay}
                  </p>
                </div>
              </div>
            </div>

            {/* Info chips row */}
            <div className="flex flex-wrap gap-1.5">
              {move?.moveDate && (
                <span className="text-xs px-2 py-1 bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 rounded-full">
                  {formatDate(move.moveDate)}
                </span>
              )}
              {move?.homeType && (
                <span className="text-xs px-2 py-1 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-full font-medium">
                  {formatLabel(move.homeType)}
                </span>
              )}
              {move?.totalItemCount && move.totalItemCount > 0 && (
                <span className="text-xs px-2 py-1 bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 rounded-full flex items-center gap-1">
                  <CubeIcon className="w-3 h-3" />
                  {move.totalItemCount} items
                </span>
              )}
              {move?.crewSize && (
                <span className="text-xs px-2 py-1 bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 rounded-full flex items-center gap-1">
                  <UserGroupIcon className="w-3 h-3" />
                  {move.crewSize} movers
                </span>
              )}
              {move?.vehicleType && (
                <span className="text-xs px-2 py-1 bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 rounded-full flex items-center gap-1">
                  <TruckIcon className="w-3 h-3" />
                  {formatLabel(move.vehicleType)}
                </span>
              )}
            </div>

            {/* Route distance + duration */}
            {(move?.routeDistanceMeters || move?.routeDurationSeconds) && (
              <div className="flex items-center gap-3 text-xs text-neutral-500 dark:text-neutral-400">
                {move.routeDistanceMeters && (
                  <span className="flex items-center gap-1">
                    <MapPinIcon className="w-3.5 h-3.5" />
                    {formatDistance(move.routeDistanceMeters)}
                  </span>
                )}
                {move.routeDurationSeconds && (
                  <span className="flex items-center gap-1">
                    <ClockIcon className="w-3.5 h-3.5" />
                    ~{formatDuration(move.routeDurationSeconds)}
                  </span>
                )}
              </div>
            )}

            {/* Additional services */}
            {move?.additionalServices && move.additionalServices.length > 0 && (
              <div className="text-xs text-neutral-500 dark:text-neutral-400">
                Services: {move.additionalServices.map(formatLabel).join(', ')}
              </div>
            )}

            {/* Price — prominent */}
            {move?.estimatedPrice && move.estimatedPrice > 0 && (
              <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
                <span className="text-sm font-medium text-green-700 dark:text-green-300">Your earnings</span>
                <span className="text-2xl font-bold text-green-700 dark:text-green-300">
                  €{move.estimatedPrice}
                </span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="px-4 pb-4 space-y-3">
            {/* View Details button */}
            {move && (
              <button
                onClick={() => setShowDetails(true)}
                className="flex items-center justify-center gap-2 w-full py-2.5 text-sm font-medium text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-xl transition-colors"
              >
                <EyeIcon className="w-4 h-4" />
                View Full Details
              </button>
            )}
            <div className="flex gap-3">
            <button
              onClick={handleDecline}
              disabled={isDeclining}
              className="flex-1 py-3 px-4 rounded-xl border-2 border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 font-semibold text-sm hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors disabled:opacity-50"
            >
              {isDeclining ? 'Declining...' : 'Decline'}
            </button>
            <button
              onClick={handleAccept}
              disabled={isAccepting}
              className="flex-[2] py-3 px-4 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-green-600/30"
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
      </div>

      {/* ── Full Details Overlay ─────────────────────────── */}
      {showDetails && move && (
        <div className="fixed inset-0 z-[101] flex flex-col bg-white dark:bg-neutral-900 animate-in slide-in-from-right duration-200">
          {/* Sticky header */}
          <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-4 py-3">
            <button
              onClick={() => setShowDetails(false)}
              className="p-1.5 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              <ArrowLeftIcon className="w-5 h-5 text-neutral-700 dark:text-neutral-300" />
            </button>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-neutral-900 dark:text-white truncate">Move Details</p>
              <p className="text-xs text-neutral-500">
                Respond within <span className="font-bold text-red-500">{countdown}s</span>
              </p>
            </div>
            <button
              onClick={() => setShowDetails(false)}
              className="p-1.5 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              <XMarkIcon className="w-5 h-5 text-neutral-500" />
            </button>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
            {/* Price banner */}
            {move.estimatedPrice != null && move.estimatedPrice > 0 && (
              <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 rounded-2xl border border-green-200 dark:border-green-800">
                <span className="text-sm font-medium text-green-700 dark:text-green-300">Your earnings</span>
                <span className="text-3xl font-bold text-green-700 dark:text-green-300">€{move.estimatedPrice}</span>
              </div>
            )}

            {/* Move type & date */}
            <div className="bg-neutral-50 dark:bg-neutral-800 rounded-2xl p-4 space-y-3">
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">Move Info</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-3 text-sm">
                  <TruckIcon className="w-4 h-4 text-neutral-400 shrink-0" />
                  <span className="text-neutral-600 dark:text-neutral-300">{formatLabel(move.moveType)} · {move.moveCategory === 'instant' ? 'Instant' : 'Scheduled'}</span>
                </div>
                {move.moveDate && (
                  <div className="flex items-center gap-3 text-sm">
                    <CalendarIcon className="w-4 h-4 text-neutral-400 shrink-0" />
                    <span className="text-neutral-600 dark:text-neutral-300">{formatDate(move.moveDate)}</span>
                  </div>
                )}
                {move.homeType && (
                  <div className="flex items-center gap-3 text-sm">
                    <HomeIcon className="w-4 h-4 text-neutral-400 shrink-0" />
                    <span className="text-neutral-600 dark:text-neutral-300">{formatLabel(move.homeType)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Locations */}
            <div className="bg-neutral-50 dark:bg-neutral-800 rounded-2xl p-4 space-y-4">
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">Locations</h3>
              <div className="flex items-start gap-3">
                <div className="mt-1 w-7 h-7 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
                  <MapPinIcon className="w-3.5 h-3.5 text-green-600" />
                </div>
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-neutral-400">Pickup</p>
                  <p className="text-sm font-semibold text-neutral-900 dark:text-white">{pickupDisplay}</p>
                </div>
              </div>
              <div className="ml-3 w-px h-3 bg-neutral-300 dark:bg-neutral-600" />
              <div className="flex items-start gap-3">
                <div className="mt-1 w-7 h-7 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
                  <MapPinIcon className="w-3.5 h-3.5 text-red-600" />
                </div>
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-neutral-400">Drop-off</p>
                  <p className="text-sm font-semibold text-neutral-900 dark:text-white">{dropoffDisplay}</p>
                </div>
              </div>
              {(move.routeDistanceMeters || move.routeDurationSeconds) && (
                <div className="flex items-center gap-3 pt-1 text-xs text-neutral-500 dark:text-neutral-400">
                  {move.routeDistanceMeters && (
                    <span className="flex items-center gap-1">
                      <MapPinIcon className="w-3.5 h-3.5" />
                      {formatDistance(move.routeDistanceMeters)}
                    </span>
                  )}
                  {move.routeDurationSeconds && (
                    <span className="flex items-center gap-1">
                      <ClockIcon className="w-3.5 h-3.5" />
                      ~{formatDuration(move.routeDurationSeconds)}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Details grid */}
            <div className="bg-neutral-50 dark:bg-neutral-800 rounded-2xl p-4 space-y-3">
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">Details</h3>
              <div className="grid grid-cols-2 gap-3">
                {move.totalItemCount != null && move.totalItemCount > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <CubeIcon className="w-4 h-4 text-neutral-400" />
                    <span className="text-neutral-600 dark:text-neutral-300">{move.totalItemCount} items</span>
                  </div>
                )}
                {move.totalWeightKg != null && move.totalWeightKg > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <CubeIcon className="w-4 h-4 text-neutral-400" />
                    <span className="text-neutral-600 dark:text-neutral-300">{move.totalWeightKg} kg</span>
                  </div>
                )}
                {move.crewSize && (
                  <div className="flex items-center gap-2 text-sm">
                    <UserGroupIcon className="w-4 h-4 text-neutral-400" />
                    <span className="text-neutral-600 dark:text-neutral-300">{move.crewSize} movers</span>
                  </div>
                )}
                {move.vehicleType && (
                  <div className="flex items-center gap-2 text-sm">
                    <TruckIcon className="w-4 h-4 text-neutral-400" />
                    <span className="text-neutral-600 dark:text-neutral-300">{formatLabel(move.vehicleType)}</span>
                  </div>
                )}
              </div>
              {move.packingServiceLevel && (
                <div className="flex items-center gap-2 text-sm pt-1">
                  <CheckCircleIcon className="w-4 h-4 text-neutral-400" />
                  <span className="text-neutral-600 dark:text-neutral-300">Packing: {formatLabel(move.packingServiceLevel)}</span>
                </div>
              )}
              {move.additionalServices && move.additionalServices.length > 0 && (
                <div className="pt-1">
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-1.5">Additional services</p>
                  <div className="flex flex-wrap gap-1.5">
                    {move.additionalServices.map((s, i) => (
                      <span key={i} className="text-xs px-2 py-0.5 bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 rounded-full">
                        {formatLabel(s)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {move.contactFullName && (
                <div className="pt-2 border-t border-neutral-200 dark:border-neutral-700">
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">Client</p>
                  <p className="text-sm font-medium text-neutral-900 dark:text-white">{move.contactFullName}</p>
                </div>
              )}
            </div>

            {/* Gallery */}
            {galleryImages.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">Photos</h3>
                <div className="grid grid-cols-2 gap-2">
                  {galleryImages.map((url, i) => (
                    <div key={i} className="relative aspect-[4/3] rounded-xl overflow-hidden bg-neutral-100 dark:bg-neutral-800">
                      <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sticky bottom action bar */}
          <div className="sticky bottom-0 border-t border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-4 py-3 flex gap-3">
            <button
              onClick={() => { setShowDetails(false); handleDecline() }}
              disabled={isDeclining}
              className="flex-1 py-3 px-4 rounded-xl border-2 border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 font-semibold text-sm hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors disabled:opacity-50"
            >
              Decline
            </button>
            <button
              onClick={() => { setShowDetails(false); handleAccept() }}
              disabled={isAccepting}
              className="flex-[2] py-3 px-4 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-green-600/30"
            >
              <CheckIcon className="w-5 h-5" />
              Accept Move
            </button>
          </div>
        </div>
      )}

      {/* CSS animation for the pulsing ring */}
        <style>{`
          @keyframes pulse-ring {
            0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
            50% { box-shadow: 0 0 0 8px rgba(239, 68, 68, 0); }
          }
          .animate-pulse-ring {
            animation: pulse-ring 2s ease-in-out infinite;
          }
        `}</style>
      </div>
    )
  }

  return (
    <>
      {children}
      {renderPopup()}
    </>
  )
}
