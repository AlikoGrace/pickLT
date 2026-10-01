import { Client, Databases, Query } from 'node-appwrite';

import {
  PricingReconcileError,
  quoteColumns,
  quoteInputFromRow,
  quoteMove,
  toPricingConfig,
} from './pricing-engine.js';

const DATABASE_ID = process.env.APPWRITE_DATABASE_ID;
const MOVES_COLLECTION = process.env.APPWRITE_COLLECTION_MOVES;
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
 * The maths lives in `./pricing-engine.js`, a byte-identical mirror of the apps'
 * `lib/pricing-engine.ts`; this file only reads inputs and writes the result.
 * A client-supplied `estimatedPrice` is never read.
 */

/**
 * Read admin rate overrides. Never throws and never blocks a quote: on any
 * failure the caller proceeds on the compiled defaults.
 */
async function loadOverrides(databases, error) {
  try {
    const res = await databases.listDocuments(DATABASE_ID, PRICING_CONFIG_COLLECTION, [Query.limit(200)]);
    return toPricingConfig(res.documents);
  } catch (e) {
    error(`[calculateprice] pricing config unavailable, using defaults: ${e.message}`);
    return {};
  }
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

    const [overrides, catalog] = await Promise.all([loadOverrides(databases, error), loadCatalog(databases)]);

    const vehicleOverride = typeof body.vehicleType === 'string' && body.vehicleType ? body.vehicleType : null;
    const input = move
      ? quoteInputFromRow(move, catalog, vehicleOverride)
      : quoteInputFromRow(rowFromBody(body), catalog, null);

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
        quoteColumns(breakdown, new Date().toISOString()),
      );
    }

    log(
      `calculateprice[v3] ${breakdown.tier}/${breakdown.mode} ${breakdown.profile.loadedVolumeM3} m³ ` +
        `${breakdown.profile.distanceKm} km crew ${breakdown.profile.crew} ${breakdown.profile.vehicleType} ` +
        `→ €${breakdown.total}${moveId ? ` (persisted on ${moveId})` : ' (preview)'}`,
    );

    return res.json({ success: true, estimatedPrice: breakdown.total, breakdown });
  } catch (err) {
    error(`Calculate price failed: ${err.message}`);
    return res.json({ error: 'Something went wrong. Please try again.', fnCode: 'generic.unexpected' }, 500);
  }
};
