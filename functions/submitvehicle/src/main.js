import { Client, Databases, ID, Permission, Query, Role } from 'node-appwrite';

/**
 * submitvehicle — register, re-submit or renew a driver's vehicle.
 *
 * Contract: pickltmobile/.agent/plans/vehicles/0.master.md §6.1, extended by
 * `.agent/plans/wave-2026-10/1.rental-windows-and-fleet.md` §6 (rental
 * windows, renewals, own + rent together). A vehicle is its own `vehicles`
 * row with its own review status; nothing here touches the driver's KYC
 * (`mover_profiles.verificationStatus`). The legacy `vehicle*` snapshot
 * columns are written only by the admin verify route (and by the renewal
 * path below, which only ever re-serves a vehicle the admin already approved).
 *
 * Body: { ownership, registrationNumber, brand, model, year?, vehicleType,
 *         capacityM3?, frontPlatePhoto, rearPlatePhoto, fullVehiclePhoto,
 *         source: 'registration'|'settings'|'login'|'post_move', vehicleId?,
 *         moveId?, note?,
 *         rental?: { startAt?, endAt?, hours?, provider? }   // required when ownership==='rented' (R1)
 *         mode?: 'renew' }                                   // + vehicleId: R5 renewal of a rented row
 * Reply: { ok: true, vehicle, profile, autoRenewed }
 *
 * Identity is always `x-appwrite-user-id`, never the body.
 */

const DATABASE_ID = process.env.APPWRITE_DATABASE_ID;
const MOVER_PROFILES_COLLECTION = process.env.APPWRITE_COLLECTION_MOVER_PROFILES;
const VEHICLES_COLLECTION = process.env.APPWRITE_COLLECTION_VEHICLES || 'vehicles';
const VEHICLE_EVENTS_COLLECTION = process.env.APPWRITE_COLLECTION_VEHICLE_EVENTS || 'vehicle_events';
const PLATFORM_TZ = process.env.PLATFORM_TZ || 'Europe/Berlin';

// --- vehicle-service (mirror) ---
/**
 * Mirror of pickltmobile/lib/vehicle-service.ts (master plan §5 + wave-2026-10/1 §5).
 * Do not edit here; edit the TS module and re-copy. The client parity test compares them.
 */
function serviceDate(nowMs, tz) {
  var zone = tz || 'Europe/Berlin';
  var parts;
  try {
    parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: zone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date(nowMs));
  } catch (e) {
    return new Date(nowMs).toISOString().slice(0, 10);
  }
  var get = function (type) {
    for (var i = 0; i < parts.length; i++) if (parts[i].type === type) return parts[i].value;
    return '';
  };
  var y = get('year');
  var m = get('month');
  var d = get('day');
  if (y.length !== 4 || m.length !== 2 || d.length !== 2) {
    return new Date(nowMs).toISOString().slice(0, 10);
  }
  return y + '-' + m + '-' + d;
}

function vehicleServiceParseMs(value) {
  if (typeof value !== 'string' || value.trim() === '') return null;
  var ms = Date.parse(value);
  return isFinite(ms) ? ms : null;
}

// Rentals longer than this keep the daily SAME/CHANGE tap inside their window.
var VEHICLE_DAILY_CONFIRM_MIN_HOURS = 24;

function vehicleServiceReady(profile, nowMs, tz) {
  if (!profile) return false;
  if (profile.verificationStatus !== 'verified') return false;
  if (profile.vehicleStatus !== 'verified') return false;
  if (!profile.currentVehicleId) return false;
  if (profile.vehicleOwnership === 'rented') {
    if (profile.vehicleReconfirmRequired === true) return false;
    var endMs = vehicleServiceParseMs(profile.vehicleRentalEndAt);
    if (endMs != null) {
      if (nowMs >= endMs) return false;
      var hours = null;
      if (typeof profile.vehicleRentalHours === 'number' && isFinite(profile.vehicleRentalHours)) {
        hours = profile.vehicleRentalHours;
      } else {
        var startMs = vehicleServiceParseMs(profile.vehicleRentalStartAt);
        if (startMs != null && endMs > startMs) hours = (endMs - startMs) / 3600000;
      }
      var daily = hours == null ? true : hours > VEHICLE_DAILY_CONFIRM_MIN_HOURS;
      if (daily && profile.vehicleConfirmedServiceDate !== serviceDate(nowMs, tz)) return false;
      return true;
    }
    if (profile.vehicleConfirmedServiceDate !== serviceDate(nowMs, tz)) return false;
  }
  return true;
}
// --- end vehicle-service ---

export { serviceDate, vehicleServiceReady };

// ── Pure validation (mirror of lib/vehicle-service.ts) ──────────────────────
// Functions cannot import app code, so the validation the driver already saw
// client-side is repeated here verbatim. Keep the two in step: the wire codes
// below are the `fnCode` values the apps map to `errors:vehicle.*`.

export const VEHICLE_TYPES = ['small_van', 'medium_truck', 'large_truck'];
export const OWNERSHIPS = ['owned', 'rented'];
export const SOURCES = ['registration', 'settings', 'login', 'post_move'];
export const MIN_CAPACITY_M3 = 1;
export const MAX_CAPACITY_M3 = 120;

// ── Rental windows (mirror of lib/vehicle-service.ts, plan wave-2026-10/1) ──
/** Longest window a single registration may cover (30 days); longer rentals renew. */
export const MAX_RENTAL_HOURS = 720;
/** Same plate renewed within this many days after its last window stays verified (R5). */
export const RENEWAL_GRACE_DAYS = 30;
const HOUR_MS = 60 * 60 * 1000;

function parseIsoMs(value) {
  if (typeof value !== 'string' || value.trim() === '') return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

/**
 * Normalises a rental window. The end wins when both `endAt` and `hours` are
 * given. Same codes, same answer as the client-side copy:
 * vehicle.rentalWindowRequired | vehicle.rentalWindowInvalid | vehicle.rentalWindowTooLong.
 */
export function resolveRentalWindow(input, nowMs) {
  if (!input || (input.endAt == null && (input.hours == null || String(input.hours).trim() === ''))) {
    return { ok: false, codes: ['vehicle.rentalWindowRequired'] };
  }
  const startMs = input.startAt ? parseIsoMs(input.startAt) : nowMs;
  if (startMs == null) return { ok: false, codes: ['vehicle.rentalWindowInvalid'] };
  let endMs = null;
  if (input.endAt != null && String(input.endAt).trim() !== '') {
    endMs = parseIsoMs(String(input.endAt));
  } else {
    const h = Number(input.hours);
    if (!Number.isFinite(h) || h <= 0) return { ok: false, codes: ['vehicle.rentalWindowInvalid'] };
    endMs = startMs + h * HOUR_MS;
  }
  if (endMs == null || endMs <= startMs || endMs <= nowMs) {
    return { ok: false, codes: ['vehicle.rentalWindowInvalid'] };
  }
  const hours = Math.round(((endMs - startMs) / HOUR_MS) * 100) / 100;
  if (hours > MAX_RENTAL_HOURS) return { ok: false, codes: ['vehicle.rentalWindowTooLong'] };
  const provider = typeof input.provider === 'string' && input.provider.trim() ? input.provider.trim().slice(0, 120) : null;
  return {
    ok: true,
    window: { startAt: new Date(startMs).toISOString(), endAt: new Date(endMs).toISOString(), hours, provider },
  };
}

/**
 * R5: a renewal of the SAME verified rental keeps `verified` (no new photos)
 * when its last window ended no more than RENEWAL_GRACE_DAYS ago (or has not
 * ended yet — an extension) and the row was never rejected.
 */
export function canAutoRenew(vehicle, nowMs) {
  if (!vehicle || vehicle.status !== 'verified') return false;
  if (vehicle.rejectionReason) return false;
  const end = parseIsoMs(vehicle.rentalEndAt);
  if (end == null) return true; // legacy rental without a window: first window, same plates
  return nowMs - end <= RENEWAL_GRACE_DAYS * 24 * HOUR_MS;
}

/**
 * The row `canAutoRenew` is asked about. `expirerentals` retires a rental the
 * moment its window closes (`status='retired'`, `expiredAt` set) — that is the
 * "previous window ended" case R5 is about, not a vehicle the driver replaced,
 * so an expiry-retired row is judged as the verified row it was. Rows retired
 * for any other reason (a CHANGE, an admin retire) carry no `expiredAt` and
 * stay ineligible.
 */
export function renewalCandidate(vehicle) {
  if (!vehicle) return vehicle;
  if (vehicle.status === 'retired' && vehicle.expiredAt) return { ...vehicle, status: 'verified' };
  return vehicle;
}

/** Registration number as compared for duplicates: upper-case, `[A-Z0-9]` only. */
export function normalizePlate(input) {
  return String(input ?? '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

/**
 * Every validation failure in the input, in a stable order. Empty means valid.
 * Codes: vehicle.photosRequired, vehicle.plateInvalid, vehicle.fieldsRequired,
 * vehicle.typeInvalid, vehicle.capacityOutOfRange, vehicle.yearInvalid.
 * The rental window is checked separately (`resolveRentalWindow`) because it
 * is only required for rented vehicles and the handler needs the resolved window.
 */
export function validateVehicleInput(input) {
  const codes = [];
  const src = input && typeof input === 'object' ? input : {};
  const has = (v) => typeof v === 'string' && v.trim().length > 0;
  if (!has(src.frontPlatePhoto) || !has(src.rearPlatePhoto) || !has(src.fullVehiclePhoto)) {
    codes.push('vehicle.photosRequired');
  }
  const plateRaw = String(src.registrationNumber ?? '').trim();
  const plate = normalizePlate(plateRaw);
  if (plateRaw.length < 2 || plateRaw.length > 32 || plate.length < 2) {
    codes.push('vehicle.plateInvalid');
  }
  if (!has(src.brand) || !has(src.model)) codes.push('vehicle.fieldsRequired');
  if (!VEHICLE_TYPES.includes(String(src.vehicleType ?? ''))) {
    codes.push('vehicle.typeInvalid');
  }
  if (src.capacityM3 !== undefined && src.capacityM3 !== null && String(src.capacityM3).trim() !== '') {
    const n = Number(src.capacityM3);
    if (!Number.isFinite(n) || n < MIN_CAPACITY_M3 || n > MAX_CAPACITY_M3) {
      codes.push('vehicle.capacityOutOfRange');
    }
  }
  if (src.year !== undefined && src.year !== null && String(src.year).trim() !== '') {
    if (!/^\d{4}$/.test(String(src.year).trim())) codes.push('vehicle.yearInvalid');
  }
  return codes;
}

/**
 * What `mover_profiles.vehicleOwnership` becomes when a vehicle is SUBMITTED
 * (master D16). Rented → owned takes the driver out of the daily and post-move
 * SAME/CHANGE regime, so it is never the driver's own call: the profile stays
 * `rented` and the admin's approval of the owned vehicle is what switches it.
 * Every other combination takes effect at once — owned → rented only tightens.
 */
export function profileOwnershipOnSubmit(current, requested) {
  if (current === 'rented' && requested === 'owned') return 'rented';
  return requested;
}

/**
 * R3: the driver's verified OWNED vehicle is in service. Adding a rental then
 * must not retire it — the rental is registered beside it (`isCurrent=false`)
 * and the admin's approval, or the driver's own switch, puts it in service.
 * `vehicleOwnership` is `owned` by default on rows written before the column
 * existed, hence the null check.
 */
export function ownedVehicleInService(profile) {
  if (!profile) return false;
  const ownership = profile.vehicleOwnership == null ? 'owned' : profile.vehicleOwnership;
  return ownership === 'owned' && profile.vehicleStatus === 'verified' && !!profile.currentVehicleId;
}

/**
 * Reviewer hint, never a rejection: European plate formats vary too much to
 * reject on shape, but a plate with no letter, no digit, or an odd length is
 * worth a second look next to the photos.
 */
export function plateFormatHint(normalized) {
  const plate = String(normalized ?? '');
  if (plate.length < 4 || plate.length > 10) return 'unusual';
  if (!/[A-Z]/.test(plate) || !/[0-9]/.test(plate)) return 'unusual';
  return 'ok';
}

/**
 * The automated checks that need no ML (master D7), stored as JSON on the
 * vehicle row for the admin reviewer. `ocr` stays null until a vision
 * provider exists; the slot keeps the row shape stable when one does.
 */
export function buildVehicleChecks({ registrationNormalized, previouslyUsedByDriver }) {
  return JSON.stringify({
    v: 1,
    photosPresent: true,
    plateNormalized: registrationNormalized,
    plateFormat: plateFormatHint(registrationNormalized),
    duplicatePlate: false,
    previouslyUsedByDriver: previouslyUsedByDriver === true,
    ocr: null,
  });
}

function optionalNumber(v) {
  if (v === undefined || v === null || String(v).trim() === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function optionalString(v, max) {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  if (!s) return null;
  return max ? s.slice(0, max) : s;
}

/** The profile's window snapshot for a rented vehicle in service, or all-null for an owned one. */
function profileWindowFields(window) {
  return {
    vehicleRentalStartAt: window ? window.startAt : null,
    vehicleRentalEndAt: window ? window.endAt : null,
    vehicleRentalHours: window ? window.hours : null,
  };
}

/** The vehicle row's window columns; all-null for an owned vehicle. */
function vehicleWindowFields(window) {
  return {
    rentalStartAt: window ? window.startAt : null,
    rentalEndAt: window ? window.endAt : null,
    rentalHours: window ? window.hours : null,
    rentalProvider: window ? window.provider : null,
  };
}

// New enum members (plan wave-2026-10/1 §4) and what to write until the
// operator has widened the enums. The fallback keeps the audit row (and its
// note names the intended action) instead of dropping it.
const EVENT_ACTION_FALLBACK = {
  renewed: 'resubmitted',
  expired: 'retired',
  fallback: 'retired',
  selected: 'confirmed_same',
  expiring_soon: 'reconfirm_required',
};
const EVENT_SOURCE_FALLBACK = { renewal: 'settings', cron: 'system' };

/**
 * Append one audit row. `vehicle_events` is append-only and server-key only;
 * the driver may read their own history (row permission on ownerUserId).
 * Best-effort: the vehicle row is already written by the time an event is
 * recorded, and failing the driver's submission over the audit trail would
 * leave the data in a worse state than a logged gap. A new enum value the
 * table does not know yet is retried with its closest existing value.
 */
async function writeEvent(databases, ownerUserId, fields, error) {
  const row = {
    moverProfileId: fields.moverProfileId,
    ownerUserId,
    vehicleId: fields.vehicleId ?? null,
    moveId: fields.moveId ?? null,
    action: fields.action,
    previousStatus: fields.previousStatus ?? null,
    newStatus: fields.newStatus ?? null,
    source: fields.source,
    serviceDate: fields.serviceDate ?? null,
    actorId: fields.actorId,
    actorRole: fields.actorRole ?? 'mover',
    note: fields.note ?? null,
    at: fields.at,
  };
  const perms = [Permission.read(Role.user(ownerUserId))];
  try {
    return await databases.createDocument(DATABASE_ID, VEHICLE_EVENTS_COLLECTION, ID.unique(), row, perms);
  } catch (e) {
    const action = EVENT_ACTION_FALLBACK[row.action];
    const source = EVENT_SOURCE_FALLBACK[row.source];
    if (!action && !source) {
      error(`[submitvehicle] vehicle_events ${fields.action} failed: ${e.message}`);
      return null;
    }
    error(`[submitvehicle] vehicle_events ${row.action}/${row.source} rejected (enum not widened yet): ${e.message} — retrying as ${action ?? row.action}/${source ?? row.source}`);
    const note = `[${row.action}] ${row.note ?? ''}`.trim().slice(0, 512);
    try {
      return await databases.createDocument(
        DATABASE_ID,
        VEHICLE_EVENTS_COLLECTION,
        ID.unique(),
        { ...row, action: action ?? row.action, source: source ?? row.source, note },
        perms,
      );
    } catch (e2) {
      error(`[submitvehicle] vehicle_events ${fields.action} fallback failed: ${e2.message}`);
      return null;
    }
  }
}

/**
 * The move behind an outstanding post-move re-confirmation: the newest
 * `reconfirm_required` event for the profile. Best-effort — null on any error.
 */
async function pendingReconfirmMoveId(databases, moverProfileId, error) {
  try {
    const rows = await databases.listDocuments(DATABASE_ID, VEHICLE_EVENTS_COLLECTION, [
      Query.equal('moverProfileId', moverProfileId),
      Query.equal('action', 'reconfirm_required'),
      Query.orderDesc('at'),
      Query.limit(1),
    ]);
    const id = rows.documents[0]?.moveId;
    return id ? String(id).slice(0, 36) : null;
  } catch (e) {
    error(`reconfirm move lookup failed: ${e.message}`);
    return null;
  }
}

/**
 * Take every other `isCurrent` row of this driver out of service before a new
 * row goes in. A verified OWNED row is never retired by a rental (R3): it keeps
 * `verified`, loses `isCurrent`, and is remembered as `ownedVehicleId`. Every
 * other live row is retired with an audit row, as before.
 * Returns { replacesVehicleId, ownedVehicleId }.
 */
async function demoteOtherCurrentRows(databases, profile, authId, exceptId, protectOwned, eventBase, nowIso, error) {
  const current = await databases.listDocuments(DATABASE_ID, VEHICLES_COLLECTION, [
    Query.equal('moverProfileId', profile.$id),
    Query.equal('isCurrent', true),
    Query.limit(10),
  ]);
  let replacesVehicleId = null;
  let ownedVehicleId = profile.ownedVehicleId ? String(profile.ownedVehicleId) : null;
  for (const old of current.documents) {
    if (old.$id === exceptId || old.status === 'retired') continue;
    if (protectOwned && old.ownership === 'owned' && old.status === 'verified') {
      await databases.updateDocument(DATABASE_ID, VEHICLES_COLLECTION, old.$id, { isCurrent: false });
      if (!ownedVehicleId) ownedVehicleId = old.$id;
      continue;
    }
    await databases.updateDocument(DATABASE_ID, VEHICLES_COLLECTION, old.$id, {
      status: 'retired',
      isCurrent: false,
      retiredAt: nowIso,
    });
    await writeEvent(databases, authId, {
      ...eventBase,
      vehicleId: old.$id,
      action: 'retired',
      previousStatus: old.status,
      newStatus: 'retired',
    }, error);
    if (!replacesVehicleId) replacesVehicleId = old.$id;
  }
  return { replacesVehicleId, ownedVehicleId };
}

function windowNote(before, after) {
  const fmt = (w) => (w && (w.startAt || w.endAt) ? `${w.startAt ?? '?'}→${w.endAt ?? '?'}` : 'none');
  return `window ${fmt(before)} ⇒ ${fmt(after)}`.slice(0, 512);
}

/**
 * mode:'renew' (R5). "Rent again" / "Extend" on a rental the driver already
 * registered: same plate, same photos, a new window. Within the grace period
 * the row stays `verified` and goes straight (back) into service; outside it,
 * or after a rejection, the row returns to review with fresh photos.
 */
async function handleRenew({ databases, res, log, error, body, profile, authId, source, nowMs }) {
  const vehicleId = optionalString(body.vehicleId, 36);
  if (!vehicleId) {
    return res.json({ ok: false, error: 'vehicleId is required to renew', fnCode: 'generic.badRequest' }, 400);
  }
  let existing;
  try {
    existing = await databases.getDocument(DATABASE_ID, VEHICLES_COLLECTION, vehicleId);
  } catch {
    existing = null;
  }
  if (!existing || existing.moverProfileId !== profile.$id) {
    return res.json({ ok: false, error: 'Vehicle not found', fnCode: 'vehicle.notFound' }, 404);
  }
  if (existing.ownership !== 'rented') {
    return res.json({ ok: false, error: 'Only rented vehicles have a rental window to renew', fnCode: 'vehicle.notRental' }, 400);
  }
  const resolved = resolveRentalWindow(body.rental, nowMs);
  if (!resolved.ok) {
    return res.json({ ok: false, error: 'Rental window is missing or invalid', fnCode: resolved.codes[0], fnCodes: resolved.codes }, 400);
  }
  const window = resolved.window;
  const nowIso = new Date(nowMs).toISOString();
  const today = serviceDate(nowMs, PLATFORM_TZ);
  const autoRenewed = canAutoRenew(renewalCandidate(existing), nowMs);
  const eventBase = {
    moverProfileId: profile.$id,
    source,
    actorId: authId,
    actorRole: 'mover',
    at: nowIso,
    moveId: optionalString(body.moveId, 36),
    note: optionalString(body.note, 512),
  };
  const previousWindow = { startAt: existing.rentalStartAt ?? null, endAt: existing.rentalEndAt ?? null };

  if (autoRenewed) {
    // The rental goes (back) into service at once. An owned vehicle that was
    // serving steps aside without being retired (R3/R6).
    const { ownedVehicleId } = await demoteOtherCurrentRows(databases, profile, authId, vehicleId, true, eventBase, nowIso, error);
    const vehicle = await databases.updateDocument(DATABASE_ID, VEHICLES_COLLECTION, vehicleId, {
      ...vehicleWindowFields(window),
      status: 'verified',
      isCurrent: true,
      renewalCount: (Number(existing.renewalCount) || 0) + 1,
      expiredAt: null,
      retiredAt: null,
      rejectionReason: null,
    });
    await writeEvent(databases, authId, {
      ...eventBase,
      vehicleId,
      action: 'renewed',
      source: 'renewal',
      previousStatus: existing.status,
      newStatus: 'verified',
      serviceDate: today,
      note: windowNote(previousWindow, window),
    }, error);
    const updatedProfile = await databases.updateDocument(DATABASE_ID, MOVER_PROFILES_COLLECTION, profile.$id, {
      ...profileWindowFields(window),
      vehicleOwnership: 'rented',
      vehicleStatus: 'verified',
      currentVehicleId: vehicleId,
      vehicleConfirmedAt: nowIso,
      vehicleConfirmedServiceDate: today,
      vehicleReconfirmRequired: false,
      ownedVehicleId,
      // Snapshot of the vehicle in service (R6) — this row was admin-approved,
      // so pricing still keys on verified data only.
      vehicleBrand: vehicle.brand ?? existing.brand ?? '',
      vehicleModel: vehicle.model ?? existing.model ?? '',
      vehicleYear: vehicle.year ?? existing.year ?? '',
      vehicleRegistration: vehicle.registrationNumber ?? existing.registrationNumber ?? '',
      vehicleType: vehicle.vehicleType ?? existing.vehicleType ?? '',
      vehicleCapacity: String((vehicle.capacityM3 ?? existing.capacityM3) ?? ''),
    });
    log(`submitvehicle: ${profile.$id} renewed vehicle ${vehicleId} until ${window.endAt} (auto, ${source})`);
    return res.json({ ok: true, vehicle, profile: updatedProfile, autoRenewed: true });
  }

  // Outside the grace period (or after a rejection): review again, with photos.
  const has = (v) => typeof v === 'string' && v.trim().length > 0;
  if (!has(body.frontPlatePhoto) || !has(body.rearPlatePhoto) || !has(body.fullVehiclePhoto)) {
    return res.json({ ok: false, error: 'Fresh photos are required to re-verify this vehicle', fnCode: 'vehicle.photosRequired', fnCodes: ['vehicle.photosRequired'] }, 400);
  }
  const keepOwnedInService = ownedVehicleInService(profile) && profile.currentVehicleId !== vehicleId;
  const { ownedVehicleId } = keepOwnedInService
    ? { ownedVehicleId: profile.ownedVehicleId ? String(profile.ownedVehicleId) : String(profile.currentVehicleId) }
    : await demoteOtherCurrentRows(databases, profile, authId, vehicleId, true, eventBase, nowIso, error);
  const vehicle = await databases.updateDocument(DATABASE_ID, VEHICLES_COLLECTION, vehicleId, {
    ...vehicleWindowFields(window),
    frontPlatePhoto: String(body.frontPlatePhoto).trim(),
    rearPlatePhoto: String(body.rearPlatePhoto).trim(),
    fullVehiclePhoto: String(body.fullVehiclePhoto).trim(),
    status: 'pending_review',
    isCurrent: !keepOwnedInService,
    rejectionReason: null,
    expiredAt: null,
    retiredAt: null,
    verifiedAt: null,
    reviewedBy: null,
    submittedAt: nowIso,
  });
  await writeEvent(databases, authId, {
    ...eventBase,
    vehicleId,
    action: 'resubmitted',
    source: 'renewal',
    previousStatus: existing.status,
    newStatus: 'pending_review',
    note: windowNote(previousWindow, window),
  }, error);
  const profilePatch = keepOwnedInService
    ? { ownedVehicleId }
    : {
        ...profileWindowFields(window),
        vehicleOwnership: 'rented',
        currentVehicleId: vehicleId,
        vehicleStatus: 'pending_review',
        vehicleReconfirmRequired: false,
        vehicleConfirmedServiceDate: null,
        ownedVehicleId,
      };
  const updatedProfile = await databases.updateDocument(DATABASE_ID, MOVER_PROFILES_COLLECTION, profile.$id, profilePatch);
  log(`submitvehicle: ${profile.$id} renewal of ${vehicleId} sent to review (${source})`);
  return res.json({ ok: true, vehicle, profile: updatedProfile, autoRenewed: false });
}

export default async ({ req, res, log, error }) => {
  // Startup assertion. A missing id used to be swallowed by a guarded
  // `if (VAR)` and the function would silently do nothing; name it instead.
  // APPWRITE_COLLECTION_VEHICLES / _VEHICLE_EVENTS default to the slug ids;
  // PLATFORM_TZ defaults to Europe/Berlin.
  const missingEnv = [
    'APPWRITE_COLLECTION_MOVER_PROFILES',
    'APPWRITE_DATABASE_ID',
  ].filter((k) => !process.env[k]);
  if (missingEnv.length) {
    error(`[submitvehicle] missing env: ${missingEnv.join(', ')}`);
    return res.json({ error: 'misconfigured', fnCode: 'generic.misconfigured' }, 500);
  }

  const client = new Client()
    .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(req.headers['x-appwrite-key'] ?? '');
  const databases = new Databases(client);

  if (req.method !== 'POST') return res.json({ ok: false, error: 'Method not allowed', fnCode: 'generic.methodNotAllowed' }, 405);

  try {
    let body;
    try {
      body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    } catch {
      return res.json({ ok: false, error: 'Invalid JSON body', fnCode: 'generic.badRequest' }, 400);
    }
    const authId = req.headers['x-appwrite-user-id'] ?? null;
    if (!authId) return res.json({ ok: false, error: 'Unauthenticated', fnCode: 'api.unauthorized' }, 401);

    const mode = body.mode === undefined || body.mode === null ? null : String(body.mode);
    if (mode !== null && mode !== 'renew') {
      return res.json({ ok: false, error: "mode must be 'renew' when given", fnCode: 'generic.badRequest' }, 400);
    }
    const source = body.source === undefined || body.source === null ? 'settings' : String(body.source);
    if (!SOURCES.includes(source)) {
      return res.json({ ok: false, error: 'source must be registration|settings|login|post_move', fnCode: 'generic.badRequest' }, 400);
    }

    // 1) Resolve the caller's profile — identity from the session, never the body.
    const profiles = await databases.listDocuments(DATABASE_ID, MOVER_PROFILES_COLLECTION, [
      Query.equal('userId', authId),
      Query.limit(1),
    ]);
    if (profiles.documents.length === 0) return res.json({ ok: false, error: 'Not a mover', fnCode: 'mover.notAMover' }, 403);
    const profile = profiles.documents[0];

    const nowMs = Date.now();
    if (mode === 'renew') {
      return await handleRenew({ databases, res, log, error, body, profile, authId, source, nowMs });
    }

    // 2) Validate.
    const ownership =
      body.ownership === undefined || body.ownership === null
        ? (profile.vehicleOwnership === 'rented' ? 'rented' : 'owned')
        : String(body.ownership);
    if (!OWNERSHIPS.includes(ownership)) {
      return res.json({ ok: false, error: 'ownership must be owned|rented', fnCode: 'generic.badRequest' }, 400);
    }
    const codes = [];
    let window = null;
    if (ownership === 'rented') {
      // R1: every rental has a window. Checked first so the driver sees the
      // window error ahead of the photo one — the picker is the new step.
      const resolved = resolveRentalWindow(body.rental, nowMs);
      if (resolved.ok) window = resolved.window;
      else codes.push(...resolved.codes);
    }
    codes.push(...validateVehicleInput(body));
    if (codes.length > 0) {
      return res.json({ ok: false, error: 'Vehicle details are incomplete or invalid', fnCode: codes[0], fnCodes: codes }, 400);
    }

    const registrationNumber = String(body.registrationNumber).trim().toUpperCase();
    const registrationNormalized = normalizePlate(registrationNumber);
    const nowIso = new Date(nowMs).toISOString();
    const today = serviceDate(nowMs, PLATFORM_TZ);

    // 3) Duplicate plate: another driver's live (non-retired) vehicle with the
    //    same normalised registration. Own rows are fine — a resubmission or a
    //    CHANGE back to a previous vehicle must not collide with itself.
    const dupes = await databases.listDocuments(DATABASE_ID, VEHICLES_COLLECTION, [
      Query.equal('registrationNormalized', registrationNormalized),
      Query.notEqual('status', 'retired'),
      Query.limit(25),
    ]);
    const clash = dupes.documents.find((v) => v.moverProfileId !== profile.$id);
    if (clash) {
      return res.json({ ok: false, error: 'This registration number is already in use by another driver', fnCode: 'vehicle.plateInUse' }, 409);
    }

    // Automated checks for the reviewer. Reaching this line means the photos
    // are present and no other driver holds the plate; whether this driver
    // used the plate before is a lookup of their own retired rows.
    let previouslyUsedByDriver = false;
    try {
      const mine = await databases.listDocuments(DATABASE_ID, VEHICLES_COLLECTION, [
        Query.equal('registrationNormalized', registrationNormalized),
        Query.equal('moverProfileId', profile.$id),
        Query.equal('status', 'retired'),
        Query.limit(1),
      ]);
      previouslyUsedByDriver = mine.documents.length > 0;
    } catch (e) {
      error(`[submitvehicle] previous-use lookup failed: ${e.message}`);
    }
    const checks = buildVehicleChecks({ registrationNormalized, previouslyUsedByDriver });

    // A CHANGE after a completed move belongs to that move. The app does not
    // know which one; the `reconfirm_required` event written at completion does.
    let moveId = optionalString(body.moveId, 36);
    if (!moveId && profile.vehicleReconfirmRequired === true) {
      moveId = await pendingReconfirmMoveId(databases, profile.$id, error);
    }

    // R3: a rental registered by a driver whose verified owned vehicle is in
    // service goes in beside it; the owned vehicle keeps serving until the
    // admin approves the rental (R8) or the driver switches (R6).
    const keepOwnedInService = ownership === 'rented' && ownedVehicleInService(profile);

    const vehicleFields = {
      ownership,
      registrationNumber,
      registrationNormalized,
      brand: String(body.brand).trim().slice(0, 64),
      model: String(body.model).trim().slice(0, 64),
      year: optionalString(body.year, 8),
      vehicleType: String(body.vehicleType),
      capacityM3: optionalNumber(body.capacityM3),
      frontPlatePhoto: String(body.frontPlatePhoto).trim(),
      rearPlatePhoto: String(body.rearPlatePhoto).trim(),
      fullVehiclePhoto: String(body.fullVehiclePhoto).trim(),
      status: 'pending_review',
      rejectionReason: null,
      checks,
      submittedAt: nowIso,
      ...vehicleWindowFields(window),
      expiredAt: null,
    };
    const eventBase = {
      moverProfileId: profile.$id,
      source,
      actorId: authId,
      actorRole: 'mover',
      at: nowIso,
      moveId,
      note: optionalString(body.note, 512),
    };

    let vehicle;
    let ownedVehicleId = profile.ownedVehicleId ? String(profile.ownedVehicleId) : null;
    if (keepOwnedInService && !ownedVehicleId) ownedVehicleId = String(profile.currentVehicleId);

    if (body.vehicleId) {
      // 4a) Re-submit in place: the row must be the caller's and still open.
      const vehicleId = String(body.vehicleId);
      let existing;
      try {
        existing = await databases.getDocument(DATABASE_ID, VEHICLES_COLLECTION, vehicleId);
      } catch {
        existing = null;
      }
      if (!existing || existing.moverProfileId !== profile.$id) {
        return res.json({ ok: false, error: 'Vehicle not found', fnCode: 'vehicle.notFound' }, 404);
      }
      if (existing.status !== 'pending_review' && existing.status !== 'rejected') {
        return res.json(
          { ok: false, error: `Vehicle cannot be resubmitted while it is ${existing.status}`, fnCode: 'vehicle.notPending', fnParams: { status: existing.status } },
          409,
        );
      }
      vehicle = await databases.updateDocument(DATABASE_ID, VEHICLES_COLLECTION, vehicleId, {
        ...vehicleFields,
        isCurrent: !keepOwnedInService,
        verifiedAt: null,
        reviewedBy: null,
      });
      await writeEvent(databases, authId, {
        ...eventBase,
        vehicleId,
        action: 'resubmitted',
        previousStatus: existing.status,
        newStatus: 'pending_review',
      }, error);
    } else {
      // 4b) New vehicle: take whatever is current out of service (retire it,
      //     or step a verified owned vehicle aside), then create the new row
      //     pointing back at what it replaces.
      let replacesVehicleId = null;
      if (!keepOwnedInService) {
        const demoted = await demoteOtherCurrentRows(databases, profile, authId, null, ownership === 'rented', eventBase, nowIso, error);
        replacesVehicleId = demoted.replacesVehicleId;
        ownedVehicleId = demoted.ownedVehicleId;
        if (!replacesVehicleId && profile.currentVehicleId && profile.currentVehicleId !== ownedVehicleId) {
          // The profile pointer is the fallback when the index query found
          // nothing (e.g. a backfilled row whose isCurrent was never set).
          replacesVehicleId = String(profile.currentVehicleId);
        }
      }

      vehicle = await databases.createDocument(
        DATABASE_ID,
        VEHICLES_COLLECTION,
        ID.unique(),
        {
          moverProfileId: profile.$id,
          ownerUserId: authId,
          ...vehicleFields,
          isCurrent: !keepOwnedInService,
          replacesVehicleId,
          verifiedAt: null,
          reviewedBy: null,
          retiredAt: null,
          renewalCount: 0,
        },
        // Owner-read only. Plate photos are the same privacy class as the
        // driver's licence; admins read through the server key.
        [Permission.read(Role.user(authId))],
      );
      await writeEvent(databases, authId, {
        ...eventBase,
        vehicleId: vehicle.$id,
        action: 'submitted',
        previousStatus: null,
        newStatus: 'pending_review',
      }, error);
      if (source === 'login' || source === 'post_move') {
        // The CHANGE half of SAME/CHANGE: recorded against the service day so
        // the daily-confirmation history reads as one timeline.
        await writeEvent(databases, authId, {
          ...eventBase,
          vehicleId: vehicle.$id,
          action: 'change_requested',
          previousStatus: null,
          newStatus: 'pending_review',
          serviceDate: today,
        }, error);
      }
    }

    // 5) Profile pointer + status. Deliberately NOT written: verificationStatus
    //    (driver KYC is a separate decision) and the legacy vehicle* snapshot
    //    (only the approval path writes that, so pricing keys on verified data).
    //    With a verified owned vehicle in service the profile keeps serving it;
    //    only `ownedVehicleId` is recorded (R3).
    const profilePatch = keepOwnedInService
      ? { ownedVehicleId }
      : {
          vehicleOwnership: profileOwnershipOnSubmit(profile.vehicleOwnership, ownership),
          currentVehicleId: vehicle.$id,
          vehicleStatus: 'pending_review',
          vehicleReconfirmRequired: false,
          vehicleConfirmedServiceDate: null,
          ...profileWindowFields(window),
          ownedVehicleId,
        };
    const updatedProfile = await databases.updateDocument(DATABASE_ID, MOVER_PROFILES_COLLECTION, profile.$id, profilePatch);

    log(`submitvehicle: ${profile.$id} ${body.vehicleId ? 'resubmitted' : 'submitted'} vehicle ${vehicle.$id} (${ownership}, ${source}${keepOwnedInService ? ', beside owned' : ''}${window ? `, until ${window.endAt}` : ''})`);
    return res.json({ ok: true, vehicle, profile: updatedProfile, autoRenewed: false });
  } catch (err) {
    error(`submitvehicle failed: ${err.message}`);
    return res.json({ ok: false, error: 'Something went wrong. Please try again.', fnCode: 'generic.unexpected' }, 500);
  }
};
