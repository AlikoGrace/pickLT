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

// ── Scope lock (plan `legal/1.scope-lock` S2/S3) ────────────────────────────
//
// A move must start and end in the same country, and that country must be an
// open market. Enforced in the create routes, so the browser cannot book
// around it. The web port of `functions/createmove/src/move-country.js`.

export type ScopeLockCode = 'country.pickupNotLive' | 'country.crossBorder'

/** Both countries are known and they differ. An unknown side never blocks. */
export function isCrossBorder(pickupCountryCode: unknown, dropoffCountryCode: unknown): boolean {
  const a = countryToIso2(pickupCountryCode)
  const b = countryToIso2(dropoffCountryCode)
  return !!a && !!b && a !== b
}

/**
 * Why this move may not be created, or `null`.
 *
 * `pickupCountryCode` is the pickup's OWN country (geocoded or hinted), or
 * null when it is not known. Only a known pickup can be refused: the client's
 * home country and the default market are fallbacks for pricing, not evidence
 * of where the move starts.
 */
export function scopeLockViolation(params: {
  pickupCountryCode: unknown
  dropoffCountryCode: unknown
  liveCountries: readonly string[]
}): ScopeLockCode | null {
  const pickup = countryToIso2(params.pickupCountryCode)
  if (!pickup) return null
  if (!params.liveCountries.includes(pickup)) return 'country.pickupNotLive'
  if (isCrossBorder(pickup, params.dropoffCountryCode)) return 'country.crossBorder'
  return null
}

/**
 * The create routes' country step: the move's (pricing) country plus the scope
 * lock verdict. Geocodes the pickup once and the drop-off once; any geocoder
 * failure leaves that side unknown and the booking goes ahead.
 */
export async function resolveMoveCountryWithLock(params: {
  pickupLatitude?: unknown
  pickupLongitude?: unknown
  pickupCountryCode?: unknown
  dropoffLatitude?: unknown
  dropoffLongitude?: unknown
  dropoffCountryCode?: unknown
  userCountryCode?: unknown
  liveCountries: readonly string[]
  token?: string
  fetchImpl?: FetchLike
}): Promise<{ countryCode: string; violation: ScopeLockCode | null }> {
  const token = params.token ?? process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN
  const fetchImpl = params.fetchImpl ?? fetch
  const [pickupGeocoded, dropoffGeocoded] = await Promise.all([
    reverseGeocodeCountry(params.pickupLatitude, params.pickupLongitude, token, fetchImpl),
    reverseGeocodeCountry(params.dropoffLatitude, params.dropoffLongitude, token, fetchImpl),
  ])
  const countryCode = pickMoveCountry({
    geocoded: pickupGeocoded,
    hint: params.pickupCountryCode,
    userCountryCode: params.userCountryCode,
  })
  const violation = scopeLockViolation({
    pickupCountryCode: countryToIso2(pickupGeocoded) ?? countryToIso2(params.pickupCountryCode),
    dropoffCountryCode: countryToIso2(dropoffGeocoded) ?? countryToIso2(params.dropoffCountryCode),
    liveCountries: params.liveCountries,
  })
  return { countryCode, violation }
}

/** HTTP status for a scope-lock refusal, matching the cloud functions. */
export function scopeLockStatus(code: ScopeLockCode): number {
  return code === 'country.pickupNotLive' ? 403 : 400
}
