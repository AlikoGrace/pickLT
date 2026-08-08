import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { computeMoveVolume, declaredCapacityM3, moverCapacityM3 } from '@/lib/moveVolume'
import { instantRouteBase, PRICING_DEFAULTS, priceForMover, VEHICLE_TYPES } from '@/lib/pricing'

/**
 * The web must price identically to the mobile client and to the backend.
 *
 * `fixtures/pricing-golden.json` is byte-identical to the copy in
 * `pickltmobile/__tests__/fixtures/`. The `instantRouteBase` expectations in it
 * were captured from the **deployed** `calculateprice` function, so passing
 * here means this page agrees with what customers are actually charged.
 *
 * This suite exists because the web had no tests, and the mover-selection page
 * quietly quoted €2.00/km — off a field that does not exist on mover_profiles —
 * against a backend charging €1.50/km, for however long it was live.
 *
 * A diff in the fixture file is a deliberate pricing change. Never re-baseline
 * it to make a test pass.
 */

const GOLDEN = JSON.parse(
  readFileSync(join(__dirname, 'fixtures', 'pricing-golden.json'), 'utf8')
) as {
  priceForMover: {
    routeBaseEur: number
    mover: { vehicleType: string; crewSize: number }
    totalItems: number
    expected: number
  }[]
  instantRouteBase: { input: Record<string, unknown>; expected: Record<string, number> }[]
}

describe('golden fixtures — priceForMover', () => {
  it('matches the mobile client on every committed case', () => {
    const wrong = GOLDEN.priceForMover
      .map((c) => ({ c, got: priceForMover(c.routeBaseEur, c.mover, c.totalItems) }))
      .filter(({ c, got }) => got !== c.expected)
      .map(({ c, got }) => `${c.mover.vehicleType}/${c.mover.crewSize}/${c.totalItems}@${c.routeBaseEur}: ${got} ≠ ${c.expected}`)
    expect(wrong).toEqual([])
  })
})

describe('golden fixtures — instantRouteBase', () => {
  it('matches the deployed calculateprice on every field of every case', () => {
    const wrong: string[] = []
    for (const { input, expected } of GOLDEN.instantRouteBase) {
      const got = instantRouteBase(input as never) as unknown as Record<string, number>
      for (const key of Object.keys(expected)) {
        if (got[key] !== expected[key]) {
          wrong.push(`${JSON.stringify(input)} .${key}: ${got[key]} ≠ ${expected[key]}`)
        }
      }
    }
    expect(wrong).toEqual([])
  })

  it('applies the platform minimum, not a raw distance price', () => {
    expect(instantRouteBase({ routeDistanceMeters: 1000, moveType: 'light' }).estimatedPrice).toBe(
      PRICING_DEFAULTS['instant.minimumPrice']
    )
  })
})

describe('vehicle classes', () => {
  // The page used to key on medium_van / large_van / truck / car — none of
  // which the schema can hold — so every real mover hit a fallback arm.
  it('are exactly the schema enum', () => {
    expect([...VEHICLE_TYPES].sort()).toEqual(['large_truck', 'medium_truck', 'small_van'])
  })

  it('has a surcharge rate defined for each', () => {
    for (const v of VEHICLE_TYPES) {
      expect(PRICING_DEFAULTS[`mover.vehicle.${v}`]).toBeTypeOf('number')
      expect(PRICING_DEFAULTS[`capacityM3.${v}`]).toBeTypeOf('number')
    }
  })
})

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
  // Same seed rows the mobile suite uses, in this repo's catalog shape.
  const SOFA_3 = {
    id: 'sofa_3seater', name: 'Sofa (3-seater)', category: 'living_room',
    meta: { widthCm: 200, heightCm: 90, depthCm: 90, weightKg: 70 },
    classificationPoints: 12, moveTypeMinimum: 'regular' as const,
  }

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
