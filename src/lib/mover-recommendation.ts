/**
 * Which mover card carries the "Recommended" mark on the instant-move mover
 * selection (plan `legal/7.driver-vetting.md` V2, twin of `lib/movers.ts` in
 * the client app): the first mover in the list who holds a verified moving
 * certificate when there is one, else the first mover. `null` for an empty
 * list. Pure; the list is taken in the order it is shown.
 */
export function recommendedMoverId<T extends { id: string; certified?: boolean }>(movers: readonly T[]): string | null {
  const pick = movers.find((m) => m.certified === true) ?? movers[0]
  return pick ? pick.id : null
}

/**
 * Display order for the priced list: cheapest first, and among movers at the
 * same price the order the server sent (certified first inside a distance
 * band, then nearer). `Array.prototype.sort` is stable, so equal prices keep
 * their incoming order.
 */
export function sortMoversForDisplay<T extends { price: number }>(movers: readonly T[]): T[] {
  return [...movers].sort((a, b) => a.price - b.price)
}
