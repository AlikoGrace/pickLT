import { Query, type Databases } from 'node-appwrite'

import { APPWRITE } from './constants'
import {
  CONFIG_KEY_DAILY_CAP,
  CONFIG_KEY_RESIDENCE_GATE,
  VETTING_DEFAULT_CONFIG,
  countsTowardDailyCap,
  dailyMoveCap,
  expiryToIso,
  parseVettingConfig,
  residenceSubmissionError,
  type VettingConfig,
  type VettingProfileFields,
} from './vetting'
import { serviceDate } from './vehicle-service'

/**
 * Server half of driver vetting on the web (plan `legal/7.driver-vetting.md`):
 * the port of `functions/submitmoverprofile` `vettingPatch` and of the
 * database helpers in `functions/<fn>/src/vetting.js`. The pure rules are in
 * `./vetting` (byte-identical with the apps). Same behaviour as the functions,
 * so a driver is treated the same whichever surface they use.
 */

type AnyDoc = Record<string, any>

const PLATFORM_CONFIG = process.env.APPWRITE_COLLECTION_PLATFORM_CONFIG || 'platform_config'

const has = (v: unknown): v is string => typeof v === 'string' && v.trim() !== ''

export type VettingRefusal =
  | 'vetting.residenceTypeRequired'
  | 'vetting.residencePhotosRequired'
  | 'vetting.residenceExpiryRequired'
  | 'vetting.residenceExpiryPast'
  | 'vetting.certificatePhotoRequired'

/**
 * The vetting columns to write for a request body. Each of the three sections
 * (residence, certificate, business insurance) is written only when the caller
 * sent it, and is validated in full when it is. Mirrors `vettingPatch` in
 * `functions/submitmoverprofile/src/main.js`; the parity test compares them.
 */
export function vettingPatch(
  body: AnyDoc,
  nowMs: number,
): { patch: Record<string, unknown>; fnCode?: undefined } | { fnCode: VettingRefusal; patch?: undefined } {
  const patch: Record<string, unknown> = {}
  const nowIso = new Date(nowMs).toISOString()

  const residenceGiven =
    body.residenceDocType != null ||
    has(body.residenceDocFront) ||
    has(body.residenceDocBack) ||
    has(body.residenceDocExpiresAt)
  if (residenceGiven) {
    const fnCode = residenceSubmissionError(
      {
        docType: body.residenceDocType,
        front: body.residenceDocFront,
        back: body.residenceDocBack,
        expiresAt: body.residenceDocExpiresAt,
      },
      nowMs,
    )
    if (fnCode) return { fnCode }
    patch.residenceDocType = body.residenceDocType
    patch.residenceDocFront = body.residenceDocFront.trim()
    patch.residenceDocBack = body.residenceDocBack.trim()
    patch.residenceDocExpiresAt = expiryToIso(body.residenceDocExpiresAt)
    patch.residenceStatus = 'pending_review'
    patch.residenceRejectionReason = null
    patch.residenceReviewedAt = null
    patch.residenceReviewedBy = null
    patch.residenceExpiryNoticeDays = null
  }

  if (typeof body.hasMovingCertificate === 'boolean') {
    if (body.hasMovingCertificate) {
      if (!has(body.movingCertificatePhoto)) return { fnCode: 'vetting.certificatePhotoRequired' }
      patch.hasMovingCertificate = true
      patch.movingCertificatePhoto = body.movingCertificatePhoto.trim()
      patch.movingCertificateStatus = 'pending_review'
    } else {
      patch.hasMovingCertificate = false
      patch.movingCertificatePhoto = null
      patch.movingCertificateStatus = 'none'
    }
    patch.movingCertificateRejectionReason = null
  }

  if (typeof body.hasBusinessInsurance === 'boolean') {
    patch.hasBusinessInsurance = body.hasBusinessInsurance
    patch.insuranceDeclaredAt = nowIso
  }

  return { patch }
}

/**
 * The cap and the residence gate date from `platform_config`. Never throws:
 * on a read failure the defaults apply (cap 2, gate not enforced).
 */
export async function loadVettingConfig(databases: Databases): Promise<VettingConfig> {
  try {
    const res = await databases.listDocuments(APPWRITE.DATABASE_ID, PLATFORM_CONFIG, [
      Query.equal('key', [CONFIG_KEY_DAILY_CAP, CONFIG_KEY_RESIDENCE_GATE]),
      Query.limit(10),
    ])
    return parseVettingConfig(res.documents as unknown as { key?: unknown; value?: unknown }[])
  } catch (err) {
    console.error('[vetting] config unavailable (defaults apply):', err instanceof Error ? err.message : err)
    return { ...VETTING_DEFAULT_CONFIG }
  }
}

/** Moves this driver accepted on the given service day that count against the cap. */
export async function countAcceptedOn(
  databases: Databases,
  moverProfileId: string,
  serviceDay: string,
  excludeMoveId?: string | null,
): Promise<number> {
  const res = await databases.listDocuments(APPWRITE.DATABASE_ID, APPWRITE.COLLECTIONS.MOVES, [
    Query.equal('moverProfileId', moverProfileId),
    Query.equal('acceptedServiceDate', serviceDay),
    Query.limit(100),
  ])
  return res.documents.filter((m) => m.$id !== excludeMoveId && countsTowardDailyCap(m.status)).length
}

export interface DailyCapState {
  /** `false` only when an uncertified driver has used today's allowance. */
  ok: boolean
  /** `null` for a certified driver (no cap). */
  cap: number | null
  acceptedToday: number
}

/**
 * The daily-cap decision for one driver. A certified driver costs no query.
 * Fails OPEN: if the count cannot be read the driver is not refused over it.
 */
export async function dailyCapCheck(
  databases: Databases,
  profile: (VettingProfileFields & { $id: string }) | AnyDoc,
  config: VettingConfig,
  nowMs: number,
  tz: string,
  excludeMoveId?: string | null,
): Promise<DailyCapState> {
  const cap = dailyMoveCap(profile, config)
  if (cap === null) return { ok: true, cap: null, acceptedToday: 0 }
  try {
    const acceptedToday = await countAcceptedOn(databases, profile.$id, serviceDate(nowMs, tz), excludeMoveId)
    return { ok: acceptedToday < cap, cap, acceptedToday }
  } catch (err) {
    console.error(`[vetting] daily cap count failed for ${profile.$id} (allowing):`, err instanceof Error ? err.message : err)
    return { ok: true, cap, acceptedToday: 0 }
  }
}

/** The drivers of `movers` who may still accept a move today (matching). */
export async function filterUnderDailyCap<T extends AnyDoc>(
  databases: Databases,
  movers: T[],
  config: VettingConfig,
  nowMs: number,
  tz: string,
): Promise<T[]> {
  const checks = await Promise.all(movers.map((m) => dailyCapCheck(databases, m, config, nowMs, tz)))
  return movers.filter((_, i) => checks[i].ok)
}

/** The column every accept path stamps so the cap can be counted. */
export function acceptedServiceDateFor(nowMs: number, tz: string): string {
  return serviceDate(nowMs, tz)
}
