/**
 * MIRROR of lib/pricing-engine.ts — edit the TS, then regenerate this file;
 * `pricing-mirror-parity.test.ts` fails on drift.
 *
 * One file, no imports: it folds in `lib/pricing-config.ts` (the registry
 * defaults + `rate`/`toPricingConfig`), the volume maths of
 * `lib/move-volume.ts`, and the v3 engine of `lib/pricing-engine.ts`. Cloud
 * functions are deployed as isolated bundles and cannot import `lib/`, so every
 * function that prices (`calculateprice`, `savedraftmove`, `createmove`) and the
 * crew gate in `broadcastmoverequest` carries a byte-identical copy of this
 * file beside its `main.js` (`scripts/check-function-mirrors.sh` keeps the
 * copies in step across repos).
 *
 * The exported names are the TS engine's names, so a reader can diff the two
 * side by side. Normative arithmetic: `.agent/plans/pricing/0.master.md` §6.3.
 * MONEY IS INTEGER CENTS inside `quoteMove` (master D4).
 */

// ── Registry (mirror of lib/pricing-config.ts) ─────────────────────────────

export const PRICING_DEFAULTS = {
  'tier.light.basePrice': 35,
  'tier.light.distanceRatePerKm': 1.1,
  'tier.light.crew': 1,
  'tier.light.laborRatePerHour': 22,
  'tier.light.minimumHours': 2,
  'tier.light.packingAllowance': 0,
  'tier.light.handlingAllowance': 0,
  'tier.light.instantMultiplier': 1.2,
  'tier.light.minVehicleRank': 0,

  'tier.regular.basePrice': 55,
  'tier.regular.distanceRatePerKm': 1.35,
  'tier.regular.crew': 2,
  'tier.regular.laborRatePerHour': 24,
  'tier.regular.minimumHours': 2,
  'tier.regular.packingAllowance': 30,
  'tier.regular.handlingAllowance': 20,
  'tier.regular.instantMultiplier': 1.15,
  'tier.regular.minVehicleRank': 1,

  'tier.premium.basePrice': 85,
  'tier.premium.distanceRatePerKm': 1.7,
  'tier.premium.crew': 3,
  'tier.premium.laborRatePerHour': 28,
  'tier.premium.minimumHours': 2,
  'tier.premium.packingAllowance': 65,
  'tier.premium.handlingAllowance': 40,
  'tier.premium.instantMultiplier': 1.1,
  'tier.premium.minVehicleRank': 2,

  'vehicle.charge.small_van': 15,
  'vehicle.charge.medium_truck': 25,
  'vehicle.charge.large_truck': 45,
  'capacityM3.small_van': 10,
  'capacityM3.medium_truck': 25,
  'capacityM3.large_truck': 45,

  'volume.packingFactor': 1.35,
  'volume.custom.small': 0.1,
  'volume.custom.medium': 0.3,
  'volume.custom.large': 0.8,
  'volume.custom.extraLarge': 1.8,

  'items.custom.small': 3,
  'items.custom.medium': 6,
  'items.custom.large': 12,
  'items.custom.extraLarge': 25,
  'items.suggest.perKg': 0.15,
  'items.suggest.perM3': 10,

  'crew.m3PerMover': 15,
  'crew.max': 4,

  'handling.hoursPerM3': 0.2,
  'access.floorSurchargeNoElevator': 15,
  'access.haltverbotFee': 0,

  'packing.none': 0,
  'packing.partial': 50,
  'packing.full': 120,
  'packing.unpacking': 180,
  'service.furniture_disassembly': 50,
  'service.furniture_assembly': 50,
  'service.tv_mount_remove': 50,
  'service.appliance_disconnect': 50,
  'service.appliance_connect': 50,
  'service.disposal_entsorgung': 50,
  'service.moveout_cleaning': 50,
  'service.temporary_storage': 0,
  'storage.perWeek': 30,

  'platformFee.rate': 0.08,
  'platformFee.fixed': 0,
  'tax.vatRate': 0.19,
  'pricing.minimumCharge': 49,
};

export function isPricingKey(key) {
  return Object.prototype.hasOwnProperty.call(PRICING_DEFAULTS, key);
}

/** Rate lookup: DB override when present and finite, else the compiled default. */
export function rate(config, key) {
  const override = config ? config[key] : undefined;
  if (typeof override === 'number' && Number.isFinite(override)) return override;
  return PRICING_DEFAULTS[key];
}

/** Legacy name kept for the function sources; identical to `rate`. */
export function rateFrom(config, key) {
  return rate(config, key);
}

export function rateOrNull(config, key) {
  return isPricingKey(key) ? rate(config, key) : null;
}

/**
 * Raw `pricing_config` rows → override map. Unknown keys and non-finite values
 * are dropped.
 *
 * Country scoping (plan `wave-2026-10/4` C4): a row carries `country` —
 * `'GLOBAL'` (or no column at all, for rows written before the wave) for the
 * base rate, or an ISO-3166-1 alpha-2 code for an override that applies only to
 * moves departing from that country. The effective config for `countryCode` is
 * the GLOBAL layer with that country's rows laid over it; rows for other
 * countries are ignored. Without a `countryCode` only the GLOBAL layer applies.
 */
export const GLOBAL_PRICING_SCOPE = 'GLOBAL';

export function pricingRowScope(row) {
  const c = typeof row.country === 'string' ? row.country.trim().toUpperCase() : '';
  return c === '' ? GLOBAL_PRICING_SCOPE : c;
}

export function toPricingConfig(rows, countryCode) {
  const cc = typeof countryCode === 'string' && countryCode.trim() ? countryCode.trim().toUpperCase() : null;
  const base = {};
  const scoped = {};
  for (const row of rows) {
    const k = typeof row.key === 'string' ? row.key : null;
    if (!k || !isPricingKey(k)) continue;
    const v = typeof row.value === 'number' ? row.value : Number(row.value);
    if (!Number.isFinite(v)) continue;
    const scope = pricingRowScope(row);
    if (scope === GLOBAL_PRICING_SCOPE) base[k] = v;
    else if (cc && scope === cc) scoped[k] = v;
  }
  return { ...base, ...scoped };
}

// ── Volume (mirror of lib/move-volume.ts) ──────────────────────────────────

export const CUBIC_CM_PER_M3 = 1_000_000;

export function itemVolumeM3(item) {
  const w = Number(item.widthCm);
  const h = Number(item.heightCm);
  const d = Number(item.depthCm);
  if (!Number.isFinite(w) || !Number.isFinite(h) || !Number.isFinite(d)) return 0;
  if (w <= 0 || h <= 0 || d <= 0) return 0;
  return (w * h * d) / CUBIC_CM_PER_M3;
}

export function customItemVolumeM3(approxSize, pricing) {
  switch (approxSize) {
    case 'small':
      return rate(pricing, 'volume.custom.small');
    case 'medium':
      return rate(pricing, 'volume.custom.medium');
    case 'large':
      return rate(pricing, 'volume.custom.large');
    case 'extra_large':
      return rate(pricing, 'volume.custom.extraLarge');
    default:
      return rate(pricing, 'volume.custom.medium');
  }
}

/** Three decimals is ~1 litre — below any resolution the pricing model uses. */
function round3Volume(n) {
  return Math.round(n * 1000) / 1000;
}

export function computeMoveVolume(counts, customItems, catalog, pricing) {
  const byId = new Map(catalog.map((i) => [i.itemId, i]));

  let catalogVolumeM3 = 0;
  for (const [itemId, qty] of Object.entries(counts)) {
    if (!Number.isFinite(qty) || qty <= 0) continue;
    const def = byId.get(itemId);
    if (!def) continue;
    catalogVolumeM3 += itemVolumeM3(def) * qty;
  }

  let customVolumeM3 = 0;
  for (const ci of customItems) {
    if (!Number.isFinite(ci.quantity) || ci.quantity <= 0) continue;
    customVolumeM3 += customItemVolumeM3(ci.approxSize, pricing) * ci.quantity;
  }

  const rawVolumeM3 = catalogVolumeM3 + customVolumeM3;
  const packingFactor = rate(pricing, 'volume.packingFactor');

  return {
    catalogVolumeM3: round3Volume(catalogVolumeM3),
    customVolumeM3: round3Volume(customVolumeM3),
    rawVolumeM3: round3Volume(rawVolumeM3),
    loadedVolumeM3: round3Volume(rawVolumeM3 * packingFactor),
  };
}

export const MIN_DECLARED_CAPACITY_M3 = 1;
export const MAX_DECLARED_CAPACITY_M3 = 120;

export function declaredCapacityM3(vehicleCapacity) {
  if (vehicleCapacity === null || vehicleCapacity === undefined) return null;
  const n = typeof vehicleCapacity === 'number' ? vehicleCapacity : parseFloat(String(vehicleCapacity));
  if (!Number.isFinite(n)) return null;
  if (n < MIN_DECLARED_CAPACITY_M3 || n > MAX_DECLARED_CAPACITY_M3) return null;
  return n;
}

export function vehicleCapacityM3(vehicleType, pricing) {
  switch (vehicleType) {
    case 'small_van':
      return rate(pricing, 'capacityM3.small_van');
    case 'medium_truck':
      return rate(pricing, 'capacityM3.medium_truck');
    case 'large_truck':
      return rate(pricing, 'capacityM3.large_truck');
    default:
      return rate(pricing, 'capacityM3.small_van');
  }
}

export function moverCapacityM3(mover, pricing) {
  const declared = declaredCapacityM3(mover.vehicleCapacity);
  if (declared !== null) return declared;
  return vehicleCapacityM3(mover.vehicleType, pricing);
}

export function moverFitsLoad(loadedVolumeM3, mover, pricing) {
  if (!Number.isFinite(loadedVolumeM3) || loadedVolumeM3 <= 0) return true;
  return loadedVolumeM3 <= moverCapacityM3(mover, pricing);
}

export function fitsVehicle(loadedVolumeM3, vehicleType, pricing) {
  if (!Number.isFinite(loadedVolumeM3) || loadedVolumeM3 <= 0) return true;
  return loadedVolumeM3 <= vehicleCapacityM3(vehicleType, pricing);
}

// ── Row readers (function-side only; the TS engine takes parsed shapes) ────

/** `moves.inventoryItems` is a JSON object string of itemId → quantity (or already an object). */
export function parseInventory(raw) {
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

/** `moves.customItems` is an array of JSON strings (or of objects). */
export function parseCustomItems(raw) {
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
      // Unparseable row — skip it rather than fail the whole quote.
    }
  }
  return out;
}

/** Loaded volume straight off a `moves` row's raw columns. */
export function loadedVolumeM3(inventoryItems, customItems, catalog, pricing) {
  return computeMoveVolume(parseInventory(inventoryItems), parseCustomItems(customItems), catalog, pricing)
    .loadedVolumeM3;
}

// ── Vocabulary (mirror of lib/pricing-engine.ts) ───────────────────────────

export const SERVICE_TIERS = ['light', 'regular', 'premium'];
export const VEHICLE_BY_RANK = ['small_van', 'medium_truck', 'large_truck'];
export const VEHICLE_RANK = { small_van: 0, medium_truck: 1, large_truck: 2 };
export const TIER_DISPLAY_KEY = {
  light: 'booking:moveType.light.short',
  regular: 'booking:moveType.regular.short',
  premium: 'booking:moveType.premium.short',
};

export function isVehicleClass(v) {
  return v === 'small_van' || v === 'medium_truck' || v === 'large_truck';
}

export function isServiceTier(v) {
  return v === 'light' || v === 'regular' || v === 'premium';
}

export class PricingReconcileError extends Error {
  constructor(message) {
    super(message);
    this.name = 'PricingReconcileError';
  }
}

// ── Money helpers (integer cents) ──────────────────────────────────────────

function roundHalfUp(n) {
  return Math.sign(n) * Math.round(Math.abs(n)) || 0;
}

function cents(eurValue) {
  return Number.isFinite(eurValue) ? roundHalfUp(eurValue * 100) : 0;
}

function eur(c) {
  return c / 100;
}

function nonNegative(n) {
  const v = typeof n === 'number' ? n : Number(n);
  return Number.isFinite(v) && v > 0 ? v : 0;
}

function round2(n) {
  return roundHalfUp(n * 100) / 100;
}

function round3(n) {
  return roundHalfUp(n * 1000) / 1000;
}

// ── Rate reading with a trace ──────────────────────────────────────────────

class RateTrace {
  constructor(config) {
    this.config = config;
    this.used = {};
  }

  get(key) {
    const v = rate(this.config, key);
    this.used[key] = v;
    return v;
  }

  maybe(key) {
    const v = rateOrNull(this.config, key);
    if (v !== null) this.used[key] = v;
    return v;
  }
}

function tierKey(tier, field) {
  return `tier.${tier}.${field}`;
}

// ── Item profile ───────────────────────────────────────────────────────────

const CUSTOM_PRICE_KEY = {
  small: 'items.custom.small',
  medium: 'items.custom.medium',
  large: 'items.custom.large',
  extra_large: 'items.custom.extraLarge',
};

const CUSTOM_VOLUME_KEY = {
  small: 'volume.custom.small',
  medium: 'volume.custom.medium',
  large: 'volume.custom.large',
  extra_large: 'volume.custom.extraLarge',
};

function basketProfile(basket, catalog, trace) {
  const byId = new Map(catalog.map((i) => [i.itemId, i]));
  const out = {
    itemCount: 0,
    weightKg: 0,
    maxItemCrew: 1,
    itemLines: [],
    itemsCents: 0,
    unpricedItemIds: [],
    unknownItemIds: [],
  };

  const ids = Object.keys(basket.counts ?? {}).sort();
  for (const itemId of ids) {
    // Same tolerance as `computeMoveVolume`: only a finite positive NUMBER
    // counts, so items, weight, crew and volume always agree on the basket.
    const rawQty = basket.counts[itemId];
    const qty = typeof rawQty === 'number' && Number.isFinite(rawQty) && rawQty > 0 ? rawQty : 0;
    if (qty <= 0) continue;
    const def = byId.get(itemId);
    if (!def) {
      out.unknownItemIds.push(itemId);
      continue;
    }
    out.itemCount += qty;
    out.weightKg += nonNegative(def.weightKg) * qty;
    const crew = Number(def.requiredCrew);
    if (Number.isFinite(crew) && crew > out.maxItemCrew) out.maxItemCrew = Math.floor(crew);

    const unit = def.unitPriceEur;
    const unitEur = typeof unit === 'number' && Number.isFinite(unit) && unit >= 0 ? unit : null;
    if (unitEur === null) out.unpricedItemIds.push(itemId);
    const lineCents = unitEur === null ? 0 : roundHalfUp(qty * unitEur * 100);
    out.itemsCents += lineCents;
    out.itemLines.push({ key: itemId, qty, unitEur: unitEur ?? 0, amountEur: eur(lineCents) });
  }

  for (const ci of basket.customItems ?? []) {
    const qty = typeof ci.quantity === 'number' && Number.isFinite(ci.quantity) && ci.quantity > 0 ? ci.quantity : 0;
    if (qty <= 0) continue;
    out.itemCount += qty;
    out.weightKg += nonNegative(ci.approxWeight) * qty;
    const key = CUSTOM_PRICE_KEY[ci.approxSize] ?? 'items.custom.medium';
    // `computeMoveVolume` read the matching volume band; record it in the trace.
    trace.get(CUSTOM_VOLUME_KEY[ci.approxSize] ?? 'volume.custom.medium');
    const unitEur = trace.get(key);
    const lineCents = roundHalfUp(qty * unitEur * 100);
    out.itemsCents += lineCents;
    out.itemLines.push({ key: `custom:${ci.approxSize}`, qty, unitEur, amountEur: eur(lineCents) });
  }

  return out;
}

// ── Public helpers (master §6.2) ───────────────────────────────────────────

export function requiredCrewFor(basket, catalog, loadedVolumeM3Value, config) {
  const trace = new RateTrace(config);
  return requiredCrewWith(basketProfile(basket, catalog, trace), loadedVolumeM3Value, trace).crew;
}

function requiredCrewWith(profile, loadedVolumeM3Value, trace) {
  const perMover = trace.get('crew.m3PerMover');
  const max = Math.max(1, Math.floor(trace.get('crew.max')));
  const byVolume = perMover > 0 ? Math.ceil(nonNegative(loadedVolumeM3Value) / perMover) : 1;
  const raw = Math.max(1, byVolume, profile.maxItemCrew);
  return { crew: Math.min(max, raw), capped: raw > max };
}

export function vehicleClassFor(tier, loadedVolumeM3Value, config) {
  return vehicleClassWith(tier, loadedVolumeM3Value, new RateTrace(config));
}

function vehicleClassWith(tier, loadedVolumeM3Value, trace) {
  const minRank = Math.min(2, Math.max(0, Math.floor(trace.get(tierKey(tier, 'minVehicleRank')))));
  const load = nonNegative(loadedVolumeM3Value);
  for (let rank = minRank; rank < VEHICLE_BY_RANK.length; rank++) {
    const cls = VEHICLE_BY_RANK[rank];
    if (load <= trace.get(`capacityM3.${cls}`)) return { vehicleType: cls, fits: true };
  }
  return { vehicleType: 'large_truck', fits: false };
}

export function billableHoursFor(tier, loadedVolumeM3Value, crew, durationSeconds, config) {
  return billableHoursWith(tier, loadedVolumeM3Value, crew, durationSeconds, new RateTrace(config));
}

function billableHoursWith(tier, loadedVolumeM3Value, crew, durationSeconds, trace) {
  const minimum = Math.max(0, trace.get(tierKey(tier, 'minimumHours')));
  const handling = (nonNegative(loadedVolumeM3Value) * trace.get('handling.hoursPerM3')) / Math.max(1, crew);
  const transit = nonNegative(durationSeconds) / 3600;
  const quarters = Math.ceil(Math.round((handling + transit) * 4 * 1e6) / 1e6);
  return Math.max(minimum, quarters / 4);
}

export function suggestedUnitPriceEur(item, config) {
  const w = nonNegative(item.widthCm);
  const h = nonNegative(item.heightCm);
  const d = nonNegative(item.depthCm);
  const volumeM3 = (w * h * d) / 1_000_000;
  const value =
    nonNegative(item.weightKg) * rate(config, 'items.suggest.perKg') +
    volumeM3 * rate(config, 'items.suggest.perM3');
  return round2(value);
}

// ── The quote ──────────────────────────────────────────────────────────────

export function quoteMove(input, config) {
  const trace = new RateTrace(config);
  const tier = isServiceTier(input.tier) ? input.tier : 'light';
  const mode = input.mode === 'instant' ? 'instant' : 'scheduled';
  const distanceKm = nonNegative(input.distanceKm);
  const durationSeconds = nonNegative(input.durationSeconds);
  const basket = {
    counts: input.basket?.counts ?? {},
    customItems: input.basket?.customItems ?? [],
  };
  const catalog = input.catalog ?? [];

  // 1. Item profile.
  const volume = computeMoveVolume(basket.counts, basket.customItems, catalog, config);
  trace.get('volume.packingFactor');
  const profile = basketProfile(basket, catalog, trace);
  const req = requiredCrewWith(profile, volume.loadedVolumeM3, trace);
  const tierCrew = Math.max(1, Math.floor(trace.get(tierKey(tier, 'crew'))));
  const crew = Math.max(tierCrew, req.crew);

  // 2. Vehicle class: the selected mover's, else the smallest that fits.
  let vehicleType;
  let exceedsLargestVehicle = false;
  if (isVehicleClass(input.vehicleType)) {
    vehicleType = input.vehicleType;
  } else {
    const resolved = vehicleClassWith(tier, volume.loadedVolumeM3, trace);
    vehicleType = resolved.vehicleType;
    exceedsLargestVehicle = !resolved.fits;
  }

  // 3. Hours.
  const hours = billableHoursWith(tier, volume.loadedVolumeM3, crew, durationSeconds, trace);

  // 4. Component lines, in cents.
  const base = cents(trace.get(tierKey(tier, 'basePrice')));
  const distance = roundHalfUp(distanceKm * trace.get(tierKey(tier, 'distanceRatePerKm')) * 100);
  const vehicle = cents(
    trace.maybe(`vehicle.charge.${vehicleType}`) ?? trace.get('vehicle.charge.small_van'),
  );
  const labor = roundHalfUp(crew * trace.get(tierKey(tier, 'laborRatePerHour')) * hours * 100);
  const items = profile.itemsCents;

  const packingLevel = input.packingLevel ?? 'none';
  const packing =
    cents(trace.get(tierKey(tier, 'packingAllowance'))) +
    cents(trace.maybe(`packing.${packingLevel}`) ?? 0);

  const floorsNoLift = Math.floor(nonNegative(input.floorsNoLift));
  const haltverbot = Math.floor(nonNegative(input.haltverbotCount));
  const handling =
    cents(trace.get(tierKey(tier, 'handlingAllowance'))) +
    floorsNoLift * cents(trace.get('access.floorSurchargeNoElevator')) +
    haltverbot * cents(trace.get('access.haltverbotFee'));

  const serviceLines = [];
  let services = 0;
  for (const id of uniqueSorted(input.services)) {
    const unitEur = trace.maybe(`service.${id}`) ?? 0;
    const c = cents(unitEur);
    services += c;
    serviceLines.push({ key: id, amountEur: eur(c) });
  }

  const storageWeeks = Math.floor(nonNegative(input.storageWeeks));
  const storage = storageWeeks * cents(trace.get('storage.perWeek'));

  // 5. Totals.
  const operationalSubtotal =
    base + distance + vehicle + labor + items + packing + handling + services + storage;
  const modeMultiplier = mode === 'instant' ? trace.get(tierKey(tier, 'instantMultiplier')) : 1;
  const adjustedSubtotal = roundHalfUp(operationalSubtotal * modeMultiplier);
  const modeAdjustment = adjustedSubtotal - operationalSubtotal;

  const platformFee =
    roundHalfUp(adjustedSubtotal * trace.get('platformFee.rate')) + cents(trace.get('platformFee.fixed'));
  const discount = Math.min(cents(nonNegative(input.discountEur)), adjustedSubtotal + platformFee);
  const netRaw = adjustedSubtotal + platformFee - discount;
  const minimum = cents(trace.get('pricing.minimumCharge'));
  const net = Math.max(minimum, netRaw);
  const minimumApplied = net > netRaw;
  const vatRate = trace.get('tax.vatRate');
  const vat = roundHalfUp(net * vatRate);
  const total = net + vat;

  // 6. Reconcile (master D4).
  const lineSum = base + distance + vehicle + labor + items + packing + handling + services + storage;
  if (lineSum !== operationalSubtotal) throw new PricingReconcileError('lines ≠ operational subtotal');
  if (operationalSubtotal + modeAdjustment !== adjustedSubtotal) throw new PricingReconcileError('mode adjustment');
  if (Math.max(minimum, adjustedSubtotal + platformFee - discount) !== net) throw new PricingReconcileError('net');
  if (net + vat !== total) throw new PricingReconcileError('vat');
  if (![base, distance, vehicle, labor, items, packing, handling, services, storage, total].every(Number.isInteger)) {
    throw new PricingReconcileError('non-integer cents');
  }

  const countryCode =
    typeof input.countryCode === 'string' && /^[A-Za-z]{2}$/.test(input.countryCode.trim())
      ? input.countryCode.trim().toUpperCase()
      : null;

  return {
    version: 'v3',
    currency: 'EUR',
    ...(countryCode ? { countryCode } : {}),
    tier,
    mode,
    profile: {
      itemCount: profile.itemCount,
      loadedVolumeM3: volume.loadedVolumeM3,
      rawVolumeM3: volume.rawVolumeM3,
      weightKg: round3(profile.weightKg),
      requiredCrew: req.crew,
      crew,
      vehicleType,
      billableHours: hours,
      distanceKm: round3(distanceKm),
      durationHours: round3(durationSeconds / 3600),
    },
    lines: {
      base: eur(base),
      distance: eur(distance),
      vehicle: eur(vehicle),
      labor: eur(labor),
      items: eur(items),
      packing: eur(packing),
      handling: eur(handling),
      services: eur(services),
      storage: eur(storage),
    },
    operationalSubtotal: eur(operationalSubtotal),
    modeMultiplier,
    modeAdjustment: eur(modeAdjustment),
    adjustedSubtotal: eur(adjustedSubtotal),
    platformFee: eur(platformFee),
    discount: eur(discount),
    minimumApplied,
    net: eur(net),
    vatRate,
    vat: eur(vat),
    total: eur(total),
    serviceLines,
    itemLines: profile.itemLines,
    rates: sortedRecord(trace.used),
    assumptions: {
      unpricedItemIds: profile.unpricedItemIds,
      unknownItemIds: profile.unknownItemIds,
      estimated: true,
    },
    flags: { exceedsLargestVehicle, crewCapped: req.capped },
  };
}

export function quoteForMover(input, mover, config) {
  const quote = quoteMove({ ...input, vehicleType: mover.vehicleType ?? null }, config);
  // An unknown crew size (null, undefined, unparseable) is not "one mover" —
  // it passes, exactly like the capacity gate passes an unmeasured load.
  const crewSize = typeof mover.crewSize === 'number' ? mover.crewSize : NaN;
  const eligible = !Number.isFinite(crewSize) || crewSize >= quote.profile.requiredCrew;
  return { quote, eligible, reason: eligible ? 'ok' : 'crew' };
}

// ── Persistence helpers ────────────────────────────────────────────────────

/** JSON with stable key order, for `moves.priceBreakdown`. */
export function serializeBreakdown(b) {
  return JSON.stringify(sortDeep(b));
}

export function parseBreakdown(raw) {
  let value = raw;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    try {
      value = JSON.parse(trimmed);
    } catch {
      return null;
    }
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const b = value;
  if (b.version !== 'v3' || b.currency !== 'EUR') return null;
  if (!isServiceTier(b.tier) || (b.mode !== 'instant' && b.mode !== 'scheduled')) return null;
  if (!b.lines || typeof b.lines !== 'object' || !b.profile || typeof b.profile !== 'object') return null;
  if (typeof b.total !== 'number' || !Number.isFinite(b.total)) return null;
  return {
    ...b,
    serviceLines: Array.isArray(b.serviceLines) ? b.serviceLines : [],
    itemLines: Array.isArray(b.itemLines) ? b.itemLines : [],
    rates: b.rates && typeof b.rates === 'object' ? b.rates : {},
    assumptions: {
      unpricedItemIds: b.assumptions?.unpricedItemIds ?? [],
      unknownItemIds: b.assumptions?.unknownItemIds ?? [],
      estimated: true,
    },
    flags: {
      exceedsLargestVehicle: !!b.flags?.exceedsLargestVehicle,
      crewCapped: !!b.flags?.crewCapped,
    },
  };
}

// ── Move-row → QuoteInput (function-side only) ─────────────────────────────

/**
 * Floors a crew has to climb at one address. `moves.<side>FloorLevel` holds
 * the wizard slug (`ground`, `floor_1` … `floor_4`, `floor_5plus`) on rows the
 * apps wrote, and free text (`"3"`) on older / web rows; both are read. An
 * address with a lift costs nothing. `floor_5plus` is charged as five.
 */
export function floorCount(level) {
  if (level === null || level === undefined) return 0;
  const s = String(level).trim().toLowerCase();
  if (!s || s === 'ground') return 0;
  const slug = /^floor_(\d+)(plus)?$/.exec(s);
  const n = slug ? parseInt(slug[1], 10) : parseInt(s, 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function floorsWithoutLift(level, elevator) {
  return elevator ? 0 : floorCount(level);
}

/**
 * Builds the engine input from a `moves` row (or a merged row + patch). Every
 * function that prices goes through this one reader so `savedraftmove`,
 * `createmove` and `calculateprice` cannot disagree about which column means
 * what. `vehicleType` is the charged class only when it is a known class —
 * free text on the schema, so anything else leaves the engine to pick.
 */
export function quoteInputFromRow(row, catalog, vehicleTypeOverride) {
  const floorsNoLift =
    floorsWithoutLift(row.pickupFloorLevel, row.pickupElevator) +
    floorsWithoutLift(row.dropoffFloorLevel, row.dropoffElevator);
  const haltverbotCount = (row.pickupHaltverbot ? 1 : 0) + (row.dropoffHaltverbot ? 1 : 0);
  const services = Array.isArray(row.additionalServices)
    ? row.additionalServices.filter((s) => typeof s === 'string')
    : [];
  const vehicleCandidate = vehicleTypeOverride ?? row.vehicleType ?? null;
  return {
    tier: isServiceTier(row.moveType) ? row.moveType : 'light',
    mode: row.moveCategory === 'instant' ? 'instant' : 'scheduled',
    distanceKm: nonNegative(row.routeDistanceMeters) / 1000,
    durationSeconds: nonNegative(row.routeDurationSeconds),
    basket: { counts: parseInventory(row.inventoryItems), customItems: parseCustomItems(row.customItems) },
    catalog,
    vehicleType: isVehicleClass(vehicleCandidate) ? vehicleCandidate : null,
    floorsNoLift,
    haltverbotCount,
    packingLevel: typeof row.packingServiceLevel === 'string' ? row.packingServiceLevel : 'none',
    services,
    storageWeeks: nonNegative(row.storageWeeks),
    discountEur: 0,
    // Pickup country (plan wave-2026-10/4 C2) — resolved by the function before
    // quoting and stored on the row; the engine only echoes it on the breakdown.
    countryCode: typeof row.countryCode === 'string' ? row.countryCode : null,
  };
}

/**
 * The five quote columns + the charged class/crew, as written to `moves`; plus
 * the pickup `countryCode` the quote was priced for when the breakdown names one.
 */
export function quoteColumns(breakdown, pricedAtIso) {
  return {
    estimatedPrice: breakdown.total,
    priceBreakdown: serializeBreakdown(breakdown),
    pricingVersion: 'v3',
    pricedAt: pricedAtIso,
    currency: 'EUR',
    vehicleType: breakdown.profile.vehicleType,
    crewSize: String(breakdown.profile.crew),
    ...(typeof breakdown.countryCode === 'string' && breakdown.countryCode
      ? { countryCode: breakdown.countryCode }
      : {}),
  };
}

// ── Small utilities ────────────────────────────────────────────────────────

function uniqueSorted(ids) {
  const out = new Set();
  for (const id of ids ?? []) if (typeof id === 'string' && id.trim()) out.add(id.trim());
  return [...out].sort();
}

function sortedRecord(r) {
  const out = {};
  for (const k of Object.keys(r).sort()) out[k] = r[k];
  return out;
}

function sortDeep(v) {
  if (Array.isArray(v)) return v.map(sortDeep);
  if (v && typeof v === 'object') {
    const out = {};
    for (const k of Object.keys(v).sort()) {
      out[k] = sortDeep(v[k]);
    }
    return out;
  }
  return v;
}
