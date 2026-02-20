import { useEffect, useRef, useCallback, useState } from 'react'
import { client } from '@/lib/appwrite'
import type { RealtimeResponseEvent, Models } from 'appwrite'

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || ''
const MOVER_LOCATIONS_COLLECTION = process.env.NEXT_PUBLIC_COLLECTION_MOVER_LOCATIONS || ''

interface MoverLocationUpdate {
  latitude: number
  longitude: number
  heading?: number
  speed?: number
  timestamp: string
}

interface UseMoverTrackingOptions {
  /** The mover profile ID to track */
  moverProfileId: string | null
  /** Whether tracking is active */
  enabled?: boolean
  /** Callback for each location update */
  onLocationUpdate?: (location: MoverLocationUpdate) => void
}

/**
 * Hook that subscribes to Appwrite Realtime for live mover GPS updates.
 * Listens for changes to documents in the mover_locations collection
 * that match the given moverProfileId.
 */
export function useMoverTracking({
  moverProfileId,
  enabled = true,
  onLocationUpdate,
}: UseMoverTrackingOptions) {
  const [lastLocation, setLastLocation] = useState<MoverLocationUpdate | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const onLocationUpdateRef = useRef(onLocationUpdate)

  // Keep ref in sync
  useEffect(() => {
    onLocationUpdateRef.current = onLocationUpdate
  }, [onLocationUpdate])

  useEffect(() => {
    if (!enabled || !moverProfileId || !DATABASE_ID || !MOVER_LOCATIONS_COLLECTION) {
      return
    }

    // Subscribe to changes in the mover_locations collection
    const channel = `databases.${DATABASE_ID}.collections.${MOVER_LOCATIONS_COLLECTION}.documents`

    const unsubscribe = client.subscribe<Models.Document>(
      channel,
      (response: RealtimeResponseEvent<Models.Document>) => {
        // Only process create/update events
        const events = response.events || []
        const isRelevant = events.some(
          (e) => e.includes('.create') || e.includes('.update')
        )
        if (!isRelevant) return

        const doc = response.payload as Models.Document & Record<string, unknown>
        if (!doc) return

        // Filter by moverProfileId
        if (doc.moverProfileId !== moverProfileId) return

        const location: MoverLocationUpdate = {
          latitude: doc.latitude as number,
          longitude: doc.longitude as number,
          heading: doc.heading as number | undefined,
          speed: doc.speed as number | undefined,
          timestamp: doc.$createdAt || (doc.timestamp as string) || new Date().toISOString(),
        }

        setLastLocation(location)
        setIsConnected(true)
        onLocationUpdateRef.current?.(location)
      }
    )

    setIsConnected(true)

    return () => {
      unsubscribe()
      setIsConnected(false)
    }
  }, [moverProfileId, enabled])

  return { lastLocation, isConnected }
}
