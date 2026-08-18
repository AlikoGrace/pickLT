/**
 * Reverse-geocoding that can actually name a building.
 *
 * The Geocoding API (v5 and v6 alike) answers an in-town coordinate with the
 * enclosing *place*: a GPS fix inside a named building came back as nothing but
 * "Kumasi, Ashanti, Ghana", so "use my location" could never resolve to the
 * building or street the user was standing in. The Search Box reverse endpoint
 * indexes POIs, addresses and streets, so it returns the specific thing at the
 * point — and several candidates around it.
 */

export interface ReverseGeocodeHit {
  id: string
  name: string
  fullAddress: string
  coordinates: { latitude: number; longitude: number }
}

/** Nearby places for a coordinate, nearest first. */
export async function reverseGeocodePlaces(
  lat: number,
  lng: number,
  token: string,
  limit = 8,
): Promise<ReverseGeocodeHit[]> {
  if (!token) return []
  const params = new URLSearchParams({
    access_token: token,
    longitude: String(lng),
    latitude: String(lat),
    limit: String(limit),
    language: 'en',
    types: 'poi,address,street,neighborhood',
  })
  try {
    const res = await fetch(`https://api.mapbox.com/search/searchbox/v1/reverse?${params}`)
    if (!res.ok) return []
    const data = await res.json()
    return (data.features || [])
      .map((f: any, i: number): ReverseGeocodeHit | null => {
        const p = f.properties || {}
        const latitude = p.coordinates?.latitude ?? f.geometry?.coordinates?.[1]
        const longitude = p.coordinates?.longitude ?? f.geometry?.coordinates?.[0]
        const name = (p.name || '').trim()
        if (typeof latitude !== 'number' || typeof longitude !== 'number' || !name) return null
        return {
          id: p.mapbox_id || `sb-${i}-${latitude},${longitude}`,
          name,
          fullAddress: p.full_address || p.place_formatted || name,
          coordinates: { latitude, longitude },
        }
      })
      .filter(Boolean) as ReverseGeocodeHit[]
  } catch {
    return []
  }
}

/** The single most specific place at a coordinate. */
export async function reverseGeocodeBest(
  lat: number,
  lng: number,
  token: string,
): Promise<ReverseGeocodeHit | null> {
  const hits = await reverseGeocodePlaces(lat, lng, token, 1)
  return hits[0] ?? null
}
