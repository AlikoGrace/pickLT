import { countryToIso2 } from './country-code.js';

/**
 * Which country is this move priced in? (plan `wave-2026-10/4` C2)
 *
 * Place of supply for a consumer move inside the EU is the country of
 * DEPARTURE, so the VAT and the tariff follow the pickup address — not the
 * client's residence and not the mover's. The chain, strongest signal first:
 *
 *   1. the row's own `countryCode` when it is already set and the pickup has
 *      not moved in this write (a finalize after an earlier finalize);
 *   2. Mapbox reverse geocode of the pickup coordinates (`types=country`);
 *   3. the client's `pickupCountryCode` / `countryCode` hint from the body
 *      (the booking wizard geocodes the pickup on-device);
 *   4. the client's own `users.countryCode`;
 *   5. `'DE'` — the market everything defaulted to before countries existed.
 *
 * Byte-identical beside `main.js` in `calculateprice`, `savedraftmove` and
 * `createmove` (`scripts/check-function-mirrors.sh`). Never throws: a geocoder
 * outage must not block a booking, it only moves the answer down the chain.
 */

export const DEFAULT_COUNTRY_CODE = 'DE';

// The functions have never reached Mapbox before this wave, so there is no
// established variable name; accept the obvious spellings. The app's own
// token is `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN`.
const TOKEN_ENV_KEYS = ['MAPBOX_ACCESS_TOKEN', 'MAPBOX_TOKEN', 'EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN'];
const GEOCODE_TIMEOUT_MS = 4000;

/** The Mapbox token, read per call so a deploy-time variable change is picked up. */
export function mapboxToken() {
  for (const k of TOKEN_ENV_KEYS) {
    const v = process.env[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return '';
}

let warnedNoToken = false;
/** One startup-style log per container when no token is configured. */
export function warnIfNoMapboxToken(fnName, log) {
  if (warnedNoToken || mapboxToken()) return;
  warnedNoToken = true;
  log(
    `[${fnName}] no MAPBOX_ACCESS_TOKEN set — the move country cannot be reverse-geocoded from the ` +
      `pickup and falls back to the client hint, the client's country, then ${DEFAULT_COUNTRY_CODE}`,
  );
}

function finiteCoord(v) {
  return typeof v === 'number' && Number.isFinite(v);
}

/**
 * Pickup coordinates → ISO2 through Mapbox (`types=country`). `null` when the
 * token is missing, the coordinates are not finite, the request fails or times
 * out, or the answer has no recognisable country. Never throws.
 */
export async function reverseGeocodeCountry(latitude, longitude, error) {
  const token = mapboxToken();
  if (!token || !finiteCoord(latitude) || !finiteCoord(longitude) || typeof fetch !== 'function') return null;
  const url =
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json` +
    `?types=country&limit=1&access_token=${encodeURIComponent(token)}`;
  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), GEOCODE_TIMEOUT_MS) : null;
  try {
    const res = await fetch(url, controller ? { signal: controller.signal } : undefined);
    if (!res.ok) {
      if (error) error(`reverse geocode (country) failed: HTTP ${res.status}`);
      return null;
    }
    const data = await res.json();
    return countryFromFeature(data && Array.isArray(data.features) ? data.features[0] : null);
  } catch (e) {
    if (error) error(`reverse geocode (country) failed: ${e && e.message ? e.message : String(e)}`);
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** The ISO2 of a Mapbox feature: its own `short_code` for a country, else the `country.*` context entry. */
export function countryFromFeature(feature) {
  if (!feature || typeof feature !== 'object') return null;
  const own = feature.properties && feature.properties.short_code;
  const isCountry = Array.isArray(feature.place_type)
    ? feature.place_type.includes('country')
    : typeof feature.id === 'string' && feature.id.startsWith('country.');
  if (isCountry) {
    const code = countryToIso2(own);
    if (code) return code;
  }
  const ctx = Array.isArray(feature.context)
    ? feature.context.find((c) => c && typeof c.id === 'string' && c.id.startsWith('country.'))
    : null;
  return countryToIso2(ctx && ctx.short_code) ?? countryToIso2(own);
}

/** The client's hint: `pickupCountryCode` wins over the looser `countryCode`. */
export function countryHint(body) {
  if (!body || typeof body !== 'object') return null;
  return countryToIso2(body.pickupCountryCode) ?? countryToIso2(body.countryCode);
}

/**
 * Resolve the move's country (see the chain above).
 *
 * @param {object} opts
 * @param {object} opts.row        the move row as it will be written (merged row + patch)
 * @param {object} [opts.body]     the request body (hint)
 * @param {boolean} [opts.pickupChanged]  true when this write moves the pickup — forces a fresh geocode
 * @param {() => Promise<string|null>} [opts.loadUserCountry]  reads `users.countryCode` for the client
 * @param {(msg: string) => void} [opts.error]
 * @returns {Promise<{ countryCode: string, source: 'row'|'geocode'|'hint'|'user'|'default' }>}
 */
export async function resolveMoveCountry(opts) {
  const row = opts.row || {};
  const existing = countryToIso2(row.countryCode);
  if (existing && !opts.pickupChanged) return { countryCode: existing, source: 'row' };

  const geocoded = await reverseGeocodeCountry(row.pickupLatitude, row.pickupLongitude, opts.error);
  if (geocoded) return { countryCode: geocoded, source: 'geocode' };

  const hint = countryHint(opts.body);
  if (hint) return { countryCode: hint, source: 'hint' };

  if (typeof opts.loadUserCountry === 'function') {
    try {
      const fromUser = countryToIso2(await opts.loadUserCountry());
      if (fromUser) return { countryCode: fromUser, source: 'user' };
    } catch (e) {
      if (opts.error) opts.error(`client country lookup failed: ${e && e.message ? e.message : String(e)}`);
    }
  }

  return { countryCode: DEFAULT_COUNTRY_CODE, source: 'default' };
}
