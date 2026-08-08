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

  // ── Unified quote engine ────────────────────────────────────────────────
  // DORMANT: `pricing.model.enabled` is 0, so everything below is inert and
  // this function prices exactly as it always has. Setting it to 1 in
  // `pricing_config` switches every quote to the resource-hour / m³×km model.
  // Mirror of lib/quote-engine.ts + the pricing.* keys in lib/pricing-config.ts.
  'pricing.model.enabled': 0,
  'pricing.model.localDistanceThresholdKm': 50,
  'pricing.local.minimumHours': 2,
  'pricing.local.moverRatePerHour': 20,
  'pricing.local.vehicleRatePerHour.small_van': 20,
  'pricing.local.vehicleRatePerHour.medium_truck': 35,
  'pricing.local.vehicleRatePerHour.large_truck': 40,
  'pricing.local.kmRate.small_van': 0.6,
  'pricing.local.kmRate.medium_truck': 0.85,
  'pricing.local.kmRate.large_truck': 0.9,
  'pricing.volume.handlingHoursPerM3': 0.2,
  'pricing.volume.ratePerM3PerKm': 0.012,
  'pricing.access.floorHoursNoLift': 0.25,
  'pricing.leadTime.factor.instant': 1.25,
  'pricing.leadTime.factor.under24h': 1.15,
  'pricing.leadTime.factor.24to72h': 1.0,
  'pricing.leadTime.factor.3to7d': 0.92,
  'pricing.leadTime.factor.7dPlus': 0.85,

  // Volume derivation (mirror of lib/move-volume.ts).
  'volume.packingFactor': 1.35,
  'volume.custom.small': 0.1,
  'volume.custom.medium': 0.3,
  'volume.custom.large': 0.8,
  'volume.custom.extraLarge': 1.8,
};

const CUBIC_CM_PER_M3 = 1_000_000;

/** Mirror of lib/move-volume.ts — loaded volume, m³. */
function loadedVolumeM3(inventoryItems, customItems, catalog, overrides) {
  const byId = new Map(catalog.map((i) => [i.itemId, i]));
  let raw = 0;

  let inv = {};
  if (inventoryItems && typeof inventoryItems === 'object') inv = inventoryItems;
  else if (typeof inventoryItems === 'string') {
    try {
      const p = JSON.parse(inventoryItems);
      if (p && typeof p === 'object') inv = p;
    } catch { /* leave empty */ }
  }

  for (const [itemId, qty] of Object.entries(inv)) {
    const quantity = Number(qty);
    if (!Number.isFinite(quantity) || quantity <= 0) continue;
    const item = byId.get(itemId);
    if (!item) continue;
    const w = Number(item.widthCm), h = Number(item.heightCm), d = Number(item.depthCm);
    if (!Number.isFinite(w) || !Number.isFinite(h) || !Number.isFinite(d)) continue;
    if (w <= 0 || h <= 0 || d <= 0) continue;
    raw += ((w * h * d) / CUBIC_CM_PER_M3) * quantity;
  }

  for (const entry of Array.isArray(customItems) ? customItems : []) {
    let ci = entry;
    if (typeof entry === 'string') {
      try { ci = JSON.parse(entry); } catch { continue; }
    }
    if (!ci || typeof ci !== 'object') continue;
    const quantity = Number(ci.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) continue;
    const key = ci.approxSize === 'extra_large' ? 'extraLarge' : ci.approxSize;
    const per = rateFrom(overrides, `volume.custom.${key}`) ?? rateFrom(overrides, 'volume.custom.medium');
    raw += per * quantity;
  }

  return Math.round(raw * rateFrom(overrides, 'volume.packingFactor') * 1000) / 1000;
}

/** Mirror of lib/quote-engine.ts `leadTimeFactor`. */
function leadTimeFactor(leadTimeHours, overrides) {
  if (leadTimeHours === null || leadTimeHours === undefined || !Number.isFinite(leadTimeHours)) {
    return rateFrom(overrides, 'pricing.leadTime.factor.instant');
  }
  if (leadTimeHours < 3) return rateFrom(overrides, 'pricing.leadTime.factor.instant');
  if (leadTimeHours < 24) return rateFrom(overrides, 'pricing.leadTime.factor.under24h');
  if (leadTimeHours < 72) return rateFrom(overrides, 'pricing.leadTime.factor.24to72h');
  if (leadTimeHours < 168) return rateFrom(overrides, 'pricing.leadTime.factor.3to7d');
  return rateFrom(overrides, 'pricing.leadTime.factor.7dPlus');
}

/** Mirror of lib/quote-engine.ts `quoteMove`. */
function quoteMove(input, overrides) {
  const volumeM3 = Number.isFinite(input.volumeM3) ? Math.max(0, input.volumeM3) : 0;
  const distanceKm = Number.isFinite(input.distanceKm) ? Math.max(0, input.distanceKm) : 0;
  const crewSize = Math.max(1, Number(input.crewSize) || 1);
  const floorsNoLift = Math.max(0, Number(input.floorsNoLift) || 0);
  const storageWeeks = Math.max(0, Number(input.storageWeeks) || 0);
  const packing = input.packingServiceLevel || 'none';
  const vt = input.vehicleType;

  const isLocal = distanceKm <= rateFrom(overrides, 'pricing.model.localDistanceThresholdKm');

  const vehicleRate =
    rateFrom(overrides, `pricing.local.vehicleRatePerHour.${vt}`) ||
    rateFrom(overrides, 'pricing.local.vehicleRatePerHour.small_van');
  const hourlyRate = vehicleRate + crewSize * rateFrom(overrides, 'pricing.local.moverRatePerHour');

  const handling = (volumeM3 * rateFrom(overrides, 'pricing.volume.handlingHoursPerM3')) / crewSize;
  const accessHours = floorsNoLift * rateFrom(overrides, 'pricing.access.floorHoursNoLift');

  let billableHours;
  let distanceCost;
  if (isLocal) {
    billableHours = Math.max(rateFrom(overrides, 'pricing.local.minimumHours'), handling + accessHours);
    const kmRate =
      rateFrom(overrides, `pricing.local.kmRate.${vt}`) ||
      rateFrom(overrides, 'pricing.local.kmRate.small_van');
    distanceCost = distanceKm * kmRate;
  } else {
    billableHours = handling + accessHours;
    distanceCost = volumeM3 * rateFrom(overrides, 'pricing.volume.ratePerM3PerKm') * distanceKm;
  }

  const labourCost = billableHours * hourlyRate;
  const packingSurcharge = rateFrom(overrides, `instant.packing.${packing}`) ?? 0;
  const storageSurcharge = storageWeeks * rateFrom(overrides, 'instant.storagePerWeek');
  const subtotal = labourCost + distanceCost + packingSurcharge + storageSurcharge;

  const factor = leadTimeFactor(input.leadTimeHours, overrides);
  const total = Math.max(rateFrom(overrides, 'instant.minimumPrice'), subtotal * factor);

  const r2 = (n) => Math.round(n * 100) / 100;
  return {
    model: isLocal ? 'local' : 'long_distance',
    volumeM3: r2(volumeM3),
    distanceKm: r2(distanceKm),
    billableHours: r2(billableHours),
    hourlyRate: r2(hourlyRate),
    labourCost: r2(labourCost),
    distanceCost: r2(distanceCost),
    accessSurcharge: r2(accessHours * hourlyRate),
    packingSurcharge,
    storageSurcharge,
    subtotal: r2(subtotal),
    leadTimeFactor: factor,
    leadTimeAdjustment: r2(subtotal * factor - subtotal),
    estimatedPrice: r2(total),
  };
}

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

    // ── Unified quote engine (dormant unless an admin enables it) ──────────
    //
    // One engine quotes both products from the same inputs, with lead time as
    // the multiplier that makes scheduled cheaper than instant at every
    // distance and volume. Until `pricing.model.enabled` is 1 this branch is
    // never taken and the legacy formula below runs unchanged.
    if (rateFrom(overrides, 'pricing.model.enabled') === 1) {
      const pickupFloor = parseInt(pickupFloorLevel || '0', 10) || 0;
      const dropoffFloor = parseInt(dropoffFloorLevel || '0', 10) || 0;
      const floorsNoLift =
        (pickupElevator ? 0 : Math.max(0, pickupFloor)) +
        (dropoffElevator ? 0 : Math.max(0, dropoffFloor));

      // Volume: derived server-side from the move's own inventory when we have
      // a moveId (authoritative — a client-supplied classification is not
      // trustworthy for pricing, audit N7), otherwise taken from the body so
      // the pre-persist preview can still be quoted.
      let volumeM3 = Number(body.volumeM3) || 0;
      let vehicleType = body.vehicleType || null;
      let leadTimeHours = body.leadTimeHours === undefined ? null : body.leadTimeHours;

      if (moveId && INVENTORY_CATALOG_COLLECTION) {
        try {
          const [moveDoc, catalogRes] = await Promise.all([
            databases.getDocument(DATABASE_ID, MOVES_COLLECTION, moveId),
            databases.listDocuments(DATABASE_ID, INVENTORY_CATALOG_COLLECTION, [Query.limit(200)]),
          ]);
          volumeM3 = loadedVolumeM3(
            moveDoc.inventoryItems,
            moveDoc.customItems,
            catalogRes.documents,
            overrides,
          );
          if (!vehicleType) vehicleType = moveDoc.vehicleType || null;
          if (leadTimeHours === null && moveDoc.moveDate) {
            const start = new Date(moveDoc.moveDate).getTime();
            if (Number.isFinite(start)) {
              leadTimeHours = Math.max(0, (start - Date.now()) / 3_600_000);
            }
          }
        } catch (e) {
          error(`calculateprice: could not derive volume for ${moveId}: ${e.message}`);
        }
      }

      const quote = quoteMove(
        {
          volumeM3,
          distanceKm,
          vehicleType: vehicleType || 'small_van',
          crewSize: Number(crewSize) || 1,
          leadTimeHours,
          floorsNoLift,
          packingServiceLevel,
          storageWeeks,
        },
        overrides,
      );

      // Persist under the same ownership rule as the legacy path — this branch
      // returns early, so without it enabling the model would silently stop
      // quotes being written to moves.
      if (moveId) {
        const callerId = req.headers['x-appwrite-user-id'];
        if (!callerId) {
          return res.json({ error: 'Authentication required to persist a quote' }, 401);
        }
        let owner;
        try {
          owner = await databases.getDocument(DATABASE_ID, MOVES_COLLECTION, moveId);
        } catch {
          return res.json({ error: 'Move not found' }, 404);
        }
        const clientId =
          typeof owner.clientId === 'string' ? owner.clientId : owner.clientId?.$id ?? null;
        if (clientId !== callerId) {
          return res.json({ error: 'Move not found' }, 404);
        }
        await databases.updateDocument(DATABASE_ID, MOVES_COLLECTION, moveId, {
          estimatedPrice: quote.estimatedPrice,
          routeDistanceMeters: routeDistanceMeters || null,
          routeDurationSeconds: routeDurationSeconds || null,
        });
      }

      log(
        `calculateprice[v2] ${quote.model} ${quote.volumeM3} m³ / ${quote.distanceKm} km ` +
        `→ €${quote.estimatedPrice} (lead ×${quote.leadTimeFactor})`
      );

      return res.json({
        success: true,
        pricingModel: 'v2',
        estimatedPrice: quote.estimatedPrice,
        breakdown: quote,
      });
    }

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

    // If moveId is provided, persist the quote onto that move — but only for
    // the move's own client. This runs with a full API key, so without an
    // ownership check any caller could iterate move ids and rewrite other
    // people's quotes (e.g. to the minimum price by passing distance 0).
    if (moveId) {
      const callerId = req.headers['x-appwrite-user-id'];
      if (!callerId) {
        return res.json({ error: 'Authentication required to persist a quote' }, 401);
      }

      let move;
      try {
        move = await databases.getDocument(DATABASE_ID, MOVES_COLLECTION, moveId);
      } catch {
        return res.json({ error: 'Move not found' }, 404);
      }

      // Relationship attributes arrive as either a bare id or a hydrated doc.
      const clientId =
        typeof move.clientId === 'string' ? move.clientId : move.clientId?.$id ?? null;
      if (clientId !== callerId) {
        return res.json({ error: 'Move not found' }, 404);
      }

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
