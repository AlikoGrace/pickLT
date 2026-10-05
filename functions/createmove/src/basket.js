/**
 * The basket on the server (inventory parity plan, "Basket wire format").
 *
 * Shared helper: byte-identical in every function that reads a basket from a
 * request body (`calculateprice`, `createmove`, `savedraftmove`);
 * `scripts/check-function-mirrors.sh` lists it. The web's
 * `src/lib/basket-server.ts` is the identical port, and both are pinned by the
 * shared fixture `basket-wire.json`.
 *
 *   basketFromWire  body/row encodings → `{ counts, customItems }`, legacy
 *                   custom items normalised (free-text size → band, "45 kg" →
 *                   45, missing size → medium, missing/invalid weight →
 *                   `DEFAULT_CUSTOM_ITEM_WEIGHT_KG` = 20 kg, missing quantity →
 *                   1), zero counts stripped — see the row readers in
 *                   `pricing-engine.js`, which this wraps;
 *   serializeBasket `{ counts, customItems }` → the `moves` column shapes;
 *   basketCapViolation  the first count above `MAX_ITEM_QTY` (99) or, for a
 *                   catalog item in category `special`, `MAX_SPECIAL_ITEM_QTY`
 *                   (10); callers reject it with fnCode `inventory.quantityTooHigh`;
 *   classifyBasket  server totals + tier: `totalItemCount` (catalog + custom
 *                   QUANTITIES), `totalWeightKg`, `totalVolumeCm3`, the
 *                   classified `systemMoveType` and the enforced
 *                   `moveType = max(client tier, classified)` (crew master D5).
 *                   Client-sent totals are never read.
 */

import {
  classifyMove,
  enforcedTier,
  isServiceTier,
  parseCustomItems,
  parseInventory,
  thresholdsFromConfig,
} from './pricing-engine.js';

/** Most units of one ordinary catalog item, or of one custom item, per move. */
export const MAX_ITEM_QTY = 99;
/** Most units of one catalog item in category `special` (piano, safe…) per move. */
export const MAX_SPECIAL_ITEM_QTY = 10;
export const SPECIAL_CATEGORY = 'special';
/** The fnCode a basket over the caps is rejected with (HTTP 400). */
export const QUANTITY_TOO_HIGH = 'inventory.quantityTooHigh';
/** `moves.extraHelpers` schema bound; the engine clamps further to `crew.maxExtraHelpers`. */
export const EXTRA_HELPERS_SCHEMA_MAX = 10;

/** Any basket encoding (JSON strings, objects, legacy rows) → the normalised basket. */
export function basketFromWire(inventoryItems, customItems) {
  return { counts: parseInventory(inventoryItems), customItems: parseCustomItems(customItems) };
}

/** A normalised basket → `{ inventoryItems: JSON string, customItems: JSON string[] }`. */
export function serializeBasket(basket) {
  const counts = {};
  for (const [itemId, qty] of Object.entries(basket?.counts ?? {})) {
    if (typeof qty === 'number' && Number.isFinite(qty) && qty >= 1) counts[itemId] = Math.floor(qty);
  }
  return {
    inventoryItems: JSON.stringify(counts),
    customItems: (basket?.customItems ?? [])
      .filter((c) => c && typeof c.quantity === 'number' && c.quantity >= 1)
      .map((c) =>
        JSON.stringify({
          id: c.id,
          name: c.name,
          quantity: Math.floor(c.quantity),
          approxSize: c.approxSize,
          approxWeight: c.approxWeight,
        }),
      ),
  };
}

/** The quantity cap for one catalog item (`MAX_SPECIAL_ITEM_QTY` for category `special`). */
export function maxQtyFor(def) {
  return def && def.category === SPECIAL_CATEGORY ? MAX_SPECIAL_ITEM_QTY : MAX_ITEM_QTY;
}

/**
 * The first line over its cap, as `{ itemId, quantity, max }`, or null. An item
 * missing from the catalog gets the ordinary cap. Custom items report their id.
 */
export function basketCapViolation(basket, catalog) {
  const byId = new Map((catalog ?? []).map((i) => [i.itemId, i]));
  for (const [itemId, qty] of Object.entries(basket?.counts ?? {})) {
    const max = maxQtyFor(byId.get(itemId));
    if (qty > max) return { itemId, quantity: qty, max };
  }
  for (const ci of basket?.customItems ?? []) {
    if (ci.quantity > MAX_ITEM_QTY) return { itemId: ci.id, quantity: ci.quantity, max: MAX_ITEM_QTY };
  }
  return null;
}

/** The 400 body for a cap violation (function `res.json` shape). */
export function quantityTooHighBody(violation) {
  return {
    error: `Too many of one item (at most ${violation.max})`,
    fnCode: QUANTITY_TOO_HIGH,
    fnParams: { itemId: violation.itemId, max: violation.max },
  };
}

/** A requested extra-helper count as a whole number in 0…`EXTRA_HELPERS_SCHEMA_MAX`. */
export function extraHelpersFromWire(raw) {
  const n = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(EXTRA_HELPERS_SCHEMA_MAX, Math.floor(n));
}

/**
 * Server totals and tier for a normalised basket. `config` is the pricing
 * override map (the `classify.*` thresholds and `volume.packingFactor` come
 * from it); `clientTier` is what the client chose (anything that is not a tier
 * reads as `fallbackTier`). The three totals are the classifier's, so they
 * always agree with the tier decision: weight and volume include custom items
 * (volume by size band), the item count includes custom quantities.
 */
export function classifyBasket(basket, catalog, config, clientTier, fallbackTier = 'light') {
  const c = classifyMove(basket.counts, basket.customItems, catalog ?? [], 'light', thresholdsFromConfig(config));
  const client = isServiceTier(clientTier) ? clientTier : fallbackTier;
  return {
    moveType: enforcedTier(client, c.recommendedType),
    systemMoveType: c.recommendedType,
    totalItemCount: c.totalItems,
    totalWeightKg: Math.round(c.totalWeightKg * 1000) / 1000,
    totalVolumeCm3: Math.round(c.totalVolumeM3 * 1_000_000),
  };
}
