import { Query, type Databases } from 'node-appwrite'
import { APPWRITE } from '@/lib/constants'

/**
 * T9 sanctions gate — TypeScript port of the checks in
 * `functions/submitmoverprofile/src/main.js`. Keep the two in sync: the
 * function guards the mobile onboarding path, this module guards the web
 * API route (which writes `mover_profiles` directly with the admin client
 * and therefore never passes through the function).
 */

// `primaryCountry` is free text; map the common spellings to ISO2. Unknown
// countries map to null (never blocked: a typo must not lock a mover out;
// DAC7 KYC review catches residence later).
const COUNTRY_CODES: Record<string, string> = {
  germany: 'DE', deutschland: 'DE', de: 'DE',
  austria: 'AT', 'österreich': 'AT', osterreich: 'AT', at: 'AT',
  switzerland: 'CH', schweiz: 'CH', suisse: 'CH', ch: 'CH',
  france: 'FR', fr: 'FR', netherlands: 'NL', nederland: 'NL', nl: 'NL',
  belgium: 'BE', be: 'BE', poland: 'PL', polska: 'PL', pl: 'PL',
  'united kingdom': 'GB', uk: 'GB', gb: 'GB',
  'united states': 'US', usa: 'US', us: 'US',
  ghana: 'GH', gh: 'GH',
  russia: 'RU', ru: 'RU', belarus: 'BY', by: 'BY',
  iran: 'IR', ir: 'IR', syria: 'SY', sy: 'SY',
  'north korea': 'KP', kp: 'KP', cuba: 'CU', cu: 'CU',
}

export function countryToIso2(raw: unknown): string | null {
  if (!raw || typeof raw !== 'string') return null
  const key = raw.trim().toLowerCase()
  if (COUNTRY_CODES[key]) return COUNTRY_CODES[key]
  if (/^[a-z]{2}$/.test(key)) return key.toUpperCase()
  return null
}

/**
 * Operator-managed deny list (platform_config `sanctioned_countries`, JSON
 * array of ISO2). Data, not code: sanctions policy changes are a config edit.
 */
export function isSanctionedCountry(primaryCountry: unknown, sanctionedList: unknown): boolean {
  const code = countryToIso2(primaryCountry)
  if (!code) return false
  return Array.isArray(sanctionedList) && sanctionedList.includes(code)
}

const PLATFORM_CONFIG_COLLECTION = 'platform_config'

/**
 * Returns a 403-worthy rejection message when the country is sanctioned, else
 * null. Config lookup failures never block onboarding (infrastructure noise
 * must not lock movers out) — they are logged and treated as "not sanctioned".
 */
export async function sanctionedCountryRejection(
  databases: Databases,
  primaryCountry: unknown,
): Promise<string | null> {
  try {
    const cfg = await databases.listDocuments(APPWRITE.DATABASE_ID, PLATFORM_CONFIG_COLLECTION, [
      Query.equal('key', 'sanctioned_countries'),
      Query.limit(1),
    ])
    const raw = (cfg.documents[0] as unknown as { value?: string } | undefined)?.value
    const list = raw ? JSON.parse(raw) : []
    if (isSanctionedCountry(primaryCountry, list)) {
      return `PickLT does not operate in ${primaryCountry}. Mover onboarding is not available there.`
    }
  } catch (e) {
    console.error('sanctions config check failed (continuing):', e)
  }
  return null
}
