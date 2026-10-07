/**
 * Turn-by-turn progress along a driving route (plan maps/mover-navigation-mode).
 *
 * Pure: give it the route Mapbox returned (`steps=true`, `language=<app
 * locale>`, GeoJSON geometry) and the driver's position; it says which turn
 * comes next, how far away it is, what is left of the trip, and whether the
 * driver has left the route (time to reroute) or arrived. Instructions arrive
 * already translated by Mapbox. Identical in pickltmover/lib and pickLT/src/lib.
 */

export type LngLat = [number, number];

export interface NavStep {
  /** Where the maneuver happens. */
  location: LngLat;
  /** Mapbox maneuver type: turn, depart, arrive, roundabout, merge, fork, … */
  type: string;
  /** left, right, slight left, sharp right, straight, uturn, … */
  modifier?: string;
  /** Localised instruction from Mapbox ("Biegen Sie links ab auf …"). */
  instruction: string;
  /** Street name of the step, may be empty. */
  name?: string;
}

export interface NavRoute {
  line: LngLat[];
  steps: NavStep[];
  /** Metres and seconds for the whole route. */
  distance: number;
  duration: number;
}

export interface NavProgress {
  /** Position snapped onto the route line. */
  snapped: LngLat;
  /** Metres from the route start to the snapped position. */
  along: number;
  /** Metres between the driver and the route line. */
  offRouteM: number;
  /** Index into `steps` of the next maneuver ahead (never the departure). */
  stepIndex: number;
  /** Metres to that maneuver. */
  toNextM: number;
  /** Index of the maneuver after it, or -1. */
  thenIndex: number;
  remainingM: number;
  remainingS: number;
  arrived: boolean;
}

/** Off the route by more than this (m) counts as off-route. */
export const OFF_ROUTE_M = 40;
/** Within this (m) of the end of the route counts as arrived. */
export const ARRIVED_M = 30;
/** A maneuver this close (m) behind the snapped position counts as passed. */
const PASSED_M = 8;

const R = 6_371_000;
const rad = (d: number) => (d * Math.PI) / 180;

/** Local equirectangular projection around `ref`, metres. Accurate at street scale. */
function project(p: LngLat, ref: LngLat): [number, number] {
  return [rad(p[0] - ref[0]) * R * Math.cos(rad(ref[1])), rad(p[1] - ref[1]) * R];
}

export function metres(a: LngLat, b: LngLat): number {
  const [x, y] = project(b, a);
  return Math.hypot(x, y);
}

interface Snap {
  point: LngLat;
  along: number;
  dist: number;
}

/** Cumulative distance (m) at each vertex of the line. */
export function cumulative(line: LngLat[]): number[] {
  const out = [0];
  for (let i = 1; i < line.length; i++) out.push(out[i - 1] + metres(line[i - 1], line[i]));
  return out;
}

/** Nearest point on the line to `p`, with its distance along the line. */
export function snapToLine(line: LngLat[], cum: number[], p: LngLat): Snap {
  let best: Snap = { point: line[0], along: 0, dist: metres(line[0], p) };
  for (let i = 0; i < line.length - 1; i++) {
    const a = line[i];
    const [bx, by] = project(line[i + 1], a);
    const [px, py] = project(p, a);
    const len2 = bx * bx + by * by;
    const t = len2 > 0 ? Math.max(0, Math.min(1, (px * bx + py * by) / len2)) : 0;
    const dx = px - t * bx;
    const dy = py - t * by;
    const dist = Math.hypot(dx, dy);
    if (dist < best.dist) {
      const segLen = cum[i + 1] - cum[i];
      best = {
        point: [a[0] + (line[i + 1][0] - a[0]) * t, a[1] + (line[i + 1][1] - a[1]) * t],
        along: cum[i] + segLen * t,
        dist,
      };
    }
  }
  return best;
}

/** Precomputed per route: cumulative distances and where each maneuver sits along the line. */
export interface PreparedRoute extends NavRoute {
  cum: number[];
  stepAlong: number[];
  length: number;
}

export function prepareRoute(route: NavRoute): PreparedRoute {
  const cum = cumulative(route.line);
  const stepAlong = route.steps.map((s) => snapToLine(route.line, cum, s.location).along);
  return { ...route, cum, stepAlong, length: cum[cum.length - 1] ?? 0 };
}

export function navProgress(route: PreparedRoute, position: LngLat): NavProgress {
  const snap = snapToLine(route.line, route.cum, position);
  // First maneuver still ahead; step 0 is the departure, never "next".
  let stepIndex = route.steps.length - 1;
  for (let i = 1; i < route.steps.length; i++) {
    if (route.stepAlong[i] > snap.along + PASSED_M) {
      stepIndex = i;
      break;
    }
  }
  const remainingM = Math.max(0, route.length - snap.along);
  const share = route.length > 0 ? remainingM / route.length : 0;
  return {
    snapped: snap.point,
    along: snap.along,
    offRouteM: snap.dist,
    stepIndex,
    toNextM: Math.max(0, route.stepAlong[stepIndex] - snap.along),
    thenIndex: stepIndex + 1 < route.steps.length ? stepIndex + 1 : -1,
    remainingM,
    remainingS: route.duration * share,
    arrived: remainingM <= ARRIVED_M,
  };
}

/**
 * Off-route needs two fixes in a row past the threshold: one noisy GPS fix
 * must not trigger a reroute.
 */
export function shouldReroute(offRouteHistory: number[]): boolean {
  const last = offRouteHistory.slice(-2);
  return last.length === 2 && last.every((m) => m > OFF_ROUTE_M);
}
