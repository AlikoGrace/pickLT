import { countryToIso2 } from './countryCode'
import { DEFAULT_COUNTRY_CODE } from './supportedCountries'

/**
 * Which country is this move in? (plan `wave-2026-10/4` C2)
 *
 * Place of supply for a consumer move inside the EU is the country of
 * departure, so a move's VAT and tariff follow the PICKUP address — not the
 * client's residence and not the mover's. The server derives it, in this order:
 *
 *   1. reverse geocode of the pickup coordinates (Mapbox, `types=country`);
 *   2. the client's `pickupCountryCode` hint (the geocoder result's country
 *      `short_code`, read in the browser when the address was picked);
 *   3. the client's own `users.countryCode`;
 *   4. `DEFAULT_COUNTRY_CODE` — the market everything defaulted to before
 *      countries existed.
 *
 * `pickMoveCountry` is the pure precedence rule (unit-tested);
 * `resolveMoveCountry` adds the network call. Server-only by intent (it reads
 * the Mapbox token from the environment), but it imports nothing Node-specific.
 */

export interface MoveCountryHints {
  /** Country the reverse geocoder answered for the pickup point, any spelling. */
  geocoded?: unknown
  /** Client-side hint from the forward geocoder's `context` short code. */
  hint?: unknown
  /** `users.countryCode` of the booking client. */
  userCountryCode?: unknown
}

/** First valid ISO2 in precedence order; never null. */
export function pickMoveCountry(h: MoveCountryHints): string {
  return (
    countryToIso2(h.geocoded) ??
    countryToIso2(h.hint) ??
    countryToIso2(h.userCountryCode) ??
    DEFAULT_COUNTRY_CODE
  )
}

/** Mapbox feature → country code, for the v6 (`context.country.country_code`) and v5 (`short_code`) shapes. */
export function countryCodeFromFeature(feature: unknown): string | null {
  if (!feature || typeof feature !== 'object') return null
  const f = feature as Record<string, any>
  const props = (f.properties ?? {}) as Record<string, any>
  const candidates: unknown[] = [
    props.context?.country?.country_code,
    props.country_code,
    props.short_code,
    f.short_code,
    ...(Array.isArray(f.context) ? f.context.map((c: Record<string, unknown>) => c?.short_code) : []),
  ]
  for (const c of candidates) {
    const code = countryToIso2(c)
    if (code) return code
  }
  return null
}

export type FetchLike = (input: string) => Promise<{ ok: boolean; json(): Promise<unknown> }>

/**
 * Reverse geocode a coordinate to its country (ISO2) or `null`. Any failure —
 * no token, network error, an odd payload — is `null`: the caller has fallbacks
 * and a geocoder outage must never block a booking.
 */
export async function reverseGeocodeCountry(
  lat: unknown,
  lng: unknown,
  token: string | undefined = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN,
  fetchImpl: FetchLike = fetch,
): Promise<string | null> {
  // `Number(null)` is 0 — a valid coordinate — so null/blank are rejected explicitly.
  const num = (v: unknown) => (typeof v === 'number' ? v : typeof v === 'string' && v.trim() ? Number(v) : NaN)
  const la = num(lat)
  const ln = num(lng)
  if (!token || !Number.isFinite(la) || !Number.isFinite(ln) || Math.abs(la) > 90 || Math.abs(ln) > 180) return null
  const params = new URLSearchParams({
    longitude: String(ln),
    latitude: String(la),
    types: 'country',
    limit: '1',
    access_token: token,
  })
  try {
    const res = await fetchImpl(`https://api.mapbox.com/search/geocode/v6/reverse?${params}`)
    if (!res.ok) return null
    const data = (await res.json()) as { features?: unknown[] }
    for (const f of data.features ?? []) {
      const code = countryCodeFromFeature(f)
      if (code) return code
    }
    return null
  } catch {
    return null
  }
}

/** The move's country for a create route: geocode, then the hints, then the default. */
export async function resolveMoveCountry(params: {
  pickupLatitude?: unknown
  pickupLongitude?: unknown
  pickupCountryCode?: unknown
  userCountryCode?: unknown
  token?: string
  fetchImpl?: FetchLike
}): Promise<string> {
  const geocoded = await reverseGeocodeCountry(
    params.pickupLatitude,
    params.pickupLongitude,
    params.token ?? process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN,
    params.fetchImpl ?? fetch,
  )
  return pickMoveCountry({ geocoded, hint: params.pickupCountryCode, userCountryCode: params.userCountryCode })
}
