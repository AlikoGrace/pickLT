import { Client, Databases, ID, Query } from 'node-appwrite';

const DATABASE_ID = process.env.APPWRITE_DATABASE_ID;
const MOVES_COLLECTION = process.env.APPWRITE_COLLECTION_MOVES;
const MOVER_PROFILES_COLLECTION = process.env.APPWRITE_COLLECTION_MOVER_PROFILES;
const MOVE_REQUESTS_COLLECTION = process.env.APPWRITE_COLLECTION_MOVE_REQUESTS;
const INVENTORY_CATALOG_COLLECTION = process.env.APPWRITE_COLLECTION_INVENTORY_CATALOG;

const MAX_MOVERS = 10;
const REQUEST_TIMEOUT_SECONDS = 60;

// ─── Load volume + vehicle capacity ─────────────────────────────────────────
//
// Mirror of `lib/move-volume.ts` in the client app (functions cannot import app
// code). Keep the two in step — these are the same compiled defaults
// `PRICING_DEFAULTS` carries.
//
// Volume is recomputed here from the catalog rather than read off
// `moves.totalVolumeCm3`: that column is written by createmove but is null on
// real production rows, and a client-supplied classification is not something
// to trust for a gating decision (audit N7).
const CUBIC_CM_PER_M3 = 1_000_000;
const PACKING_FACTOR = 1.35;
const CUSTOM_SIZE_M3 = { small: 0.1, medium: 0.3, large: 0.8, extra_large: 1.8 };
const CAPACITY_M3 = { small_van: 10, medium_truck: 25, large_truck: 45 };

// A declared capacity outside these bounds is treated as a typo — otherwise
// "2000" in the capacity box makes a small van eligible for every job.
const MIN_DECLARED_CAPACITY_M3 = 1;
const MAX_DECLARED_CAPACITY_M3 = 120;

/** A mover's own declared m³, or null when absent or implausible. */
function declaredCapacityM3(vehicleCapacity) {
  if (vehicleCapacity === null || vehicleCapacity === undefined) return null;
  const n = typeof vehicleCapacity === 'number' ? vehicleCapacity : parseFloat(String(vehicleCapacity));
  if (!Number.isFinite(n)) return null;
  if (n < MIN_DECLARED_CAPACITY_M3 || n > MAX_DECLARED_CAPACITY_M3) return null;
  return n;
}

/**
 * What a specific mover can carry, m³.
 *
 * Declared figure wins over the class band — production has a `large_truck`
 * declaring 65 m³ against a 45 m³ band, and the band would wrongly exclude it
 * from the large jobs it exists for. Unknown class → smallest, so a mover with
 * neither a declared figure nor a recognised class fails closed.
 */
function capacityM3(mover) {
  const declared = declaredCapacityM3(mover.vehicleCapacity);
  if (declared !== null) return declared;
  return CAPACITY_M3[mover.vehicleType] ?? CAPACITY_M3.small_van;
}

/** `moves.inventoryItems` is a JSON object string of itemId → quantity. */
function parseInventory(raw) {
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

/** `moves.customItems` is an array of JSON strings. */
function parseCustomItems(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const entry of raw) {
    if (entry && typeof entry === 'object') {
      out.push(entry);
      continue;
    }
    try {
      const parsed = JSON.parse(entry);
      if (parsed && typeof parsed === 'object') out.push(parsed);
    } catch {
      // Unparseable row — skip it rather than fail the whole broadcast.
    }
  }
  return out;
}

/**
 * Volume a vehicle must hold, m³.
 *
 * Bounding-box sums understate real loaded space (irregular shapes, stacking
 * gaps), so the packing factor is applied before any capacity comparison.
 * Returns 0 when nothing can be measured, which callers treat as "fits
 * anything" — an estimate must never be able to make a move unbookable.
 */
function loadedVolumeM3(move, catalog) {
  const byId = new Map(catalog.map((i) => [i.itemId, i]));

  let raw = 0;
  for (const [itemId, qty] of Object.entries(parseInventory(move.inventoryItems))) {
    const quantity = Number(qty);
    if (!Number.isFinite(quantity) || quantity <= 0) continue;
    const item = byId.get(itemId);
    if (!item) continue;
    const w = Number(item.widthCm);
    const h = Number(item.heightCm);
    const d = Number(item.depthCm);
    if (!Number.isFinite(w) || !Number.isFinite(h) || !Number.isFinite(d)) continue;
    if (w <= 0 || h <= 0 || d <= 0) continue;
    raw += ((w * h * d) / CUBIC_CM_PER_M3) * quantity;
  }

  for (const ci of parseCustomItems(move.customItems)) {
    const quantity = Number(ci.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) continue;
    // Unknown band → medium, never zero, so it cannot shrink the load.
    raw += (CUSTOM_SIZE_M3[ci.approxSize] ?? CUSTOM_SIZE_M3.medium) * quantity;
  }

  return Math.round(raw * PACKING_FACTOR * 1000) / 1000;
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
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(req.headers['x-appwrite-key'] ?? '');
  const databases = new Databases(client);

  if (req.method !== 'POST') {
    return res.json({ error: 'Method not allowed' }, 405);
  }

  try {
    let body;
    try {
      body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    } catch {
      return res.json({ error: 'Invalid JSON body' }, 400);
    }
    const { moveId } = body;

    if (!moveId) {
      return res.json({ error: 'moveId is required' }, 400);
    }

    // Get move details
    const move = await databases.getDocument(DATABASE_ID, MOVES_COLLECTION, moveId);

    if (!move.pickupLatitude || !move.pickupLongitude) {
      return res.json({ error: 'Move has no pickup coordinates' }, 400);
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

    // Calculate distances and sort by proximity
    const inRange = movers.documents
      .filter(m => m.currentLatitude && m.currentLongitude)
      .map(m => ({
        ...m,
        distanceKm: haversineKm(
          move.pickupLatitude, move.pickupLongitude,
          m.currentLatitude, m.currentLongitude
        ),
      }))
      .filter(m => m.distanceKm <= 15)
      .sort((a, b) => a.distanceKm - b.distanceKm);

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
          Query.limit(200),
        ]);
        catalog = res.documents;
      } catch (e) {
        error(`broadcast: catalog unavailable, capacity gate disabled: ${e.message}`);
      }
    }

    const loadM3 = catalog.length > 0 ? loadedVolumeM3(move, catalog) : 0;

    let candidates = inRange;
    let capacityGated = false;
    if (loadM3 > 0) {
      const fitting = inRange.filter(m => capacityM3(m) >= loadM3);
      if (fitting.length > 0) {
        candidates = fitting;
        capacityGated = true;
      } else if (inRange.length > 0) {
        // Nobody nearby can carry it. Send to the biggest vehicles anyway so a
        // human can judge — a wrong estimate must not silently kill the move.
        candidates = [...inRange].sort(
          (a, b) => capacityM3(b) - capacityM3(a)
        );
        error(
          `broadcast: no mover within range fits ${loadM3} m³ for move ${moveId}; ` +
          `falling back to the ${Math.min(candidates.length, MAX_MOVERS)} largest vehicles`
        );
      }
    }

    const nearbyMovers = candidates.slice(0, MAX_MOVERS);

    if (nearbyMovers.length === 0) {
      log(`No nearby movers found for move ${moveId}`);
      return res.json({ success: true, requestsSent: 0, message: 'No nearby movers available' });
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + REQUEST_TIMEOUT_SECONDS * 1000).toISOString();

    // Create move requests for each nearby mover
    const requests = [];
    for (const mover of nearbyMovers) {
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
        }
      );
      requests.push(request);
    }

    log(
      `Broadcast ${requests.length} move requests for move ${moveId} ` +
      `(load ${loadM3} m³, capacity gate ${capacityGated ? 'applied' : 'not applied'})`
    );

    return res.json({
      success: true,
      requestsSent: requests.length,
      loadVolumeM3: loadM3,
      capacityGated,
      moversNotified: nearbyMovers.map(m => ({ id: m.$id, distanceKm: Math.round(m.distanceKm * 10) / 10 })),
    });
  } catch (err) {
    error(`Broadcast move request failed: ${err.message}`);
    return res.json({ error: err.message }, 500);
  }
};
