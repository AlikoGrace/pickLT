import { describe, expect, it } from 'vitest'

import {
  MOVE_UI_CATEGORY_VALUES,
  moveUiCategoryLabel,
  moveUiCategoryOptions,
  moveUiCategoryStatus,
  toMoveUiCategory,
} from '../move-ui-category'

/**
 * The "Your Moves" tabs used to be their own captions, and a `switch` matched
 * on `'In Progress'`. Translating a caption would have made every case miss and
 * the grid show nothing. These tests pin the split.
 */
describe('toMoveUiCategory', () => {
  it('resolves the key', () => {
    expect(toMoveUiCategory('all')).toBe('all')
    expect(toMoveUiCategory('scheduled')).toBe('scheduled')
    expect(toMoveUiCategory('pending')).toBe('pending')
    expect(toMoveUiCategory('in_progress')).toBe('in_progress')
    expect(toMoveUiCategory('completed')).toBe('completed')
    expect(toMoveUiCategory('cancelled')).toBe('cancelled')
  })

  it('resolves the legacy English caption the tabs used to carry', () => {
    expect(toMoveUiCategory('All Moves')).toBe('all')
    expect(toMoveUiCategory('Scheduled')).toBe('scheduled')
    expect(toMoveUiCategory('Pending')).toBe('pending')
    expect(toMoveUiCategory('In Progress')).toBe('in_progress')
    expect(toMoveUiCategory('Completed')).toBe('completed')
    expect(toMoveUiCategory('Cancelled')).toBe('cancelled')
  })

  it('collapses unknown, empty and missing input to null', () => {
    // The component falls back to 'all' on null, so a stale tab shows
    // everything instead of nothing.
    expect(toMoveUiCategory(null)).toBeNull()
    expect(toMoveUiCategory(undefined)).toBeNull()
    expect(toMoveUiCategory('')).toBeNull()
    expect(toMoveUiCategory('Archived')).toBeNull()
  })
})

describe('moveUiCategoryLabel', () => {
  it('gives every key a caption, and every key round-trips', () => {
    for (const key of MOVE_UI_CATEGORY_VALUES) {
      const label = moveUiCategoryLabel(key)
      expect(label.length).toBeGreaterThan(0)
      expect(toMoveUiCategory(key)).toBe(key)
      // The caption resolves back too, which is what keeps stale state working.
      expect(toMoveUiCategory(label)).toBe(key)
    }
  })

  it('keeps caption and key distinct so translation cannot reach a comparison', () => {
    for (const option of moveUiCategoryOptions()) {
      expect(option.value).toBe(option.value.toLowerCase())
      expect(option.value).not.toContain(' ')
    }
  })
})

describe('moveUiCategoryStatus', () => {
  it('reproduces the switch it replaced', () => {
    expect(moveUiCategoryStatus('all')).toBeUndefined()
    expect(moveUiCategoryStatus('scheduled')).toBe('scheduled')
    expect(moveUiCategoryStatus('pending')).toBe('pending')
    expect(moveUiCategoryStatus('in_progress')).toBe('in_progress')
    expect(moveUiCategoryStatus('completed')).toBe('completed')
    expect(moveUiCategoryStatus('cancelled')).toBe('cancelled')
  })
})
