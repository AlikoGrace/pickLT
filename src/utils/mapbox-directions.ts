const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || ''

export interface DirectionsResult {
  distanceMeters: number
  durationSeconds: number
}

/**
 * Get driving directions between two points using the Mapbox Directions API.
 * Returns the distance in meters and duration in seconds for the fastest route.
 */
export async function getMapboxDirections(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number
): Promise<DirectionsResult | null> {
  if (!MAPBOX_TOKEN) return null

  try {
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${fromLng},${fromLat};${toLng},${toLat}?access_token=${MAPBOX_TOKEN}&overview=false`
    const res = await fetch(url)
    if (!res.ok) return null

    const data = await res.json()
    if (!data.routes || data.routes.length === 0) return null

    return {
      distanceMeters: data.routes[0].distance,
      durationSeconds: data.routes[0].duration,
    }
  } catch {
    return null
  }
}
