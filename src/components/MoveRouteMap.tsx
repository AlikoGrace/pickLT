'use client'

import dynamic from 'next/dynamic'
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { RouteInfo } from '@/components/MapboxMap'
import { routeCaptionParts, type Coordinate } from '@/lib/route-caption'

/**
 * mapbox-gl touches `window` at import time, so the map is loaded on the
 * client only — the details page itself still server-renders its text.
 */
const MapboxMap = dynamic(() => import('@/components/MapboxMap'), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-neutral-100 dark:bg-neutral-800" />,
})

interface MoveRouteMapProps {
  pickup: Coordinate | null
  dropoff: Coordinate | null
  /** The row's `routeDistanceMeters` — what the quote was priced on. */
  distanceMeters?: number | null
  /** The row's `routeDurationSeconds`. */
  durationSeconds?: number | null
  className?: string
}

/**
 * The route map on a move's details page (maps master M2/M3): pickup, drop-off
 * and the driven route, captioned with the **row's** distance and duration so
 * the figure never disagrees with the price breakdown. Renders nothing when
 * either endpoint is missing.
 *
 * The route the map draws is fetched live by `MapboxMap`; its figures are used
 * for the caption only when the row carries none (older rows).
 */
export default function MoveRouteMap({
  pickup,
  dropoff,
  distanceMeters,
  durationSeconds,
  className = '',
}: MoveRouteMapProps) {
  const { t, i18n } = useTranslation()
  const [fetchedRoute, setFetchedRoute] = useState<RouteInfo | null>(null)

  const handleRouteCalculated = useCallback((info: RouteInfo) => {
    setFetchedRoute(info)
  }, [])

  if (!pickup || !dropoff) return null

  const hasRowDistance = typeof distanceMeters === 'number' && distanceMeters > 0
  const caption = routeCaptionParts(
    hasRowDistance ? distanceMeters : fetchedRoute?.distance,
    hasRowDistance ? durationSeconds : fetchedRoute?.duration,
    i18n.resolvedLanguage ?? i18n.language,
  )

  const captionText = caption.distance
    ? caption.duration
      ? t('web:moveDetails.map.distanceDuration', { distance: caption.distance, duration: caption.duration })
      : t('web:moveDetails.map.distance', { distance: caption.distance })
    : null

  return (
    <div className={`bg-white dark:bg-neutral-800 rounded-2xl p-6 shadow-sm ${className}`}>
      <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
        {t('web:moveDetails.map.title')}
      </h2>
      <div className="h-[320px] w-full overflow-hidden rounded-2xl">
        <MapboxMap
          pickupCoordinates={pickup}
          dropoffCoordinates={dropoff}
          showRoute
          showUserLocation={false}
          onRouteCalculated={hasRowDistance ? undefined : handleRouteCalculated}
        />
      </div>
      {captionText && (
        <p className="mt-3 text-sm text-neutral-500 dark:text-neutral-400">{captionText}</p>
      )}
    </div>
  )
}
