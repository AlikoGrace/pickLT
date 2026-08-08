/**
 * Shared quote maths for the web client.
 *
 * Every rate the platform charges lives in the `pricing_config` collection and
 * is edited from the admin panel. The constants below are **defaults, not
 * fallback data to be shown**: a config that fails to load must never produce a
 * €0 quote, so the DB is an override layer over these. Worst case the web
 * prices exactly as the server's compiled defaults do.
 *
 * This module exists because the formula used to be duplicated inline in two
 * pages, and the copies had drifted apart and away from the backend — the
 * mover-selection page was quoting a rate that did not exist on any mover and a
 * per-km figure a third above what `calculateprice` charges. One copy, one set
 * of keys, shared by every surface.
 *
 * `instantRouteBase` is a faithful port of `functions/calculateprice/src/main.js`
 * and `priceForMover` mirrors the mobile client's `lib/move-pricing.ts`. Both
 * must stay in lockstep with their counterparts; the cross-repo golden fixtures
 * planned in `capability-pricing-design.md` sub-plan 7 are what will pin that.
 */

export const PRICING_DEFAULTS: Record<string, number> = {
  // ── Instant / route pricing (calculateprice) ──
  'instant.baseRatePerKm': 1.5,
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

  // ── Per-mover surcharges (instant mover list) ──
  'mover.crewSurchargePerHead': 10,
  'mover.itemSurcharge': 1.5,
  'mover.vehicle.small_van': 0,
  'mover.vehicle.medium_truck': 10,
  'mover.vehicle.large_truck': 25,

  // ── Load volume (lib/moveVolume.ts) ──
  'volume.packingFactor': 1.35,
  'volume.custom.small': 0.1,
  'volume.custom.medium': 0.3,
  'volume.custom.large': 0.8,
  'volume.custom.extraLarge': 1.8,
  'capacityM3.small_van': 10,
  'capacityM3.medium_truck': 25,
  'capacityM3.large_truck': 45,
}

/** A partial override map as returned by `GET /api/pricing/config`. */
export type PricingRates = Record<string, number>

/** Rate lookup: DB override when present and finite, else the compiled default. */
export function rate(rates: PricingRates | null | undefined, key: string): number {
  const v = rates?.[key]
  if (typeof v === 'number' && Number.isFinite(v)) return v
  const fallback = PRICING_DEFAULTS[key]
  return typeof fallback === 'number' ? fallback : 0
}

// ─── Vehicle classes ────────────────────────────────────────────────────────
//
// These are the ONLY values `mover_profiles.vehicleType` can hold — the schema
// enum is `small_van | medium_truck | large_truck`. The previous maps on the
// mover-selection page keyed on `medium_van`, `large_van`, `truck` and `car`,
// none of which exist, so every real mover fell through to the default arm of
// every lookup: wrong label, wrong capacity blurb, wrong per-item fee.

export type VehicleType = 'small_van' | 'medium_truck' | 'large_truck'

export const VEHICLE_TYPES: VehicleType[] = ['small_van', 'medium_truck', 'large_truck']

export const VEHICLE_LABELS: Record<VehicleType, string> = {
  small_van: 'Small Van',
  medium_truck: 'Medium Truck',
  large_truck: 'Large Truck',
}

/** Capacity blurbs mirror the mover app's VEHICLE_TYPE_OPTIONS descriptions. */
export const VEHICLE_CAPACITY: Record<VehicleType, string> = {
  small_van: 'Up to 10 m³ — small moves, single items',
  medium_truck: '10–25 m³ — apartment moves',
  large_truck: '25+ m³ — house moves, large loads',
}

/** Narrows an arbitrary stored value to a known class, defaulting to the smallest. */
export function asVehicleType(v: string | null | undefined): VehicleType {
  return VEHICLE_TYPES.includes(v as VehicleType) ? (v as VehicleType) : 'small_van'
}

// ─── Instant route base ─────────────────────────────────────────────────────

export interface InstantQuoteInput {
  routeDistanceMeters: number
  moveType?: string | null
  packingServiceLevel?: string | null
  crewSize?: number | string | null
  pickupFloorLevel?: string | number | null
  pickupElevator?: boolean | null
  dropoffFloorLevel?: string | number | null
  dropoffElevator?: boolean | null
  storageWeeks?: number | null
}

export interface InstantQuoteBreakdown {
  basePrice: number
  distanceKm: number
  moveTypeMultiplier: number
  floorSurcharge: number
  packingSurcharge: number
  crewSurcharge: number
  storageSurcharge: number
  estimatedPrice: number
}

/**
 * The route base price — a faithful port of the `calculateprice` cloud function.
 *
 * Keep the order of operations identical to the server's: the multiplier applies
 * to the distance component only, and the minimum is a floor on the total after
 * surcharges, not on the base.
 */
export function instantRouteBase(
  input: InstantQuoteInput,
  rates?: PricingRates | null
): InstantQuoteBreakdown {
  const distanceKm = (input.routeDistanceMeters || 0) / 1000

  let basePrice = distanceKm * rate(rates, 'instant.baseRatePerKm')

  const effectiveType = input.moveType || 'light'
  const multiplier = rate(rates, `instant.multiplier.${effectiveType}`)
  basePrice *= multiplier

  let floorSurcharge = 0
  const floorRate = rate(rates, 'instant.floorSurchargeNoElevator')
  const pickupFloor = parseInt(String(input.pickupFloorLevel ?? '0'), 10) || 0
  const dropoffFloor = parseInt(String(input.dropoffFloorLevel ?? '0'), 10) || 0
  if (!input.pickupElevator && pickupFloor > 0) floorSurcharge += pickupFloor * floorRate
  if (!input.dropoffElevator && dropoffFloor > 0) floorSurcharge += dropoffFloor * floorRate

  const packingSurcharge = rate(rates, `instant.packing.${input.packingServiceLevel ?? 'none'}`)
  const crewSurcharge = rate(rates, `instant.crew.${input.crewSize ?? 1}`)
  const storageSurcharge = (input.storageWeeks || 0) * rate(rates, 'instant.storagePerWeek')

  let estimatedPrice =
    basePrice + floorSurcharge + packingSurcharge + crewSurcharge + storageSurcharge
  estimatedPrice = Math.max(estimatedPrice, rate(rates, 'instant.minimumPrice'))
  estimatedPrice = Math.round(estimatedPrice * 100) / 100

  return {
    basePrice: Math.round(basePrice * 100) / 100,
    distanceKm: Math.round(distanceKm * 100) / 100,
    moveTypeMultiplier: multiplier,
    floorSurcharge,
    packingSurcharge,
    crewSurcharge,
    storageSurcharge,
    estimatedPrice,
  }
}

// ─── Per-mover price ────────────────────────────────────────────────────────

export interface MoverPricingFields {
  vehicleType?: string | null
  crewSize?: number | null
}

/**
 * The price shown against one mover in the selection list.
 *
 * Mirrors the mobile client's `priceForMover`. The mover affects the price only
 * through **declared capability** — crew size and vehicle class — never through
 * a rate they set themselves. Two movers with the same truck and crew quote the
 * same number, which is what keeps the list comparable and keeps a customer's
 * quote stable when a job is re-broadcast to a different mover.
 */
export function priceForMover(
  routeBaseEur: number,
  mover: MoverPricingFields,
  totalItems: number,
  rates?: PricingRates | null
): number {
  const crewSize = Number(mover.crewSize) || 1
  const crewSurcharge = Math.max(0, crewSize - 1) * rate(rates, 'mover.crewSurchargePerHead')
  const itemSurcharge = Math.max(0, totalItems) * rate(rates, 'mover.itemSurcharge')
  const vehicleSurcharge = rate(rates, `mover.vehicle.${asVehicleType(mover.vehicleType)}`)
  return Math.round(routeBaseEur + crewSurcharge + itemSurcharge + vehicleSurcharge)
}
