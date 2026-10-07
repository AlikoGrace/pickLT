'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { databases } from '@/lib/appwrite'
import { Query } from 'appwrite'
import type { Models } from 'appwrite'

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || ''
const MOVER_LOCATIONS_COLLECTION = process.env.NEXT_PUBLIC_COLLECTION_MOVER_LOCATIONS || ''

interface MoverLocationUpdate {
  latitude: number
  longitude: number
  heading?: number
  speed?: number
  timestamp: string
}

interface UseMoverLocationPollingOptions {
  /** The mover profile ID to track */
  moverProfileId: string | null
  /** Whether polling is active */
  enabled?: boolean
  /** Polling interval in ms (default: 3000 = 3s) */
  intervalMs?: number
  /** Callback for each location update */
  onLocationUpdate?: (location: MoverLocationUpdate) => void
}

/**
 * Hook that polls the mover_locations collection every `intervalMs` (default 3s)
 * to get the latest GPS coordinates for a mover.
 * 
 * This is more reliable than Realtime alone since it ensures we always
 * have the latest position even if a Realtime event was missed.
 */
export function useMoverLocationPolling({
  moverProfileId,
  enabled = true,
  intervalMs = 3000,
  onLocationUpdate,
}: UseMoverLocationPollingOptions) {
  const [lastLocation, setLastLocation] = useState<MoverLocationUpdate | null>(null)
  const [isPolling, setIsPolling] = useState(false)
  const onLocationUpdateRef = useRef(onLocationUpdate)

  // Keep callback ref in sync
  useEffect(() => {
    onLocationUpdateRef.current = onLocationUpdate
  }, [onLocationUpdate])

  const fetchLatestLocation = useCallback(async () => {
    if (!moverProfileId || !DATABASE_ID || !MOVER_LOCATIONS_COLLECTION) return

    try {
      const res = await databases.listDocuments(
        DATABASE_ID,
        MOVER_LOCATIONS_COLLECTION,
        [
          Query.equal('moverProfileId', moverProfileId),
          // The row is updated in place on every ping; `$createdAt` never moves.
          Query.orderDesc('$updatedAt'),
          Query.limit(1),
        ]
      )

      if (res.total === 0) return

      const doc = res.documents[0] as Models.Document & Record<string, unknown>
      const location: MoverLocationUpdate = {
        latitude: doc.latitude as number,
        longitude: doc.longitude as number,
        heading: doc.heading as number | undefined,
        speed: doc.speed as number | undefined,
        timestamp: (doc.timestamp as string) || doc.$updatedAt || new Date().toISOString(),
      }

      setLastLocation(location)
      onLocationUpdateRef.current?.(location)
    } catch (err) {
      console.warn('[useMoverLocationPolling] fetch failed:', err)
    }
  }, [moverProfileId])

  // Poll on interval
  useEffect(() => {
    if (!enabled || !moverProfileId || !DATABASE_ID || !MOVER_LOCATIONS_COLLECTION) {
      setIsPolling(false)
      return
    }

    setIsPolling(true)

    // Fetch immediately on mount
    fetchLatestLocation()

    const intervalId = setInterval(fetchLatestLocation, intervalMs)

    return () => {
      clearInterval(intervalId)
      setIsPolling(false)
    }
  }, [enabled, moverProfileId, intervalMs, fetchLatestLocation])

  return { lastLocation, isPolling }
}
