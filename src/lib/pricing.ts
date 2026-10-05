/**
 * Admin-editable pricing registry — v3 (tiered engine), web port.
 *
 * Every rate the platform charges lives in the `pricing_config` collection
 * (key/value rows edited from the admin panel). The constants below are
 * **compiled defaults**, not fallback data to be shown: a config that fails to
 * load must never produce a €0 quote or a crash, so the DB is an override
 * layer over these. Worst case the web prices at the documented defaults.
 *
 * Source of the default values: *MoveDNA — Simple Logistics Pricing Engine*
 * v1.0 §3.1 (tier parameters), §5 (platform fee 8 %), and the Executive
 * Framework §6. They are the documents' *illustrative* rates and must be
 * validated in pilot — see `pickltmobile/.agent/plans/pricing/0.master.md` §5.
 *
 * This is the web port of `pickltmobile/lib/pricing-config.ts` (byte-identical
 * there, in pickltadmin and in pickltmover). The key set and every value must
 * match that file exactly; `pricing-parity.test.ts` pins the arithmetic
 * downstream through the shared golden fixture. Edit the mobile file first.
 *
 * Key families (master plan §5):
 *   tier.<light|regular|premium>.*  one profile per service tier
 *   vehicle.charge.<class>          fixed vehicle charge by class
 *   capacityM3.<class>              usable capacity per class (feasibility)
 *   volume.*                        bounding-box → loaded volume calibration
 *   items.*                         custom-item unit prices + suggestion rates
 *   crew.*  handling.*  access.*    crew requirement, extra helpers, handling hours, access fees
 *   classify.<light|regular>.*      tier cut-offs (points, weight, items, m³)
 *   packing.*  service.*  storage.* selectable services
 *   platformFee.*  tax.*            customer-facing fee and VAT
 *   pricing.minimumCharge           floor on the net price
 *
 * Wire tier values stay `light | regular | premium`; the customer sees
 * Normal / Medium / Premium (master D1). `commissionRate` (driver-side, read by
 * `writetaxledger`) is deliberately NOT here — it is an admin-registry key, not
 * an engine input.
 */

import type { TFunction } from 'i18next'
import { vehicleCapacityLabel, type VehicleTierKey } from '@/lib/vehicle-capacity'

export const PRICING_DEFAULTS = {
  // ── Service tiers (MoveDNA §3.1) ─────────────────────────────────────────
  'tier.light.basePrice': 35,
  'tier.light.distanceRatePerKm': 1.1,
  'tier.light.crew': 1,
  'tier.light.laborRatePerHour': 22,
  'tier.light.minimumHours': 2,
  'tier.light.packingAllowance': 0,
  'tier.light.handlingAllowance': 0,
  'tier.light.instantMultiplier': 1.2,
  // Smallest vehicle class the tier is sold with: 0 small_van, 1 medium_truck, 2 large_truck.
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

  // ── Vehicle (MoveDNA §3.1 vehicle charge; capacity bands unchanged) ──────
  'vehicle.charge.small_van': 15,
  'vehicle.charge.medium_truck': 25,
  'vehicle.charge.large_truck': 45,
  'capacityM3.small_van': 10,
  'capacityM3.medium_truck': 25,
  'capacityM3.large_truck': 45,

  // ── Load volume (lib/moveVolume.ts) ──────────────────────────────────────
  // Bounding-box volume understates the space a load occupies; 1.35 is the
  // industry's usual correction. Custom items carry only a size band, anchored
  // to real catalog items: box 0.096 m³, coffee table 0.297, armchair 0.729,
  // 3-seater sofa 1.62.
  'volume.packingFactor': 1.35,
  'volume.custom.small': 0.1,
  'volume.custom.medium': 0.3,
  'volume.custom.large': 0.8,
  'volume.custom.extraLarge': 1.8,

  // ── Items (owner requirement: every catalog item has an admin-set price) ─
  // Catalog rows carry `unitPriceEur`; these are the unit prices for the
  // custom-item size bands, and the rates behind the admin "Suggest price"
  // helper (weight × perKg + volume × perM3).
  'items.custom.small': 3,
  'items.custom.medium': 6,
  'items.custom.large': 12,
  'items.custom.extraLarge': 25,
  'items.suggest.perKg': 0.15,
  'items.suggest.perM3': 10,

  // ── Crew requirement (MoveDNA §6.3) ──────────────────────────────────────
  'crew.m3PerMover': 15,
  'crew.max': 4,
  // Helpers the client may add on top of the charged crew (crew master D2),
  // each billed at the tier labour rate for the billable hours.
  'crew.maxExtraHelpers': 3,

  // ── Tier classification (crew master D4, lib/classifyMove.ts) ────────────
  // A basket stays Normal (light) while it is at or under every light limit,
  // Medium (regular) while at or under every regular limit, else Premium.
  // maxM3 is LOADED volume: Σ bounding-box m³ (custom items by size band) ×
  // volume.packingFactor — matched to the vehicle each tier is sold with
  // (small van 10 m³, medium truck 25 m³; above → large truck).
  'classify.light.maxPoints': 25,
  'classify.light.maxWeightKg': 200,
  'classify.light.maxItems': 15,
  'classify.light.maxM3': 10,
  'classify.regular.maxPoints': 80,
  'classify.regular.maxWeightKg': 800,
  'classify.regular.maxItems': 40,
  'classify.regular.maxM3': 25,

  // ── Handling time + access surcharges ─────────────────────────────────────
  // CALIBRATION PARAMETER: hours of physical handling per loaded m³ for one
  // mover. Tune against completed-move timings.
  'handling.hoursPerM3': 0.2,
  'access.floorSurchargeNoElevator': 15,
  'access.haltverbotFee': 0,

  // ── Selectable services ───────────────────────────────────────────────────
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
  // Storage is billed per week below; the service tick itself is free.
  'service.temporary_storage': 0,
  'storage.perWeek': 30,

  // ── Platform fee, tax, floor (MoveDNA §2, §5) ─────────────────────────────
  'platformFee.rate': 0.08,
  'platformFee.fixed': 0,
  'tax.vatRate': 0.19,
  'pricing.minimumCharge': 49,
} as const

export type PricingKey = keyof typeof PRICING_DEFAULTS

/** A partial override map, as read from `pricing_config` / `GET /api/pricing/config`. */
export type PricingConfig = Partial<Record<PricingKey, number>>

/** Older import name for the same shape; kept so call sites read naturally. */
export type PricingRates = PricingConfig

export function isPricingKey(key: string): key is PricingKey {
  return Object.prototype.hasOwnProperty.call(PRICING_DEFAULTS, key)
}

/** Rate lookup: DB override when present and finite, else the compiled default. */
export function rate(config: PricingConfig | null | undefined, key: PricingKey): number {
  const override = config?.[key]
  if (typeof override === 'number' && Number.isFinite(override)) return override
  return PRICING_DEFAULTS[key]
}

/**
 * Rate lookup for a key assembled at runtime (`tier.${tier}.basePrice`,
 * `service.${id}`). Returns `null` for a key the registry does not know, so a
 * caller can decide between "0" (an unknown service costs nothing) and "fall
 * back to a sibling key" (an unknown vehicle class prices as the smallest).
 */
export function rateOrNull(config: PricingConfig | null | undefined, key: string): number | null {
  return isPricingKey(key) ? rate(config, key) : null
}

/**
 * Turns raw `pricing_config` rows (or a `{ key: value }` map) into an override
 * map. Unknown keys are dropped (a stale row can't inject a rate no consumer
 * understands) and non-finite values are ignored so a bad edit degrades to the
 * default rather than to NaN.
 *
 * Country scoping (plan `wave-2026-10/4` C4): a row carries `country` —
 * `'GLOBAL'` (or no column at all, for rows written before the wave) for the
 * base rate, or an ISO-3166-1 alpha-2 code for an override that applies only to
 * moves departing from that country. The effective config for `countryCode` is
 * the GLOBAL layer with that country's rows laid over it; rows for other
 * countries are ignored. Without a `countryCode` only the GLOBAL layer applies.
 *
 * A `{ key: value }` map (what `GET /api/pricing/config` returns, already
 * merged server-side) is read as a GLOBAL layer. Same arithmetic as
 * `pickltmobile/lib/pricing-config.ts`.
 */
export const GLOBAL_PRICING_SCOPE = 'GLOBAL'

export interface PricingConfigRow {
  key?: unknown
  value?: unknown
  /** `'GLOBAL'` | ISO2; absent on legacy rows (treated as GLOBAL). */
  country?: unknown
}

export function pricingRowScope(row: PricingConfigRow): string {
  const c = typeof row.country === 'string' ? row.country.trim().toUpperCase() : ''
  return c === '' ? GLOBAL_PRICING_SCOPE : c
}

export function toPricingConfig(
  rows: PricingConfigRow[] | Record<string, unknown> | null | undefined,
  countryCode?: string | null,
): PricingConfig {
  if (!rows) return {}
  const entries: PricingConfigRow[] = Array.isArray(rows)
    ? rows
    : Object.entries(rows).map(([key, value]) => ({ key, value }))
  const cc = typeof countryCode === 'string' && countryCode.trim() ? countryCode.trim().toUpperCase() : null
  const base: PricingConfig = {}
  const scoped: PricingConfig = {}
  for (const row of entries) {
    const k = typeof row.key === 'string' ? row.key : null
    if (!k || !isPricingKey(k)) continue
    const v = typeof row.value === 'number' ? row.value : Number(row.value)
    if (!Number.isFinite(v)) continue
    const scope = pricingRowScope(row)
    if (scope === GLOBAL_PRICING_SCOPE) base[k] = v
    else if (cc && scope === cc) scoped[k] = v
  }
  return { ...base, ...scoped }
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

const VEHICLE_LABEL_KEYS: Record<VehicleType, string> = {
  small_van: 'booking:vehicle.smallVan.label',
  medium_truck: 'booking:vehicle.mediumTruck.label',
  large_truck: 'booking:vehicle.largeTruck.label',
}

/** Wire value → the capacity-band key segment in `lib/vehicle-capacity.ts`. */
const VEHICLE_TIER_KEY: Record<VehicleType, VehicleTierKey> = {
  small_van: 'smallVan',
  medium_truck: 'mediumTruck',
  large_truck: 'largeTruck',
}

/** Capacity blurbs mirror the mover app's VEHICLE_TYPE_OPTIONS descriptions. */
const VEHICLE_CAPACITY_KEYS: Record<VehicleType, string> = {
  small_van: 'booking:vehicle.smallVan.helper',
  medium_truck: 'booking:vehicle.mediumTruck.helper',
  large_truck: 'booking:vehicle.largeTruck.helper',
}

/**
 * Labels take `t` rather than importing one. This module is imported by client
 * pages (which still render once on the server) and by server-side pricing
 * code, so a module-level `t` would either freeze the boot language or leak one
 * request's locale into another's render. Resolved at render, never at import.
 */
export function vehicleLabel(t: TFunction, v: VehicleType): string {
  return t(VEHICLE_LABEL_KEYS[v])
}

export function vehicleCapacity(t: TFunction, v: VehicleType): string {
  // The band itself ("Up to 10 m³") is a business constant formatted at call
  // time, not a literal typed into eight translations of the blurb.
  return t(VEHICLE_CAPACITY_KEYS[v], { capacity: vehicleCapacityLabel(t, VEHICLE_TIER_KEY[v]) })
}

/** Narrows an arbitrary stored value to a known class, defaulting to the smallest. */
export function asVehicleType(v: string | null | undefined): VehicleType {
  return VEHICLE_TYPES.includes(v as VehicleType) ? (v as VehicleType) : 'small_van'
}
