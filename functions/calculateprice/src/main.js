import { Client, Databases, Query } from 'node-appwrite';

const DATABASE_ID = process.env.APPWRITE_DATABASE_ID;
const MOVES_COLLECTION = process.env.APPWRITE_COLLECTION_MOVES;
const INVENTORY_CATALOG_COLLECTION = process.env.APPWRITE_COLLECTION_INVENTORY_CATALOG;

const PRICING_CONFIG_COLLECTION = process.env.APPWRITE_COLLECTION_PRICING_CONFIG || 'pricing_config';

// Compiled defaults. Rates are admin-editable via the `pricing_config`
// collection, but a config that fails to load must never yield a €0 quote — so
// the DB is an override layer over these, never a replacement. Keys mirror
// pickltmobile/lib/pricing-config.ts.
const DEFAULTS = {
  'instant.baseRatePerKm': 1.50,
  'instant.multiplier.light': 1.0,
  'instant.multiplier.regular': 1.3,
  'instant.multiplier.premium': 1.8,
  'instant.floorSurchargeNoElevator': 15,
  'instant.packing.none': 0,
  'instant.packing.partial': 50,
  'instant.packing.full': 120,
  'instant.packing.unpacking': 180,
  'instant.crew.1': 0,
  'instant.crew.2': 30,
  'instant.crew.3': 60,
  'instant.crew.4plus': 100,
  'instant.storagePerWeek': 25,
  'instant.minimumPrice': 49,
};

/** Rate lookup: finite DB override when present, else the compiled default. */
function rateFrom(overrides, key) {
  const v = overrides[key];
  return typeof v === 'number' && Number.isFinite(v) ? v : DEFAULTS[key];
}

/**
 * Read admin rate overrides. Never throws and never blocks a quote: on any
 * failure the caller proceeds on DEFAULTS, pricing exactly as before.
 */
async function loadOverrides(databases, error) {
  try {
    const res = await databases.listDocuments(DATABASE_ID, PRICING_CONFIG_COLLECTION, [
      Query.limit(200),
    ]);
    const out = {};
    for (const row of res.documents) {
      if (typeof row.key !== 'string' || !(row.key in DEFAULTS)) continue;
      const v = typeof row.value === 'number' ? row.value : Number(row.value);
      if (Number.isFinite(v)) out[row.key] = v;
    }
    return out;
  } catch (e) {
    error(`[calculateprice] pricing config unavailable, using defaults: ${e.message}`);
    return {};
  }
}

export default async ({ req, res, log, error }) => {
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
    return res.json({ error: 'Method not allowed' }, 405);
  }

  try {
    // Appwrite Node 22 functions runtime auto-parses JSON bodies when
    // content-type is application/json, so req.body is already an object.
    // Older runtimes deliver it as a raw string. Handle both.
    let body;
    try {
      body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    } catch {
      return res.json({ error: 'Invalid JSON body' }, 400);
    }
    const { moveId, routeDistanceMeters, routeDurationSeconds, moveType, packingServiceLevel, crewSize, pickupFloorLevel, pickupElevator, dropoffFloorLevel, dropoffElevator, storageWeeks } = body;

    const overrides = await loadOverrides(databases, error);

    const distanceKm = (routeDistanceMeters || 0) / 1000;

    // Base price from distance
    let basePrice = distanceKm * rateFrom(overrides, 'instant.baseRatePerKm');

    // Move type multiplier
    const effectiveType = moveType || 'light';
    const multiplier = rateFrom(overrides, `instant.multiplier.${effectiveType}`) ?? 1.0;
    basePrice *= multiplier;

    // Floor surcharges (no elevator)
    let floorSurcharge = 0;
    const pickupFloor = parseInt(pickupFloorLevel || '0', 10);
    const dropoffFloor = parseInt(dropoffFloorLevel || '0', 10);
    const floorRate = rateFrom(overrides, 'instant.floorSurchargeNoElevator');
    if (!pickupElevator && pickupFloor > 0) {
      floorSurcharge += pickupFloor * floorRate;
    }
    if (!dropoffElevator && dropoffFloor > 0) {
      floorSurcharge += dropoffFloor * floorRate;
    }

    // Packing surcharge
    const packingSurcharge = rateFrom(overrides, `instant.packing.${packingServiceLevel}`) ?? 0;

    // Crew surcharge
    const crewSurcharge = rateFrom(overrides, `instant.crew.${crewSize}`) ?? 0;

    // Storage surcharge
    const storageSurcharge = (storageWeeks || 0) * rateFrom(overrides, 'instant.storagePerWeek');

    // Total
    let estimatedPrice = basePrice + floorSurcharge + packingSurcharge + crewSurcharge + storageSurcharge;
    estimatedPrice = Math.max(estimatedPrice, rateFrom(overrides, 'instant.minimumPrice'));
    estimatedPrice = Math.round(estimatedPrice * 100) / 100;

    const breakdown = {
      basePrice: Math.round(basePrice * 100) / 100,
      distanceKm: Math.round(distanceKm * 100) / 100,
      moveTypeMultiplier: multiplier,
      floorSurcharge,
      packingSurcharge,
      crewSurcharge,
      storageSurcharge,
      estimatedPrice,
    };

    // If moveId is provided, update the move document
    if (moveId) {
      await databases.updateDocument(DATABASE_ID, MOVES_COLLECTION, moveId, {
        estimatedPrice,
        routeDistanceMeters: routeDistanceMeters || null,
        routeDurationSeconds: routeDurationSeconds || null,
      });
    }

    log(`Price calculated: €${estimatedPrice} for ${distanceKm}km ${effectiveType} move`);

    return res.json({ success: true, breakdown });
  } catch (err) {
    error(`Calculate price failed: ${err.message}`);
    return res.json({ error: err.message }, 500);
  }
};
