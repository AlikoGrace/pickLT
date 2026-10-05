import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import type { InventoryItemDef } from '@/lib/classifyMove'
import { computeMoveVolume, declaredCapacityM3, moverCapacityM3 } from '@/lib/moveVolume'
import { PRICING_DEFAULTS, VEHICLE_TYPES, toPricingConfig } from '@/lib/pricing'
import {
  PricingReconcileError,
  parseBreakdown,
  quoteForMover,
  quoteMove,
  requiredCrewFor,
  serializeBreakdown,
  suggestedUnitPriceEur,
  vehicleClassFor,
  billableHoursFor,
  type QuoteBreakdown,
  type QuoteInput,
} from '@/lib/pricingEngine'
import {
  basketFromWire,
  floorsNoLiftFor,
  haltverbotCountFor,
  normalizeCustomSize,
} from '@/lib/pricingInputs'

/**
 * The web must price identically to the mobile client and to the backend.
 *
 * Three guards:
 *
 *  1. **MoveDNA §5 worked examples** — the spec's own numbers, reproduced to
 *     the cent through the web port of the v3 engine.
 *  2. **The shared golden fixture** (`fixtures/pricing-golden.json`), committed
 *     to pickltmobile and copied here by sub-plan 1. Every v3 case it carries
 *     must reproduce exactly. A diff in the fixture file is a deliberate
 *     pricing change. Never re-baseline it to make a test pass.
 *  3. **Registry parity** — the key set and values of `PRICING_DEFAULTS` must
 *     match the mobile client's `lib/pricing-config.ts` when that repo is
 *     checked out beside this one.
 *
 * This suite exists because the web had no tests, and the mover-selection page
 * quietly quoted €2.00/km — off a field that does not exist on mover_profiles —
 * against a backend charging €1.50/km, for however long it was live.
 */

// ── Fixture catalog (seed rows, in this repo's catalog shape) ────────────────

const SOFA_3: InventoryItemDef = {
  id: 'sofa_3seater', name: 'Sofa (3-seater)', category: 'living_room',
  meta: { widthCm: 200, heightCm: 90, depthCm: 90, weightKg: 70 },
  classificationPoints: 12, moveTypeMinimum: 'regular', unitPriceEur: 26.7, requiredCrew: 1,
}
const BOX: InventoryItemDef = {
  id: 'cardboard_boxes', name: 'Cardboard box', category: 'boxes',
  meta: { widthCm: 60, heightCm: 40, depthCm: 40, weightKg: 15 },
  classificationPoints: 2, moveTypeMinimum: 'light', unitPriceEur: 2.46, requiredCrew: 1,
}
const PIANO: InventoryItemDef = {
  id: 'piano', name: 'Piano', category: 'special',
  meta: { widthCm: 150, heightCm: 120, depthCm: 60, weightKg: 250 },
  classificationPoints: 25, moveTypeMinimum: 'premium', unitPriceEur: 48.3, requiredCrew: 2,
}
const UNPRICED: InventoryItemDef = {
  id: 'lamp', name: 'Lamp', category: 'living_room',
  meta: { widthCm: 30, heightCm: 150, depthCm: 30, weightKg: 4 },
  classificationPoints: 1, moveTypeMinimum: 'light', unitPriceEur: null,
}
const CATALOG = [SOFA_3, BOX, PIANO, UNPRICED]

const EMPTY: QuoteInput['basket'] = { counts: {}, customItems: [] }

function movedna(tier: QuoteInput['tier'], mode: QuoteInput['mode']): QuoteBreakdown {
  // MoveDNA §5: empty basket, 20 km, drive time 0 so hours = the 2 h minimum.
  return quoteMove({ tier, mode, distanceKm: 20, durationSeconds: 0, basket: EMPTY, catalog: CATALOG })
}

// ── 1. MoveDNA §5 worked examples ────────────────────────────────────────────

describe('MoveDNA §5 worked examples (master §6.4)', () => {
  const CASES: [QuoteInput['tier'], QuoteInput['mode'], Partial<QuoteBreakdown>][] = [
    ['light', 'scheduled', { operationalSubtotal: 116, adjustedSubtotal: 116, platformFee: 9.28, net: 125.28, vat: 23.8, total: 149.08 }],
    ['light', 'instant', { operationalSubtotal: 116, adjustedSubtotal: 139.2, modeAdjustment: 23.2, platformFee: 11.14, net: 150.34, vat: 28.56, total: 178.9 }],
    ['regular', 'scheduled', { operationalSubtotal: 253, adjustedSubtotal: 253, platformFee: 20.24, net: 273.24, vat: 51.92, total: 325.16 }],
    ['regular', 'instant', { operationalSubtotal: 253, adjustedSubtotal: 290.95, modeAdjustment: 37.95, platformFee: 23.28, net: 314.23, vat: 59.7, total: 373.93 }],
    ['premium', 'scheduled', { operationalSubtotal: 437, adjustedSubtotal: 437, platformFee: 34.96, net: 471.96, vat: 89.67, total: 561.63 }],
    ['premium', 'instant', { operationalSubtotal: 437, adjustedSubtotal: 480.7, modeAdjustment: 43.7, platformFee: 38.46, net: 519.16, vat: 98.64, total: 617.8 }],
  ]

  it.each(CASES)('%s / %s reproduces the spec to the cent', (tier, mode, expected) => {
    const b = movedna(tier, mode)
    expect(b).toMatchObject({ version: 'v3', currency: 'EUR', tier, mode, ...expected })
    expect(b.minimumApplied).toBe(false)
    expect(b.discount).toBe(0)
  })

  it('charges the tier crew, the tier minimum hours and the tier minimum vehicle', () => {
    expect(movedna('light', 'scheduled').profile).toMatchObject({ crew: 1, billableHours: 2, vehicleType: 'small_van' })
    expect(movedna('regular', 'scheduled').profile).toMatchObject({ crew: 2, billableHours: 2, vehicleType: 'medium_truck' })
    expect(movedna('premium', 'scheduled').profile).toMatchObject({ crew: 3, billableHours: 2, vehicleType: 'large_truck' })
    expect(movedna('light', 'scheduled').lines).toEqual({
      base: 35, distance: 22, vehicle: 15, labor: 44, extraHelpers: 0, items: 0, packing: 0, handling: 0, services: 0, storage: 0,
    })
    expect(movedna('premium', 'scheduled').lines).toMatchObject({ base: 85, distance: 34, vehicle: 45, labor: 168, packing: 65, handling: 40 })
  })

  it('records every rate it read', () => {
    const b = movedna('regular', 'instant')
    expect(b.rates['tier.regular.instantMultiplier']).toBe(1.15)
    expect(b.rates['platformFee.rate']).toBe(0.08)
    expect(b.rates['tax.vatRate']).toBe(0.19)
    expect(Object.keys(b.rates)).toEqual([...Object.keys(b.rates)].sort())
  })
})

// ── 2. Shared golden fixture ─────────────────────────────────────────────────

type GoldenCase = { name?: string; input: QuoteInput; config?: Record<string, number> | null; expected: QuoteBreakdown }

/**
 * Tolerant loader: the fixture is generated by sub-plan 1 and may carry its
 * cases under `quoteMove` or `cases`, with the catalog inline on each input or
 * once at the top level. Catalog rows may be in the mobile shape
 * (`itemId` + top-level dimensions); they are mapped to this repo's shape.
 */
function loadGoldenV3(): GoldenCase[] {
  const file = join(__dirname, 'fixtures', 'pricing-golden.json')
  if (!existsSync(file)) return []
  const raw = JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>
  const list = (raw.quoteMove ?? raw.cases ?? raw.quotes ?? []) as Record<string, unknown>[]
  const topCatalog = Array.isArray(raw.catalog) ? (raw.catalog as Record<string, unknown>[]) : null
  const toItem = (row: Record<string, unknown>): InventoryItemDef =>
    'meta' in row
      ? (row as unknown as InventoryItemDef)
      : {
          id: String(row.itemId ?? row.id),
          name: String(row.name ?? ''),
          category: String(row.category ?? ''),
          meta: {
            widthCm: Number(row.widthCm ?? 0), heightCm: Number(row.heightCm ?? 0),
            depthCm: Number(row.depthCm ?? 0), weightKg: Number(row.weightKg ?? 0),
          },
          classificationPoints: Number(row.moveClassificationWeight ?? row.classificationPoints ?? 3),
          moveTypeMinimum: (row.moveTypeMinimum as InventoryItemDef['moveTypeMinimum']) ?? 'light',
          unitPriceEur: (row.unitPriceEur as number | null | undefined) ?? null,
          requiredCrew: (row.requiredCrew as number | null | undefined) ?? 1,
        }
  return list
    .filter((c) => c && typeof c === 'object' && c.input && c.expected && (c.expected as QuoteBreakdown).version === 'v3')
    .map((c) => {
      const input = { ...(c.input as QuoteInput) }
      const catalogRows = (Array.isArray(input.catalog) ? input.catalog : topCatalog ?? []) as unknown as Record<string, unknown>[]
      input.catalog = catalogRows.map(toItem)
      return { name: c.name as string | undefined, input, config: (c.config as Record<string, number> | null) ?? null, expected: c.expected as QuoteBreakdown }
    })
}

describe('golden fixture — quoteMove (shared with pickltmobile)', () => {
  const cases = loadGoldenV3()

  it('is present in its v3 shape (sub-plan 1 regenerates and copies it)', () => {
    // Until the regenerated fixture lands this is the one assertion that may
    // fail; the MoveDNA examples above pin the arithmetic in the meantime.
    expect(cases.length, 'no v3 quoteMove cases found in fixtures/pricing-golden.json').toBeGreaterThan(0)
  })

  it.each(cases.map((c, i) => [c.name ?? `case ${i}`, c] as const))('%s reproduces exactly', (_name, c) => {
    const got = quoteMove(c.input, c.config ? toPricingConfig(c.config) : null)
    expect(JSON.parse(serializeBreakdown(got))).toEqual(JSON.parse(serializeBreakdown(c.expected)))
  })
})

// ── 3. Registry parity ───────────────────────────────────────────────────────

describe('registry — PRICING_DEFAULTS', () => {
  it('is exactly the 75-key v3 registry of master §5', () => {
    expect(Object.keys(PRICING_DEFAULTS)).toHaveLength(75)
    for (const legacy of ['instant.', 'scheduled.', 'mover.', 'pricing.model', 'pricing.local', 'pricing.volume', 'pricing.access', 'pricing.leadTime']) {
      expect(Object.keys(PRICING_DEFAULTS).filter((k) => k.startsWith(legacy))).toEqual([])
    }
    expect(Object.keys(PRICING_DEFAULTS)).not.toContain('commissionRate')
  })

  it('matches the mobile client registry when that repo is checked out alongside', () => {
    const mobile = join(__dirname, '..', '..', '..', '..', 'pickltmobile', 'lib', 'pricing-config.ts')
    if (!existsSync(mobile)) return
    const src = readFileSync(mobile, 'utf8')
    const theirs: Record<string, number> = {}
    for (const m of src.matchAll(/^\s*'([a-zA-Z0-9_.]+)':\s*(-?[0-9.]+),/gm)) theirs[m[1]] = Number(m[2])
    expect(theirs).toEqual(PRICING_DEFAULTS)
  })

  it('has a vehicle charge and a capacity for every schema vehicle class', () => {
    expect([...VEHICLE_TYPES].sort()).toEqual(['large_truck', 'medium_truck', 'small_van'])
    for (const v of VEHICLE_TYPES) {
      expect(PRICING_DEFAULTS[`vehicle.charge.${v}` as keyof typeof PRICING_DEFAULTS]).toBeTypeOf('number')
      expect(PRICING_DEFAULTS[`capacityM3.${v}` as keyof typeof PRICING_DEFAULTS]).toBeTypeOf('number')
    }
  })

  it('drops unknown keys and non-finite values when reading rows', () => {
    const cfg = toPricingConfig([
      { key: 'tax.vatRate', value: 0.07 },
      { key: 'instant.baseRatePerKm', value: 1.5 },
      { key: 'platformFee.rate', value: 'abc' },
      { key: 'pricing.minimumCharge', value: '60' },
    ])
    expect(cfg).toEqual({ 'tax.vatRate': 0.07, 'pricing.minimumCharge': 60 })
    expect(toPricingConfig({ 'storage.perWeek': 25, bogus: 1 })).toEqual({ 'storage.perWeek': 25 })
  })
})

// ── 4. Engine behaviour (master §6.3 / §6.4 extra cases) ─────────────────────

describe('quoteMove — items, crew, vehicle, floor, discount', () => {
  const base = (over: Partial<QuoteInput>): QuoteInput => ({
    tier: 'light', mode: 'scheduled', distanceKm: 20, durationSeconds: 0, basket: EMPTY, catalog: CATALOG, ...over,
  })

  it('prices the basket at admin unit prices (2 × sofa @ 26.70 + 10 × box @ 2.46 = 78.00)', () => {
    const b = quoteMove(base({ basket: { counts: { sofa_3seater: 2, cardboard_boxes: 10 }, customItems: [] } }))
    expect(b.lines.items).toBe(78)
    expect(b.itemLines).toEqual([
      { key: 'cardboard_boxes', qty: 10, unitEur: 2.46, amountEur: 24.6 },
      { key: 'sofa_3seater', qty: 2, unitEur: 26.7, amountEur: 53.4 },
    ])
    expect(b.profile.itemCount).toBe(12)
    expect(b.profile.weightKg).toBe(290)
  })

  it('prices custom items by size band and flags unpriced / unknown catalog items', () => {
    const b = quoteMove(base({
      basket: { counts: { lamp: 1, ghost_item: 3 }, customItems: [{ quantity: 2, approxSize: 'large', approxWeight: 10 }, { quantity: 1, approxSize: 'banana' }] },
    }))
    expect(b.lines.items).toBe(2 * 12 + 6)
    expect(b.assumptions.unpricedItemIds).toEqual(['lamp'])
    expect(b.assumptions.unknownItemIds).toEqual(['ghost_item'])
    expect(b.itemLines.map((l) => l.key)).toEqual(['lamp', 'custom:large', 'custom:banana'])
  })

  it('forces a second mover from volume (> 15 m³ loaded) and bills the crew', () => {
    // 10 sofas = 16.2 m³ raw → 21.87 m³ loaded → 2 movers; light tier crew is 1.
    const b = quoteMove(base({ basket: { counts: { sofa_3seater: 10 }, customItems: [] } }))
    expect(b.profile.requiredCrew).toBe(2)
    expect(b.profile.crew).toBe(2)
    expect(b.flags.crewCapped).toBe(false)
    // hours = max(2, ceilQuarter(21.87 × 0.2 / 2)) = max(2, 2.25) = 2.25 → 2 × 22 × 2.25
    expect(b.profile.billableHours).toBe(2.25)
    expect(b.lines.labor).toBe(99)
    expect(requiredCrewFor({ counts: { sofa_3seater: 10 }, customItems: [] }, CATALOG, b.profile.loadedVolumeM3)).toBe(2)
  })

  it('forces the crew from a single item’s requiredCrew (piano = 2)', () => {
    const b = quoteMove(base({ basket: { counts: { piano: 1 }, customItems: [] } }))
    expect(b.profile.requiredCrew).toBe(2)
    expect(b.profile.crew).toBe(2)
  })

  it('caps the crew at crew.max and says so', () => {
    const b = quoteMove(base({ basket: { counts: { sofa_3seater: 40 }, customItems: [] } }))
    expect(b.profile.requiredCrew).toBe(4)
    expect(b.flags.crewCapped).toBe(true)
  })

  it('picks the smallest vehicle that fits, floored by the tier, and flags an impossible load', () => {
    expect(vehicleClassFor('light', 0)).toEqual({ vehicleType: 'small_van', fits: true })
    expect(vehicleClassFor('light', 12)).toEqual({ vehicleType: 'medium_truck', fits: true })
    expect(vehicleClassFor('regular', 1)).toEqual({ vehicleType: 'medium_truck', fits: true })
    expect(vehicleClassFor('premium', 1)).toEqual({ vehicleType: 'large_truck', fits: true })
    expect(vehicleClassFor('light', 46)).toEqual({ vehicleType: 'large_truck', fits: false })
    const b = quoteMove(base({ basket: { counts: { sofa_3seater: 40 }, customItems: [] } }))
    expect(b.flags.exceedsLargestVehicle).toBe(true)
    expect(b.profile.vehicleType).toBe('large_truck')
  })

  it('charges the selected mover’s vehicle class when one is given', () => {
    const b = quoteMove(base({ vehicleType: 'large_truck' }))
    expect(b.profile.vehicleType).toBe('large_truck')
    expect(b.lines.vehicle).toBe(45)
    expect(b.flags.exceedsLargestVehicle).toBe(false)
    // An unknown class falls back to resolving from the load.
    expect(quoteMove(base({ vehicleType: 'multiple' })).profile.vehicleType).toBe('small_van')
  })

  it('bills drive time to the quarter hour above the minimum', () => {
    expect(billableHoursFor('light', 0, 1, 0)).toBe(2)
    expect(billableHoursFor('light', 0, 1, 2 * 3600 + 60)).toBe(2.25)
    expect(billableHoursFor('light', 0, 1, 3 * 3600)).toBe(3)
    const b = quoteMove(base({ durationSeconds: 2 * 3600 + 60 }))
    expect(b.lines.labor).toBe(49.5)
  })

  it('adds floors without a lift, Halteverbot, packing, services and storage', () => {
    const b = quoteMove(base({
      floorsNoLift: 3, haltverbotCount: 2, packingLevel: 'full',
      services: ['furniture_assembly', 'furniture_assembly', 'unknown_service', 'temporary_storage'], storageWeeks: 2,
    }))
    expect(b.lines.handling).toBe(45)
    expect(b.lines.packing).toBe(120)
    expect(b.lines.services).toBe(50)
    expect(b.serviceLines).toEqual([
      { key: 'furniture_assembly', amountEur: 50 },
      { key: 'temporary_storage', amountEur: 0 },
      { key: 'unknown_service', amountEur: 0 },
    ])
    expect(b.lines.storage).toBe(60)
    expect(b.operationalSubtotal).toBe(116 + 45 + 120 + 50 + 60)
  })

  it('applies the discount, then the minimum charge, then VAT', () => {
    const b = quoteMove(base({ discountEur: 100 }))
    // 116 + 9.28 fee − 100 = 25.28 → floored at 49.
    expect(b.discount).toBe(100)
    expect(b.minimumApplied).toBe(true)
    expect(b.net).toBe(49)
    expect(b.vat).toBe(9.31)
    expect(b.total).toBe(58.31)
    // A discount can never exceed what is owed.
    expect(quoteMove(base({ discountEur: 10_000 })).discount).toBe(125.28)
  })

  it('honours admin overrides, including an explicit 0', () => {
    const b = quoteMove(base({}), { 'tier.light.basePrice': 0, 'platformFee.rate': 0.1, 'tax.vatRate': 0 })
    expect(b.lines.base).toBe(0)
    expect(b.platformFee).toBe(8.1)
    expect(b.vat).toBe(0)
    expect(b.total).toBe(b.net)
  })

  it('tolerates junk inputs', () => {
    const b = quoteMove({
      tier: 'bogus' as never, mode: 'later' as never, distanceKm: Number.NaN, durationSeconds: -5,
      basket: { counts: { sofa_3seater: -1 }, customItems: [{ quantity: Number.NaN }] }, catalog: CATALOG,
      floorsNoLift: -2, storageWeeks: 1.9,
    })
    expect(b.tier).toBe('light')
    expect(b.mode).toBe('scheduled')
    expect(b.lines.distance).toBe(0)
    expect(b.lines.items).toBe(0)
    expect(b.lines.storage).toBe(30)
  })

  it('suggests a unit price from weight and bounding-box volume', () => {
    // 70 kg × 0.15 + 1.62 m³ × 10 = 10.5 + 16.2
    expect(suggestedUnitPriceEur(SOFA_3.meta)).toBe(26.7)
    expect(suggestedUnitPriceEur({ weightKg: null, widthCm: 0, heightCm: 0, depthCm: 0 })).toBe(0)
  })

  it('exports a reconcile error class', () => {
    expect(new PricingReconcileError('x')).toBeInstanceOf(Error)
  })
})

describe('quoteForMover — the instant list', () => {
  const input: Omit<QuoteInput, 'vehicleType'> = {
    tier: 'regular', mode: 'instant', distanceKm: 20, durationSeconds: 0,
    basket: { counts: { piano: 1 }, customItems: [] }, catalog: CATALOG,
  }

  it('varies the price by vehicle class only and gates on crew', () => {
    const van = quoteForMover(input, { vehicleType: 'small_van', crewSize: 2 })
    const truck = quoteForMover(input, { vehicleType: 'large_truck', crewSize: 3 })
    expect(van.eligible).toBe(true)
    expect(truck.eligible).toBe(true)
    expect(truck.quote.operationalSubtotal - van.quote.operationalSubtotal).toBe(30)
    expect(van.quote.profile.crew).toBe(2)
    expect(truck.quote.profile.crew).toBe(2)

    const solo = quoteForMover(input, { vehicleType: 'small_van', crewSize: 1 })
    expect(solo.eligible).toBe(false)
    expect(solo.reason).toBe('crew')
    expect(solo.quote.total).toBe(van.quote.total)
  })
})

describe('serializeBreakdown / parseBreakdown', () => {
  it('round-trips with stable key order', () => {
    const b = movedna('regular', 'instant')
    const json = serializeBreakdown(b)
    expect(json).toBe(serializeBreakdown(JSON.parse(json)))
    expect(json.indexOf('"adjustedSubtotal"')).toBeLessThan(json.indexOf('"assumptions"'))
    expect(parseBreakdown(json)).toEqual(b)
    expect(parseBreakdown(JSON.parse(json))).toEqual(b)
  })

  it('returns null for anything that is not a v3 breakdown', () => {
    expect(parseBreakdown(null)).toBeNull()
    expect(parseBreakdown('')).toBeNull()
    expect(parseBreakdown('not json')).toBeNull()
    expect(parseBreakdown('{"version":"v2","total":10}')).toBeNull()
    expect(parseBreakdown({ version: 'v3', currency: 'EUR', tier: 'light', mode: 'instant', total: 'x' })).toBeNull()
  })
})

// ── 5. Web adapters (lib/pricingInputs.ts) ───────────────────────────────────

describe('pricingInputs — the shapes this app stores', () => {
  it('reads the moves-column encodings and the wizard context alike', () => {
    const fromRow = basketFromWire('{"sofa_3seater":2,"cardboard_boxes":"3","bad":0}', [
      '{"id":"c1","name":"Lamp","quantity":1,"approxSize":"Large","approxWeight":"4 kg"}',
      '{"quantity":0}',
      'not json',
    ])
    expect(fromRow.counts).toEqual({ sofa_3seater: 2, cardboard_boxes: 3 })
    expect(fromRow.customItems).toEqual([{ quantity: 1, approxSize: 'large', approxWeight: 4 }])

    const fromContext = basketFromWire({ piano: 1 }, [{ id: 'c', name: 'x', quantity: 2, approxSize: '', approxWeight: '' }])
    expect(fromContext).toEqual({ counts: { piano: 1 }, customItems: [{ quantity: 2, approxSize: 'medium', approxWeight: 0 }] })
    expect(basketFromWire(null, undefined)).toEqual({ counts: {}, customItems: [] })
  })

  it('maps free-text sizes to a band, defaulting to medium', () => {
    expect(normalizeCustomSize('extra large')).toBe('extra_large')
    expect(normalizeCustomSize('XL')).toBe('extra_large')
    expect(normalizeCustomSize(' Small ')).toBe('small')
    expect(normalizeCustomSize('riesig')).toBe('medium')
    expect(normalizeCustomSize(undefined)).toBe('medium')
  })

  it('counts floors without a lift and Halteverbot addresses', () => {
    expect(floorsNoLiftFor({ pickupFloorLevel: '3', pickupElevator: false, dropoffFloorLevel: '2', dropoffElevator: true })).toBe(3)
    expect(floorsNoLiftFor({ pickupFloorLevel: 'ground', pickupElevator: false, dropoffFloorLevel: '5plus', dropoffElevator: false })).toBe(5)
    expect(floorsNoLiftFor({})).toBe(0)
    expect(haltverbotCountFor(true, true)).toBe(2)
    expect(haltverbotCountFor(false, null)).toBe(0)
  })
})

// ── 6. Capacity + volume parity (unchanged from the legacy suite) ────────────

describe('capacity — parity with the mobile client', () => {
  it('resolves declared capacity identically', () => {
    expect(declaredCapacityM3('20')).toBe(20)
    expect(declaredCapacityM3(' 12 ')).toBe(12)
    expect(declaredCapacityM3('12 m³')).toBe(12)
    expect(declaredCapacityM3('big')).toBeNull()
    expect(declaredCapacityM3(0)).toBeNull()
    expect(declaredCapacityM3(2000)).toBeNull()
  })

  it('prefers a declared figure over the class band', () => {
    expect(moverCapacityM3({ vehicleType: 'large_truck', vehicleCapacity: '65' })).toBe(65)
    expect(moverCapacityM3({ vehicleType: 'large_truck', vehicleCapacity: null })).toBe(45)
  })
})

describe('volume — parity with the mobile client', () => {
  it('computes the same cubic metres', () => {
    const v = computeMoveVolume({ sofa_3seater: 1 }, [], [SOFA_3])
    expect(v.rawVolumeM3).toBeCloseTo(1.62, 3)
    expect(v.loadedVolumeM3).toBeCloseTo(1.62 * 1.35, 2)
  })

  it('never yields NaN on missing dimensions', () => {
    const broken = { ...SOFA_3, meta: { ...SOFA_3.meta, widthCm: null as unknown as number } }
    expect(computeMoveVolume({ sofa_3seater: 2 }, [], [broken]).loadedVolumeM3).toBe(0)
  })
})

// ── 4. Extra helpers (crew master D2) ────────────────────────────────────────

describe('extra helpers', () => {
  const input: QuoteInput = { tier: 'regular', mode: 'instant', distanceKm: 20, durationSeconds: 0, basket: EMPTY, catalog: CATALOG }

  it('bills extraHelpers × labour rate × billable hours, through the instant multiplier', () => {
    const b = quoteMove({ ...input, extraHelpers: 2 })
    const none = quoteMove(input)
    expect(b.lines.extraHelpers).toBe(2 * 24 * 2)
    expect(b.profile).toMatchObject({ crew: 2, extraHelpers: 2, totalCrew: 4, billableHours: none.profile.billableHours })
    expect(b.operationalSubtotal).toBe(none.operationalSubtotal + 96)
    expect(b.adjustedSubtotal).toBeCloseTo((none.operationalSubtotal + 96) * 1.15, 2)
    const sum = Object.values(b.lines).reduce((acc, v) => acc + Math.round(v * 100), 0)
    expect(sum).toBe(Math.round(b.operationalSubtotal * 100))
  })

  it('clamps to 0…crew.maxExtraHelpers and records the cap only when asked', () => {
    expect(quoteMove({ ...input, extraHelpers: 8 }).profile.extraHelpers).toBe(3)
    expect(quoteMove({ ...input, extraHelpers: -1 }).profile.extraHelpers).toBe(0)
    expect(quoteMove({ ...input, extraHelpers: 2 }, toPricingConfig([{ key: 'crew.maxExtraHelpers', value: 1 }])).profile.extraHelpers).toBe(1)
    expect('crew.maxExtraHelpers' in quoteMove(input).rates).toBe(false)
  })

  it('reads a stored quote without the fields as "no extras"', () => {
    const legacy = JSON.parse(serializeBreakdown(quoteMove(input)))
    delete legacy.lines.extraHelpers
    delete legacy.profile.extraHelpers
    delete legacy.profile.totalCrew
    expect(parseBreakdown(legacy)).toMatchObject({ lines: { extraHelpers: 0 }, profile: { extraHelpers: 0, totalCrew: 2 } })
  })
})
