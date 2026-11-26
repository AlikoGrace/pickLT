/**
 * Driver vetting rules (plan `.agent/plans/legal/7.driver-vetting.md`).
 *
 * Three things the lawyer asked for, as pure decisions:
 *   - residence status: a passport or residence permit, reviewed by an admin,
 *     must be on file (and not expired) before a driver may take work;
 *   - moving certificate: optional; a verified one lifts the daily cap and
 *     sorts the driver first among equally near candidates;
 *   - insurance: yes/no declarations (the vehicle one blocks approval, in the
 *     admin app; nothing here).
 *
 * No clock and no I/O: callers pass `nowMs` and the parsed config.
 *
 * MIRRORS. This file is byte-identical in pickltmover `lib/` and pickltadmin
 * `src/lib/` (`scripts/check-lib-mirrors.sh`) and in pickLT `src/lib/`. The
 * server functions carry the plain-JS port `functions/<fn>/src/vetting.js`
 * (`SHARED_FILES` in `scripts/check-function-mirrors.sh`); the parity test
 * runs both over the same cases. Edit here, then re-copy.
 */

export type ReviewStatus = 'none' | 'pending_review' | 'verified' | 'rejected';
export type ResidenceDocType = 'passport' | 'residence_permit';

export const REVIEW_STATUSES: readonly ReviewStatus[] = ['none', 'pending_review', 'verified', 'rejected'];
export const RESIDENCE_DOC_TYPES: readonly ResidenceDocType[] = ['passport', 'residence_permit'];

/** The vetting columns of a `mover_profiles` row. Every one may be absent on an old row. */
export interface VettingProfileFields {
  residenceDocType?: string | null;
  residenceDocFront?: string | null;
  residenceDocBack?: string | null;
  residenceDocExpiresAt?: string | null;
  residenceStatus?: string | null;
  residenceRejectionReason?: string | null;
  residenceExpiryNoticeDays?: number | null;
  hasMovingCertificate?: boolean | null;
  movingCertificatePhoto?: string | null;
  movingCertificateStatus?: string | null;
  hasBusinessInsurance?: boolean | null;
}

export interface VettingConfig {
  /** Moves a driver without a verified certificate may accept per service day. */
  uncertifiedDailyMoveCap: number;
  /**
   * From this moment a driver without a verified residence document cannot
   * take work. `null` (the row is unset) means the gate is not enforced yet:
   * drivers registered before the feature keep working while they submit.
   */
  residenceGateFromMs: number | null;
}

export const DEFAULT_UNCERTIFIED_DAILY_MOVE_CAP = 2;
/** `platform_config` keys. */
export const CONFIG_KEY_DAILY_CAP = 'uncertified_daily_move_cap';
export const CONFIG_KEY_RESIDENCE_GATE = 'residence_gate_from';
/** Drivers whose distances fall in the same band count as equally near. */
export const CERTIFIED_DISTANCE_BAND_KM = 2;
/** Days before the expiry on which the driver is reminded. */
export const RESIDENCE_EXPIRY_NOTICE_DAYS: readonly number[] = [30, 7];

export const VETTING_DEFAULT_CONFIG: VettingConfig = {
  uncertifiedDailyMoveCap: DEFAULT_UNCERTIFIED_DAILY_MOVE_CAP,
  residenceGateFromMs: null,
};

function parseMs(value: unknown): number | null {
  if (typeof value !== 'string' || value.trim() === '') return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

/**
 * Read the two settings from `platform_config` rows (`{ key, value }`, value a
 * string). Anything missing or unreadable falls back to the default, so a bad
 * config edit can never lock every driver out.
 */
export function parseVettingConfig(rows: readonly { key?: unknown; value?: unknown }[] | null | undefined): VettingConfig {
  let cap = DEFAULT_UNCERTIFIED_DAILY_MOVE_CAP;
  let gate: number | null = null;
  for (const row of rows ?? []) {
    if (!row) continue;
    if (row.key === CONFIG_KEY_DAILY_CAP) {
      // A blank value is "not set", not zero: Number('') is 0, and a cap of
      // zero would stop every driver without a certificate.
      const raw = typeof row.value === 'string' ? row.value.trim() : row.value;
      const n = raw === '' || raw == null ? Number.NaN : Number(raw);
      if (Number.isInteger(n) && n >= 0 && n <= 100) cap = n;
    } else if (row.key === CONFIG_KEY_RESIDENCE_GATE) {
      gate = parseMs(row.value);
    }
  }
  return { uncertifiedDailyMoveCap: cap, residenceGateFromMs: gate };
}

/** A verified document whose end date has passed. A passport stored without a date never expires here. */
export function residenceExpired(profile: VettingProfileFields | null | undefined, nowMs: number): boolean {
  const expiresMs = parseMs(profile?.residenceDocExpiresAt);
  return expiresMs != null && nowMs >= expiresMs;
}

/** Whether the gate date has arrived. Unset means "not yet". */
export function residenceGateActive(nowMs: number, gateFromMs: number | null | undefined): boolean {
  return typeof gateFromMs === 'number' && Number.isFinite(gateFromMs) && nowMs >= gateFromMs;
}

/**
 * Why this driver may not take new work, or `null` when they may.
 *
 * - A verified document that has expired blocks at once, whatever the gate.
 * - A verified, unexpired document always passes.
 * - Anything else (nothing on file, under review, rejected) passes only until
 *   the gate date, which is how drivers registered before the feature get
 *   time to submit.
 *
 * Never applied to a move already under way.
 */
export function residenceBlockCode(
  profile: VettingProfileFields | null | undefined,
  nowMs: number,
  gateFromMs: number | null | undefined,
): 'mover.residenceExpired' | 'mover.residenceNotVerified' | null {
  const verified = profile?.residenceStatus === 'verified';
  if (verified && residenceExpired(profile, nowMs)) return 'mover.residenceExpired';
  if (verified) return null;
  return residenceGateActive(nowMs, gateFromMs) ? 'mover.residenceNotVerified' : null;
}

export function residenceAllowsWork(
  profile: VettingProfileFields | null | undefined,
  nowMs: number,
  gateFromMs: number | null | undefined,
): boolean {
  return residenceBlockCode(profile, nowMs, gateFromMs) === null;
}

/** Only a certificate an admin approved counts. */
export function isCertified(profile: VettingProfileFields | null | undefined): boolean {
  return profile?.movingCertificateStatus === 'verified';
}

/** `null` means no cap. */
export function dailyMoveCap(profile: VettingProfileFields | null | undefined, config: VettingConfig): number | null {
  return isCertified(profile) ? null : config.uncertifiedDailyMoveCap;
}

export function mayAcceptToday(
  profile: VettingProfileFields | null | undefined,
  acceptedToday: number,
  config: VettingConfig,
): boolean {
  const cap = dailyMoveCap(profile, config);
  return cap === null || acceptedToday < cap;
}

/** A move counts against the day it was accepted unless it was cancelled. */
export function countsTowardDailyCap(moveStatus: unknown): boolean {
  return typeof moveStatus !== 'string' || !moveStatus.startsWith('cancelled');
}

export function distanceBand(distanceKm: number): number {
  return Number.isFinite(distanceKm) && distanceKm > 0 ? Math.floor(distanceKm / CERTIFIED_DISTANCE_BAND_KM) : 0;
}

/**
 * Candidate order: nearer band first; inside a band a certified driver first;
 * then the exact distance. A certified driver 20 km away therefore never
 * outranks an uncertified one next door.
 */
export function compareCandidates(
  a: { distanceKm: number; certified: boolean },
  b: { distanceKm: number; certified: boolean },
): number {
  const band = distanceBand(a.distanceKm) - distanceBand(b.distanceKm);
  if (band !== 0) return band;
  if (a.certified !== b.certified) return a.certified ? -1 : 1;
  return a.distanceKm - b.distanceKm;
}

export type ResidenceSubmissionError =
  | 'vetting.residenceTypeRequired'
  | 'vetting.residencePhotosRequired'
  | 'vetting.residenceExpiryRequired'
  | 'vetting.residenceExpiryPast';

/**
 * A residence submission needs the document type, both photographs and, for a
 * permit, an end date in the future. A passport may carry a date; if it does
 * it must be in the future too.
 */
export function residenceSubmissionError(
  input: { docType?: unknown; front?: unknown; back?: unknown; expiresAt?: unknown },
  nowMs: number,
): ResidenceSubmissionError | null {
  if (input.docType !== 'passport' && input.docType !== 'residence_permit') return 'vetting.residenceTypeRequired';
  const has = (v: unknown) => typeof v === 'string' && v.trim() !== '';
  if (!has(input.front) || !has(input.back)) return 'vetting.residencePhotosRequired';
  const expiresMs = parseMs(input.expiresAt);
  if (expiresMs == null) {
    if (input.docType === 'residence_permit' || has(input.expiresAt)) return 'vetting.residenceExpiryRequired';
    return null;
  }
  return expiresMs > nowMs ? null : 'vetting.residenceExpiryPast';
}

/**
 * A date picked as `YYYY-MM-DD` is valid through that day: stored as its last
 * millisecond (UTC). A full timestamp passes through. `null` when unreadable.
 */
export function expiryToIso(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const v = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
    const ms = Date.parse(`${v}T23:59:59.999Z`);
    return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
  }
  const ms = parseMs(v);
  return ms == null ? null : new Date(ms).toISOString();
}

/**
 * Which reminder (30 or 7 days) should be sent now, or `null`. The sweep runs
 * every few minutes, so the last reminder sent is kept on the profile
 * (`residenceExpiryNoticeDays`) and passed back in: each threshold is sent
 * once, and a new submission resets it.
 */
export function residenceExpiryNoticeDue(expiresAt: unknown, nowMs: number, lastNoticedDays?: unknown): number | null {
  const expiresMs = parseMs(expiresAt);
  if (expiresMs == null || expiresMs <= nowMs) return null;
  const daysLeft = (expiresMs - nowMs) / 86400000;
  let due: number | null = null;
  for (const threshold of RESIDENCE_EXPIRY_NOTICE_DAYS) {
    if (daysLeft <= threshold && (due === null || threshold < due)) due = threshold;
  }
  if (due === null) return null;
  return typeof lastNoticedDays === 'number' && lastNoticedDays <= due ? null : due;
}

/** What the driver's own screens show. */
export type VettingPrompt = 'residenceMissing' | 'residencePending' | 'residenceRejected' | 'residenceExpired' | null;

export function residencePrompt(profile: VettingProfileFields | null | undefined, nowMs: number): VettingPrompt {
  const status = profile?.residenceStatus;
  if (status === 'verified') return residenceExpired(profile, nowMs) ? 'residenceExpired' : null;
  if (status === 'pending_review') return 'residencePending';
  if (status === 'rejected') return 'residenceRejected';
  return 'residenceMissing';
}
