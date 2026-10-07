import { describe, expect, it } from 'vitest'

import { MotionTrack, bearingDeg, distanceM, lerpHeading } from '../motion-track';

// Kumasi, ~111 m per 0.001° of latitude.
const A = { latitude: 6.6900, longitude: -1.6200 };
const north = (m: number) => ({ latitude: A.latitude + m / 111_195, longitude: A.longitude });

describe('MotionTrack (plan maps/smooth-mover-marker)', () => {
  it('places the first fix without a glide', () => {
    const tr = new MotionTrack();
    expect(tr.sample(0)).toBeNull();
    expect(tr.push({ ...A, heading: 90, receivedAt: 1_000 })).toBe(true);
    expect(tr.sample(1_000)).toEqual({ ...A, heading: 90 });
    expect(tr.isAnimating(1_000)).toBe(false);
  });

  it('glides to the next fix over the gap between fixes, at constant speed', () => {
    const tr = new MotionTrack();
    tr.push({ ...A, heading: 0, receivedAt: 0 });
    tr.push({ ...north(150), heading: 0, receivedAt: 15_000 });
    expect(tr.isAnimating(15_000)).toBe(true);
    const mid = tr.sample(22_500)!;
    expect(distanceM(A, mid)).toBeCloseTo(75, 0);
    expect(distanceM(tr.sample(30_000)!, north(150))).toBeLessThan(0.01);
    expect(tr.isAnimating(30_001)).toBe(false);
  });

  it('a fix arriving mid-glide starts from where the marker is drawn, not from the old fix', () => {
    const tr = new MotionTrack();
    tr.push({ ...A, receivedAt: 0 });
    tr.push({ ...north(100), receivedAt: 10_000 });
    const drawn = tr.sample(15_000)!; // halfway: 50 m
    tr.push({ ...north(200), receivedAt: 15_000 });
    expect(distanceM(tr.sample(15_000)!, drawn)).toBeLessThan(0.01);
    expect(distanceM(A, tr.sample(17_500)!)).toBeCloseTo(125, 0); // 50 → 200 over 5 s
  });

  it('turns along the shorter arc', () => {
    expect(lerpHeading(350, 10, 0.5)).toBeCloseTo(0, 5);
    expect(lerpHeading(10, 350, 0.5)).toBeCloseTo(0, 5);
    expect(lerpHeading(90, 250, 0.25)).toBeCloseTo(130, 5);
    expect(lerpHeading(250, 90, 0.25)).toBeCloseTo(210, 5);
    const tr = new MotionTrack({ turnMs: 1_000 });
    tr.push({ ...A, heading: 350, receivedAt: 0 });
    tr.push({ ...north(100), heading: 10, receivedAt: 10_000 });
    expect(tr.sample(10_500)!.heading).toBeCloseTo(0, 5);
    expect(tr.sample(12_000)!.heading).toBeCloseTo(10, 5);
  });

  it('derives the heading from the movement when the fix has none', () => {
    const tr = new MotionTrack();
    tr.push({ ...A, receivedAt: 0 });
    tr.push({ latitude: A.latitude, longitude: A.longitude + 0.001, heading: null, receivedAt: 5_000 });
    expect(tr.sample(10_000)!.heading).toBeCloseTo(90, 0);
    expect(bearingDeg(A, north(100))).toBeCloseTo(0, 5);
  });

  it('ignores GPS jitter, inaccurate fixes and out-of-order fixes', () => {
    const tr = new MotionTrack();
    tr.push({ ...A, heading: 0, receivedAt: 0, time: 0 });
    expect(tr.push({ ...north(2), receivedAt: 5_000, time: 5_000 })).toBe(false); // 2 m wobble
    expect(tr.sample(6_000)).toEqual({ ...A, heading: 0 });
    expect(tr.push({ ...north(300), accuracy: 120, receivedAt: 7_000, time: 7_000 })).toBe(false);
    expect(tr.push({ ...north(300), receivedAt: 8_000, time: 4_000 })).toBe(false); // older than the last
    expect(tr.isAnimating(8_000)).toBe(false);
  });

  it('jumps instead of gliding across town or after a long silence', () => {
    const far = new MotionTrack();
    far.push({ ...A, receivedAt: 0 });
    far.push({ ...north(5_000), receivedAt: 15_000 });
    expect(far.isAnimating(15_000)).toBe(false);
    expect(distanceM(far.sample(15_000)!, north(5_000))).toBeLessThan(0.01);

    const late = new MotionTrack();
    late.push({ ...A, receivedAt: 0 });
    late.push({ ...north(200), receivedAt: 120_000 });
    expect(late.isAnimating(120_000)).toBe(false);
  });

  it('bounds the glide between 1 s and 20 s', () => {
    const tr = new MotionTrack();
    tr.push({ ...A, receivedAt: 0 });
    tr.push({ ...north(100), receivedAt: 200 });
    expect(tr.isAnimating(1_150)).toBe(true);
    expect(tr.isAnimating(1_250)).toBe(false);
    tr.push({ ...north(300), receivedAt: 45_000 });
    expect(tr.isAnimating(64_000)).toBe(true);
    expect(tr.isAnimating(65_100)).toBe(false);
  });

  it('jumpTo places the marker with no glide (arrival snap)', () => {
    const tr = new MotionTrack();
    tr.push({ ...A, receivedAt: 0 });
    tr.push({ ...north(100), receivedAt: 10_000 });
    tr.jumpTo({ ...north(40), heading: 180 });
    expect(tr.isAnimating(11_000)).toBe(false);
    expect(tr.sample(11_000)).toEqual({ ...north(40), heading: 180 });
  });
});
