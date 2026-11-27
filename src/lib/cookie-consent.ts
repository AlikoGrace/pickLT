/**
 * Cookie consent (plan pickltmobile/.agent/plans/legal/6.web-cleanup.md, W3).
 *
 * Pure helpers, no DOM access, so the banner, the Sentry gate in
 * `src/instrumentation-client.ts` and the unit tests share one reading of the
 * cookie.
 *
 * Categories: necessary (sign-in, language, booking draft, payment and maps
 * when used; always on, never stored) and error monitoring (Sentry; off until
 * accepted). There is no analytics or marketing category.
 */

export const CONSENT_COOKIE = 'picklt_consent'

/** Bump to ask everyone again (a stored cookie with another `v` is ignored). */
export const CONSENT_VERSION = 1

/** Six months, in seconds. */
export const CONSENT_MAX_AGE = 60 * 60 * 24 * 182

export type Consent = {
  v: typeof CONSENT_VERSION
  monitoring: boolean
  /** ISO timestamp of the choice. */
  at: string
}

/** Value of one cookie out of a `document.cookie`-style string, or null. */
function readCookie(cookieString: string | null | undefined, name: string): string | null {
  if (!cookieString) return null
  for (const part of cookieString.split(';')) {
    const eq = part.indexOf('=')
    if (eq === -1) continue
    if (part.slice(0, eq).trim() === name) return part.slice(eq + 1).trim()
  }
  return null
}

/**
 * Reads the consent out of a cookie string (`document.cookie` or a request's
 * `Cookie` header). Returns null when the cookie is missing, malformed or of
 * another version, which all mean: ask.
 */
export function parseConsent(cookieString: string | null | undefined): Consent | null {
  const raw = readCookie(cookieString, CONSENT_COOKIE)
  if (!raw) return null
  let data: unknown
  try {
    data = JSON.parse(decodeURIComponent(raw))
  } catch {
    return null
  }
  if (!data || typeof data !== 'object') return null
  const { v, monitoring, at } = data as Record<string, unknown>
  if (v !== CONSENT_VERSION) return null
  if (typeof monitoring !== 'boolean') return null
  if (typeof at !== 'string' || Number.isNaN(Date.parse(at))) return null
  return { v: CONSENT_VERSION, monitoring, at }
}

/** The cookie value (URI-encoded JSON) for a choice. */
export function serialiseConsent(monitoring: boolean, now: Date = new Date()): string {
  const consent: Consent = { v: CONSENT_VERSION, monitoring, at: now.toISOString() }
  return encodeURIComponent(JSON.stringify(consent))
}

/** The full `document.cookie` assignment for a choice. */
export function consentCookieString(monitoring: boolean, now: Date = new Date()): string {
  return `${CONSENT_COOKIE}=${serialiseConsent(monitoring, now)}; path=/; max-age=${CONSENT_MAX_AGE}; samesite=lax`
}

/** True when the banner should be shown: no valid choice of this version. */
export function needsPrompt(cookieString: string | null | undefined): boolean {
  return parseConsent(cookieString) === null
}

/** The Sentry gate: browser error monitoring only after an explicit yes. */
export function monitoringAllowed(cookieString: string | null | undefined): boolean {
  return parseConsent(cookieString)?.monitoring === true
}
