import { Client, Databases, ID, Permission, Query, Role } from 'node-appwrite';

/**
 * selectvehicle — "Vehicle in service" switch (plan wave-2026-10/1 R6).
 *
 * A driver may hold two verified vehicles: a permanent OWNED one and a
 * time-boxed RENTAL. This puts the chosen verified row in service: profile
 * `currentVehicleId`, `vehicleOwnership` (= the chosen row's), the legacy
 * `vehicle*` snapshot columns pricing reads, and the rental window snapshot
 * (`vehicleRentalStartAt/EndAt/Hours`, null for an owned vehicle). The other
 * verified row loses `isCurrent` but is NOT retired — it stays in the fleet.
 *
 * Body:  { vehicleId }
 * Reply: { ok: true, profile }
 *        403 vehicle.notOwnVehicle — not the caller's row
 *        409 vehicle.notVerified   — only admin-approved rows serve (master D2)
 *        409 vehicle.notInWindow   — a rental whose window has ended
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

/**
 * Whether a verified row may be put in service right now, and why not.
 * Owned rows always may; a rental only inside its window. A legacy rental
 * (verified before windows existed, no `rentalEndAt`) stays selectable — the
 * daily-confirmation regime keeps applying to it (plan wave-2026-10/1 §6).
 */
export function selectableReason(vehicle, nowMs) {
  if (!vehicle) return 'vehicle.notOwnVehicle';
  if (vehicle.status !== 'verified') return 'vehicle.notVerified';
  if (vehicle.ownership === 'rented' && typeof vehicle.rentalEndAt === 'string' && vehicle.rentalEndAt.trim() !== '') {
    const endMs = Date.parse(vehicle.rentalEndAt);
    if (Number.isFinite(endMs) && nowMs >= endMs) return 'vehicle.notInWindow';
  }
  return null;
}

/**
 * The profile columns that describe the vehicle in service (R6). The same
 * patch `expirerentals` writes when it falls back to the owned vehicle, so
 * both writers agree on what "in service" means. `nowMs` stamps a rental's
 * confirmed-today the way the admin verify route does on approval: choosing
 * the vehicle is the driver's SAME for the day.
 */
export function inServicePatch(vehicle, nowMs, tz) {
  const rented = vehicle.ownership === 'rented';
  const patch = {
    currentVehicleId: vehicle.$id,
    vehicleOwnership: rented ? 'rented' : 'owned',
    vehicleStatus: 'verified',
    vehicleBrand: vehicle.brand ?? '',
    vehicleModel: vehicle.model ?? '',
    vehicleYear: vehicle.year ?? '',
    vehicleRegistration: vehicle.registrationNumber ?? '',
    vehicleType: vehicle.vehicleType ?? '',
    vehicleCapacity: String(vehicle.capacityM3 ?? ''),
    vehicleRentalStartAt: rented ? (vehicle.rentalStartAt ?? null) : null,
    vehicleRentalEndAt: rented ? (vehicle.rentalEndAt ?? null) : null,
    vehicleRentalHours: rented && typeof vehicle.rentalHours === 'number' ? vehicle.rentalHours : null,
  };
  if (!rented) patch.ownedVehicleId = vehicle.$id;
  if (rented && typeof nowMs === 'number') {
    patch.vehicleConfirmedAt = new Date(nowMs).toISOString();
    patch.vehicleConfirmedServiceDate = serviceDate(nowMs, tz || PLATFORM_TZ);
    patch.vehicleReconfirmRequired = false;
  }
  return patch;
}

// New enum members (plan wave-2026-10/1 §4) and what to write until the
// operator has widened the enums.
const EVENT_ACTION_FALLBACK = { selected: 'confirmed_same' };

async function writeEvent(databases, ownerUserId, row, error) {
  const perms = [Permission.read(Role.user(ownerUserId))];
  try {
    return await databases.createDocument(DATABASE_ID, VEHICLE_EVENTS_COLLECTION, ID.unique(), row, perms);
  } catch (e) {
    const action = EVENT_ACTION_FALLBACK[row.action];
    if (!action) {
      error(`[selectvehicle] vehicle_events ${row.action} failed: ${e.message}`);
      return null;
    }
    error(`[selectvehicle] vehicle_events ${row.action} rejected (enum not widened yet): ${e.message} — retrying as ${action}`);
    try {
      return await databases.createDocument(
        DATABASE_ID,
        VEHICLE_EVENTS_COLLECTION,
        ID.unique(),
        { ...row, action, note: `[${row.action}] ${row.note ?? ''}`.trim().slice(0, 512) },
        perms,
      );
    } catch (e2) {
      error(`[selectvehicle] vehicle_events ${row.action} fallback failed: ${e2.message}`);
      return null;
    }
  }
}

export default async ({ req, res, log, error }) => {
  const missingEnv = [
    'APPWRITE_COLLECTION_MOVER_PROFILES',
    'APPWRITE_DATABASE_ID',
  ].filter((k) => !process.env[k]);
  if (missingEnv.length) {
    error(`[selectvehicle] missing env: ${missingEnv.join(', ')}`);
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

    const vehicleId = body.vehicleId === undefined || body.vehicleId === null ? '' : String(body.vehicleId).trim().slice(0, 36);
    if (!vehicleId) return res.json({ ok: false, error: 'vehicleId is required', fnCode: 'generic.badRequest' }, 400);

    const profiles = await databases.listDocuments(DATABASE_ID, MOVER_PROFILES_COLLECTION, [
      Query.equal('userId', authId),
      Query.limit(1),
    ]);
    if (profiles.documents.length === 0) return res.json({ ok: false, error: 'Not a mover', fnCode: 'mover.notAMover' }, 403);
    const profile = profiles.documents[0];

    let vehicle;
    try {
      vehicle = await databases.getDocument(DATABASE_ID, VEHICLES_COLLECTION, vehicleId);
    } catch {
      vehicle = null;
    }
    if (!vehicle || vehicle.moverProfileId !== profile.$id) {
      return res.json({ ok: false, error: 'This vehicle does not belong to your account', fnCode: 'vehicle.notOwnVehicle' }, 403);
    }
    const nowMs = Date.now();
    const reason = selectableReason(vehicle, nowMs);
    if (reason === 'vehicle.notVerified') {
      return res.json({ ok: false, error: 'Only a verified vehicle can be put in service', fnCode: reason, fnParams: { status: vehicle.status } }, 409);
    }
    if (reason === 'vehicle.notInWindow') {
      return res.json({ ok: false, error: 'This vehicle is not available for service right now', fnCode: reason, fnParams: { rentalEndAt: vehicle.rentalEndAt } }, 409);
    }

    const nowIso = new Date(nowMs).toISOString();
    const previousId = profile.currentVehicleId ? String(profile.currentVehicleId) : null;

    // Other rows in service step aside; nothing is retired (R6).
    const current = await databases.listDocuments(DATABASE_ID, VEHICLES_COLLECTION, [
      Query.equal('moverProfileId', profile.$id),
      Query.equal('isCurrent', true),
      Query.limit(10),
    ]);
    for (const other of current.documents) {
      if (other.$id === vehicle.$id) continue;
      await databases.updateDocument(DATABASE_ID, VEHICLES_COLLECTION, other.$id, { isCurrent: false });
    }
    if (vehicle.isCurrent !== true) {
      await databases.updateDocument(DATABASE_ID, VEHICLES_COLLECTION, vehicle.$id, { isCurrent: true });
    }

    const patch = inServicePatch(vehicle, nowMs, PLATFORM_TZ);
    // Remember the owned vehicle when the driver switches away from it, so the
    // rental's expiry can fall back to it (R4).
    if (vehicle.ownership === 'rented' && !profile.ownedVehicleId && previousId && previousId !== vehicle.$id) {
      const prev = current.documents.find((v) => v.$id === previousId);
      if (prev && prev.ownership === 'owned' && prev.status === 'verified') patch.ownedVehicleId = previousId;
    }
    const updatedProfile = await databases.updateDocument(DATABASE_ID, MOVER_PROFILES_COLLECTION, profile.$id, patch);

    await writeEvent(databases, authId, {
      moverProfileId: profile.$id,
      ownerUserId: authId,
      vehicleId: vehicle.$id,
      moveId: null,
      action: 'selected',
      previousStatus: 'verified',
      newStatus: 'verified',
      source: 'settings',
      serviceDate: patch.vehicleConfirmedServiceDate ?? null,
      actorId: authId,
      actorRole: 'mover',
      note: previousId && previousId !== vehicle.$id ? `in service: ${previousId} → ${vehicle.$id}`.slice(0, 512) : null,
      at: nowIso,
    }, error);

    log(`selectvehicle: ${profile.$id} put ${vehicle.$id} (${vehicle.ownership}) in service${previousId ? ` (was ${previousId})` : ''}`);
    return res.json({ ok: true, profile: updatedProfile });
  } catch (err) {
    error(`selectvehicle failed: ${err.message}`);
    return res.json({ ok: false, error: 'Something went wrong. Please try again.', fnCode: 'generic.unexpected' }, 500);
  }
};
