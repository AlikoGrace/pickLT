/**
 * Filter-tab identity for the "Your Moves" grid.
 *
 * `SectionGridFeaturePlaces` used to hold the *display labels themselves* as
 * its filter state — `['All Moves', 'Scheduled', 'Pending', 'In Progress', …]`
 * fed a `switch` on `'In Progress'`, the selected-tab `===` comparison, and the
 * empty-state sentence, all off the same string. Translating the tab captions
 * would have made every `case` miss and the grid silently show nothing.
 *
 * So the tabs now carry a stable key and a separate label. This is the web twin
 * of `UiCategory` in `pickltmobile/lib/move-status.ts` and
 * `pickltmover/lib/move-status.ts`; the extra `'scheduled'` member is
 * web-specific (it filters on `moveCategory`, not on status).
 *
 * `toMoveUiCategory` also accepts the old English labels, because they are what
 * any bookmarked or in-flight state still holds.
 */

import type { MoveStatus } from '@/context/moveSearch'

export type MoveUiCategory =
  | 'all'
  | 'scheduled'
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'cancelled'

export const MOVE_UI_CATEGORY_VALUES: readonly MoveUiCategory[] = [
  'all',
  'scheduled',
  'pending',
  'in_progress',
  'completed',
  'cancelled',
] as const

/** Catalog keys are `moves.category.<key>`; replaced by `t()` at extraction. */
const MOVE_UI_CATEGORY_LABELS: Record<MoveUiCategory, string> = {
  all: 'All Moves',
  scheduled: 'Scheduled',
  pending: 'Pending',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

export function moveUiCategoryLabel(category: MoveUiCategory): string {
  return MOVE_UI_CATEGORY_LABELS[category]
}

/** Key or legacy English tab label → key. Null when it is neither. */
export function toMoveUiCategory(input: string | null | undefined): MoveUiCategory | null {
  if (!input) return null
  const raw = input.trim()
  if ((MOVE_UI_CATEGORY_VALUES as readonly string[]).includes(raw)) {
    return raw as MoveUiCategory
  }
  const legacy: Record<string, MoveUiCategory> = {
    'all moves': 'all',
    all: 'all',
    scheduled: 'scheduled',
    pending: 'pending',
    'in progress': 'in_progress',
    completed: 'completed',
    cancelled: 'cancelled',
  }
  return legacy[raw.toLowerCase()] ?? null
}

/**
 * The status a category filters on, or undefined for "everything".
 *
 * `'scheduled'` returns `'scheduled'` rather than a `MoveStatus` because it is
 * not one — the caller branches on it and filters `moveCategory` instead. That
 * shape is preserved from the switch this replaced.
 */
export function moveUiCategoryStatus(
  category: MoveUiCategory,
): MoveStatus | 'scheduled' | undefined {
  if (category === 'all') return undefined
  return category
}

export function moveUiCategoryOptions(): { value: MoveUiCategory; label: string }[] {
  return MOVE_UI_CATEGORY_VALUES.map((value) => ({
    value,
    label: MOVE_UI_CATEGORY_LABELS[value],
  }))
}
