import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import {
  classifyMove,
  DEFAULT_CLASSIFY_THRESHOLDS,
  enforcedTier,
  thresholdsFromConfig,
  type CustomItemInput,
  type InventoryItemDef,
} from '@/lib/classifyMove'
import type { MoveType } from '@/lib/types'

/**
 * The web port of pickltmobile/lib/classify-move.ts (crew master §4). It must
 * decide exactly as the app and the server: points, weight, item count and
 * LOADED volume (raw bounding-box m³ × packing factor) against the thresholds,
 * custom items by size band, then the per-item `moveTypeMinimum` floor. The
 * shared golden fixture's `classification` blocks pin the cross-repo answer.
 */

type Row = Record<string, unknown>
const toItem = (row: Row): InventoryItemDef => ({
  id: String(row.itemId),
  name: String(row.name),
  category: String(row.category),
  meta: {
    widthCm: Number(row.widthCm), heightCm: Number(row.heightCm),
    depthCm: Number(row.depthCm), weightKg: Number(row.weightKg),
  },
  classificationPoints: Number(row.moveClassificationWeight),
  moveTypeMinimum: row.moveTypeMinimum as MoveType,
})

const GOLDEN = JSON.parse(readFileSync(join(__dirname, 'fixtures', 'pricing-golden.json'), 'utf8')) as {
  quoteMove: {
    name: string
    input: { basket: { counts: Record<string, number>; customItems: Row[] }; catalog: Row[] }
    classification?: { currentType: MoveType; expected: Record<string, unknown> }
  }[]
}

const item = (id: string, w: number, h: number, d: number, kg: number, pts: number, min: MoveType = 'light'): InventoryItemDef => ({
  id, name: id, category: 'x', meta: { widthCm: w, heightCm: h, depthCm: d, weightKg: kg }, classificationPoints: pts, moveTypeMinimum: min,
})
const SECTIONAL = item('sectional', 300, 90, 200, 60, 4)
const PIANO = item('piano', 150, 130, 60, 200, 25, 'premium')
const CHAIR = item('chairs', 45, 90, 50, 5, 1)
const CATALOG = [SECTIONAL, PIANO, CHAIR]

describe('golden fixture classification blocks (shared with pickltmobile)', () => {
  const cases = GOLDEN.quoteMove.filter((c) => c.classification)
  it('carries the tier cases', () => {
    expect(cases.map((c) => c.name).sort()).toEqual(['tier-by-volume-sofa-heavy', 'tier-floor-piano'])
  })
  it.each(cases.map((c) => [c.name, c] as const))('%s', (_n, c) => {
    const custom: CustomItemInput[] = c.input.basket.customItems.map((ci) => ({
      id: String(ci.id), name: String(ci.name), quantity: Number(ci.quantity),
      estimatedWeightKg: Number(ci.approxWeight), approxSize: String(ci.approxSize),
    }))
    const r = classifyMove(c.input.basket.counts, custom, c.classification!.currentType, c.input.catalog.map(toItem))
    expect(r).toMatchObject(c.classification!.expected)
  })
})

describe('classifyMove (web port)', () => {
  it('loaded volume alone pushes Normal → Medium → Premium (10 / 25 m³ loaded)', () => {
    expect(classifyMove({ sectional: 1 }, [], 'light', CATALOG)).toMatchObject({ recommendedType: 'light', totalVolumeM3: 5.4, loadedVolumeM3: 7.29 })
    expect(classifyMove({ sectional: 2 }, [], 'light', CATALOG)).toMatchObject({ recommendedType: 'regular', loadedVolumeM3: 14.58, requiresUpgrade: true })
    expect(classifyMove({ sectional: 4 }, [], 'light', CATALOG)).toMatchObject({ recommendedType: 'premium', loadedVolumeM3: 29.16, totalPoints: 16 })
  })

  it('keeps the moveTypeMinimum floor: one piano is Premium', () => {
    expect(classifyMove({ piano: 1 }, [], 'light', CATALOG)).toMatchObject({ recommendedType: 'premium', upgradeTo: 'premium', upgradeFrom: 'light' })
  })

  it('counts custom items by size band (points 2/5/10/18, m³ 0.1/0.5/1.5/3; unknown → medium)', () => {
    const ci = (approxSize: string | undefined, quantity = 1): CustomItemInput => ({ id: 'c', name: 'c', quantity, approxSize, estimatedWeightKg: 1 })
    expect(classifyMove({}, [ci('small')], 'light', CATALOG)).toMatchObject({ totalPoints: 2, totalVolumeM3: 0.1 })
    expect(classifyMove({}, [ci('large')], 'light', CATALOG)).toMatchObject({ totalPoints: 10, totalVolumeM3: 1.5 })
    expect(classifyMove({}, [ci('extra_large', 2)], 'light', CATALOG)).toMatchObject({ totalPoints: 36, totalVolumeM3: 6, totalWeightKg: 2 })
    expect(classifyMove({}, [ci(undefined)], 'light', CATALOG)).toMatchObject({ totalPoints: 5, totalVolumeM3: 0.5 })
  })

  it('honours thresholds and the packing factor from config', () => {
    const tight = thresholdsFromConfig({ 'classify.light.maxM3': 1 })
    expect(classifyMove({ chairs: 3 }, [], 'light', CATALOG, tight).recommendedType).toBe('light')
    expect(classifyMove({ chairs: 4 }, [], 'light', CATALOG, tight).recommendedType).toBe('regular')
    const raw = thresholdsFromConfig({ 'classify.light.maxM3': 1, 'volume.packingFactor': 1 })
    expect(classifyMove({ chairs: 4 }, [], 'light', CATALOG, raw).recommendedType).toBe('light')
  })

  it('thresholdsFromConfig defaults', () => {
    expect(thresholdsFromConfig(null)).toEqual(DEFAULT_CLASSIFY_THRESHOLDS)
    expect(DEFAULT_CLASSIFY_THRESHOLDS).toEqual({
      light: { maxPoints: 25, maxWeightKg: 200, maxItems: 15, maxM3: 10 },
      regular: { maxPoints: 80, maxWeightKg: 800, maxItems: 40, maxM3: 25 },
      packingFactor: 1.35,
    })
  })

  it('enforcedTier is the higher tier', () => {
    expect(enforcedTier('light', 'premium')).toBe('premium')
    expect(enforcedTier('premium', 'regular')).toBe('premium')
    expect(enforcedTier('regular', 'light')).toBe('regular')
  })
})
