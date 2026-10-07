/**
 * Smooth movement for the mover's live marker (plan maps/smooth-mover-marker).
 *
 * Fixes arrive seconds apart; drawing each one where it lands makes the truck
 * jump. Like Uber/Bolt, every accepted fix becomes the *target* of a glide that
 * starts from wherever the marker is drawn right now and lasts about as long
 * as the gap between fixes, at constant speed. The marker therefore runs about
 * one interval behind reality, which reads as smooth driving instead of hops.
 *
 * Pure and framework-free: the screens call `push()` when a fix arrives and
 * `sample(now)` from an animation frame loop. Byte-identical in pickltmobile
 * and pickltmover, and copied as-is to pickLT/src/lib/motion-track.ts.
 */

export interface MotionFix {
  latitude: number;
  longitude: number;
  /** Degrees clockwise from north; null when unknown. */
  heading?: number | null;
  /** Horizontal accuracy in metres; null when the source doesn't report it. */
  accuracy?: number | null;
  /** When this client received the fix (ms since epoch). Drives the glide timing. */
  receivedAt: number;
  /** When the fix was taken or written (ms), for ordering only. Falls back to `receivedAt`. */
  time?: number | null;
}

export interface MotionPose {
  latitude: number;
  longitude: number;
  heading: number | null;
}

export interface MotionTrackOptions {
  /** A fix closer than this (m) to the current target is GPS jitter. */
  minMoveM?: number;
  /** Fixes less accurate than this (m) are dropped. */
  maxAccuracyM?: number;
  /** Glide duration bounds (ms). */
  minGlideMs?: number;
  maxGlideMs?: number;
  /** Jump instead of gliding when the new fix is this far (m)… */
  teleportM?: number;
  /** …or arrives this long (ms) after the previous one. */
  teleportGapMs?: number;
  /** How long a turn of the heading takes (ms), capped by the glide. */
  turnMs?: number;
}

const DEFAULTS: Required<MotionTrackOptions> = {
  minMoveM: 4,
  maxAccuracyM: 50,
  minGlideMs: 1_000,
  maxGlideMs: 20_000,
  teleportM: 1_000,
  teleportGapMs: 60_000,
  turnMs: 800,
};

interface Segment {
  from: MotionPose;
  to: MotionPose;
  start: number;
  duration: number;
}

const toRad = (deg: number) => (deg * Math.PI) / 180;
const toDeg = (rad: number) => (rad * 180) / Math.PI;

export function normalizeDeg(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

/** Great-circle distance in metres. */
export function distanceM(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }): number {
  const R = 6_371_000;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Initial bearing from `a` to `b`, degrees clockwise from north. */
export function bearingDeg(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }): number {
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return normalizeDeg(toDeg(Math.atan2(y, x)));
}

/** Heading `t` of the way from `a` to `b` along the shorter arc (350 → 10 turns 20°, not 340°). */
export function lerpHeading(a: number, b: number, t: number): number {
  const delta = ((b - a + 540) % 360) - 180;
  return normalizeDeg(a + delta * t);
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

export class MotionTrack {
  private readonly opts: Required<MotionTrackOptions>;
  private segment: Segment | null = null;
  private pose: MotionPose | null = null;
  private last: MotionFix | null = null;

  constructor(options: MotionTrackOptions = {}) {
    this.opts = { ...DEFAULTS, ...options };
  }

  /**
   * Feed a fix. Returns false when it was dropped (out of order, inaccurate,
   * or jitter). The glide starts from the pose drawn at `fix.receivedAt`, so a
   * fix that lands mid-glide bends the path instead of jumping.
   */
  push(fix: MotionFix): boolean {
    if (!finite(fix.latitude) || !finite(fix.longitude)) return false;
    const o = this.opts;
    const time = finite(fix.time) ? fix.time : fix.receivedAt;
    if (this.last) {
      const lastTime = finite(this.last.time) ? this.last.time : this.last.receivedAt;
      if (time <= lastTime) return false;
    }
    if (finite(fix.accuracy) && fix.accuracy > o.maxAccuracyM) return false;

    const fixHeading = finite(fix.heading) && fix.heading >= 0 ? normalizeDeg(fix.heading) : null;
    const target = this.segment?.to ?? this.pose;

    // First fix: just place it.
    if (!target || !this.last) {
      this.pose = { latitude: fix.latitude, longitude: fix.longitude, heading: fixHeading };
      this.segment = null;
      this.last = fix;
      return true;
    }

    const moved = distanceM(target, fix);
    const gap = fix.receivedAt - this.last.receivedAt;

    // Jitter: barely moved. Keep the position, accept a real heading change.
    if (moved < o.minMoveM) {
      this.last = fix;
      if (fixHeading !== null && this.segment === null && this.pose) {
        this.pose = { ...this.pose, heading: fixHeading };
      }
      return false;
    }

    const from = this.sample(fix.receivedAt) ?? target;
    const heading = fixHeading ?? (distanceM(from, fix) >= o.minMoveM ? bearingDeg(from, fix) : from.heading);
    const to: MotionPose = { latitude: fix.latitude, longitude: fix.longitude, heading };

    if (moved > o.teleportM || gap > o.teleportGapMs) {
      this.pose = to;
      this.segment = null;
    } else {
      this.segment = {
        from,
        to,
        start: fix.receivedAt,
        duration: clamp(gap, o.minGlideMs, o.maxGlideMs),
      };
    }
    this.last = fix;
    return true;
  }

  /** The pose to draw at `now`; null before the first fix. */
  sample(now: number): MotionPose | null {
    const seg = this.segment;
    if (!seg) return this.pose;
    const elapsed = now - seg.start;
    if (elapsed >= seg.duration) {
      this.pose = seg.to;
      this.segment = null;
      return this.pose;
    }
    const t = clamp(elapsed / seg.duration, 0, 1);
    const turnT = clamp(elapsed / Math.min(this.opts.turnMs, seg.duration), 0, 1);
    const { from, to } = seg;
    let heading: number | null = to.heading;
    if (from.heading !== null && to.heading !== null) heading = lerpHeading(from.heading, to.heading, turnT);
    else if (to.heading === null) heading = from.heading;
    return {
      latitude: from.latitude + (to.latitude - from.latitude) * t,
      longitude: from.longitude + (to.longitude - from.longitude) * t,
      heading,
    };
  }

  /** True while a glide is in progress: the frame loop can idle otherwise. */
  isAnimating(now: number): boolean {
    return this.segment !== null && now - this.segment.start < this.segment.duration;
  }

  /** Jump to a pose with no glide (e.g. the arrival snap), keeping order checks. */
  jumpTo(pose: MotionPose): void {
    this.pose = pose;
    this.segment = null;
  }

  reset(): void {
    this.pose = null;
    this.segment = null;
    this.last = null;
  }
}
