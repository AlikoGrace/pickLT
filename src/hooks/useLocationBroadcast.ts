'use client'

import { useEffect, useRef, useCallback } from 'react'

interface UseLocationBroadcastOptions {
  /** Whether broadcasting is enabled (e.g. user is a mover and online) */
  enabled: boolean
  /** Minimum interval between location updates in ms (default: 30000 = 30s) */
  intervalMs?: number
  /** Optional active moveId to associate with the location update */
  moveId?: string
}

/**
 * Hook that watches the mover's GPS position and periodically sends it
 * to our API so clients can see nearby movers in real-time.
 *
 * Uses `navigator.geolocation.watchPosition` for continuous tracking.
 * Throttles API calls to avoid excessive writes.
 */
export function useLocationBroadcast({
  enabled,
  intervalMs = 30_000,
  moveId,
}: UseLocationBroadcastOptions) {
  const lastSent = useRef<number>(0)
  const watchId = useRef<number | null>(null)

  const sendLocation = useCallback(
    async (position: GeolocationPosition) => {
      const now = Date.now()
      // Throttle: skip if last update was sent less than intervalMs ago
      if (now - lastSent.current < intervalMs) return

      lastSent.current = now

      try {
        await fetch('/api/mover/update-location', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            heading: position.coords.heading,
            speed: position.coords.speed,
            moveId: moveId || undefined,
          }),
        })
      } catch (err) {
        console.error('[LocationBroadcast] Failed to send location:', err)
      }
    },
    [intervalMs, moveId]
  )

  useEffect(() => {
    if (!enabled) return
    if (typeof navigator === 'undefined' || !navigator.geolocation) return

    watchId.current = navigator.geolocation.watchPosition(
      (position) => {
        sendLocation(position)
      },
      (err) => {
        console.warn('[LocationBroadcast] Geolocation error:', err.message)
      },
      {
        enableHighAccuracy: true,
        maximumAge: 10_000,
        timeout: 15_000,
      }
    )

    return () => {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current)
        watchId.current = null
      }
    }
  }, [enabled, sendLocation])
}
