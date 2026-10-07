import { mapboxLanguage } from '@/lib/mapbox-language'
import type { NavRoute } from '@/lib/nav-progress'

interface Point {
  latitude: number
  longitude: number
}

interface MapboxNavResponse {
  routes: {
    geometry: { coordinates: [number, number][] }
    distance: number
    duration: number
    legs: {
      steps: {
        name?: string
        maneuver: { location: [number, number]; type: string; modifier?: string; instruction: string }
      }[]
    }[]
  }[]
}

/**
 * A driving route with turn-by-turn steps for the mover's navigation mode
 * (plan pickltmobile maps/mover-navigation-mode), instructions translated by
 * Mapbox into the app's language. Twin of the mover app's `fetchNavRoute`.
 */
export async function fetchNavRoute(
  from: Point,
  to: Point,
  opts: { signal?: AbortSignal; language?: string } = {}
): Promise<NavRoute> {
  const params = new URLSearchParams({
    access_token: process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || '',
    overview: 'full',
    geometries: 'geojson',
    steps: 'true',
    language: opts.language ?? mapboxLanguage(),
  })
  const coords = `${from.longitude},${from.latitude};${to.longitude},${to.latitude}`
  const res = await fetch(`https://api.mapbox.com/directions/v5/mapbox/driving/${coords}?${params}`, {
    signal: opts.signal,
  })
  if (!res.ok) throw new Error(`Mapbox directions ${res.status}`)
  const data = (await res.json()) as MapboxNavResponse
  const route = data.routes[0]
  if (!route) throw new Error('Mapbox: no route found')
  return {
    line: route.geometry.coordinates,
    steps: route.legs.flatMap((leg) =>
      leg.steps.map((st) => ({
        location: st.maneuver.location,
        type: st.maneuver.type,
        modifier: st.maneuver.modifier,
        instruction: st.maneuver.instruction,
        name: st.name,
      }))
    ),
    distance: route.distance,
    duration: route.duration,
  }
}
