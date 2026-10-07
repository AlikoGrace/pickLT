/**
 * The mover truck's on-screen size for a map zoom (owner, 2026-10-07; plan
 * pickltmobile maps/smooth-mover-marker W6): small over the whole city,
 * street-sized up close. Same stops as the apps' `TRUCK_ICON_SIZE`
 * (iconSize × the 512 px source), linear between them, clamped outside.
 */
const STOPS: [zoom: number, px: number][] = [
  [10, 31],
  [13, 51],
  [15, 77],
  [17, 123],
  [19, 154],
]

export function truckSizePx(zoom: number): number {
  if (!Number.isFinite(zoom) || zoom <= STOPS[0][0]) return STOPS[0][1]
  for (let i = 1; i < STOPS.length; i++) {
    const [z1, p1] = STOPS[i]
    if (zoom <= z1) {
      const [z0, p0] = STOPS[i - 1]
      return p0 + ((p1 - p0) * (zoom - z0)) / (z1 - z0)
    }
  }
  return STOPS[STOPS.length - 1][1]
}
