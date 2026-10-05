import { Client, Databases, Query } from 'node-appwrite';

import { basketCapViolation, basketFromWire, classifyBasket, quantityTooHighBody } from './basket.js';
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
const INVENTORY_CATALOG_COLLECTION = process.env.APPWRITE_COLLECTION_INVENTORY_CATALOG;
const PRICING_CONFIG_COLLECTION = process.env.APPWRITE_COLLECTION_PRICING_CONFIG || 'pricing_config';

/**
 * calculateprice — the v3 tiered engine (pricing master plan D5).
 *
 * Two shapes of call:
 *
 *   - PREVIEW (no `moveId`): the body carries the booking inputs and the
 *     function quotes them. Nothing is written. Used while the wizard is still
 *     assembling the move and by the instant mover list.
 *   - PERSIST (`moveId`): every input is read FROM THE ROW — the body may only
 *     supply `vehicleType` (the selected mover's class). The quote is written to
 *     the move (`estimatedPrice`, `priceBreakdown`, `pricingVersion`, `pricedAt`,
 *     `currency`, plus the charged `vehicleType` / `crewSize`). Owner-only: this
 *     runs with a full API key, so without the ownership check any caller could
 *     iterate move ids and rewrite other people's quotes.
 *
 * TIER (crew master D5): both shapes classify the basket server-side and price
 * at max(requested tier, classified tier); the response names both
 * (`moveType` = the tier priced, `systemMoveType` = the classified one) plus the
 * server totals. A persist also writes them to the row. A preview body over
 * the quantity caps is a 400 `inventory.quantityTooHigh`.
 *
 * The maths lives in `./pricing-engine.js`, a byte-identical mirror of the apps'
 * `lib/pricing-engine.ts`; this file only reads inputs and writes the result.
 * A client-supplied `estimatedPrice` is never read.
 */

/**
 * Read admin rate overrides for the pickup country: the GLOBAL layer plus the
 * country's own rows (plan wave-2026-10/4 C4/C5). Never throws and never
 * blocks a quote: on any failure the caller proceeds on the compiled defaults.
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
      error(`[calculateprice] country-scoped pricing config query failed (${e.message}); loading unscoped`);
    }
    try {
      const res = await databases.listDocuments(DATABASE_ID, PRICING_CONFIG_COLLECTION, [Query.limit(200)]);
      return toPricingConfig(res.documents, countryCode);
    } catch (e2) {
      error(`[calculateprice] pricing config unavailable, using defaults: ${e2.message}`);
      return {};
    }
  }
}

/** The caller's `users.countryCode`, or null — the last signal before the default. */
function userCountryLoader(databases, userId) {
  if (!USERS_COLLECTION || !userId) return undefined;
  return async () => {
    const user = await databases.getDocument(DATABASE_ID, USERS_COLLECTION, userId);
    return user ? user.countryCode : null;
  };
}

async function loadCatalog(databases) {
  const res = await databases.listDocuments(DATABASE_ID, INVENTORY_CATALOG_COLLECTION, [Query.limit(500)]);
  return res.documents;
}

/** The preview body, as a pseudo-row the shared reader understands. */
function rowFromBody(body) {
  return {
    moveType: body.tier ?? body.moveType,
    moveCategory: body.mode ?? body.moveCategory,
    routeDistanceMeters: body.routeDistanceMeters,
    routeDurationSeconds: body.routeDurationSeconds,
    inventoryItems: body.inventoryItems,
    customItems: body.customItems,
    vehicleType: body.vehicleType,
    pickupFloorLevel: body.pickupFloorLevel,
    pickupElevator: body.pickupElevator,
    dropoffFloorLevel: body.dropoffFloorLevel,
    dropoffElevator: body.dropoffElevator,
    pickupHaltverbot: body.pickupHaltverbot,
    dropoffHaltverbot: body.dropoffHaltverbot,
    packingServiceLevel: body.packingServiceLevel,
    additionalServices: body.additionalServices,
    storageWeeks: body.storageWeeks,
    // Client-added helpers (crew master D2); the engine clamps to crew.maxExtraHelpers.
    extraHelpers: body.extraHelpers,
    // Pickup coordinates feed the country resolution (reverse geocode), not the price.
    pickupLatitude: body.pickupLatitude,
    pickupLongitude: body.pickupLongitude,
  };
}

export default async ({ req, res, log, error }) => {
  // Startup assertion. A missing id used to be swallowed by a guarded
  // `if (VAR)` and the function would silently do nothing; name it instead.
  // APPWRITE_API_KEY is optional: falls back to the dynamic per-execution key.
  // APPWRITE_COLLECTION_PRICING_CONFIG is optional: defaults to `pricing_config`.
  const missingEnv = [
    'APPWRITE_COLLECTION_INVENTORY_CATALOG',
    'APPWRITE_COLLECTION_MOVES',
    'APPWRITE_DATABASE_ID',
  ].filter((k) => !process.env[k]);
  if (missingEnv.length) {
    error(`[calculateprice] missing env: ${missingEnv.join(', ')}`);
    return res.json({ error: 'misconfigured', fnCode: 'generic.misconfigured' }, 500);
  }

  const client = new Client()
    .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    // Prefer an explicitly configured API key over the per-execution dynamic key.
    // This function was created console-side with `scopes: ['users.read']`, so the
    // dynamic key alone cannot read collections — it has an APPWRITE_API_KEY
    // variable for exactly that reason. Falling back to the dynamic key keeps this
    // source portable to the scoped, config-deployed functions.
    .setKey(process.env.APPWRITE_API_KEY || req.headers['x-appwrite-key'] || '');
  const databases = new Databases(client);

  if (req.method !== 'POST') {
    return res.json({ error: 'Method not allowed', fnCode: 'generic.methodNotAllowed' }, 405);
  }

  try {
    // Appwrite Node 22 functions runtime auto-parses JSON bodies when
    // content-type is application/json, so req.body is already an object.
    // Older runtimes deliver it as a raw string. Handle both.
    let body;
    try {
      body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    } catch {
      return res.json({ error: 'Invalid JSON body', fnCode: 'generic.badRequest' }, 400);
    }
    const moveId = typeof body.moveId === 'string' && body.moveId ? body.moveId : null;

    // ── PERSIST: inputs come from the row, never the body ──────────────────
    let move = null;
    if (moveId) {
      const callerId = req.headers['x-appwrite-user-id'];
      if (!callerId) {
        return res.json({ error: 'Authentication required to persist a quote', fnCode: 'api.unauthorized' }, 401);
      }
      try {
        move = await databases.getDocument(DATABASE_ID, MOVES_COLLECTION, moveId);
      } catch {
        return res.json({ error: 'Move not found', code: 'move_not_found', fnCode: 'move.notFound' }, 404);
      }
      // Relationship attributes arrive as either a bare id or a hydrated doc.
      const clientId = typeof move.clientId === 'string' ? move.clientId : move.clientId?.$id ?? null;
      if (clientId !== callerId) {
        return res.json({ error: 'Move not found', code: 'move_not_found', fnCode: 'move.notFound' }, 404);
      }
    }

    // Pickup country (plan wave-2026-10/4 C2): the row's own code, else the
    // pickup reverse-geocoded, else the client's hint (PREVIEW only — on a
    // persist the body may not steer the price), else the client's country,
    // else DE. Prices and VAT follow it.
    warnIfNoMapboxToken('calculateprice', log);
    const callerId = req.headers['x-appwrite-user-id'] || null;
    const baseRow = move ?? rowFromBody(body);
    const country = await resolveMoveCountry({
      row: baseRow,
      body: move ? null : body,
      loadUserCountry: userCountryLoader(databases, callerId),
      error,
    });
    const row = { ...baseRow, countryCode: country.countryCode };

    const [overrides, catalog] = await Promise.all([
      loadOverrides(databases, error, country.countryCode),
      loadCatalog(databases),
    ]);

    // The basket as the engine will read it; a preview body is capped (a
    // stored row was capped when it was written).
    const basket = basketFromWire(row.inventoryItems, row.customItems);
    if (!move) {
      const overCap = basketCapViolation(basket, catalog);
      if (overCap) return res.json(quantityTooHighBody(overCap), 400);
    }
    // Server totals + tier (crew master D5): price at max(requested, classified).
    const classified = classifyBasket(basket, catalog, overrides, row.moveType, 'light');
    row.moveType = classified.moveType;

    const vehicleOverride = typeof body.vehicleType === 'string' && body.vehicleType ? body.vehicleType : null;
    const input = quoteInputFromRow(row, catalog, move ? vehicleOverride : null);

    let breakdown;
    try {
      breakdown = quoteMove(input, overrides);
    } catch (e) {
      if (e instanceof PricingReconcileError) {
        error(`[calculateprice] quote did not reconcile${moveId ? ` for ${moveId}` : ''}: ${e.message}`);
        return res.json({ error: 'Price could not be computed', fnCode: 'pricing.reconcile' }, 500);
      }
      throw e;
    }

    if (move) {
      await databases.updateDocument(
        DATABASE_ID,
        MOVES_COLLECTION,
        moveId,
        { ...quoteColumns(breakdown, new Date().toISOString()), ...classified },
      );
    }

    log(
      `calculateprice[v3] ${breakdown.tier}/${breakdown.mode} ${breakdown.profile.loadedVolumeM3} m³ ` +
        `${breakdown.profile.distanceKm} km crew ${breakdown.profile.totalCrew} ${breakdown.profile.vehicleType} ` +
        `→ €${breakdown.total} [${country.countryCode} via ${country.source}]${moveId ? ` (persisted on ${moveId})` : ' (preview)'}`,
    );

    return res.json({
      success: true,
      estimatedPrice: breakdown.total,
      breakdown,
      moveType: classified.moveType,
      systemMoveType: classified.systemMoveType,
      totals: {
        totalItemCount: classified.totalItemCount,
        totalWeightKg: classified.totalWeightKg,
        totalVolumeCm3: classified.totalVolumeCm3,
      },
    });
  } catch (err) {
    error(`Calculate price failed: ${err.message}`);
    return res.json({ error: 'Something went wrong. Please try again.', fnCode: 'generic.unexpected' }, 500);
  }
};
