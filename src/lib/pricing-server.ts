import type { Databases, Models } from 'node-appwrite'
import { Query } from 'node-appwrite'
import { APPWRITE } from '@/lib/constants'
import type { InventoryItemDef } from '@/lib/classifyMove'
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
    vehicleType: breakdown.profile.vehicleType,
    crewSize: String(breakdown.profile.crew),
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
