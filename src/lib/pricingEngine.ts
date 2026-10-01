/**
 * The pricing engine — v3, tiered. Web port.
 *
 *   FINAL PRICE = Base + Distance + Vehicle + Crew labour + Items + Packing
 *               + Handling/Access + Services + Storage
 *               → × mode multiplier (instant) → + platform fee − discount
 *               → floor at the minimum charge → + VAT
 *
 * One engine quotes both booking modes from the same inputs; the three service
 * tiers are configuration profiles of it, not separate calculators (Executive
 * Framework §4; MoveDNA §2–§5). Every rate is read through `rate()` so an admin
 * can change it without a deploy, and every rate a quote reads is echoed back in
 * `breakdown.rates` so the quote records the exact rules used (Framework §7.2).
 *
 * MONEY IS INTEGER CENTS inside this file (master D4). Each component is rounded
 * to cents before summing, and the result is reconciled line by line — a quote
 * whose lines do not add up to its total throws rather than ships.
 *
 * Pure: no I/O, no clock, no React, no Appwrite. This is the port of
 * `pickltmobile/lib/pricing-engine.ts` with this repo's import names and
 * catalog shape (`InventoryItemDef.id` / `.meta.*` instead of `itemId` /
 * top-level dimensions). The arithmetic is identical and is pinned by the
 * shared golden fixture (`__tests__/pricing-parity.test.ts`). Normative
 * arithmetic: `pickltmobile/.agent/plans/pricing/0.master.md` §6.3.
 */

import type { InventoryItemDef } from './classifyMove'
import type { MoveType } from './types'
import { computeMoveVolume, type CustomItemSize } from './moveVolume'
import { rate, rateOrNull, type PricingConfig, type PricingKey } from './pricing'

// ── Vocabulary ─────────────────────────────────────────────────────────────

/** Wire values. Displayed as Normal / Medium / Premium (master D1). */
export type ServiceTier = MoveType
export type BookingMode = 'instant' | 'scheduled'
export type VehicleClass = 'small_van' | 'medium_truck' | 'large_truck'
export type PackingLevel = 'none' | 'partial' | 'full' | 'unpacking'

export const SERVICE_TIERS: readonly ServiceTier[] = ['light', 'regular', 'premium']
export const VEHICLE_BY_RANK: readonly VehicleClass[] = ['small_van', 'medium_truck', 'large_truck']
export const VEHICLE_RANK: Record<VehicleClass, number> = {
  small_van: 0,
  medium_truck: 1,
  large_truck: 2,
}
/** i18n key of the short customer-facing tier name ("Normal", "Medium", "Premium"). */
export const TIER_DISPLAY_KEY: Record<ServiceTier, string> = {
  light: 'booking:moveType.light.short',
  regular: 'booking:moveType.regular.short',
  premium: 'booking:moveType.premium.short',
}

export function isVehicleClass(v: unknown): v is VehicleClass {
  return v === 'small_van' || v === 'medium_truck' || v === 'large_truck'
}

export function isServiceTier(v: unknown): v is ServiceTier {
  return v === 'light' || v === 'regular' || v === 'premium'
}

// ── Input / output shapes (master §6.1) ────────────────────────────────────

/**
 * A user-described item, as the engine needs it. The mobile client's
 * `CustomItem` is this plus `id`/`name`; the web booking context stores the
 * size band and weight as free text and normalises them through
 * `lib/pricingInputs.ts` before quoting.
 */
export interface PricingCustomItem {
  quantity: number
  approxSize?: CustomItemSize | string | null
  approxWeight?: number | null
}

export interface PricingBasket {
  /** `{ itemId: quantity }` — the shape persisted on `moves.inventoryItems`. */
  counts: Record<string, number>
  customItems: PricingCustomItem[]
}

export interface QuoteInput {
  tier: ServiceTier
  mode: BookingMode
  /** Route distance in km. Non-finite or negative reads as 0. */
  distanceKm: number
  /** Route duration in seconds. Non-finite or negative reads as 0. */
  durationSeconds: number
  basket: PricingBasket
  catalog: InventoryItemDef[]
  /** The selected mover's vehicle class when a mover is known (master D8). */
  vehicleType?: string | null
  /** Pickup floors without a lift + drop-off floors without a lift. */
  floorsNoLift?: number
  /** Number of addresses needing a no-parking (Halteverbot) arrangement, 0–2. */
  haltverbotCount?: number
  packingLevel?: PackingLevel | string | null
  /** Additional service ids (`furniture_disassembly`, …). */
  services?: readonly string[] | null
  storageWeeks?: number
  /** Euros. No UI yet; reserved for promotions (master §10). */
  discountEur?: number
}

export interface QuoteLine {
  key: string
  amountEur: number
  qty?: number
  unitEur?: number
}

export interface QuoteProfile {
  itemCount: number
  loadedVolumeM3: number
  rawVolumeM3: number
  weightKg: number
  requiredCrew: number
  crew: number
  vehicleType: VehicleClass
  billableHours: number
  distanceKm: number
  durationHours: number
}

export interface QuoteLines {
  base: number
  distance: number
  vehicle: number
  labor: number
  items: number
  packing: number
  handling: number
  services: number
  storage: number
}

export interface QuoteBreakdown {
  version: 'v3'
  currency: 'EUR'
  tier: ServiceTier
  mode: BookingMode
  profile: QuoteProfile
  /** Every value in euros, two decimals, already rounded. */
  lines: QuoteLines
  operationalSubtotal: number
  modeMultiplier: number
  /** `adjustedSubtotal − operationalSubtotal`; 0 for scheduled. */
  modeAdjustment: number
  adjustedSubtotal: number
  platformFee: number
  discount: number
  minimumApplied: boolean
  /** Before VAT, after the floor. */
  net: number
  vatRate: number
  vat: number
  /** What the customer pays. */
  total: number
  serviceLines: QuoteLine[]
  itemLines: QuoteLine[]
  /** Every registry key this quote read, with the value actually used. */
  rates: Record<string, number>
  assumptions: {
    unpricedItemIds: string[]
    unknownItemIds: string[]
    estimated: true
  }
  flags: {
    /** No vehicle class holds the loaded volume; priced as a large truck. */
    exceedsLargestVehicle: boolean
    /** The item/volume requirement exceeded `crew.max` and was capped. */
    crewCapped: boolean
  }
}

export class PricingReconcileError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PricingReconcileError'
  }
}

// ── Money helpers (integer cents) ──────────────────────────────────────────

/** Half-up rounding to the nearest integer, stable for the negative-zero case. */
function roundHalfUp(n: number): number {
  return Math.sign(n) * Math.round(Math.abs(n)) || 0
}

/** Euros → integer cents. Non-finite reads as 0. */
function cents(eur: number): number {
  return Number.isFinite(eur) ? roundHalfUp(eur * 100) : 0
}

function eur(c: number): number {
  return c / 100
}

function nonNegative(n: unknown): number {
  const v = typeof n === 'number' ? n : Number(n)
  return Number.isFinite(v) && v > 0 ? v : 0
}

function round2(n: number): number {
  return roundHalfUp(n * 100) / 100
}

function round3(n: number): number {
  return roundHalfUp(n * 1000) / 1000
}

// ── Rate reading with a trace ──────────────────────────────────────────────

/**
 * A `rate()` that remembers every key it answered, so the quote can store the
 * exact rules used (Framework §7.2 "calculation trace").
 */
class RateTrace {
  readonly used: Record<string, number> = {}
  constructor(private readonly config: PricingConfig | null | undefined) {}

  get(key: PricingKey): number {
    const v = rate(this.config, key)
    this.used[key] = v
    return v
  }

  /** Runtime-assembled key; `null` when the registry does not know it. */
  maybe(key: string): number | null {
    const v = rateOrNull(this.config, key)
    if (v !== null) this.used[key] = v
    return v
  }
}

function tierKey(tier: ServiceTier, field: string): PricingKey {
  return `tier.${tier}.${field}` as PricingKey
}

// ── Item profile ───────────────────────────────────────────────────────────

interface BasketProfile {
  itemCount: number
  weightKg: number
  maxItemCrew: number
  itemLines: QuoteLine[]
  itemsCents: number
  unpricedItemIds: string[]
  unknownItemIds: string[]
}

const CUSTOM_PRICE_KEY: Record<CustomItemSize, PricingKey> = {
  small: 'items.custom.small',
  medium: 'items.custom.medium',
  large: 'items.custom.large',
  extra_large: 'items.custom.extraLarge',
}

const CUSTOM_VOLUME_KEY: Record<CustomItemSize, PricingKey> = {
  small: 'volume.custom.small',
  medium: 'volume.custom.medium',
  large: 'volume.custom.large',
  extra_large: 'volume.custom.extraLarge',
}

function basketProfile(
  basket: PricingBasket,
  catalog: InventoryItemDef[],
  trace: RateTrace,
): BasketProfile {
  const byId = new Map(catalog.map((i) => [i.id, i]))
  const out: BasketProfile = {
    itemCount: 0,
    weightKg: 0,
    maxItemCrew: 1,
    itemLines: [],
    itemsCents: 0,
    unpricedItemIds: [],
    unknownItemIds: [],
  }

  // Deterministic order: catalog ids sorted, then custom items in input order.
  const ids = Object.keys(basket.counts ?? {}).sort()
  for (const itemId of ids) {
    // Same tolerance as `computeMoveVolume`: only a finite positive NUMBER
    // counts, so items, weight, crew and volume always agree on the basket.
    const rawQty = basket.counts[itemId]
    const qty = typeof rawQty === 'number' && Number.isFinite(rawQty) && rawQty > 0 ? rawQty : 0
    if (qty <= 0) continue
    const def = byId.get(itemId)
    if (!def) {
      out.unknownItemIds.push(itemId)
      continue
    }
    out.itemCount += qty
    out.weightKg += nonNegative(def.meta?.weightKg) * qty
    const crew = Number(def.requiredCrew)
    if (Number.isFinite(crew) && crew > out.maxItemCrew) out.maxItemCrew = Math.floor(crew)

    const unit = def.unitPriceEur
    const unitEur = typeof unit === 'number' && Number.isFinite(unit) && unit >= 0 ? unit : null
    if (unitEur === null) out.unpricedItemIds.push(itemId)
    const lineCents = unitEur === null ? 0 : roundHalfUp(qty * unitEur * 100)
    out.itemsCents += lineCents
    out.itemLines.push({ key: itemId, qty, unitEur: unitEur ?? 0, amountEur: eur(lineCents) })
  }

  for (const ci of basket.customItems ?? []) {
    const qty = typeof ci.quantity === 'number' && Number.isFinite(ci.quantity) && ci.quantity > 0 ? ci.quantity : 0
    if (qty <= 0) continue
    out.itemCount += qty
    out.weightKg += nonNegative(ci.approxWeight) * qty
    // Unknown band → medium, the same call `customItemVolumeM3` makes.
    const key = CUSTOM_PRICE_KEY[ci.approxSize as CustomItemSize] ?? 'items.custom.medium'
    // `computeMoveVolume` read the matching volume band; record it in the trace.
    trace.get(CUSTOM_VOLUME_KEY[ci.approxSize as CustomItemSize] ?? 'volume.custom.medium')
    const unitEur = trace.get(key)
    const lineCents = roundHalfUp(qty * unitEur * 100)
    out.itemsCents += lineCents
    out.itemLines.push({ key: `custom:${ci.approxSize}`, qty, unitEur, amountEur: eur(lineCents) })
  }

  return out
}

// ── Public helpers (master §6.2) ───────────────────────────────────────────

/**
 * Movers the job needs (MoveDNA §6.3): the highest of the volume rule
 * (`crew.m3PerMover` per mover), the heaviest single item's `requiredCrew`, and
 * one. Capped at `crew.max`.
 */
export function requiredCrewFor(
  basket: PricingBasket,
  catalog: InventoryItemDef[],
  loadedVolumeM3: number,
  config?: PricingConfig | null,
): number {
  const trace = new RateTrace(config)
  return requiredCrewWith(basketProfile(basket, catalog, trace), loadedVolumeM3, trace).crew
}

function requiredCrewWith(
  profile: BasketProfile,
  loadedVolumeM3: number,
  trace: RateTrace,
): { crew: number; capped: boolean } {
  const perMover = trace.get('crew.m3PerMover')
  const max = Math.max(1, Math.floor(trace.get('crew.max')))
  const byVolume = perMover > 0 ? Math.ceil(nonNegative(loadedVolumeM3) / perMover) : 1
  const raw = Math.max(1, byVolume, profile.maxItemCrew)
  return { crew: Math.min(max, raw), capped: raw > max }
}

/**
 * The vehicle class a tier is quoted with when no mover is selected (master D8):
 * the smallest class that holds the load, never below the tier's minimum class.
 * `fits` is false when not even the largest class holds it.
 */
export function vehicleClassFor(
  tier: ServiceTier,
  loadedVolumeM3: number,
  config?: PricingConfig | null,
): { vehicleType: VehicleClass; fits: boolean } {
  return vehicleClassWith(tier, loadedVolumeM3, new RateTrace(config))
}

function vehicleClassWith(
  tier: ServiceTier,
  loadedVolumeM3: number,
  trace: RateTrace,
): { vehicleType: VehicleClass; fits: boolean } {
  const minRank = Math.min(2, Math.max(0, Math.floor(trace.get(tierKey(tier, 'minVehicleRank')))))
  const load = nonNegative(loadedVolumeM3)
  for (let rank = minRank; rank < VEHICLE_BY_RANK.length; rank++) {
    const cls = VEHICLE_BY_RANK[rank]
    if (load <= trace.get(`capacityM3.${cls}` as PricingKey)) return { vehicleType: cls, fits: true }
  }
  return { vehicleType: 'large_truck', fits: false }
}

/**
 * Hours the crew is billed for (master D9): handling time for the volume,
 * divided among the crew, plus the drive between the addresses, rounded up to
 * the quarter hour, never below the tier's minimum.
 */
export function billableHoursFor(
  tier: ServiceTier,
  loadedVolumeM3: number,
  crew: number,
  durationSeconds: number,
  config?: PricingConfig | null,
): number {
  return billableHoursWith(tier, loadedVolumeM3, crew, durationSeconds, new RateTrace(config))
}

function billableHoursWith(
  tier: ServiceTier,
  loadedVolumeM3: number,
  crew: number,
  durationSeconds: number,
  trace: RateTrace,
): number {
  const minimum = Math.max(0, trace.get(tierKey(tier, 'minimumHours')))
  const handling = (nonNegative(loadedVolumeM3) * trace.get('handling.hoursPerM3')) / Math.max(1, crew)
  const transit = nonNegative(durationSeconds) / 3600
  // Guard the quarter-hour ceiling against float noise (1.0000000002 → 1.25).
  const quarters = Math.ceil(Math.round((handling + transit) * 4 * 1e6) / 1e6)
  return Math.max(minimum, quarters / 4)
}

/**
 * The admin "Suggest price" helper (master D6): weight × €/kg + bounding-box
 * volume × €/m³, rounded to the cent. The admin's typed figure is authoritative;
 * this only proposes one.
 */
export function suggestedUnitPriceEur(
  item: { weightKg?: number | null; widthCm?: number | null; heightCm?: number | null; depthCm?: number | null },
  config?: PricingConfig | null,
): number {
  const w = nonNegative(item.widthCm)
  const h = nonNegative(item.heightCm)
  const d = nonNegative(item.depthCm)
  const volumeM3 = (w * h * d) / 1_000_000
  const value =
    nonNegative(item.weightKg) * rate(config, 'items.suggest.perKg') +
    volumeM3 * rate(config, 'items.suggest.perM3')
  return round2(value)
}

// ── The quote ──────────────────────────────────────────────────────────────

export function quoteMove(input: QuoteInput, config?: PricingConfig | null): QuoteBreakdown {
  const trace = new RateTrace(config)
  const tier: ServiceTier = isServiceTier(input.tier) ? input.tier : 'light'
  const mode: BookingMode = input.mode === 'instant' ? 'instant' : 'scheduled'
  const distanceKm = nonNegative(input.distanceKm)
  const durationSeconds = nonNegative(input.durationSeconds)
  const basket: PricingBasket = {
    counts: input.basket?.counts ?? {},
    customItems: input.basket?.customItems ?? [],
  }
  const catalog = input.catalog ?? []

  // 1. Item profile.
  const volume = computeMoveVolume(
    basket.counts,
    basket.customItems.map((ci) => ({
      quantity: ci.quantity,
      approxSize: (ci.approxSize ?? null) as CustomItemSize | null,
    })),
    catalog,
    config,
  )
  trace.get('volume.packingFactor') // read by computeMoveVolume; recorded for the trace
  const profile = basketProfile(basket, catalog, trace)
  const req = requiredCrewWith(profile, volume.loadedVolumeM3, trace)
  const tierCrew = Math.max(1, Math.floor(trace.get(tierKey(tier, 'crew'))))
  const crew = Math.max(tierCrew, req.crew)

  // 2. Vehicle class: the selected mover's, else the smallest that fits.
  let vehicleType: VehicleClass
  let exceedsLargestVehicle = false
  if (isVehicleClass(input.vehicleType)) {
    vehicleType = input.vehicleType
  } else {
    const resolved = vehicleClassWith(tier, volume.loadedVolumeM3, trace)
    vehicleType = resolved.vehicleType
    exceedsLargestVehicle = !resolved.fits
  }

  // 3. Hours.
  const hours = billableHoursWith(tier, volume.loadedVolumeM3, crew, durationSeconds, trace)

  // 4. Component lines, in cents.
  const base = cents(trace.get(tierKey(tier, 'basePrice')))
  const distance = roundHalfUp(distanceKm * trace.get(tierKey(tier, 'distanceRatePerKm')) * 100)
  const vehicle = cents(
    trace.maybe(`vehicle.charge.${vehicleType}`) ?? trace.get('vehicle.charge.small_van'),
  )
  const labor = roundHalfUp(crew * trace.get(tierKey(tier, 'laborRatePerHour')) * hours * 100)
  const items = profile.itemsCents

  const packingLevel = input.packingLevel ?? 'none'
  const packing =
    cents(trace.get(tierKey(tier, 'packingAllowance'))) +
    cents(trace.maybe(`packing.${packingLevel}`) ?? 0)

  const floorsNoLift = Math.floor(nonNegative(input.floorsNoLift))
  const haltverbot = Math.floor(nonNegative(input.haltverbotCount))
  const handling =
    cents(trace.get(tierKey(tier, 'handlingAllowance'))) +
    floorsNoLift * cents(trace.get('access.floorSurchargeNoElevator')) +
    haltverbot * cents(trace.get('access.haltverbotFee'))

  const serviceLines: QuoteLine[] = []
  let services = 0
  for (const id of uniqueSorted(input.services)) {
    // An unknown service id costs nothing rather than failing the quote; it is
    // still listed so the breakdown shows what was selected.
    const unitEur = trace.maybe(`service.${id}`) ?? 0
    const c = cents(unitEur)
    services += c
    serviceLines.push({ key: id, amountEur: eur(c) })
  }

  const storageWeeks = Math.floor(nonNegative(input.storageWeeks))
  const storage = storageWeeks * cents(trace.get('storage.perWeek'))

  // 5. Totals.
  const operationalSubtotal =
    base + distance + vehicle + labor + items + packing + handling + services + storage
  const modeMultiplier = mode === 'instant' ? trace.get(tierKey(tier, 'instantMultiplier')) : 1
  const adjustedSubtotal = roundHalfUp(operationalSubtotal * modeMultiplier)
  const modeAdjustment = adjustedSubtotal - operationalSubtotal

  const platformFee =
    roundHalfUp(adjustedSubtotal * trace.get('platformFee.rate')) + cents(trace.get('platformFee.fixed'))
  const discount = Math.min(cents(nonNegative(input.discountEur)), adjustedSubtotal + platformFee)
  const netRaw = adjustedSubtotal + platformFee - discount
  const minimum = cents(trace.get('pricing.minimumCharge'))
  const net = Math.max(minimum, netRaw)
  const minimumApplied = net > netRaw
  const vatRate = trace.get('tax.vatRate')
  const vat = roundHalfUp(net * vatRate)
  const total = net + vat

  // 6. Reconcile (master D4). Integer arithmetic makes these exact; the checks
  // exist so a future edit that breaks the invariant fails loudly.
  const lineSum = base + distance + vehicle + labor + items + packing + handling + services + storage
  if (lineSum !== operationalSubtotal) throw new PricingReconcileError('lines ≠ operational subtotal')
  if (operationalSubtotal + modeAdjustment !== adjustedSubtotal) throw new PricingReconcileError('mode adjustment')
  if (Math.max(minimum, adjustedSubtotal + platformFee - discount) !== net) throw new PricingReconcileError('net')
  if (net + vat !== total) throw new PricingReconcileError('vat')
  if (![base, distance, vehicle, labor, items, packing, handling, services, storage, total].every(Number.isInteger)) {
    throw new PricingReconcileError('non-integer cents')
  }

  return {
    version: 'v3',
    currency: 'EUR',
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
  }
}

/**
 * Quote a job for one specific mover (the instant mover list). The mover's
 * vehicle class sets the vehicle line; the mover's crew size never changes the
 * price (master D7) — it only decides eligibility.
 */
export function quoteForMover(
  input: Omit<QuoteInput, 'vehicleType'>,
  mover: { vehicleType: string | null | undefined; crewSize: number | null | undefined },
  config?: PricingConfig | null,
): { quote: QuoteBreakdown; eligible: boolean; reason: 'ok' | 'crew' } {
  const quote = quoteMove({ ...input, vehicleType: mover.vehicleType ?? null }, config)
  // An unknown crew size (null, undefined, unparseable) is not "one mover" —
  // it passes, exactly like the capacity gate passes an unmeasured load.
  const crewSize = typeof mover.crewSize === 'number' ? mover.crewSize : NaN
  const eligible = !Number.isFinite(crewSize) || crewSize >= quote.profile.requiredCrew
  return { quote, eligible, reason: eligible ? 'ok' : 'crew' }
}

// ── Persistence helpers ────────────────────────────────────────────────────

/** JSON with stable key order, for `moves.priceBreakdown`. */
export function serializeBreakdown(b: QuoteBreakdown): string {
  return JSON.stringify(sortDeep(b))
}

/**
 * Tolerant reader for `moves.priceBreakdown`: a string from the wire or an
 * already-parsed object. Anything that is not a v3 breakdown yields `null`, so
 * a move written before this engine existed renders its plain total instead of
 * crashing a detail screen.
 */
export function parseBreakdown(raw: unknown): QuoteBreakdown | null {
  let value: unknown = raw
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return null
    try {
      value = JSON.parse(trimmed)
    } catch {
      return null
    }
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const b = value as Partial<QuoteBreakdown>
  if (b.version !== 'v3' || b.currency !== 'EUR') return null
  if (!isServiceTier(b.tier) || (b.mode !== 'instant' && b.mode !== 'scheduled')) return null
  if (!b.lines || typeof b.lines !== 'object' || !b.profile || typeof b.profile !== 'object') return null
  if (typeof b.total !== 'number' || !Number.isFinite(b.total)) return null
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
  } as QuoteBreakdown
}

// ── Small utilities ────────────────────────────────────────────────────────

function uniqueSorted(ids: readonly string[] | null | undefined): string[] {
  const out = new Set<string>()
  for (const id of ids ?? []) if (typeof id === 'string' && id.trim()) out.add(id.trim())
  return [...out].sort()
}

function sortedRecord(r: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = {}
  for (const k of Object.keys(r).sort()) out[k] = r[k]
  return out
}

function sortDeep(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(sortDeep)
  if (v && typeof v === 'object') {
    const out: Record<string, unknown> = {}
    for (const k of Object.keys(v as Record<string, unknown>).sort()) {
      out[k] = sortDeep((v as Record<string, unknown>)[k])
    }
    return out
  }
  return v
}
