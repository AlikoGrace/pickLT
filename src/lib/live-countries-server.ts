import type { Databases } from 'node-appwrite'
import { Query } from 'node-appwrite'

import { APPWRITE } from './constants'
import { liveCountryCodes, parseSupportedCountries, SUPPORTED_COUNTRIES } from './supportedCountries'

const PLATFORM_CONFIG_COLLECTION = 'platform_config'

/**
 * The open markets (plan `legal/1.scope-lock` S3): the operator's
 * `platform_config.supported_countries`, else the compiled defaults. Never
 * throws, so an unreadable config can neither open a closed market nor close
 * the home one.
 */
export async function loadLiveCountries(databases: Databases): Promise<string[]> {
  try {
    const cfg = await databases.listDocuments(APPWRITE.DATABASE_ID, PLATFORM_CONFIG_COLLECTION, [
      Query.equal('key', 'supported_countries'),
      Query.limit(1),
    ])
    const raw = (cfg.documents[0] as unknown as { value?: string } | undefined)?.value
    if (raw) return liveCountryCodes(parseSupportedCountries(raw))
  } catch (e) {
    console.error('supported countries lookup failed (using defaults):', e)
  }
  return liveCountryCodes(SUPPORTED_COUNTRIES)
}
