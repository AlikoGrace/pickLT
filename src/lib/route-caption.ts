/**
 * The route-map caption on the move details pages (maps master M3).
 *
 * The figures come from the move **row** — `routeDistanceMeters` and
 * `routeDurationSeconds`, the values the quote was priced on — never from a
 * freshly fetched route, so the map can never disagree with the price
 * breakdown sitting under it ("2.7 km × €1.35").
 *
 * Pure and locale-explicit so it can be pinned by a node test; the component
 * resolves the active locale and passes it in.
 */

import { formatDistanceKm, formatDurationHm } from './format'

export interface Coordinate {
  latitude: number
  longitude: number
}

export interface RouteCaptionParts {
  /** `2.7 km`, or null when the row carries no usable distance. */
  distance: string | null
  /** `1 hr 20 min`, or null when the row carries no usable duration. */
  duration: string | null
}

function isPositiveFinite(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}

/**
 * Pair a row's latitude/longitude into a coordinate, or null when either half
 * is missing or not a real number — the map renders nothing in that case
 * rather than a pin at (0, 0) off the coast of West Africa.
 */
export function toCoordinate(
  latitude: number | null | undefined,
  longitude: number | null | undefined,
): Coordinate | null {
  if (typeof latitude !== 'number' || !Number.isFinite(latitude)) return null
  if (typeof longitude !== 'number' || !Number.isFinite(longitude)) return null
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null
  return { latitude, longitude }
}

/** The formatted pieces of the caption; each is null when the row has none. */
export function routeCaptionParts(
  distanceMeters: number | null | undefined,
  durationSeconds: number | null | undefined,
  locale: string,
): RouteCaptionParts {
  return {
    distance: isPositiveFinite(distanceMeters)
      ? formatDistanceKm(distanceMeters / 1000, { locale })
      : null,
    duration: isPositiveFinite(durationSeconds)
      ? formatDurationHm(durationSeconds, { locale })
      : null,
  }
}
