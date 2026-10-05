import { describe, expect, it } from 'vitest'

import {
  capFor,
  compareCategoryByKnownOrder,
  customItemFromDraft,
  expandForSearch,
  foldForSearch,
  MAX_ITEM_QTY,
  MAX_SPECIAL_ITEM_QTY,
  parseWeightKg,
  proposeChange,
  resolveUpgrade,
  searchCatalog,
  selectableItems,
  setCount,
  setCustomQuantity,
  tabCategories,
  type CatalogItem,
  type CustomItem,
  type SelectorState,
} from '../selector-logic'

/**
 * The web `<InventorySelector>` logic, pinned against the mobile selector's
 * behaviour (crew plan 1): search, category order, caps, custom-item
 * validation and the upgrade-with-undo flow.
 */

const item = (
  id: string,
  name: string,
  category: string,
  extra: Partial<CatalogItem> = {},
): CatalogItem => ({
  id,
  name,
  category,
  meta: { widthCm: 50, heightCm: 50, depthCm: 50, weightKg: 10 },
  classificationPoints: 2,
  moveTypeMinimum: 'light',
  ...extra,
})

const CATALOG: CatalogItem[] = [
  item('piano', 'Piano', 'special', { moveTypeMinimum: 'premium', classificationPoints: 25 }),
  item('box', 'Moving box', 'boxes'),
  item('kuehl', 'Kühlschrank', 'kitchen', { englishName: 'Fridge' }),
  item('sofa_2', '2-Sitzer-Sofa', 'living_room', { englishName: 'Sofa (2-seater)' }),
  item('desk', 'Desk', 'office'),
  item('bed', 'Bed', 'bedroom'),
  item('daybed', 'Daybed', 'bedroom'),
  item('garden_chair', 'Garden chair', 'garden'),
  item('old_tv', 'Old TV', 'living_room', { isActive: false }),
]

describe('categories', () => {
  it('sorts tabs by the known order, unknown slugs last, special excluded', () => {
    expect(tabCategories(CATALOG)).toEqual(['living_room', 'bedroom', 'kitchen', 'office', 'boxes', 'garden'])
  })

  it('the default tab is the first present', () => {
    expect(tabCategories([item('a', 'A', 'office'), item('b', 'B', 'kitchen')])[0]).toBe('kitchen')
  })

  it('keeps unknown slugs in catalog order', () => {
    expect(['zeta', 'alpha', 'bedroom'].sort(compareCategoryByKnownOrder)).toEqual(['bedroom', 'zeta', 'alpha'])
  })

  it('hides inactive items from the selector', () => {
    expect(selectableItems(CATALOG).map((i) => i.id)).not.toContain('old_tv')
    expect(selectableItems(CATALOG)).toHaveLength(CATALOG.length - 1)
  })
})

describe('search', () => {
  it('folds and expands diacritics', () => {
    expect(foldForSearch('Kühlschrank')).toBe('kuhlschrank')
    expect(expandForSearch('Kühlschrank')).toBe('kuehlschrank')
    expect(foldForSearch('groß')).toBe('gross')
  })

  it('matches the localized name with or without diacritics', () => {
    expect(searchCatalog(CATALOG, 'kuhl', 'de').map((i) => i.id)).toEqual(['kuehl'])
    expect(searchCatalog(CATALOG, 'kuehl', 'de').map((i) => i.id)).toEqual(['kuehl'])
  })

  it('matches the English name and the id', () => {
    expect(searchCatalog(CATALOG, 'fridge', 'de').map((i) => i.id)).toEqual(['kuehl'])
    expect(searchCatalog(CATALOG, 'sofa', 'de').map((i) => i.id)).toEqual(['sofa_2'])
    expect(searchCatalog(CATALOG, '2 sitzer', 'de').map((i) => i.id)).toEqual(['sofa_2'])
  })

  it('spans every category, prefix hits first', () => {
    expect(searchCatalog(CATALOG, 'bed', 'en').map((i) => i.id)).toEqual(['bed', 'daybed'])
    expect(searchCatalog(CATALOG, 'piano', 'en').map((i) => i.id)).toEqual(['piano'])
  })

  it('an empty query finds nothing', () => {
    expect(searchCatalog(CATALOG, '   ', 'en')).toEqual([])
  })
})

describe('quantity caps', () => {
  it('99 for ordinary items, 10 for special', () => {
    expect(capFor(item('x', 'X', 'boxes'))).toBe(MAX_ITEM_QTY)
    expect(capFor(item('x', 'X', 'special'))).toBe(MAX_SPECIAL_ITEM_QTY)
    expect(MAX_ITEM_QTY).toBe(99)
    expect(MAX_SPECIAL_ITEM_QTY).toBe(10)
  })

  it('clamps and strips zeros', () => {
    expect(setCount({}, 'box', 150, 99)).toEqual({ box: 99 })
    expect(setCount({ box: 3 }, 'box', 0, 99)).toEqual({})
    expect(setCount({ box: 3 }, 'box', -2, 99)).toEqual({})
    expect(setCount({ piano: 9 }, 'piano', 11, 10)).toEqual({ piano: 10 })
  })

  it('custom quantity clamps to 99 and removes at zero', () => {
    const c: CustomItem = { id: 'c1', name: 'Clock', quantity: 2, approxSize: 'large', approxWeight: 40 }
    expect(setCustomQuantity([c], 'c1', 120)[0].quantity).toBe(99)
    expect(setCustomQuantity([c], 'c1', 0)).toEqual([])
  })
})

describe('custom item validation', () => {
  const draft = { name: ' Grandfather clock ', quantity: 2, approxSize: 'large', weight: '45,5' }

  it('accepts a full draft and normalises it', () => {
    expect(customItemFromDraft(draft, 'id1')).toEqual({
      id: 'id1', name: 'Grandfather clock', quantity: 2, approxSize: 'large', approxWeight: 45.5,
    })
  })

  it('requires a numeric weight > 0', () => {
    expect(customItemFromDraft({ ...draft, weight: '' }, 'x')).toBeNull()
    expect(customItemFromDraft({ ...draft, weight: '0' }, 'x')).toBeNull()
    expect(customItemFromDraft({ ...draft, weight: '45 kg' }, 'x')).toBeNull()
    expect(parseWeightKg('12.5')).toBe(12.5)
  })

  it('requires a name, a size band and 1…99 units', () => {
    expect(customItemFromDraft({ ...draft, name: '  ' }, 'x')).toBeNull()
    expect(customItemFromDraft({ ...draft, approxSize: '100x50 cm' }, 'x')).toBeNull()
    expect(customItemFromDraft({ ...draft, quantity: 0 }, 'x')).toBeNull()
    expect(customItemFromDraft({ ...draft, quantity: 100 }, 'x')).toBeNull()
    expect(customItemFromDraft({ ...draft, approxSize: 'extra_large' }, 'x')?.approxSize).toBe('extra_large')
  })
})

describe('upgrade with undo', () => {
  const start: SelectorState = { counts: { box: 2 }, customItems: [], tier: 'light', pending: null }

  it('a change within the tier applies with nothing pending', () => {
    const next = proposeChange(start, { counts: { box: 3 }, customItems: [] }, 'Moving box', CATALOG)
    expect(next).toEqual({ counts: { box: 3 }, customItems: [], tier: 'light', pending: null })
  })

  it('adding a piano asks for premium; Cancel puts the previous basket back', () => {
    const proposed = proposeChange(start, { counts: { box: 2, piano: 1 }, customItems: [] }, 'Piano', CATALOG)
    expect(proposed.counts).toEqual({ box: 2, piano: 1 })
    expect(proposed.tier).toBe('light')
    expect(proposed.pending?.upgradeTo).toBe('premium')
    expect(proposed.pending?.triggerName).toBe('Piano')

    const cancelled = resolveUpgrade(proposed, false)
    expect(cancelled).toEqual({ counts: { box: 2 }, customItems: [], tier: 'light', pending: null })
  })

  it('Continue lifts the tier and keeps the item', () => {
    const proposed = proposeChange(start, { counts: { box: 2, piano: 1 }, customItems: [] }, 'Piano', CATALOG)
    expect(resolveUpgrade(proposed, true)).toEqual({ counts: { box: 2, piano: 1 }, customItems: [], tier: 'premium', pending: null })
  })

  it('never drops below the chosen tier', () => {
    const premium: SelectorState = { ...start, tier: 'premium' }
    const next = proposeChange(premium, { counts: {}, customItems: [] }, '', CATALOG)
    expect(next.tier).toBe('premium')
    expect(next.pending).toBeNull()
  })

  it('a custom item heavy enough to exceed the tier asks too, and Cancel removes it', () => {
    const heavy: CustomItem = { id: 'c1', name: 'Safe', quantity: 1, approxSize: 'large', approxWeight: 400 }
    const proposed = proposeChange(start, { counts: { box: 2 }, customItems: [heavy] }, 'Safe', CATALOG)
    expect(proposed.pending?.upgradeTo).toBe('regular')
    expect(resolveUpgrade(proposed, false).customItems).toEqual([])
  })

  it('classification honours live thresholds', () => {
    const tight = {
      light: { maxPoints: 1, maxWeightKg: 200, maxItems: 15, maxM3: 10 },
      regular: { maxPoints: 80, maxWeightKg: 800, maxItems: 40, maxM3: 25 },
      packingFactor: 1.35,
    }
    const next = proposeChange(start, { counts: { box: 3 }, customItems: [] }, 'Moving box', CATALOG, tight)
    expect(next.pending?.upgradeTo).toBe('regular')
  })

  it('resolving with nothing pending is a no-op', () => {
    expect(resolveUpgrade(start, true)).toBe(start)
  })
})
