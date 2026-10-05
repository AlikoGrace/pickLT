import { Client, Databases, ID, Permission, Query, Role } from 'node-appwrite';

import {
  basketCapViolation,
  basketFromWire,
  classifyBasket,
  extraHelpersFromWire,
  quantityTooHighBody,
  serializeBasket,
} from './basket.js';
import { resolveMoveCountry, warnIfNoMapboxToken } from './move-country.js';
import {
  GLOBAL_PRICING_SCOPE,
  PricingReconcileError,
  quoteColumns,
  quoteInputFromRow,
  quoteMove,
  toPricingConfig,
} from './pricing-engine.js';

const DATABASE_ID = process.env.APPWRITE_DATABASE_ID;
const MOVES_COLLECTION = process.env.APPWRITE_COLLECTION_MOVES;
// Optional: only read to fall back to the client's own country (plan
// wave-2026-10/4 C2) when neither the pickup nor the body names one.
const USERS_COLLECTION = process.env.APPWRITE_COLLECTION_USERS;
const MOVE_STATUS_HISTORY_COLLECTION = process.env.APPWRITE_COLLECTION_MOVE_STATUS_HISTORY;
const INVENTORY_CATALOG_COLLECTION = process.env.APPWRITE_COLLECTION_INVENTORY_CATALOG;
const PRICING_CONFIG_COLLECTION = process.env.APPWRITE_COLLECTION_PRICING_CONFIG || 'pricing_config';

// Generate a human-readable move handle
function generateHandle() {
  const year = new Date().getFullYear();
  const random = Math.floor(100000 + Math.random() * 900000);
  return `MV-${year}-${random}`;
}

// ── Value normalizers ────────────────────────────────────────────────────
// Several `moves` attributes are text or text[] columns. When a caller sends a
// raw object/array where Appwrite expects a string, the value is coerced to
// "[object Object]" and the whole write is rejected with:
//   `"[object Object]" is not valid`
// Callers historically disagree on whether they pre-stringify their custom
// items / inventory (the mobile apps stringify; some web paths pass raw
// objects). This function is the shared server chokepoint every mobile caller
// funnels through, so we normalize here rather than trusting each client.

// Coerce a value destined for a single text/JSON column to a plain string.
// null/undefined pass through unchanged; objects/arrays are JSON-encoded.
function asText(value) {
  if (value === null || value === undefined) return null;
  return typeof value === 'string' ? value : JSON.stringify(value);
}

// Coerce a value destined for a text[] column to an array of plain strings.
// Object elements are JSON-encoded so none ever reaches Appwrite as
// "[object Object]".
function asTextArray(value) {
  if (value === null || value === undefined) return [];
  const arr = Array.isArray(value) ? value : [value];
  return arr
    .filter((v) => v !== null && v !== undefined)
    .map((v) => (typeof v === 'string' ? v : JSON.stringify(v)));
}

/**
 * Read admin rate overrides for the pickup country: the GLOBAL layer plus the
 * country's own rows (plan wave-2026-10/4 C4/C5). Never throws: a config that
 * fails to load prices at the compiled defaults rather than blocking the booking.
 *
 * Before the schema step adds `pricing_config.country` the filtered query is
 * rejected (unknown attribute); that falls back to the unscoped legacy load so
 * a function deployed ahead of the schema still prices on the admin's rates.
 */
let warnedLegacyConfig = false;
async function loadOverrides(databases, error, countryCode) {
  const scopes = countryCode ? [GLOBAL_PRICING_SCOPE, countryCode] : [GLOBAL_PRICING_SCOPE];
  try {
    const res = await databases.listDocuments(DATABASE_ID, PRICING_CONFIG_COLLECTION, [
      Query.equal('country', scopes),
      Query.limit(400),
    ]);
    return toPricingConfig(res.documents, countryCode);
  } catch (e) {
    if (!warnedLegacyConfig) {
      warnedLegacyConfig = true;
      error(`createmove: country-scoped pricing config query failed (${e.message}); loading unscoped`);
    }
    try {
      const res = await databases.listDocuments(DATABASE_ID, PRICING_CONFIG_COLLECTION, [Query.limit(200)]);
      return toPricingConfig(res.documents, countryCode);
    } catch (e2) {
      error(`createmove: pricing config unavailable, using defaults: ${e2.message}`);
      return {};
    }
  }
}

/** The client's `users.countryCode`, or null — the last signal before the default. */
function userCountryLoader(databases, userId) {
  if (!USERS_COLLECTION || !userId) return undefined;
  return async () => {
    const user = await databases.getDocument(DATABASE_ID, USERS_COLLECTION, userId);
    return user ? user.countryCode : null;
  };
}

export default async ({ req, res, log, error }) => {
  // Startup assertion. A missing id used to be swallowed by a guarded
  // `if (VAR)` and the function would silently do nothing; name it instead.
  // APPWRITE_COLLECTION_PRICING_CONFIG is optional: defaults to `pricing_config`.
  const missingEnv = [
    'APPWRITE_COLLECTION_INVENTORY_CATALOG',
    'APPWRITE_COLLECTION_MOVES',
    'APPWRITE_COLLECTION_MOVE_STATUS_HISTORY',
    'APPWRITE_DATABASE_ID',
  ].filter((k) => !process.env[k]);
  if (missingEnv.length) {
    error(`[createmove] missing env: ${missingEnv.join(', ')}`);
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

  let body = {};
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const { clientId, moveCategory, moveType, moveDate, ...moveData } = body;

    if (!clientId) {
      return res.json({ error: 'clientId is required', fnCode: 'generic.badRequest' }, 400);
    }

    // The catalog feeds both the classification and the quote, so it is read
    // on every create (a move with only custom items still needs pricing).
    const catalogRes = await databases.listDocuments(DATABASE_ID, INVENTORY_CATALOG_COLLECTION, [Query.limit(500)]);
    const catalog = catalogRes.documents;

    // The basket, normalised (legacy custom items, zero counts) and capped.
    // It is re-serialised onto the row so what is stored is what was priced.
    const basket = basketFromWire(moveData.inventoryItems, moveData.customItems);
    const overCap = basketCapViolation(basket, catalog);
    if (overCap) return res.json(quantityTooHighBody(overCap), 400);
    const wire = serializeBasket(basket);

    const handle = generateHandle();

    // The row as it will be written, minus the quote columns.
    const data = {
      handle,
      clientId,
      status: 'draft',
      moveCategory: moveCategory || 'scheduled',
      // Client tier for now; replaced below by the enforced tier (crew master D5).
      moveType: moveType || 'light',
      moveDate: moveDate || null,
      inventoryItems: wire.inventoryItems,
      // Pickup
      pickupLocation: asText(moveData.pickupLocation),
      pickupLatitude: moveData.pickupLatitude || null,
      pickupLongitude: moveData.pickupLongitude || null,
      pickupStreetAddress: asText(moveData.pickupStreetAddress),
      pickupApartmentUnit: asText(moveData.pickupApartmentUnit),
      pickupFloorLevel: asText(moveData.pickupFloorLevel),
      pickupElevator: moveData.pickupElevator ?? null,
      pickupParking: asText(moveData.pickupParking),
      pickupHaltverbot: moveData.pickupHaltverbot ?? null,
      // Dropoff
      dropoffLocation: asText(moveData.dropoffLocation),
      dropoffLatitude: moveData.dropoffLatitude || null,
      dropoffLongitude: moveData.dropoffLongitude || null,
      dropoffStreetAddress: asText(moveData.dropoffStreetAddress),
      dropoffApartmentUnit: asText(moveData.dropoffApartmentUnit),
      dropoffFloorLevel: asText(moveData.dropoffFloorLevel),
      dropoffElevator: moveData.dropoffElevator ?? null,
      dropoffParking: asText(moveData.dropoffParking),
      dropoffHaltverbot: moveData.dropoffHaltverbot ?? null,
      // Other
      homeType: moveData.homeType || null,
      customItems: wire.customItems,
      packingServiceLevel: moveData.packingServiceLevel || null,
      packingMaterials: asTextArray(moveData.packingMaterials),
      packingNotes: asText(moveData.packingNotes),
      arrivalWindow: asText(moveData.arrivalWindow),
      flexibility: moveData.flexibility || null,
      crewSize: asText(moveData.crewSize),
      // Client-added helpers (crew master D2), clamped to the schema here and to
      // `crew.maxExtraHelpers` by the engine; `quoteColumns` writes the billed count.
      extraHelpers: extraHelpersFromWire(moveData.extraHelpers),
      vehicleType: asText(moveData.vehicleType),
      additionalServices: asTextArray(moveData.additionalServices),
      storageWeeks: moveData.storageWeeks || 0,
      coverPhotoId: asText(moveData.coverPhotoId),
      galleryPhotoIds: asTextArray(moveData.galleryPhotoIds),
      contactFullName: asText(moveData.contactFullName),
      contactPhone: asText(moveData.contactPhone),
      contactEmail: asText(moveData.contactEmail),
      contactNotes: asText(moveData.contactNotes),
      isBusinessMove: moveData.isBusinessMove ?? null,
      companyName: asText(moveData.companyName),
      vatId: asText(moveData.vatId),
      routeDistanceMeters: moveData.routeDistanceMeters || null,
      routeDurationSeconds: moveData.routeDurationSeconds || null,
      // Pricing + payment. The SERVER is the price authority (pricing master
      // plan D5): `estimatedPrice` and the breakdown are computed below from
      // this very row. A client-sent `estimatedPrice` / `finalPrice` is
      // ignored — before v3 the function persisted whatever the client posted.
      finalPrice: null,
      paymentMethod: asText(moveData.paymentMethod),
      termsAccepted: moveData.termsAccepted ?? null,
      privacyAccepted: moveData.privacyAccepted ?? null,
    };

    // Pickup country (plan wave-2026-10/4 C2): reverse-geocoded from the
    // pickup, else the client's `pickupCountryCode` hint, else the client's own
    // country, else DE. Stored on the row; the quote is priced in that market.
    warnIfNoMapboxToken('createmove', log);
    const country = await resolveMoveCountry({
      row: data,
      body: moveData,
      pickupChanged: true,
      loadUserCountry: userCountryLoader(databases, clientId),
      error,
    });
    data.countryCode = country.countryCode;

    // Quote the row. The selected mover's class on the row (instant) sets the
    // vehicle line; otherwise the engine picks the smallest class that fits.
    const overrides = await loadOverrides(databases, error, country.countryCode);

    // Server totals + tier (crew master D5): classify the basket with the
    // admin thresholds and price at max(client tier, classified tier). Client
    // totals are never read.
    const classified = classifyBasket(basket, catalog, overrides, moveType, 'light');
    Object.assign(data, classified);
    const systemMoveType = classified.systemMoveType;

    let breakdown;
    try {
      breakdown = quoteMove(quoteInputFromRow(data, catalog, null), overrides);
    } catch (e) {
      if (e instanceof PricingReconcileError) {
        error(`createmove: quote did not reconcile: ${e.message}`);
        return res.json({ error: 'Price could not be computed', fnCode: 'pricing.reconcile' }, 500);
      }
      throw e;
    }
    Object.assign(data, quoteColumns(breakdown, new Date().toISOString()));

    // Create the move document
    const move = await databases.createDocument(
      DATABASE_ID,
      MOVES_COLLECTION,
      ID.unique(),
      data,
      [
        // clientId is the client's Appwrite auth account id (users.$id ===
        // account.$id), so it is directly usable as Role.user(...). The client
        // reads their own move and deletes it while it is still a draft
        // (discardDraftMove). No client-session update path exists, so no
        // update grant. read(assignedMover) is added later by acceptmove /
        // acceptscheduledmove / finalizeacceptance.
        Permission.read(Role.user(clientId)),
        Permission.delete(Role.user(clientId)),
      ]
    );

    // Create initial status history entry
    await databases.createDocument(
      DATABASE_ID,
      MOVE_STATUS_HISTORY_COLLECTION,
      ID.unique(),
      {
        moveId: move.$id,
        fromStatus: '',
        toStatus: 'draft',
        changedBy: clientId,
        changedAt: new Date().toISOString(),
        note: 'Move created',
      },
      // Server-only audit trail — no client in any app reads this collection.
      []
    );

    log(
      `Move created: ${move.$id} (${handle}) for client ${clientId} — €${breakdown.total} ` +
        `(${breakdown.tier}/${breakdown.mode}, ${country.countryCode} via ${country.source})`,
    );

    return res.json({
      success: true,
      move,
      moveType: data.moveType,
      systemMoveType,
    });
  } catch (err) {
    error(`Create move failed: ${err.message}`);
    // Surface which attributes carried non-scalar values so an
    // "[object Object]" style rejection can be traced to its field.
    try {
      const suspect = Object.entries(body || {})
        .filter(([, v]) => v !== null && typeof v === 'object' && !Array.isArray(v))
        .map(([k]) => k);
      if (suspect.length) error(`Create move object-valued fields: ${suspect.join(', ')}`);
    } catch {
      /* diagnostics only — never mask the original error */
    }
    return res.json({ error: 'Something went wrong. Please try again.', fnCode: 'generic.unexpected' }, 500);
  }
};
