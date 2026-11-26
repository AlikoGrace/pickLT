/**
 * Driver vetting rules: plain-JS port of pickltmobile/lib/vetting.ts (plan
 * `.agent/plans/legal/7.driver-vetting.md`). Functions cannot import app code.
 *
 * Do not edit a copy. Edit pickltmobile/lib/vetting.ts, port the change here,
 * then copy this file to every function that carries it: the copies are
 * byte-identical (`SHARED_FILES` in scripts/check-function-mirrors.sh) and the
 * parity test runs this port against the TS module.
 *
 * Import-free on purpose: the two helpers that read the database take the
 * `databases` service and the `Query` builder from the caller.
 */

export const DEFAULT_UNCERTIFIED_DAILY_MOVE_CAP = 2;
export const CONFIG_KEY_DAILY_CAP = 'uncertified_daily_move_cap';
export const CONFIG_KEY_RESIDENCE_GATE = 'residence_gate_from';
export const CERTIFIED_DISTANCE_BAND_KM = 2;
export const RESIDENCE_EXPIRY_NOTICE_DAYS = [30, 7];

export const VETTING_DEFAULT_CONFIG = {
  uncertifiedDailyMoveCap: DEFAULT_UNCERTIFIED_DAILY_MOVE_CAP,
  residenceGateFromMs: null,
};

function parseMs(value) {
  if (typeof value !== 'string' || value.trim() === '') return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

export function parseVettingConfig(rows) {
  let cap = DEFAULT_UNCERTIFIED_DAILY_MOVE_CAP;
  let gate = null;
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

export function residenceExpired(profile, nowMs) {
  const expiresMs = parseMs(profile?.residenceDocExpiresAt);
  return expiresMs != null && nowMs >= expiresMs;
}

export function residenceGateActive(nowMs, gateFromMs) {
  return typeof gateFromMs === 'number' && Number.isFinite(gateFromMs) && nowMs >= gateFromMs;
}

export function residenceBlockCode(profile, nowMs, gateFromMs) {
  const verified = profile?.residenceStatus === 'verified';
  if (verified && residenceExpired(profile, nowMs)) return 'mover.residenceExpired';
  if (verified) return null;
  return residenceGateActive(nowMs, gateFromMs) ? 'mover.residenceNotVerified' : null;
}

export function residenceAllowsWork(profile, nowMs, gateFromMs) {
  return residenceBlockCode(profile, nowMs, gateFromMs) === null;
}

export function isCertified(profile) {
  return profile?.movingCertificateStatus === 'verified';
}

export function dailyMoveCap(profile, config) {
  return isCertified(profile) ? null : config.uncertifiedDailyMoveCap;
}

export function mayAcceptToday(profile, acceptedToday, config) {
  const cap = dailyMoveCap(profile, config);
  return cap === null || acceptedToday < cap;
}

export function countsTowardDailyCap(moveStatus) {
  return typeof moveStatus !== 'string' || !moveStatus.startsWith('cancelled');
}

export function distanceBand(distanceKm) {
  return Number.isFinite(distanceKm) && distanceKm > 0 ? Math.floor(distanceKm / CERTIFIED_DISTANCE_BAND_KM) : 0;
}

export function compareCandidates(a, b) {
  const band = distanceBand(a.distanceKm) - distanceBand(b.distanceKm);
  if (band !== 0) return band;
  if (a.certified !== b.certified) return a.certified ? -1 : 1;
  return a.distanceKm - b.distanceKm;
}

export function residenceSubmissionError(input, nowMs) {
  if (input.docType !== 'passport' && input.docType !== 'residence_permit') return 'vetting.residenceTypeRequired';
  const has = (v) => typeof v === 'string' && v.trim() !== '';
  if (!has(input.front) || !has(input.back)) return 'vetting.residencePhotosRequired';
  const expiresMs = parseMs(input.expiresAt);
  if (expiresMs == null) {
    if (input.docType === 'residence_permit' || has(input.expiresAt)) return 'vetting.residenceExpiryRequired';
    return null;
  }
  return expiresMs > nowMs ? null : 'vetting.residenceExpiryPast';
}

export function expiryToIso(value) {
  if (typeof value !== 'string') return null;
  const v = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
    const ms = Date.parse(`${v}T23:59:59.999Z`);
    return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
  }
  const ms = parseMs(v);
  return ms == null ? null : new Date(ms).toISOString();
}

export function residenceExpiryNoticeDue(expiresAt, nowMs, lastNoticedDays) {
  const expiresMs = parseMs(expiresAt);
  if (expiresMs == null || expiresMs <= nowMs) return null;
  const daysLeft = (expiresMs - nowMs) / 86400000;
  let due = null;
  for (const threshold of RESIDENCE_EXPIRY_NOTICE_DAYS) {
    if (daysLeft <= threshold && (due === null || threshold < due)) due = threshold;
  }
  if (due === null) return null;
  return typeof lastNoticedDays === 'number' && lastNoticedDays <= due ? null : due;
}

export function residencePrompt(profile, nowMs) {
  const status = profile?.residenceStatus;
  if (status === 'verified') return residenceExpired(profile, nowMs) ? 'residenceExpired' : null;
  if (status === 'pending_review') return 'residencePending';
  if (status === 'rejected') return 'residenceRejected';
  return 'residenceMissing';
}

// ── Server-only helpers (no TS counterpart) ─────────────────────────────────

/** The platform's service day (`YYYY-MM-DD`) for a moment, as the vehicle gate computes it. */
export function vettingServiceDate(nowMs, tz) {
  const zone = tz || 'Europe/Berlin';
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: zone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date(nowMs));
    const get = (type) => parts.find((p) => p.type === type)?.value ?? '';
    const y = get('year');
    const m = get('month');
    const d = get('day');
    if (y.length === 4 && m.length === 2 && d.length === 2) return `${y}-${m}-${d}`;
  } catch {
    // fall through
  }
  return new Date(nowMs).toISOString().slice(0, 10);
}

/**
 * The two settings, read from `platform_config`. Never throws: when the
 * collection cannot be read the defaults apply (cap 2, gate not enforced), so
 * infrastructure noise cannot take every driver offline.
 */
export async function loadVettingConfig({ databases, Query, databaseId, collectionId, error }) {
  try {
    const res = await databases.listDocuments(databaseId, collectionId || 'platform_config', [
      Query.equal('key', [CONFIG_KEY_DAILY_CAP, CONFIG_KEY_RESIDENCE_GATE]),
      Query.limit(10),
    ]);
    return parseVettingConfig(res.documents);
  } catch (e) {
    if (typeof error === 'function') error(`vetting config unavailable (defaults apply): ${e.message}`);
    return { ...VETTING_DEFAULT_CONFIG };
  }
}

/**
 * How many moves this driver accepted on the given service day. Every accept
 * path stamps `moves.acceptedServiceDate`; a move the driver withdrew from no
 * longer carries their `moverProfileId`, and a cancelled one does not count.
 * `excludeMoveId` leaves out the move being accepted (a retry of the same tap).
 */
export async function countAcceptedToday({ databases, Query, databaseId, movesCollectionId, moverProfileId, serviceDay, excludeMoveId }) {
  const res = await databases.listDocuments(databaseId, movesCollectionId, [
    Query.equal('moverProfileId', moverProfileId),
    Query.equal('acceptedServiceDate', serviceDay),
    Query.limit(100),
  ]);
  return res.documents.filter((m) => m.$id !== excludeMoveId && countsTowardDailyCap(m.status)).length;
}

/**
 * The daily-cap decision for one driver, in one call. `{ ok: true }` when the
 * driver is certified (no query is made) or still under the cap. Fails OPEN:
 * if the count cannot be read the driver is not refused over it.
 */
export async function dailyCapCheck({ databases, Query, databaseId, movesCollectionId, profile, config, nowMs, tz, excludeMoveId, error }) {
  const cap = dailyMoveCap(profile, config);
  if (cap === null) return { ok: true, cap: null, acceptedToday: 0 };
  try {
    const acceptedToday = await countAcceptedToday({
      databases,
      Query,
      databaseId,
      movesCollectionId,
      moverProfileId: profile.$id,
      serviceDay: vettingServiceDate(nowMs, tz),
      excludeMoveId,
    });
    return { ok: acceptedToday < cap, cap, acceptedToday };
  } catch (e) {
    if (typeof error === 'function') error(`daily cap count failed for ${profile.$id} (allowing): ${e.message}`);
    return { ok: true, cap, acceptedToday: 0 };
  }
}

/**
 * The drivers of `movers` who may still accept a move today. Used by matching,
 * so a client is never offered someone who would have to refuse. One count per
 * uncertified driver, in parallel; certified drivers cost nothing.
 */
export async function filterUnderDailyCap({ databases, Query, databaseId, movesCollectionId, movers, config, nowMs, tz, error }) {
  const checks = await Promise.all(
    movers.map((profile) =>
      dailyCapCheck({ databases, Query, databaseId, movesCollectionId, profile, config, nowMs, tz, error }),
    ),
  );
  return movers.filter((_, i) => checks[i].ok);
}
