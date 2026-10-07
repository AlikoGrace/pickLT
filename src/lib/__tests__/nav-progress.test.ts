import { describe, expect, it } from 'vitest'

import { metres, navProgress, prepareRoute, shouldReroute, type LngLat, type NavRoute } from '../nav-progress';

// An L-shaped route in Kumasi: 500 m north, then 300 m east (turn right).
const O: LngLat = [-1.62, 6.69];
const north = (m: number): LngLat => [O[0], O[1] + m / 110_574];
const corner = north(500);
const east = (m: number): LngLat => [corner[0] + m / (111_320 * Math.cos((O[1] * Math.PI) / 180)), corner[1]];

const route: NavRoute = {
  line: [O, north(250), corner, east(150), east(300)],
  steps: [
    { location: O, type: 'depart', instruction: 'Fahren Sie nach Norden' },
    { location: corner, type: 'turn', modifier: 'right', instruction: 'Biegen Sie rechts ab', name: 'Hyde Road' },
    { location: east(300), type: 'arrive', instruction: 'Sie haben Ihr Ziel erreicht' },
  ],
  distance: 800,
  duration: 120,
};
const prepared = prepareRoute(route);

describe('navProgress (plan maps/mover-navigation-mode)', () => {
  it('measures the route', () => {
    expect(prepared.length).toBeCloseTo(800, -1);
    expect(metres(O, north(100))).toBeCloseTo(100, -1);
  });

  it('names the next turn and the distance to it, never the departure', () => {
    const p = navProgress(prepared, north(200));
    expect(p.stepIndex).toBe(1);
    expect(p.toNextM).toBeCloseTo(300, -1);
    expect(p.thenIndex).toBe(2);
    expect(p.remainingM).toBeCloseTo(600, -1);
    expect(p.remainingS).toBeCloseTo(90, 0);
    expect(p.arrived).toBe(false);
  });

  it('moves on to the next maneuver once the turn is passed', () => {
    const p = navProgress(prepared, east(50));
    expect(p.stepIndex).toBe(2);
    expect(p.toNextM).toBeCloseTo(250, -1);
    expect(p.thenIndex).toBe(-1);
  });

  it('snaps a slightly-off position onto the line and reports the gap', () => {
    const beside: LngLat = [north(300)[0] + 20 / 110_000, north(300)[1]];
    const p = navProgress(prepared, beside);
    expect(p.offRouteM).toBeCloseTo(20, 0);
    expect(p.along).toBeCloseTo(300, -1);
  });

  it('detects arrival near the end', () => {
    expect(navProgress(prepared, east(285)).arrived).toBe(true);
  });

  it('reroutes only after two off-route fixes in a row', () => {
    expect(shouldReroute([10, 60])).toBe(false);
    expect(shouldReroute([60, 70])).toBe(true);
    expect(shouldReroute([60, 70, 12])).toBe(false);
    expect(shouldReroute([90])).toBe(false);
  });
});
