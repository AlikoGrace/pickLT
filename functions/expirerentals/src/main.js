import { Client, Databases, ID, Permission, Query, Role } from 'node-appwrite';

/**
 * expirerentals — rental-window housekeeping (plan wave-2026-10/1 R2/R4/R9/R10).
 *
 * Scheduled every 5 minutes with the server key. The readiness predicate
 * already stops a rented driver the second `vehicleRentalEndAt` passes; this
 * job tidies up after it and tells the driver:
 *
 *  1. Every verified rental whose window has ended (`rentalEndAt <= now`, no
 *     `expiredAt` yet) is retired (`status='retired'`, `retiredAt`, `expiredAt`,
 *     `isCurrent=false`) with an `expired` audit row. If it was the vehicle in
 *     service, the profile falls back to the driver's verified OWNED vehicle
 *     (same writes as `selectvehicle`, audit row `fallback`) or, without one,
 *     is cleared (`currentVehicleId=null`, `vehicleStatus='none'`, window
 *     snapshot null). Notification `vehicle_rental_expired`.
 *     R10: a driver with a move underway is skipped and revisited next tick —
 *     the predicate still gates NEW work, the current job is not disturbed.
 *  2. Every verified rental ending within RENTAL_EXPIRING_MS gets one
 *     `expiring_soon` audit row per window and a `vehicle_rental_expiring`
 *     notification. The audit row is the dedupe key, so a renewal (new end)
 *     warns again, a repeat tick does not.
 *
 * Idempotent, batches of 100, one failure never stops the loop.
 * Reply: { ok, expired, fallback, cleared, skippedActiveMove, warned, errors }
 */

const DATABASE_ID = process.env.APPWRITE_DATABASE_ID;
const MOVER_PROFILES_COLLECTION = process.env.APPWRITE_COLLECTION_MOVER_PROFILES;
const MOVES_COLLECTION = process.env.APPWRITE_COLLECTION_MOVES;
const NOTIFICATIONS_COLLECTION = process.env.APPWRITE_COLLECTION_NOTIFICATIONS;
const VEHICLES_COLLECTION = process.env.APPWRITE_COLLECTION_VEHICLES || 'vehicles';
const VEHICLE_EVENTS_COLLECTION = process.env.APPWRITE_COLLECTION_VEHICLE_EVENTS || 'vehicle_events';
const PLATFORM_TZ = process.env.PLATFORM_TZ || 'Europe/Berlin';
const PLATFORM_CONFIG_COLLECTION = process.env.APPWRITE_COLLECTION_PLATFORM_CONFIG || 'platform_config';

/**
 * Wall-clock zone per market for the `{{time}}` a driver reads. Mirrors the
 * compiled list in `lib/supported-countries.ts`; the operator's
 * `platform_config.supported_countries` row overrides and extends it (that is
 * where a test market like GH / Africa/Accra lives). Device pass 2026-10-03: a
 * Kumasi driver read "ends at 19:47" (Berlin) for a 17:47 end.
 */
const COMPILED_MARKET_TZ = {
  DE: 'Europe/Berlin',
  AT: 'Europe/Vienna',
  NL: 'Europe/Amsterdam',
  BE: 'Europe/Brussels',
  FR: 'Europe/Paris',
  IT: 'Europe/Rome',
  ES: 'Europe/Madrid',
  PT: 'Europe/Lisbon',
  IE: 'Europe/Dublin',
  LU: 'Europe/Luxembourg',
};

function isValidZone(zone) {
  try {
    new Intl.DateTimeFormat('en-GB', { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

/** Compiled zones overlaid with the operator row (`[{ code, timeZone }]`); malformed entries are skipped. */
export function marketTimeZones(rawSupportedCountries) {
  const zones = { ...COMPILED_MARKET_TZ };
  let list = rawSupportedCountries;
  if (typeof list === 'string') {
    try {
      list = JSON.parse(list);
    } catch {
      list = null;
    }
  }
  if (Array.isArray(list)) {
    for (const entry of list) {
      const code = typeof entry?.code === 'string' ? entry.code.trim().toUpperCase() : '';
      const zone = typeof entry?.timeZone === 'string' ? entry.timeZone.trim() : '';
      if (/^[A-Z]{2}$/.test(code) && zone && isValidZone(zone)) zones[code] = zone;
    }
  }
  return zones;
}

/** The zone a driver's times are shown in: their market's, else the platform's. */
export function zoneForCountry(countryCode, zones) {
  const code = typeof countryCode === 'string' ? countryCode.trim().toUpperCase() : '';
  return (code && zones?.[code]) || PLATFORM_TZ;
}

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

/** "Rental ends soon" from this much time before the end (R9); mirrors lib/vehicle-service.ts. */
export const RENTAL_EXPIRING_MS = 60 * 60 * 1000;
/** Rows per query; the loop pages with a cursor until a short page. */
export const BATCH_SIZE = 100;
const MAX_BATCHES = 20;
/** `vehicle_events.actorId` for rows the scheduler writes (string 36, required). */
export const SYSTEM_ACTOR_ID = 'expirerentals';

/**
 * R10: a move the driver is on, from acceptance to the payment hand-off. Same
 * span as `acceptmove`'s HOLDS_TIME minus `paid` (paid is complete for the
 * driver). A rental ending inside one is left alone until the move completes.
 */
export const ACTIVE_MOVE_STATUSES = [
  'mover_accepted',
  'mover_en_route',
  'mover_arrived',
  'loading',
  'in_transit',
  'arrived_destination',
  'unloading',
  'awaiting_payment',
];

function relId(v) {
  if (!v) return null;
  return typeof v === 'string' ? v : (v.$id ?? null);
}

/**
 * The profile columns that describe the vehicle in service. Byte-for-byte the
 * rule `selectvehicle` applies, so a fallback lands the driver exactly where a
 * manual switch to the owned vehicle would.
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

/** Profile patch when a rental in service ends and no owned vehicle can take over (R4). */
export function clearedPatch() {
  return {
    currentVehicleId: null,
    vehicleStatus: 'none',
    vehicleRentalStartAt: null,
    vehicleRentalEndAt: null,
    vehicleRentalHours: null,
  };
}

/** The dedupe marker kept in the `expiring_soon` audit row's note. */
export function expiringNote(rentalEndAt) {
  return `expiring_soon end=${rentalEndAt}`;
}

/** True when one of the vehicle's recent events already warned about THIS window. */
export function hasExpiringEventForWindow(events, rentalEndAt) {
  const marker = expiringNote(rentalEndAt);
  return (events || []).some((e) => typeof e?.note === 'string' && e.note.includes(marker));
}

/**
 * The `{{time}}` param, pre-formatted (notification conventions §3.4): the
 * wall-clock end in the platform zone, with the date when it is not today.
 */
export function formatEndTime(endIso, nowMs, tz) {
  const zone = tz || PLATFORM_TZ;
  const endMs = Date.parse(endIso);
  if (!Number.isFinite(endMs)) return String(endIso ?? '');
  let hhmm;
  try {
    const parts = new Intl.DateTimeFormat('en-GB', { timeZone: zone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(endMs));
    const get = (type) => parts.find((p) => p.type === type)?.value ?? '';
    hhmm = `${get('hour')}:${get('minute')}`;
  } catch {
    hhmm = new Date(endMs).toISOString().slice(11, 16) + ' UTC';
  }
  const endDay = serviceDate(endMs, zone);
  return endDay === serviceDate(nowMs, zone) ? hhmm : `${endDay} ${hhmm}`;
}

// New enum members (plan wave-2026-10/1 §4) and what to write until the
// operator has widened the enums.
const EVENT_ACTION_FALLBACK = { expired: 'retired', fallback: 'retired', expiring_soon: 'reconfirm_required' };
const EVENT_SOURCE_FALLBACK = { cron: 'system' };

/** Append one audit row (best-effort, enum fallback). Returns the row or null. */
async function writeEvent(databases, ownerUserId, fields, error) {
  const row = {
    moverProfileId: fields.moverProfileId,
    ownerUserId,
    vehicleId: fields.vehicleId ?? null,
    moveId: null,
    action: fields.action,
    previousStatus: fields.previousStatus ?? null,
    newStatus: fields.newStatus ?? null,
    source: 'cron',
    serviceDate: fields.serviceDate ?? null,
    actorId: SYSTEM_ACTOR_ID,
    actorRole: 'system',
    note: fields.note ? String(fields.note).slice(0, 512) : null,
    at: fields.at,
  };
  const perms = ownerUserId ? [Permission.read(Role.user(ownerUserId))] : [];
  try {
    return await databases.createDocument(DATABASE_ID, VEHICLE_EVENTS_COLLECTION, ID.unique(), row, perms);
  } catch (e) {
    const action = EVENT_ACTION_FALLBACK[row.action] ?? row.action;
    const source = EVENT_SOURCE_FALLBACK[row.source] ?? row.source;
    error(`[expirerentals] vehicle_events ${row.action}/${row.source} rejected (enum not widened yet?): ${e.message} — retrying as ${action}/${source}`);
    try {
      return await databases.createDocument(
        DATABASE_ID,
        VEHICLE_EVENTS_COLLECTION,
        ID.unique(),
        { ...row, action, source, note: `[${row.action}] ${row.note ?? ''}`.trim().slice(0, 512) },
        perms,
      );
    } catch (e2) {
      error(`[expirerentals] vehicle_events ${row.action} fallback failed: ${e2.message}`);
      return null;
    }
  }
}

const NOTIFICATION_COPY = {
  vehicle_rental_expiring: {
    i18nKey: 'vehicle.rentalExpiring',
    title: 'Rental ends soon',
    body: (p) => `Your rented vehicle ${p.plate} ends at ${p.time}. Extend it to keep receiving moves.`,
  },
  vehicle_rental_expired: {
    i18nKey: 'vehicle.rentalExpired',
    title: 'Rental period ended',
    body: (p) => `Your rental period for ${p.plate} has ended. Rent again to receive moves.`,
  },
};

/**
 * In-app notification row (+ `sendpush` picks it up by type). English copy is
 * the fallback for clients without the catalog; the apps re-render from
 * `data.i18nKey` + `data.i18nParams`. Until the enum is widened the row is
 * retried as `system` (existing convention), which `sendpush` does not push.
 */
async function notify(databases, userId, type, params, vehicleId, error) {
  if (!NOTIFICATIONS_COLLECTION || !userId) return false;
  const copy = NOTIFICATION_COPY[type];
  const row = {
    userId,
    title: copy.title,
    body: copy.body(params),
    data: JSON.stringify({ i18nKey: copy.i18nKey, i18nParams: params, vehicleId, route: '/vehicle' }),
    isRead: false,
  };
  const perms = [Permission.read(Role.user(userId)), Permission.update(Role.user(userId)), Permission.delete(Role.user(userId))];
  try {
    await databases.createDocument(DATABASE_ID, NOTIFICATIONS_COLLECTION, ID.unique(), { ...row, type }, perms);
    return true;
  } catch (e) {
    error(`[expirerentals] notification type '${type}' rejected (enum not widened yet?): ${e.message} — retrying as system`);
    try {
      await databases.createDocument(DATABASE_ID, NOTIFICATIONS_COLLECTION, ID.unique(), { ...row, type: 'system' }, perms);
      return true;
    } catch (e2) {
      error(`[expirerentals] notification fallback failed: ${e2.message}`);
      return false;
    }
  }
}

async function getOrNull(databases, collection, id) {
  if (!id) return null;
  try {
    return await databases.getDocument(DATABASE_ID, collection, String(id));
  } catch {
    return null;
  }
}

async function hasActiveMove(databases, moverProfileId) {
  const rows = await databases.listDocuments(DATABASE_ID, MOVES_COLLECTION, [
    Query.equal('moverProfileId', moverProfileId),
    Query.equal('status', ACTIVE_MOVE_STATUSES),
    Query.limit(1),
  ]);
  return rows.documents.length > 0;
}

/**
 * The verified owned vehicle that takes over when a rental ends (R4):
 * `profile.ownedVehicleId` when it still points at one, else a lookup — a
 * profile written before the column existed has the row but not the pointer.
 */
async function findOwnedFallback(databases, profile) {
  const pointed = await getOrNull(databases, VEHICLES_COLLECTION, profile.ownedVehicleId);
  if (pointed && pointed.moverProfileId === profile.$id && pointed.ownership === 'owned' && pointed.status === 'verified') {
    return pointed;
  }
  try {
    const rows = await databases.listDocuments(DATABASE_ID, VEHICLES_COLLECTION, [
      Query.equal('moverProfileId', profile.$id),
      Query.equal('ownership', 'owned'),
      Query.equal('status', 'verified'),
      Query.limit(1),
    ]);
    return rows.documents[0] ?? null;
  } catch {
    return null;
  }
}

async function pageThrough(databases, baseQueries, onRow, error, label) {
  let cursor = null;
  for (let batch = 0; batch < MAX_BATCHES; batch += 1) {
    const queries = [...baseQueries, Query.orderAsc('$id'), Query.limit(BATCH_SIZE)];
    if (cursor) queries.push(Query.cursorAfter(cursor));
    let page;
    try {
      page = await databases.listDocuments(DATABASE_ID, VEHICLES_COLLECTION, queries);
    } catch (e) {
      error(`[expirerentals] ${label} query failed: ${e.message}`);
      return;
    }
    for (const row of page.documents) {
      try {
        await onRow(row);
      } catch (e) {
        error(`[expirerentals] ${label} ${row.$id} failed: ${e.message}`);
        onRow.failed = (onRow.failed ?? 0) + 1;
      }
    }
    if (page.documents.length < BATCH_SIZE) return;
    cursor = page.documents[page.documents.length - 1].$id;
  }
}

export default async ({ req, res, log, error }) => {
  const missingEnv = [
    'APPWRITE_COLLECTION_MOVER_PROFILES',
    'APPWRITE_COLLECTION_MOVES',
    'APPWRITE_DATABASE_ID',
  ].filter((k) => !process.env[k]);
  if (missingEnv.length) {
    error(`[expirerentals] missing env: ${missingEnv.join(', ')}`);
    return res.json({ error: 'misconfigured', fnCode: 'generic.misconfigured' }, 500);
  }
  if (!NOTIFICATIONS_COLLECTION) log('[expirerentals] APPWRITE_COLLECTION_NOTIFICATIONS unset — drivers will not be notified');

  const client = new Client()
    .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(req.headers['x-appwrite-key'] ?? '');
  const databases = new Databases(client);

  const nowMs = Date.now();
  const nowIso = new Date(nowMs).toISOString();
  const soonIso = new Date(nowMs + RENTAL_EXPIRING_MS).toISOString();
  const summary = { expired: 0, fallback: 0, cleared: 0, skippedActiveMove: 0, warned: 0, errors: 0 };

  let zones = marketTimeZones(null);
  try {
    const cfg = await databases.listDocuments(DATABASE_ID, PLATFORM_CONFIG_COLLECTION, [
      Query.equal('key', 'supported_countries'),
      Query.limit(1),
    ]);
    zones = marketTimeZones(cfg.documents[0]?.value ?? null);
  } catch (e) {
    log(`[expirerentals] supported_countries not readable (${e.message}) — compiled market zones`);
  }

  // ── 1. Windows that have ended ─────────────────────────────────────────────
  const expireOne = async (vehicle) => {
    const profile = await getOrNull(databases, MOVER_PROFILES_COLLECTION, vehicle.moverProfileId);
    if (profile && (await hasActiveMove(databases, profile.$id))) {
      summary.skippedActiveMove += 1;
      log(`[expirerentals] ${vehicle.$id}: window ended but ${profile.$id} has a move underway — revisit next tick (R10)`);
      return;
    }
    const ownerUserId = vehicle.ownerUserId || relId(profile?.userId) || null;
    await databases.updateDocument(DATABASE_ID, VEHICLES_COLLECTION, vehicle.$id, {
      status: 'retired',
      isCurrent: false,
      retiredAt: nowIso,
      expiredAt: nowIso,
    });
    await writeEvent(databases, ownerUserId, {
      moverProfileId: vehicle.moverProfileId,
      vehicleId: vehicle.$id,
      action: 'expired',
      previousStatus: 'verified',
      newStatus: 'retired',
      serviceDate: serviceDate(nowMs, PLATFORM_TZ),
      note: `window ${vehicle.rentalStartAt ?? '?'}→${vehicle.rentalEndAt ?? '?'}`,
      at: nowIso,
    }, error);
    summary.expired += 1;

    if (profile && String(profile.currentVehicleId ?? '') === vehicle.$id) {
      const owned = await findOwnedFallback(databases, profile);
      if (owned) {
        if (owned.isCurrent !== true) {
          await databases.updateDocument(DATABASE_ID, VEHICLES_COLLECTION, owned.$id, { isCurrent: true });
        }
        await databases.updateDocument(DATABASE_ID, MOVER_PROFILES_COLLECTION, profile.$id, inServicePatch(owned, nowMs, PLATFORM_TZ));
        await writeEvent(databases, ownerUserId, {
          moverProfileId: profile.$id,
          vehicleId: owned.$id,
          action: 'fallback',
          previousStatus: 'verified',
          newStatus: 'verified',
          serviceDate: serviceDate(nowMs, PLATFORM_TZ),
          note: `rental ${vehicle.$id} (${vehicle.registrationNumber ?? '?'}) expired — owned vehicle back in service`,
          at: nowIso,
        }, error);
        summary.fallback += 1;
        log(`[expirerentals] ${vehicle.$id} expired; ${profile.$id} falls back to owned ${owned.$id}`);
      } else {
        await databases.updateDocument(DATABASE_ID, MOVER_PROFILES_COLLECTION, profile.$id, clearedPatch());
        summary.cleared += 1;
        log(`[expirerentals] ${vehicle.$id} expired; ${profile.$id} has no owned vehicle — cleared`);
      }
    } else {
      log(`[expirerentals] ${vehicle.$id} expired while not in service; profile untouched`);
    }

    await notify(databases, ownerUserId, 'vehicle_rental_expired', {
      plate: vehicle.registrationNumber ?? '',
      time: formatEndTime(vehicle.rentalEndAt, nowMs, zoneForCountry(profile?.countryCode, zones)),
    }, vehicle.$id, error);
  };
  await pageThrough(databases, [
    Query.equal('status', 'verified'),
    Query.equal('ownership', 'rented'),
    Query.lessThanEqual('rentalEndAt', nowIso),
    Query.isNull('expiredAt'),
  ], expireOne, error, 'expire');
  summary.errors += expireOne.failed ?? 0;

  // ── 2. Windows ending within the hour ─────────────────────────────────────
  const warnOne = async (vehicle) => {
    const recent = await databases.listDocuments(DATABASE_ID, VEHICLE_EVENTS_COLLECTION, [
      Query.equal('vehicleId', vehicle.$id),
      Query.orderDesc('at'),
      Query.limit(10),
    ]);
    if (hasExpiringEventForWindow(recent.documents, vehicle.rentalEndAt)) return;
    // The profile also carries the market whose clock the driver reads.
    const profile = await getOrNull(databases, MOVER_PROFILES_COLLECTION, vehicle.moverProfileId);
    const ownerUserId = vehicle.ownerUserId || relId(profile?.userId);
    const event = await writeEvent(databases, ownerUserId, {
      moverProfileId: vehicle.moverProfileId,
      vehicleId: vehicle.$id,
      action: 'expiring_soon',
      previousStatus: 'verified',
      newStatus: 'verified',
      serviceDate: serviceDate(nowMs, PLATFORM_TZ),
      note: expiringNote(vehicle.rentalEndAt),
      at: nowIso,
    }, error);
    if (!event) {
      // The audit row is the dedupe key: without it the warning would repeat
      // every tick, so it is better not sent until the write works.
      error(`[expirerentals] ${vehicle.$id}: expiring_soon event not written — warning deferred`);
      return;
    }
    await notify(databases, ownerUserId, 'vehicle_rental_expiring', {
      plate: vehicle.registrationNumber ?? '',
      time: formatEndTime(vehicle.rentalEndAt, nowMs, zoneForCountry(profile?.countryCode, zones)),
    }, vehicle.$id, error);
    summary.warned += 1;
    log(`[expirerentals] ${vehicle.$id} ends at ${vehicle.rentalEndAt} — warned`);
  };
  await pageThrough(databases, [
    Query.equal('status', 'verified'),
    Query.equal('ownership', 'rented'),
    Query.greaterThan('rentalEndAt', nowIso),
    Query.lessThanEqual('rentalEndAt', soonIso),
  ], warnOne, error, 'warn');
  summary.errors += warnOne.failed ?? 0;

  log(`[expirerentals] expired=${summary.expired} fallback=${summary.fallback} cleared=${summary.cleared} skippedActiveMove=${summary.skippedActiveMove} warned=${summary.warned} errors=${summary.errors}`);
  return res.json({ ok: true, ...summary });
};
