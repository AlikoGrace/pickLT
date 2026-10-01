import { Client, Databases, ID, Permission, Query, Role } from 'node-appwrite';

import {
  PricingReconcileError,
  quoteColumns,
  quoteInputFromRow,
  quoteMove,
  toPricingConfig,
} from './pricing-engine.js';

const DATABASE_ID = process.env.APPWRITE_DATABASE_ID;
const MOVES_COLLECTION = process.env.APPWRITE_COLLECTION_MOVES;
const MOVE_STATUS_HISTORY_COLLECTION = process.env.APPWRITE_COLLECTION_MOVE_STATUS_HISTORY;
const INVENTORY_CATALOG_COLLECTION = process.env.APPWRITE_COLLECTION_INVENTORY_CATALOG;
const PRICING_CONFIG_COLLECTION = process.env.APPWRITE_COLLECTION_PRICING_CONFIG || 'pricing_config';

// Move type thresholds
const THRESHOLDS = {
  light: { maxPoints: 25, maxWeightKg: 200, maxItems: 15 },
  regular: { maxPoints: 80, maxWeightKg: 800, maxItems: 40 },
};
const TYPE_ORDER = { light: 0, regular: 1, premium: 2 };

function classifyMoveServer(inventory, catalogItems, currentMoveType) {
  let totalPoints = 0;
  let totalWeightKg = 0;
  let totalVolumeCm3 = 0;
  let totalItems = 0;

  for (const [itemId, quantity] of Object.entries(inventory)) {
    if (quantity <= 0) continue;
    const item = catalogItems.find(i => i.itemId === itemId);
    if (!item) continue;
    totalPoints += (item.moveClassificationWeight || 0) * quantity;
    totalWeightKg += (item.weightKg || 0) * quantity;
    totalVolumeCm3 += ((item.widthCm || 0) * (item.heightCm || 0) * (item.depthCm || 0)) * quantity;
    totalItems += quantity;
  }

  let recommendedType = 'light';
  if (totalPoints > THRESHOLDS.regular.maxPoints || totalWeightKg > THRESHOLDS.regular.maxWeightKg || totalItems > THRESHOLDS.regular.maxItems) {
    recommendedType = 'premium';
  } else if (totalPoints > THRESHOLDS.light.maxPoints || totalWeightKg > THRESHOLDS.light.maxWeightKg || totalItems > THRESHOLDS.light.maxItems) {
    recommendedType = 'regular';
  }

  return { recommendedType, totalPoints, totalWeightKg, totalVolumeCm3, totalItems };
}

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
 * Read admin rate overrides. Never throws: a config that fails to load prices
 * at the compiled defaults rather than blocking the booking.
 */
async function loadOverrides(databases, error) {
  try {
    const res = await databases.listDocuments(DATABASE_ID, PRICING_CONFIG_COLLECTION, [Query.limit(200)]);
    return toPricingConfig(res.documents);
  } catch (e) {
    error(`createmove: pricing config unavailable, using defaults: ${e.message}`);
    return {};
  }
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

    // Server-side classification
    let systemMoveType = moveType || 'light';
    let totalItemCount = 0;
    let totalWeightKg = 0;
    let totalVolumeCm3 = 0;

    if (moveData.inventoryItems) {
      const inventoryObj = typeof moveData.inventoryItems === 'string'
        ? JSON.parse(moveData.inventoryItems)
        : moveData.inventoryItems;

      const classification = classifyMoveServer(inventoryObj, catalog, moveType || 'light');
      systemMoveType = classification.recommendedType;
      totalItemCount = classification.totalItems;
      totalWeightKg = classification.totalWeightKg;
      totalVolumeCm3 = classification.totalVolumeCm3;
    }

    const handle = generateHandle();

    // The row as it will be written, minus the quote columns.
    const data = {
      handle,
      clientId,
      status: 'draft',
      moveCategory: moveCategory || 'scheduled',
      moveType: moveType || 'light',
      systemMoveType,
      moveDate: moveDate || null,
      totalItemCount,
      totalWeightKg,
      totalVolumeCm3,
      inventoryItems: asText(moveData.inventoryItems),
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
      customItems: asTextArray(moveData.customItems),
      packingServiceLevel: moveData.packingServiceLevel || null,
      packingMaterials: asTextArray(moveData.packingMaterials),
      packingNotes: asText(moveData.packingNotes),
      arrivalWindow: asText(moveData.arrivalWindow),
      flexibility: moveData.flexibility || null,
      crewSize: asText(moveData.crewSize),
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

    // Quote the row. The selected mover's class on the row (instant) sets the
    // vehicle line; otherwise the engine picks the smallest class that fits.
    const overrides = await loadOverrides(databases, error);
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

    log(`Move created: ${move.$id} (${handle}) for client ${clientId} — €${breakdown.total} (${breakdown.tier}/${breakdown.mode})`);

    return res.json({
      success: true,
      move,
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
