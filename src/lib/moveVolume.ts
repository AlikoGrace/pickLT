import type { InventoryItemDef } from '@/lib/classifyMove'
import { rate, type PricingRates } from '@/lib/pricing'

/**
 * Load volume in cubic metres.
 *
 * Mirrors `lib/move-volume.ts` in the mobile client. Every catalog item already
 * carries width/height/depth, so volume needs no new data collection — only the
 * arithmetic, in one place rather than inline in a classifier.
 *
 * `classifyMove` here already accumulates a `totalVolumeCm3`, but it is a raw
 * bounding-box sum with a flat 0.125 m³ guess per custom item and no packing
 * correction, and nothing consumes it. This module is the version the pricing
 * and capacity work in `capability-pricing-design.md` builds on.
 */

/** cm³ per m³. Named because `1e6` in a volume expression reads as a typo. */
export const CUBIC_CM_PER_M3 = 1_000_000

export interface MoveVolume {
  catalogVolumeM3: number
  customVolumeM3: number
  rawVolumeM3: number
  /**
   * What a vehicle actually has to hold. Bounding-box sums understate the space
   * a load occupies — items are irregular, cannot be perfectly stacked, and
   * need gaps for padding. Capacity checks must use this, not `rawVolumeM3`.
   */
  loadedVolumeM3: number
}

/** Size bands offered for user-described items that carry no dimensions. */
export type CustomItemSize = 'small' | 'medium' | 'large' | 'extra_large'

export interface CustomItemVolumeInput {
  quantity: number
  approxSize?: CustomItemSize | null
}

/**
 * Bounding-box volume of one unit, in m³.
 *
 * Missing or non-finite dimensions yield 0 rather than NaN: one unmeasured
 * catalog row must not poison the basket total and break capacity checks for
 * every mover.
 */
export function itemVolumeM3(meta: {
  widthCm?: number | null
  heightCm?: number | null
  depthCm?: number | null
}): number {
  const w = Number(meta?.widthCm)
  const h = Number(meta?.heightCm)
  const d = Number(meta?.depthCm)
  if (!Number.isFinite(w) || !Number.isFinite(h) || !Number.isFinite(d)) return 0
  if (w <= 0 || h <= 0 || d <= 0) return 0
  return (w * h * d) / CUBIC_CM_PER_M3
}

/**
 * Estimated volume for a custom item from its size band.
 *
 * Anchored to real catalog items of comparable bulk: small ≈ a moving box
 * (0.096 m³), medium ≈ a coffee table (0.297), large ≈ an armchair (0.729),
 * extra_large ≈ a 3-seater sofa (1.62).
 */
export function customItemVolumeM3(
  approxSize: CustomItemSize | null | undefined,
  rates?: PricingRates | null
): number {
  switch (approxSize) {
    case 'small':
      return rate(rates, 'volume.custom.small')
    case 'large':
      return rate(rates, 'volume.custom.large')
    case 'extra_large':
      return rate(rates, 'volume.custom.extraLarge')
    case 'medium':
    default:
      // Unknown or absent band → medium, never zero, so an unrecognised value
      // cannot silently shrink a load.
      return rate(rates, 'volume.custom.medium')
  }
}

/**
 * Total volume of a basket.
 *
 * Follows `classifyMove`'s tolerance rules — non-positive quantities skipped,
 * unknown ids dropped — so the two can never disagree about basket contents.
 */
export function computeMoveVolume(
  inventory: Record<string, number>,
  customItems: CustomItemVolumeInput[],
  itemCatalog: InventoryItemDef[],
  rates?: PricingRates | null
): MoveVolume {
  const byId = new Map(itemCatalog.map((i) => [i.id, i]))

  let catalogVolumeM3 = 0
  for (const [itemId, quantity] of Object.entries(inventory)) {
    if (!Number.isFinite(quantity) || quantity <= 0) continue
    const item = byId.get(itemId)
    if (!item) continue
    catalogVolumeM3 += itemVolumeM3(item.meta) * quantity
  }

  let customVolumeM3 = 0
  for (const ci of customItems ?? []) {
    if (!Number.isFinite(ci?.quantity) || ci.quantity <= 0) continue
    customVolumeM3 += customItemVolumeM3(ci.approxSize, rates) * ci.quantity
  }

  const rawVolumeM3 = catalogVolumeM3 + customVolumeM3
  const packingFactor = rate(rates, 'volume.packingFactor')

  return {
    catalogVolumeM3: round3(catalogVolumeM3),
    customVolumeM3: round3(customVolumeM3),
    rawVolumeM3: round3(rawVolumeM3),
    loadedVolumeM3: round3(rawVolumeM3 * packingFactor),
  }
}

/**
 * Sanity bounds for a mover-declared capacity, m³. Below 1 is meaningless;
 * above 120 exceeds any road vehicle a mover here will have. Outside the range
 * is treated as a typo and the class band is used — otherwise "2000" in the
 * capacity box makes a small van eligible for every job on the platform.
 */
export const MIN_DECLARED_CAPACITY_M3 = 1
export const MAX_DECLARED_CAPACITY_M3 = 120

export interface MoverCapability {
  vehicleType?: string | null
  /** Free text on the schema; movers are asked for m³. */
  vehicleCapacity?: number | string | null
}

/** A mover's declared m³, or null when absent or implausible. */
export function declaredCapacityM3(
  vehicleCapacity: number | string | null | undefined
): number | null {
  if (vehicleCapacity === null || vehicleCapacity === undefined) return null
  const n =
    typeof vehicleCapacity === 'number' ? vehicleCapacity : parseFloat(String(vehicleCapacity))
  if (!Number.isFinite(n)) return null
  if (n < MIN_DECLARED_CAPACITY_M3 || n > MAX_DECLARED_CAPACITY_M3) return null
  return n
}

/**
 * What this specific mover can carry, m³ — declared figure over class band.
 *
 * Production has a `large_truck` declaring 65 m³ against a 45 m³ band default;
 * using the band would wrongly exclude it from the large jobs it exists for.
 */
export function moverCapacityM3(mover: MoverCapability, rates?: PricingRates | null): number {
  const declared = declaredCapacityM3(mover.vehicleCapacity)
  if (declared !== null) return declared
  return vehicleCapacityM3(mover.vehicleType, rates)
}

/** Can this mover carry this load? */
export function moverFitsLoad(
  loadedVolumeM3: number,
  mover: MoverCapability,
  rates?: PricingRates | null
): boolean {
  if (!Number.isFinite(loadedVolumeM3) || loadedVolumeM3 <= 0) return true
  return loadedVolumeM3 <= moverCapacityM3(mover, rates)
}

/** Usable capacity of a vehicle *class*, m³ — the fallback when none is declared. */
export function vehicleCapacityM3(
  vehicleType: string | null | undefined,
  rates?: PricingRates | null
): number {
  switch (vehicleType) {
    case 'medium_truck':
      return rate(rates, 'capacityM3.medium_truck')
    case 'large_truck':
      return rate(rates, 'capacityM3.large_truck')
    case 'small_van':
    default:
      // An unrecognised class must not read as infinite — assume the smallest
      // so an unknown mover is filtered out rather than handed a load nobody
      // has checked they can carry.
      return rate(rates, 'capacityM3.small_van')
  }
}

/**
 * Can this vehicle class carry this load?
 *
 * A zero or unmeasured load fits anything — the mover list renders before
 * anything is selected, and refusing everyone then would empty it on first paint.
 */
export function fitsVehicle(
  loadedVolumeM3: number,
  vehicleType: string | null | undefined,
  rates?: PricingRates | null
): boolean {
  if (!Number.isFinite(loadedVolumeM3) || loadedVolumeM3 <= 0) return true
  return loadedVolumeM3 <= vehicleCapacityM3(vehicleType, rates)
}

/** Three decimals is ~1 litre — below any resolution the pricing model uses. */
function round3(n: number): number {
  return Math.round(n * 1000) / 1000
}
