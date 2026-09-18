import { Client, Databases, ID, Permission, Query, Role } from 'node-appwrite';

/**
 * confirmvehicle — a rental driver's SAME-vehicle confirmation.
 *
 * Contract: pickltmobile/.agent/plans/vehicles/0.master.md §6.2. Rental
 * drivers confirm at every service-day login and again after every completed
 * move; the confirmation is what `vehicleServiceReady` reads to let them back
 * into the client-facing pool. The CHANGE half goes through `submitvehicle`.
 *
 * Body:  { source: 'login'|'post_move', moveId?, note? }
 *        `note` is an optional device/session id, kept on the audit row.
 * Reply: { ok: true, serviceDate, profile }
 *
 * Identity is always `x-appwrite-user-id`, never the body. The service day is
 * computed server-side in PLATFORM_TZ so a phone with a wrong clock or a
 * driver across a border cannot confirm for the wrong date.
 */

const DATABASE_ID = process.env.APPWRITE_DATABASE_ID;
const MOVER_PROFILES_COLLECTION = process.env.APPWRITE_COLLECTION_MOVER_PROFILES;
const VEHICLE_EVENTS_COLLECTION = process.env.APPWRITE_COLLECTION_VEHICLE_EVENTS || 'vehicle_events';
const PLATFORM_TZ = process.env.PLATFORM_TZ || 'Europe/Berlin';

const SOURCES = ['login', 'post_move'];

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

function optionalString(v, max) {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  if (!s) return null;
  return max ? s.slice(0, max) : s;
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
  // APPWRITE_COLLECTION_VEHICLE_EVENTS defaults to the slug id; PLATFORM_TZ
  // defaults to Europe/Berlin.
  const missingEnv = [
    'APPWRITE_COLLECTION_MOVER_PROFILES',
    'APPWRITE_DATABASE_ID',
  ].filter((k) => !process.env[k]);
  if (missingEnv.length) {
    error(`[confirmvehicle] missing env: ${missingEnv.join(', ')}`);
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

    const source = body.source === undefined || body.source === null ? 'login' : String(body.source);
    if (!SOURCES.includes(source)) {
      return res.json({ ok: false, error: 'source must be login|post_move', fnCode: 'generic.badRequest' }, 400);
    }

    const profiles = await databases.listDocuments(DATABASE_ID, MOVER_PROFILES_COLLECTION, [
      Query.equal('userId', authId),
      Query.limit(1),
    ]);
    if (profiles.documents.length === 0) return res.json({ ok: false, error: 'Not a mover', fnCode: 'mover.notAMover' }, 403);
    const profile = profiles.documents[0];

    if (profile.vehicleOwnership !== 'rented') {
      return res.json({ ok: false, error: 'Daily confirmation applies to rented vehicles only', fnCode: 'vehicle.notRental' }, 400);
    }
    if (profile.vehicleStatus !== 'verified' || !profile.currentVehicleId) {
      return res.json({ ok: false, error: 'Your current vehicle has not been verified yet', fnCode: 'vehicle.notVerified' }, 409);
    }

    const nowMs = Date.now();
    const nowIso = new Date(nowMs).toISOString();
    const today = serviceDate(nowMs, PLATFORM_TZ);
    // A post-move confirmation belongs to the move that raised it. The app
    // does not know which one; the `reconfirm_required` event does.
    let moveId = optionalString(body.moveId, 36);
    if (!moveId && profile.vehicleReconfirmRequired === true) {
      moveId = await pendingReconfirmMoveId(databases, profile.$id, error);
    }
    const note = optionalString(body.note, 512);

    const updatedProfile = await databases.updateDocument(DATABASE_ID, MOVER_PROFILES_COLLECTION, profile.$id, {
      vehicleConfirmedAt: nowIso,
      vehicleConfirmedServiceDate: today,
      vehicleReconfirmRequired: false,
    });

    // Audit row. Best-effort: the confirmation itself has landed and the
    // driver must not be told otherwise because the history write hiccupped.
    try {
      await databases.createDocument(
        DATABASE_ID,
        VEHICLE_EVENTS_COLLECTION,
        ID.unique(),
        {
          moverProfileId: profile.$id,
          ownerUserId: authId,
          vehicleId: String(profile.currentVehicleId),
          moveId,
          action: 'confirmed_same',
          previousStatus: 'verified',
          newStatus: 'verified',
          source,
          serviceDate: today,
          actorId: authId,
          actorRole: 'mover',
          note,
          at: nowIso,
        },
        [Permission.read(Role.user(authId))],
      );
    } catch (e) {
      error(`[confirmvehicle] vehicle_events confirmed_same failed: ${e.message}`);
    }

    log(`confirmvehicle: ${profile.$id} confirmed ${profile.currentVehicleId} for ${today} (${source}${moveId ? `, move ${moveId}` : ''})`);
    return res.json({ ok: true, serviceDate: today, profile: updatedProfile });
  } catch (err) {
    error(`confirmvehicle failed: ${err.message}`);
    return res.json({ ok: false, error: 'Something went wrong. Please try again.', fnCode: 'generic.unexpected' }, 500);
  }
};
