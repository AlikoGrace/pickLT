import { Client, Databases, ID, Permission, Query, Role } from 'node-appwrite';

import {
  loadedVolumeM3,
  moverCapacityM3,
  parseCustomItems,
  parseInventory,
  requiredCrewFor,
  toPricingConfig,
} from './pricing-engine.js';

const DATABASE_ID = process.env.APPWRITE_DATABASE_ID;
const MOVES_COLLECTION = process.env.APPWRITE_COLLECTION_MOVES;
const MOVER_PROFILES_COLLECTION = process.env.APPWRITE_COLLECTION_MOVER_PROFILES;
const MOVE_REQUESTS_COLLECTION = process.env.APPWRITE_COLLECTION_MOVE_REQUESTS;
const INVENTORY_CATALOG_COLLECTION = process.env.APPWRITE_COLLECTION_INVENTORY_CATALOG;
const PRICING_CONFIG_COLLECTION = process.env.APPWRITE_COLLECTION_PRICING_CONFIG || 'pricing_config';

const MAX_MOVERS = 10;
const REQUEST_TIMEOUT_SECONDS = 60;
// Service day for the vehicle-readiness gate (master plan §5). Optional:
// defaults to the platform's home zone.
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

// ─── Load volume, vehicle capacity, crew requirement ────────────────────────
//
// All three come from `./pricing-engine.js`, the byte-identical mirror of the
// apps' `lib/pricing-engine.ts` + `lib/move-volume.ts` (functions cannot import
// app code). Volume is recomputed here from the catalog rather than read off
// `moves.totalVolumeCm3`: that column is written by createmove but is null on
// real production rows, and a client-supplied classification is not something
// to trust for a gating decision (audit N7).
//
// The `pricing_config` overrides (capacity bands, `crew.m3PerMover`) are read
// fail-open: an unreadable config gates on the compiled defaults.

/**
 * Read admin rate overrides. Never throws and never blocks a broadcast.
 */
async function loadOverrides(databases, error) {
  try {
    const res = await databases.listDocuments(DATABASE_ID, PRICING_CONFIG_COLLECTION, [Query.limit(200)]);
    return toPricingConfig(res.documents);
  } catch (e) {
    error(`broadcast: pricing config unavailable, gating on defaults: ${e.message}`);
    return {};
  }
}

/**
 * The crew gate's eligibility rule — the same one `quoteForMover` applies in
 * the client's instant list (master D7): a mover whose declared crew is smaller
 * than what the job needs is not offered it. An unknown crew size passes, so a
 * profile written before the column existed is not silently excluded.
 */
export function crewEligible(mover, requiredCrew) {
  // Same rule as `quoteForMover` in pricing-engine: an unknown crew size (null,
  // undefined, unparseable) is not "one mover" — it passes.
  const crewSize = typeof mover.crewSize === 'number' ? mover.crewSize : NaN;
  return !Number.isFinite(crewSize) || crewSize >= requiredCrew;
}

// Haversine distance in km
function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default async ({ req, res, log, error }) => {
  // Startup assertion. A missing id used to be swallowed by a guarded
  // `if (VAR)` and the function would silently do nothing; name it instead.
  // CONFLICT_BUFFER_MS is optional: the code supplies a numeric default.
  // APPWRITE_COLLECTION_PRICING_CONFIG is optional: defaults to `pricing_config`.
  const missingEnv = [
    'APPWRITE_COLLECTION_INVENTORY_CATALOG',
    'APPWRITE_COLLECTION_MOVER_PROFILES',
    'APPWRITE_COLLECTION_MOVES',
    'APPWRITE_COLLECTION_MOVE_REQUESTS',
    'APPWRITE_DATABASE_ID',
  ].filter((k) => !process.env[k]);
  if (missingEnv.length) {
    error(`[broadcastmoverequest] missing env: ${missingEnv.join(', ')}`);
    return res.json({ error: 'misconfigured', fnCode: 'generic.misconfigured' }, 500);
  }

  const client = new Client()
    .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(req.headers['x-appwrite-key'] ?? '');
  const databases = new Databases(client);

  if (req.method !== 'POST') {
    return res.json({ error: 'Method not allowed', fnCode: 'generic.methodNotAllowed' }, 405);
  }

  try {
    let body;
    try {
      body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    } catch {
      return res.json({ error: 'Invalid JSON body', fnCode: 'generic.badRequest' }, 400);
    }
    const { moveId } = body;

    if (!moveId) {
      return res.json({ error: 'moveId is required', fnCode: 'generic.badRequest' }, 400);
    }

    // Get move details
    const move = await databases.getDocument(DATABASE_ID, MOVES_COLLECTION, moveId);

    if (!move.pickupLatitude || !move.pickupLongitude) {
      return res.json({ error: 'Move has no pickup coordinates', fnCode: 'move.noPickupCoords' }, 400);
    }

    // Idempotency gate. The caller is the client's track screen, whose view of
    // "has a mover accepted yet" comes from a realtime socket that can silently
    // die — so it will happily ask us to broadcast a move that was accepted
    // seconds ago. Re-broadcasting then offers an assigned job to other movers,
    // and a second mover can accept a move that already has one.
    // The move row is the only trustworthy source here, so gate on it.
    const relId = (v) => (!v ? null : typeof v === 'string' ? v : v.$id ?? null);
    const NON_BROADCASTABLE = new Set([
      'mover_accepted', 'mover_en_route', 'mover_arrived', 'loading', 'in_transit',
      'arrived_destination', 'unloading', 'awaiting_payment', 'paid', 'completed',
      'cancelled_by_client', 'cancelled_by_mover', 'disputed',
    ]);
    if (relId(move.moverProfileId) || NON_BROADCASTABLE.has(move.status)) {
      log(`[broadcast] skipped ${moveId}: already assigned/closed (status=${move.status})`);
      return res.json({ ok: true, skipped: 'already_assigned', broadcast: 0 });
    }

    // A still-pending priority request means the exclusive window has not run
    // out; broadcasting now would undercut it.
    const openAccepted = await databases.listDocuments(
      DATABASE_ID,
      MOVE_REQUESTS_COLLECTION,
      [Query.equal('moveId', moveId), Query.equal('status', 'accepted'), Query.limit(1)]
    );
    if (openAccepted.total > 0) {
      log(`[broadcast] skipped ${moveId}: an accepted request already exists`);
      return res.json({ ok: true, skipped: 'already_accepted', broadcast: 0 });
    }

    // Fetch online, verified movers
    const movers = await databases.listDocuments(
      DATABASE_ID,
      MOVER_PROFILES_COLLECTION,
      [
        Query.equal('verificationStatus', 'verified'),
        Query.equal('isOnline', true),
        Query.limit(100),
      ]
    );

    // Staleness gate: a mover whose position hasn't been stamped in the
    // last 3 min is a ghost (app killed with isOnline stuck true, or a long
    // offline gap). The mover app pings every 15 s from the foreground AND
    // the background, so real movers stay far inside the window — three
    // minutes is twelve missed pings. Mirrors listnearbymovers,
    // createpriorityrequest and the client's lib/movers.ts.
    const LOCATION_STALE_MS = 3 * 60 * 1000;
    const isFresh = (iso) => {
      const t = iso ? Date.parse(iso) : NaN;
      return Number.isFinite(t) && Date.now() - t <= LOCATION_STALE_MS;
    };
    // typeof, not truthiness: latitude 0 / longitude 0 are real coordinates.
    const located = movers.documents.filter(
      m => typeof m.currentLatitude === 'number' && typeof m.currentLongitude === 'number'
    );
    const fresh = located.filter(m => isFresh(m.locationUpdatedAt));
    if (fresh.length < located.length) {
      log(`staleness gate: ${located.length - fresh.length}/${located.length} online movers dropped (no ping in 3 min)`);
    }

    // Vehicle-readiness gate (master plan §5, D4): a verified driver whose
    // current vehicle is not verified — or, for a rental driver, not confirmed
    // for today's service day — is not offered new moves. Same predicate as
    // listnearbymovers / createpriorityrequest / setmoveronline / acceptmove.
    const ready = fresh.filter(m => vehicleServiceReady(m, Date.now(), PLATFORM_TZ));
    const vehicleGated = fresh.length - ready.length;
    if (vehicleGated > 0) {
      log(`vehicle gate: ${vehicleGated}/${fresh.length} fresh movers dropped (vehicle not service-ready)`);
    }

    // Calculate distances and sort by proximity
    const inRange = ready
      .map(m => ({
        ...m,
        distanceKm: haversineKm(
          move.pickupLatitude, move.pickupLongitude,
          m.currentLatitude, m.currentLongitude
        ),
      }))
      .filter(m => m.distanceKm <= 15)
      .sort((a, b) => a.distanceKm - b.distanceKm);

    // ── Double-booking gate ────────────────────────────────────────────────
    //
    // Found on device: a mover holding a scheduled move due to start in minutes
    // was still offered an instant job. Availability was only ever "verified,
    // online, recently seen, near enough, big enough truck" — never "actually
    // free at that time".
    //
    // The test is OVERLAP, not proximity: a two-hour job offered seventy
    // minutes before a scheduled start still collides. Each commitment becomes
    // a time window; a mover whose window intersects this job is dropped.
    // Mirrors pickltmobile/lib/scheduling-conflict.ts — keep in sync.
    const available = await dropConflictedMovers(databases, inRange, move);
    if (available.length < inRange.length) {
      log(`conflict gate: ${inRange.length - available.length}/${inRange.length} movers dropped (already committed)`);
    }

    // ── Capacity gate ──────────────────────────────────────────────────────
    //
    // Offering a job to a mover whose vehicle cannot hold it wastes their time
    // and, worse, ends with them arriving at the customer's door unable to do
    // the work. Filtering here is the point of computing volume at all.
    //
    // The load figure is an ESTIMATE (bounding boxes × a packing factor), so it
    // must never be able to make a move unbookable. Three safeguards:
    //   · a catalog that fails to load leaves volume 0 → everyone passes;
    //   · a load of 0 (nothing measurable) → everyone passes;
    //   · if the gate empties an otherwise non-empty pool, fall back to the
    //     largest-capacity movers and log it loudly, rather than sending zero
    //     requests and stranding the customer.
    let catalog = [];
    if (INVENTORY_CATALOG_COLLECTION) {
      try {
        const res = await databases.listDocuments(DATABASE_ID, INVENTORY_CATALOG_COLLECTION, [
          Query.limit(500),
        ]);
        catalog = res.documents;
      } catch (e) {
        error(`broadcast: catalog unavailable, capacity gate disabled: ${e.message}`);
      }
    }
    const overrides = await loadOverrides(databases, error);

    const loadM3 = catalog.length > 0 ? loadedVolumeM3(move.inventoryItems, move.customItems, catalog, overrides) : 0;

    let candidates = available;
    let capacityGated = false;
    if (loadM3 > 0) {
      const fitting = available.filter(m => moverCapacityM3(m, overrides) >= loadM3);
      if (fitting.length > 0) {
        candidates = fitting;
        capacityGated = true;
      } else if (available.length > 0) {
        // Nobody nearby can carry it. Send to the biggest vehicles anyway so a
        // human can judge — a wrong estimate must not silently kill the move.
        candidates = [...available].sort(
          (a, b) => moverCapacityM3(b, overrides) - moverCapacityM3(a, overrides)
        );
        error(
          `broadcast: no mover within range fits ${loadM3} m³ for move ${moveId}; ` +
          `falling back to the ${Math.min(candidates.length, MAX_MOVERS)} largest vehicles`
        );
      }
    }

    // ── Crew gate (pricing master plan D7) ─────────────────────────────────
    //
    // The job's crew requirement comes from the load (m³ per mover) and the
    // heaviest item's `requiredCrew` — the same `requiredCrewFor` the engine
    // prices with, so a mover is hidden here exactly when the client's instant
    // list hides them. The mover's actual crew never changes the price; it
    // only decides eligibility. Same degradation rule as the capacity gate:
    // never empty a non-empty pool — fall back to the largest crews and log.
    const requiredCrew = catalog.length > 0
      ? requiredCrewFor(
          { counts: parseInventory(move.inventoryItems), customItems: parseCustomItems(move.customItems) },
          catalog,
          loadM3,
          overrides,
        )
      : 1;

    let crewGated = false;
    if (requiredCrew > 1 && candidates.length > 0) {
      const crewed = candidates.filter(m => crewEligible(m, requiredCrew));
      if (crewed.length > 0) {
        if (crewed.length < candidates.length) {
          log(`crew gate: ${candidates.length - crewed.length}/${candidates.length} movers dropped (crew < ${requiredCrew})`);
        }
        candidates = crewed;
        crewGated = true;
      } else {
        candidates = [...candidates].sort(
          (a, b) => (Number(b.crewSize) || 0) - (Number(a.crewSize) || 0)
        );
        error(
          `broadcast: no candidate mover has the ${requiredCrew} movers move ${moveId} needs; ` +
          `falling back to the ${Math.min(candidates.length, MAX_MOVERS)} largest crews`
        );
      }
    }

    const nearbyMovers = candidates.slice(0, MAX_MOVERS);

    if (nearbyMovers.length === 0) {
      log(`No nearby movers found for move ${moveId}`);
      return res.json({ success: true, requestsSent: 0, vehicleGated, requiredCrew, crewGated, message: 'No nearby movers available' });
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + REQUEST_TIMEOUT_SECONDS * 1000).toISOString();

    // Create move requests for each nearby mover
    const requests = [];
    // moves.clientId IS the client's auth account id and can be used directly.
    // mover_profiles.$id is NOT an auth id — the mover's account id has to be
    // read off the profile's userId relationship (string or hydrated object).
    const moveClientAuthId = relId(move.clientId);
    for (const mover of nearbyMovers) {
      const moverAuthId = relId(mover.userId);
      const requestPermissions = [];
      if (moverAuthId) requestPermissions.push(Permission.read(Role.user(moverAuthId)));
      if (moveClientAuthId) requestPermissions.push(Permission.read(Role.user(moveClientAuthId)));
      const request = await databases.createDocument(
        DATABASE_ID,
        MOVE_REQUESTS_COLLECTION,
        ID.unique(),
        {
          moveId,
          moverProfileId: mover.$id,
          status: 'pending',
          sentAt: now.toISOString(),
          respondedAt: null,
          expiresAt,
        },
        // The target mover needs their inbox; the client's tracking screen
        // lists who was pinged.
        requestPermissions
      );
      requests.push(request);
    }

    log(
      `Broadcast ${requests.length} move requests for move ${moveId} ` +
      `(load ${loadM3} m³, capacity gate ${capacityGated ? 'applied' : 'not applied'}, ` +
      `crew ${requiredCrew}, crew gate ${crewGated ? 'applied' : 'not applied'})`
    );

    return res.json({
      success: true,
      requestsSent: requests.length,
      loadVolumeM3: loadM3,
      capacityGated,
      vehicleGated,
      requiredCrew,
      crewGated,
      moversNotified: nearbyMovers.map(m => ({ id: m.$id, distanceKm: Math.round(m.distanceKm * 10) / 10 })),
    });
  } catch (err) {
    error(`Broadcast move request failed: ${err.message}`);
    return res.json({ error: 'Something went wrong. Please try again.', fnCode: 'generic.unexpected' }, 500);
  }
};

// ── Scheduling-conflict helpers (mirror of lib/scheduling-conflict.ts) ───────
const DEFAULT_MOVE_DURATION_MS = 90 * 60 * 1000;
const CONFLICT_BUFFER_MS = Number(process.env.CONFLICT_BUFFER_MS || 30 * 60 * 1000);
const UNDERWAY_SET = new Set([
  'mover_en_route', 'mover_arrived', 'loading', 'in_transit',
  'arrived_destination', 'unloading',
]);
const HOLDS_TIME = new Set([...UNDERWAY_SET, 'awaiting_payment', 'paid', 'mover_accepted']);

function durationMsOf(move) {
  const secs = move.routeDurationSeconds;
  return typeof secs === 'number' && isFinite(secs) && secs > 0 ? secs * 1000 : DEFAULT_MOVE_DURATION_MS;
}

function scheduledStartMs(move) {
  if (!move.moveDate) return null;
  const base = new Date(move.moveDate);
  if (isNaN(base.getTime())) return null;
  const m = /^\s*(\d{1,2}):(\d{2})\s*(AM|PM)?\s*$/i.exec(move.arrivalWindow || '');
  if (!m) return base.getTime();
  let h = parseInt(m[1], 10);
  const mins = parseInt(m[2], 10);
  if (mins > 59) return base.getTime();
  const period = (m[3] || '').toUpperCase();
  if (period) {
    if (h < 1 || h > 12) return base.getTime();
    if (period === 'PM' && h !== 12) h += 12;
    if (period === 'AM' && h === 12) h = 0;
  } else if (h > 23) return base.getTime();
  const isMidnight =
    base.getUTCHours() === 0 && base.getUTCMinutes() === 0 && base.getUTCSeconds() === 0;
  if (!isMidnight) return base.getTime();
  const tz = process.env.PLATFORM_TZ || 'Europe/Berlin';
  const wallAsUtc = Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate(), 0, h * 60 + mins);
  const offset = (t) => {
    // NOT a display locale — 'en-US' is a fixed parsing anchor for
    // `formatToParts`; the tag never reaches a screen and localising it would
    // break DST handling.
    const dtf = new Intl.DateTimeFormat('en-US', {
      timeZone: tz, hour12: false, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
    const parts = {};
    for (const p of dtf.formatToParts(new Date(t))) if (p.type !== 'literal') parts[p.type] = +p.value;
    return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour % 24, parts.minute, parts.second) - t;
  };
  const guess = wallAsUtc - offset(wallAsUtc);
  return wallAsUtc - offset(guess);
}

function windowOf(move, nowMs) {
  if (!HOLDS_TIME.has(move.status)) return null;
  // ONLY SCHEDULED MOVES RESERVE TIME. Queueing instant jobs is deliberate
  // (Problems.docx #2 built the "I'm on another move" notice for exactly that).
  // Reserving time for instant moves made two now-starting windows collide
  // every time, which silently filtered the mover out of discovery and left the
  // queue-notice feature unreachable. Mirrors lib/scheduling-conflict.ts.
  if (move.moveCategory !== 'scheduled') return null;
  const len = durationMsOf(move);
  if (move.status === 'mover_accepted') {
    const start = scheduledStartMs(move);
    if (start === null) return null;
    return { start, end: start + len };
  }
  return { start: nowMs, end: nowMs + len };
}

/**
 * Drop movers whose existing commitments overlap this job. One query for all
 * candidates, filtered in memory — never one round trip per mover.
 * Fail-open: a lookup error must never make a move unbookable.
 */
async function dropConflictedMovers(databases, candidates, candidateMove) {
  if (candidates.length === 0) return candidates;
  const now = Date.now();
  const candLen = durationMsOf(candidateMove);
  const candWindow = { start: now, end: now + candLen };
  try {
    const held = await databases.listDocuments(DATABASE_ID, MOVES_COLLECTION, [
      Query.equal('moverProfileId', candidates.map(m => m.$id)),
      Query.equal('status', [...HOLDS_TIME]),
      Query.limit(200),
    ]);
    const busy = new Set();
    for (const move of held.documents) {
      if (move.$id === candidateMove.$id) continue;
      const w = windowOf(move, now);
      if (!w) continue;
      if (w.start - CONFLICT_BUFFER_MS < candWindow.end && candWindow.start - CONFLICT_BUFFER_MS < w.end) {
        const owner = !move.moverProfileId ? null
          : typeof move.moverProfileId === 'string' ? move.moverProfileId : move.moverProfileId.$id;
        if (owner) busy.add(owner);
      }
    }
    return candidates.filter(m => !busy.has(m.$id));
  } catch (e) {
    error(`[broadcast] conflict gate failed, allowing all: ${e.message}`);
    return candidates;
  }
}
