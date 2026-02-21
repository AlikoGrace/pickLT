import { useEffect, useRef, useState } from 'react'
import { client, databases } from '@/lib/appwrite'
import type { RealtimeResponseEvent, Models } from 'appwrite'
import { Query } from 'appwrite'

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
 * Fetches the latest location document on mount, then subscribes for
 * real-time updates in the mover_locations collection.
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

  // ── Fetch the latest location document on mount ──────────
  useEffect(() => {
    if (!enabled || !moverProfileId || !DATABASE_ID || !MOVER_LOCATIONS_COLLECTION) return

    let cancelled = false

    ;(async () => {
      try {
        const res = await databases.listDocuments(
          DATABASE_ID,
          MOVER_LOCATIONS_COLLECTION,
          [
            Query.equal('moverProfileId', moverProfileId),
            Query.orderDesc('$createdAt'),
            Query.limit(1),
          ]
        )

        if (cancelled || res.total === 0) return

        const doc = res.documents[0] as Models.Document & Record<string, unknown>
        const location: MoverLocationUpdate = {
          latitude: doc.latitude as number,
          longitude: doc.longitude as number,
          heading: doc.heading as number | undefined,
          speed: doc.speed as number | undefined,
          timestamp: doc.$createdAt || (doc.timestamp as string) || new Date().toISOString(),
        }

        setLastLocation(location)
        onLocationUpdateRef.current?.(location)
      } catch (err) {
        // Client SDK may lack permission — fall back silently to realtime
        console.warn('[useMoverTracking] initial fetch failed:', err)
      }
    })()

    return () => { cancelled = true }
  }, [moverProfileId, enabled])

  // ── Subscribe to realtime updates ────────────────────────
  useEffect(() => {
    if (!enabled || !moverProfileId || !DATABASE_ID || !MOVER_LOCATIONS_COLLECTION) {
      return
    }

    const channel = `databases.${DATABASE_ID}.collections.${MOVER_LOCATIONS_COLLECTION}.documents`

    const unsubscribe = client.subscribe<Models.Document>(
      channel,
      (response: RealtimeResponseEvent<Models.Document>) => {
        const events = response.events || []
        const isRelevant = events.some(
          (e) => e.includes('.create') || e.includes('.update')
        )
        if (!isRelevant) return

        const doc = response.payload as Models.Document & Record<string, unknown>
        if (!doc) return

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
