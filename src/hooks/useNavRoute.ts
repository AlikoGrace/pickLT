import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { navProgress, prepareRoute, shouldReroute, type NavProgress, type PreparedRoute } from '@/lib/nav-progress'
import { fetchNavRoute } from '@/lib/nav-route'

interface Point {
  latitude: number
  longitude: number
}

/**
 * Turn-by-turn route from the driver to `destination` while navigation mode is
 * on (plan pickltmobile maps/mover-navigation-mode). Fetched on entering, when
 * the driver leaves the route (two fixes > 40 m off) and when the app language
 * changes. Twin of the mover app's `useNavRoute`.
 */
export function useNavRoute(
  position: Point | null,
  destination: Point | null,
  active: boolean
): { route: PreparedRoute | null; progress: NavProgress | null; rerouting: boolean } {
  const { i18n } = useTranslation()
  const [route, setRoute] = useState<PreparedRoute | null>(null)
  const [nonce, setNonce] = useState(0)
  const [rerouting, setRerouting] = useState(false)
  const offHistory = useRef<number[]>([])
  const positionRef = useRef(position)
  positionRef.current = position
  const hasPosition = !!position
  const destKey = destination ? `${destination.latitude},${destination.longitude}` : ''

  useEffect(() => {
    if (!active || !hasPosition || !destination) {
      if (!active) setRoute(null)
      return
    }
    const ctrl = new AbortController()
    setRerouting(true)
    fetchNavRoute(positionRef.current!, destination, { signal: ctrl.signal })
      .then((r) => {
        offHistory.current = []
        setRoute(prepareRoute(r))
      })
      .catch(() => {})
      .finally(() => {
        if (!ctrl.signal.aborted) setRerouting(false)
      })
    return () => ctrl.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, hasPosition, destKey, i18n.language, nonce])

  const progress = useMemo(
    () => (route && position ? navProgress(route, [position.longitude, position.latitude]) : null),
    [route, position]
  )

  useEffect(() => {
    if (!progress || rerouting) return
    offHistory.current = [...offHistory.current.slice(-4), progress.offRouteM]
    if (shouldReroute(offHistory.current)) {
      offHistory.current = []
      setNonce((n) => n + 1)
    }
  }, [progress, rerouting])

  return { route, progress, rerouting }
}
