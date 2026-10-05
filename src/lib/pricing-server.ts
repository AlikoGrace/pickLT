import type { Databases, Models } from 'node-appwrite'
import { Query } from 'node-appwrite'
import { APPWRITE } from '@/lib/constants'
import {
  basketCapViolation,
  basketFromWire as normalizedBasketFromWire,
  extraHelpersFromWire,
  serializeBasket,
  type CapViolation,
  type NormalizedBasket,
  type WireBasket,
} from '@/lib/basket-server'
import { classifyMove, enforcedTier, thresholdsFromConfig, type InventoryItemDef } from '@/lib/classifyMove'
import { countryToIso2 } from '@/lib/countryCode'
import { GLOBAL_PRICING_SCOPE, toPricingConfig, type PricingConfig, type PricingConfigRow } from '@/lib/pricing'
import {
  basketFromWire,
  floorsNoLiftFor,
  haltverbotCountFor,
  kmFromMeters,
  secondsFrom,
  servicesFromWire,
} from '@/lib/pricingInputs'
import {
  isServiceTier,
  quoteMove,
  serializeBreakdown,
  type BookingMode,
  type QuoteBreakdown,
  type QuoteInput,
  type ServiceTier,
} from '@/lib/pricingEngine'

/**
 * Server-side pricing: the inputs the route handlers need to be the price
 * authority (master D5).
 *
 * `create-instant` and `create-scheduled` used to persist whatever
 * `estimatedPrice` the browser posted. They now ignore it, load the catalog and
 * the admin rates here, run the same engine the pages run for display, and
 * write the quote columns themselves. Server-only: imports `node-appwrite`.
 */

export const PRICING_CONFIG_COLLECTION =
  process.env.APPWRITE_COLLECTION_PRICING_CONFIG || 'pricing_config'

/** A catalog document as the engine's item definition. */
export function catalogDocToItemDef(doc: Models.Document & Record<string, unknown>): InventoryItemDef {
  const num = (v: unknown, fallback: number) => {
    const n = typeof v === 'number' ? v : Number(v)
    return Number.isFinite(n) ? n : fallback
  }
  const unit = doc.unitPriceEur
  const crew = doc.requiredCrew
  return {
    id: String(doc.itemId || doc.$id),
    name: String(doc.name ?? ''),
    category: String(doc.category ?? ''),
    meta: {
      widthCm: num(doc.widthCm, 0),
      heightCm: num(doc.heightCm, 0),
      depthCm: num(doc.depthCm, 0),
      weightKg: num(doc.weightKg, 0),
    },
    classificationPoints: num(doc.moveClassificationWeight, 3),
    moveTypeMinimum: isServiceTier(doc.moveTypeMinimum) ? doc.moveTypeMinimum : 'light',
    // Null until the admin backfill runs (master §9 step 2); the engine prices a
    // null as 0 and flags the item in `assumptions.unpricedItemIds`.
    unitPriceEur: typeof unit === 'number' && Number.isFinite(unit) ? unit : null,
    requiredCrew: typeof crew === 'number' && Number.isFinite(crew) && crew >= 1 ? Math.floor(crew) : 1,
  }
}

/**
 * Every catalog row. 500, not 200: the admin platform owns this catalog, and
 * silently truncating it would price the missing items at zero.
 */
export async function loadCatalog(databases: Databases): Promise<InventoryItemDef[]> {
  const res = await databases.listDocuments(
    APPWRITE.DATABASE_ID,
    APPWRITE.COLLECTIONS.INVENTORY_CATALOG,
    [Query.limit(500)],
  )
  return res.documents.map((d) => catalogDocToItemDef(d as Models.Document & Record<string, unknown>))
}

/** Appwrite's "no such attribute" failure, for the pre-schema fallback below. */
function isUnknownAttributeError(err: unknown, attribute: string): boolean {
  const msg = err instanceof Error ? err.message : String(err ?? '')
  return /attribute/i.test(msg) && new RegExp(attribute, 'i').test(msg)
}

/**
 * Admin rate overrides. Any failure yields `{}` — the compiled defaults then
 * apply, which is the documented degradation: a config outage must never
 * produce a €0 quote or block a booking.
 *
 * Country scoping (plan `wave-2026-10/4` C4/C5): with a `countryCode` the
 * query fetches the GLOBAL layer and that country's rows (limit 400, so the
 * 200-row ceiling of one country cannot truncate the base) and
 * `toPricingConfig` lays the country over the base. Until the `country`
 * attribute exists on the collection the filtered query fails; the loader then
 * falls back to the unfiltered read, which `toPricingConfig` still scopes
 * correctly (rows without the column are GLOBAL).
 */
export async function loadPricingConfig(databases: Databases, countryCode?: string | null): Promise<PricingConfig> {
  const cc = countryToIso2(countryCode)
  try {
    if (cc) {
      try {
        const res = await databases.listDocuments(APPWRITE.DATABASE_ID, PRICING_CONFIG_COLLECTION, [
          Query.equal('country', [GLOBAL_PRICING_SCOPE, cc]),
          Query.limit(400),
        ])
        return toPricingConfig(res.documents as PricingConfigRow[], cc)
      } catch (err) {
        if (!isUnknownAttributeError(err, 'country')) throw err
        console.warn('[pricing] pricing_config has no `country` attribute yet; loading unscoped')
      }
    }
    const res = await databases.listDocuments(APPWRITE.DATABASE_ID, PRICING_CONFIG_COLLECTION, [
      Query.limit(400),
    ])
    return toPricingConfig(res.documents as PricingConfigRow[], cc)
  } catch (err) {
    console.warn('[pricing] config unavailable, pricing at compiled defaults:', err)
    return {}
  }
}

/** The fields a `moves` row (or a create-route body) contributes to a quote. */
export interface MovePricingFields {
  moveType?: unknown
  moveCategory?: unknown
  routeDistanceMeters?: unknown
  routeDurationSeconds?: unknown
  inventoryItems?: unknown
  customItems?: unknown
  vehicleType?: unknown
  pickupFloorLevel?: unknown
  pickupElevator?: unknown
  dropoffFloorLevel?: unknown
  dropoffElevator?: unknown
  pickupHaltverbot?: unknown
  dropoffHaltverbot?: unknown
  packingServiceLevel?: unknown
  additionalServices?: unknown
  storageWeeks?: unknown
  /** Client-added helpers (crew master D2); the engine clamps to `crew.maxExtraHelpers`. */
  extraHelpers?: unknown
}

/**
 * Build the engine input from row-shaped fields. The same column names the
 * `moves` collection uses, so a stored row and a create body map identically.
 */
export function quoteInputFromMove(
  fields: MovePricingFields,
  catalog: InventoryItemDef[],
  mode: BookingMode,
  countryCode?: string | null,
): QuoteInput {
  const storage = Number(fields.storageWeeks)
  return {
    // The market the quote is priced for (plan wave-2026-10/4 C2); the engine
    // stamps it on the breakdown so the stored quote names its country.
    ...(countryToIso2(countryCode) ? { countryCode: countryToIso2(countryCode) } : {}),
    tier: isServiceTier(fields.moveType) ? fields.moveType : 'regular',
    mode,
    distanceKm: kmFromMeters(fields.routeDistanceMeters),
    durationSeconds: secondsFrom(fields.routeDurationSeconds),
    basket: basketFromWire(fields.inventoryItems, fields.customItems),
    catalog,
    vehicleType: typeof fields.vehicleType === 'string' ? fields.vehicleType : null,
    floorsNoLift: floorsNoLiftFor(fields),
    haltverbotCount: haltverbotCountFor(fields.pickupHaltverbot, fields.dropoffHaltverbot),
    packingLevel: typeof fields.packingServiceLevel === 'string' ? fields.packingServiceLevel : 'none',
    services: servicesFromWire(fields.additionalServices),
    storageWeeks: Number.isFinite(storage) && storage > 0 ? storage : 0,
    extraHelpers: extraHelpersFromWire(fields.extraHelpers),
  }
}

/** The quote columns written on every priced `moves` row (master D13). */
export interface QuoteColumns {
  estimatedPrice: number
  priceBreakdown: string
  pricingVersion: 'v3'
  pricedAt: string
  currency: 'EUR'
  vehicleType: string
  crewSize: string
  /** The clamped extra-helper count actually billed (crew master D2). */
  extraHelpers: number
}

export function quoteColumns(breakdown: QuoteBreakdown, pricedAt = new Date()): QuoteColumns {
  return {
    estimatedPrice: breakdown.total,
    priceBreakdown: serializeBreakdown(breakdown),
    pricingVersion: 'v3',
    pricedAt: pricedAt.toISOString(),
    currency: 'EUR',
    // `moves.vehicleType` / `crewSize` are text columns holding the *charged*
    // class and crew — what the job needs, not what the customer guessed.
    // `crewSize` is the whole crew that turns up: charged crew + extra helpers.
    vehicleType: breakdown.profile.vehicleType,
    crewSize: String(breakdown.profile.totalCrew ?? breakdown.profile.crew),
    extraHelpers: breakdown.profile.extraHelpers ?? 0,
  }
}

/** Quote a row-shaped input end to end. Throws `PricingReconcileError` on a bad quote. */
export async function quoteMoveFields(
  databases: Databases,
  fields: MovePricingFields,
  mode: BookingMode,
  countryCode?: string | null,
): Promise<QuoteBreakdown> {
  const [catalog, config] = await Promise.all([loadCatalog(databases), loadPricingConfig(databases, countryCode)])
  return quoteMove(quoteInputFromMove(fields, catalog, mode, countryCode), config)
}

/** A basket with a count over the caps (`inventory.quantityTooHigh`, HTTP 400). */
export class BasketCapError extends Error {
  readonly fnCode = 'inventory.quantityTooHigh'
  constructor(readonly violation: CapViolation) {
    super(`Too many of one item (at most ${violation.max})`)
    this.name = 'BasketCapError'
  }
}

/** Server totals + tier for a basket (crew master D5; inventory parity plan). */
export interface BasketClassification {
  /** The tier priced and stored: max(client tier, classified tier). */
  moveType: ServiceTier
  /** The classified tier. */
  systemMoveType: ServiceTier
  totalItemCount: number
  totalWeightKg: number
  totalVolumeCm3: number
}

/**
 * Totals and the enforced tier, with the admin thresholds (`classify.*`). Same
 * decision and the same three totals as the functions' `classifyBasket`:
 * catalog + custom QUANTITIES, custom weight and size-band volume included.
 */
export function classifyBasketServer(
  basket: NormalizedBasket,
  catalog: InventoryItemDef[],
  config: PricingConfig,
  clientTier: unknown,
  fallbackTier: ServiceTier,
): BasketClassification {
  const c = classifyMove(
    basket.counts,
    basket.customItems.map((ci) => ({
      id: ci.id,
      name: ci.name,
      quantity: ci.quantity,
      approxSize: ci.approxSize,
      estimatedWeightKg: ci.approxWeight,
    })),
    'light',
    catalog,
    thresholdsFromConfig(config as Partial<Record<string, number>>),
  )
  const client = isServiceTier(clientTier) ? clientTier : fallbackTier
  return {
    moveType: enforcedTier(client, c.recommendedType),
    systemMoveType: c.recommendedType,
    totalItemCount: c.totalItems,
    totalWeightKg: Math.round(c.totalWeightKg * 1000) / 1000,
    totalVolumeCm3: Math.round(c.totalVolumeM3 * 1_000_000),
  }
}

export interface PricedMove {
  breakdown: QuoteBreakdown
  /** Quote columns (estimatedPrice … crewSize, extraHelpers). */
  columns: QuoteColumns
  /** Tier + totals columns (moveType, systemMoveType, totalItemCount, totalWeightKg, totalVolumeCm3). */
  classification: BasketClassification
  /** The normalised basket in the `moves` column shapes — write these, not the body's. */
  basket: WireBasket
}

/**
 * The create routes' price authority (master D5 + crew master D5): normalise
 * and cap the basket (throws `BasketCapError`), classify it with the admin
 * thresholds, price at the enforced tier and hand back every column to write.
 * Client totals and the client's tier as a ceiling are ignored. Throws
 * `PricingReconcileError` on a bad quote.
 */
export async function priceMoveFields(
  databases: Databases,
  fields: MovePricingFields,
  mode: BookingMode,
  countryCode: string | null | undefined,
  fallbackTier: ServiceTier,
): Promise<PricedMove> {
  const [catalog, config] = await Promise.all([loadCatalog(databases), loadPricingConfig(databases, countryCode)])
  const basket = normalizedBasketFromWire(fields.inventoryItems, fields.customItems)
  const violation = basketCapViolation(basket, catalog)
  if (violation) throw new BasketCapError(violation)
  const classification = classifyBasketServer(basket, catalog, config, fields.moveType, fallbackTier)
  const breakdown = quoteMove(
    quoteInputFromMove({ ...fields, moveType: classification.moveType }, catalog, mode, countryCode),
    config,
  )
  return { breakdown, columns: quoteColumns(breakdown), classification, basket: serializeBasket(basket) }
}
