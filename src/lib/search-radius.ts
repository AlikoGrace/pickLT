/**
 * How far from the pickup address an instant move looks for a mover (plan
 * `.agent/plans/matching/1.widen-search-then-schedule.md`).
 *
 * Two rings. The client first sees movers in the near ring. When that is
 * empty the client is asked whether to widen the search to the extended ring;
 * when that is empty too, the client is offered a scheduled move instead.
 *
 * Pure. Byte-identical in pickLT `src/lib/search-radius.ts`. The server
 * functions carry the same two numbers (`listnearbymovers`,
 * `broadcastmoverequest`); a test pins them together.
 */

export const NEAR_RADIUS_KM = 20;
export const EXTENDED_RADIUS_KM = 50;

export type SearchStage = 'near' | 'extended';

export function radiusForStage(stage: SearchStage): number {
  return stage === 'extended' ? EXTENDED_RADIUS_KM : NEAR_RADIUS_KM;
}

/**
 * What the mover list shows when a search has finished.
 *
 * - `list`: there are movers to choose from.
 * - `offerExtend`: nobody in the near ring; ask to search the wider one.
 * - `offerSchedule`: nobody in the wider ring either; suggest a scheduled move.
 */
export type SearchOutcome = 'list' | 'offerExtend' | 'offerSchedule';

export function searchOutcome(stage: SearchStage, moverCount: number): SearchOutcome {
  if (moverCount > 0) return 'list';
  return stage === 'near' ? 'offerExtend' : 'offerSchedule';
}
