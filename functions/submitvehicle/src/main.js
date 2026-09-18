import { Client, Databases, ID, Permission, Query, Role } from 'node-appwrite';

/**
 * submitvehicle — register or re-submit a driver's vehicle.
 *
 * Contract: pickltmobile/.agent/plans/vehicles/0.master.md §6.1. A vehicle is
 * its own `vehicles` row with its own review status; nothing here touches the
 * driver's KYC (`mover_profiles.verificationStatus`) or the legacy `vehicle*`
 * snapshot columns — those are written only by the admin verify route once
 * the vehicle is approved.
 *
 * Body: { ownership, registrationNumber, brand, model, year?, vehicleType,
 *         capacityM3?, frontPlatePhoto, rearPlatePhoto, fullVehiclePhoto,
 *         source: 'registration'|'settings'|'login'|'post_move', vehicleId?,
 *         moveId?, note? }
 * Reply: { ok: true, vehicle, profile }
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
 * Mirror of pickltmobile/lib/vehicle-service.ts (master plan §5). Do not edit
 * here; edit the TS module and re-copy. The client parity test compares them.
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

function vehicleServiceReady(profile, nowMs, tz) {
  if (!profile) return false;
  if (profile.verificationStatus !== 'verified') return false;
  if (profile.vehicleStatus !== 'verified') return false;
  if (!profile.currentVehicleId) return false;
  if (profile.vehicleOwnership === 'rented') {
    if (profile.vehicleReconfirmRequired === true) return false;
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

/** Optional numeric field: null when absent/blank, else the number. */
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

/**
 * Append one audit row. `vehicle_events` is append-only and server-key only;
 * the driver may read their own history (row permission on ownerUserId).
 * Best-effort: the vehicle row is already written by the time an event is
 * recorded, and failing the driver's submission over the audit trail would
 * leave the data in a worse state than a logged gap.
 */
async function writeEvent(databases, ownerUserId, fields, error) {
  try {
    return await databases.createDocument(
      DATABASE_ID,
      VEHICLE_EVENTS_COLLECTION,
      ID.unique(),
      {
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
      },
      [Permission.read(Role.user(ownerUserId))],
    );
  } catch (e) {
    error(`[submitvehicle] vehicle_events ${fields.action} failed: ${e.message}`);
    return null;
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

    // 1) Resolve the caller's profile — identity from the session, never the body.
    const profiles = await databases.listDocuments(DATABASE_ID, MOVER_PROFILES_COLLECTION, [
      Query.equal('userId', authId),
      Query.limit(1),
    ]);
    if (profiles.documents.length === 0) return res.json({ ok: false, error: 'Not a mover', fnCode: 'mover.notAMover' }, 403);
    const profile = profiles.documents[0];

    // 2) Validate.
    const source = body.source === undefined || body.source === null ? 'settings' : String(body.source);
    if (!SOURCES.includes(source)) {
      return res.json({ ok: false, error: 'source must be registration|settings|login|post_move', fnCode: 'generic.badRequest' }, 400);
    }
    const ownership =
      body.ownership === undefined || body.ownership === null
        ? (profile.vehicleOwnership === 'rented' ? 'rented' : 'owned')
        : String(body.ownership);
    if (!OWNERSHIPS.includes(ownership)) {
      return res.json({ ok: false, error: 'ownership must be owned|rented', fnCode: 'generic.badRequest' }, 400);
    }
    const codes = validateVehicleInput(body);
    if (codes.length > 0) {
      return res.json({ ok: false, error: 'Vehicle details are incomplete or invalid', fnCode: codes[0], fnCodes: codes }, 400);
    }

    const registrationNumber = String(body.registrationNumber).trim().toUpperCase();
    const registrationNormalized = normalizePlate(registrationNumber);
    const nowIso = new Date().toISOString();
    const today = serviceDate(Date.now(), PLATFORM_TZ);

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
        isCurrent: true,
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
      // 4b) New vehicle: retire whatever is current, then create the new row
      //     pointing back at what it replaces.
      const current = await databases.listDocuments(DATABASE_ID, VEHICLES_COLLECTION, [
        Query.equal('moverProfileId', profile.$id),
        Query.equal('isCurrent', true),
        Query.limit(10),
      ]);
      let replacesVehicleId = null;
      for (const old of current.documents) {
        if (old.status === 'retired') continue;
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
      if (!replacesVehicleId && profile.currentVehicleId) {
        // The profile pointer is the fallback when the index query found
        // nothing (e.g. a backfilled row whose isCurrent was never set).
        replacesVehicleId = String(profile.currentVehicleId);
      }

      vehicle = await databases.createDocument(
        DATABASE_ID,
        VEHICLES_COLLECTION,
        ID.unique(),
        {
          moverProfileId: profile.$id,
          ownerUserId: authId,
          ...vehicleFields,
          isCurrent: true,
          replacesVehicleId,
          verifiedAt: null,
          reviewedBy: null,
          retiredAt: null,
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
    const updatedProfile = await databases.updateDocument(DATABASE_ID, MOVER_PROFILES_COLLECTION, profile.$id, {
      vehicleOwnership: profileOwnershipOnSubmit(profile.vehicleOwnership, ownership),
      currentVehicleId: vehicle.$id,
      vehicleStatus: 'pending_review',
      vehicleReconfirmRequired: false,
      vehicleConfirmedServiceDate: null,
    });

    log(`submitvehicle: ${profile.$id} ${body.vehicleId ? 'resubmitted' : 'submitted'} vehicle ${vehicle.$id} (${ownership}, ${source})`);
    return res.json({ ok: true, vehicle, profile: updatedProfile });
  } catch (err) {
    error(`submitvehicle failed: ${err.message}`);
    return res.json({ ok: false, error: 'Something went wrong. Please try again.', fnCode: 'generic.unexpected' }, 500);
  }
};
