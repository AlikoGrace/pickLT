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

import type { TFunction } from 'i18next'
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

/**
 * English fallback, used only when no `t` is supplied (tests, and any caller
 * outside a request/provider scope). The stored value is always the key.
 */
const MOVE_UI_CATEGORY_LABELS: Record<MoveUiCategory, string> = {
  all: 'All Moves',
  scheduled: 'Scheduled',
  pending: 'Pending',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

/**
 * Catalog segment for a category. `in_progress` cannot be a key segment as-is:
 * i18next reserves `_` for plural suffixes (catalog conventions § 2).
 */
const MOVE_UI_CATEGORY_KEY_SEGMENT: Record<MoveUiCategory, string> = {
  all: 'all',
  scheduled: 'scheduled',
  pending: 'pending',
  in_progress: 'inProgress',
  completed: 'completed',
  cancelled: 'cancelled',
}

// i18n-keys: web.home.moves.tab.all.label, web.home.moves.tab.scheduled.label,
// web.home.moves.tab.pending.label, web.home.moves.tab.inProgress.label,
// web.home.moves.tab.completed.label, web.home.moves.tab.cancelled.label
export function moveUiCategoryLabel(category: MoveUiCategory, t?: TFunction): string {
  if (!t) return MOVE_UI_CATEGORY_LABELS[category]
  return t(`web:home.moves.tab.${MOVE_UI_CATEGORY_KEY_SEGMENT[category]}.label`)
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

export function moveUiCategoryOptions(t?: TFunction): { value: MoveUiCategory; label: string }[] {
  return MOVE_UI_CATEGORY_VALUES.map((value) => ({
    value,
    label: moveUiCategoryLabel(value, t),
  }))
}
