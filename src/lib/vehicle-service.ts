/**
 * Vehicle service readiness — the one predicate behind "is this driver allowed
 * to be shown to clients and to accept moves today".
 *
 * Plan: `.agent/plans/vehicles/0.master.md` §5. The same logic is carried
 * inline (no imports) by every gating cloud function between the markers
 * `// --- vehicle-service (mirror) ---` and `// --- end vehicle-service ---`,
 * and `__tests__/vehicle-service-parity.test.ts` slices those blocks out and
 * runs them against this module. Change both or the test fails — that is the
 * point: four visibility gates already drifted once, a fifth term must not.
 *
 * This file is byte-identical in `pickltmover/lib/vehicle-service.ts` and
 * `pickLT/src/lib/vehicle-service.ts`. Pure: no clock, no I/O, no React.
 */

export type VehicleOwnership = 'owned' | 'rented';

/** Status of one `vehicles` row. */
export type VehicleStatus = 'pending_review' | 'verified' | 'rejected' | 'retired';

/** Status mirrored onto `mover_profiles.vehicleStatus` for the current vehicle. */
export type ProfileVehicleStatus = 'none' | 'pending_review' | 'verified' | 'rejected';

export type VehicleEventAction =
  | 'submitted'
  | 'resubmitted'
  | 'confirmed_same'
  | 'change_requested'
  | 'verified'
  | 'rejected'
  | 'retired'
  | 'reconfirm_required'
  // Wave 2026-10 (plan `wave-2026-10/1`): rental windows and the two-vehicle fleet.
  | 'renewed'
  | 'expired'
  | 'fallback'
  | 'selected'
  | 'expiring_soon';

export type VehicleEventSource =
  | 'registration'
  | 'settings'
  | 'login'
  | 'post_move'
  | 'admin'
  | 'system'
  | 'backfill'
  | 'renewal'
  | 'cron';

/** The spec's visibility/access states (§10), plus the two owned-driver extensions. */
export type VehicleServiceState =
  | 'OWN_VERIFIED'
  | 'OWN_PENDING_VEHICLE'
  | 'OWN_VEHICLE_REVIEW'
  | 'RENTAL_PENDING_VEHICLE'
  | 'RENTAL_VEHICLE_REVIEW'
  | 'RENTAL_CHANGE_PENDING'
  | 'RENTAL_DAILY_CONFIRMATION_REQUIRED'
  | 'RENTAL_VERIFIED_TODAY'
  /** Rental with a window, inside it and ready (plan wave-2026-10/1 R1). */
  | 'RENTAL_ACTIVE'
  /** Inside the window but ≤ `RENTAL_EXPIRING_MS` left — still ready, prompt to extend (R9). */
  | 'RENTAL_EXPIRING'
  /** The window has ended and no owned vehicle took over (R4). */
  | 'RENTAL_EXPIRED'
  | 'VEHICLE_REJECTED';

/** The subset of `mover_profiles` the predicate reads. Every field is optional
 * because rows written before the schema change carry none of them. */
export interface VehicleProfileFields {
  verificationStatus?: string | null;
  vehicleOwnership?: string | null;
  vehicleStatus?: string | null;
  currentVehicleId?: string | null;
  vehicleConfirmedServiceDate?: string | null;
  vehicleReconfirmRequired?: boolean | null;
  /**
   * Rental window of the vehicle IN SERVICE (plan wave-2026-10/1 R2), snapshotted
   * on the profile so this predicate stays profile-only. Null on an owned vehicle
   * in service and on rentals registered before windows existed (legacy: the
   * daily-confirmation regime keeps applying to those until their next renewal).
   */
  vehicleRentalStartAt?: string | null;
  vehicleRentalEndAt?: string | null;
  vehicleRentalHours?: number | null;
  /** The driver's verified OWNED vehicle, if any — the fallback when a rental ends (R3/R4). */
  ownedVehicleId?: string | null;
}

export const DEFAULT_PLATFORM_TZ = 'Europe/Berlin';

// ── Rental windows (plan wave-2026-10/1) ──────────────────────────────────────

/** Quick-pick durations offered by the window picker, in hours. */
export const RENTAL_DURATION_PRESETS_HOURS: readonly number[] = [4, 8, 24, 48, 72, 168];
/** Longest window a single registration may cover (30 days); longer rentals renew. */
export const MAX_RENTAL_HOURS = 720;
/** Rentals longer than this keep the daily SAME/CHANGE tap inside the window (R7). */
export const DAILY_CONFIRM_MIN_HOURS = 24;
/** "Rental ends soon" from this much time before the end (R9). */
export const RENTAL_EXPIRING_MS = 60 * 60 * 1000;
/** Same plate renewed within this many days after its last window stays verified (R5). */
export const RENEWAL_GRACE_DAYS = 30;

const HOUR_MS = 60 * 60 * 1000;

function parseIsoMs(value: string | null | undefined): number | null {
  if (typeof value !== 'string' || value.trim() === '') return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

/** Hours of the window in service: the snapshot when present, else derived from the two instants. */
export function rentalWindowHours(profile: VehicleProfileFields | null | undefined): number | null {
  if (!profile) return null;
  if (typeof profile.vehicleRentalHours === 'number' && Number.isFinite(profile.vehicleRentalHours)) {
    return profile.vehicleRentalHours;
  }
  const start = parseIsoMs(profile.vehicleRentalStartAt);
  const end = parseIsoMs(profile.vehicleRentalEndAt);
  if (start == null || end == null || end <= start) return null;
  return Math.round(((end - start) / HOUR_MS) * 100) / 100;
}

/** Milliseconds until the window in service ends; `null` when there is no window; ≤ 0 once ended. */
export function rentalRemainingMs(profile: VehicleProfileFields | null | undefined, nowMs: number): number | null {
  const end = parseIsoMs(profile?.vehicleRentalEndAt);
  return end == null ? null : end - nowMs;
}

/** True when the window in service has an end and it has passed. */
export function rentalWindowEnded(profile: VehicleProfileFields | null | undefined, nowMs: number): boolean {
  const remaining = rentalRemainingMs(profile, nowMs);
  return remaining != null && remaining <= 0;
}

/**
 * Whether the rental in service still asks for the daily SAME/CHANGE tap (R7):
 * legacy rentals (no window) always; windowed rentals only when longer than a day.
 */
export function rentalNeedsDailyConfirm(profile: VehicleProfileFields | null | undefined): boolean {
  if (!profile || profile.vehicleOwnership !== 'rented') return false;
  if (parseIsoMs(profile.vehicleRentalEndAt) == null) return true;
  const hours = rentalWindowHours(profile);
  return hours == null ? true : hours > DAILY_CONFIRM_MIN_HOURS;
}

export interface RentalWindowInput {
  /** ISO instant; defaults to "now" when omitted. */
  startAt?: string | null;
  /** ISO instant; one of `endAt` / `hours` is required. */
  endAt?: string | null;
  hours?: number | string | null;
  provider?: string | null;
}

export interface RentalWindow {
  startAt: string;
  endAt: string;
  hours: number;
  provider: string | null;
}

export type RentalWindowValidationCode =
  | 'vehicle.rentalWindowRequired'
  | 'vehicle.rentalWindowInvalid'
  | 'vehicle.rentalWindowTooLong';

/**
 * Normalises a window. The end wins when both `endAt` and `hours` are given.
 * Returns the codes (`fnCode` on the wire, `errors:vehicle.*` in the apps) or
 * the resolved window. Run client-side before the call and server-side in
 * `submitvehicle` — the same function, the same answer.
 */
export function resolveRentalWindow(
  input: RentalWindowInput | null | undefined,
  nowMs: number,
): { ok: true; window: RentalWindow } | { ok: false; codes: RentalWindowValidationCode[] } {
  if (!input || (input.endAt == null && (input.hours == null || String(input.hours).trim() === ''))) {
    return { ok: false, codes: ['vehicle.rentalWindowRequired'] };
  }
  const startMs = input.startAt ? parseIsoMs(input.startAt) : nowMs;
  if (startMs == null) return { ok: false, codes: ['vehicle.rentalWindowInvalid'] };
  let endMs: number | null = null;
  if (input.endAt != null && String(input.endAt).trim() !== '') {
    endMs = parseIsoMs(String(input.endAt));
  } else {
    const h = Number(input.hours);
    if (!Number.isFinite(h) || h <= 0) return { ok: false, codes: ['vehicle.rentalWindowInvalid'] };
    endMs = startMs + h * HOUR_MS;
  }
  if (endMs == null || endMs <= startMs || endMs <= nowMs) {
    return { ok: false, codes: ['vehicle.rentalWindowInvalid'] };
  }
  const hours = Math.round(((endMs - startMs) / HOUR_MS) * 100) / 100;
  if (hours > MAX_RENTAL_HOURS) return { ok: false, codes: ['vehicle.rentalWindowTooLong'] };
  const provider = typeof input.provider === 'string' && input.provider.trim() ? input.provider.trim().slice(0, 120) : null;
  return {
    ok: true,
    window: { startAt: new Date(startMs).toISOString(), endAt: new Date(endMs).toISOString(), hours, provider },
  };
}

/**
 * R5: a renewal of the SAME verified rental keeps `verified` (no new photos)
 * when its last window ended no more than `RENEWAL_GRACE_DAYS` ago (or has not
 * ended yet — an extension) and the row was never rejected. Otherwise it goes
 * back to review.
 */
export function canAutoRenew(
  vehicle:
    | { status?: string | null; rentalEndAt?: string | null; rejectionReason?: string | null; expiredAt?: string | null }
    | null
    | undefined,
  nowMs: number,
): boolean {
  if (!vehicle) return false;
  // A rental the `expirerentals` cron has already closed is `retired` with
  // `expiredAt` set; it was verified when its window ended, so it renews under
  // the same grace rule. Rows retired for any other reason stay ineligible.
  const wasVerified = vehicle.status === 'verified' || (vehicle.status === 'retired' && !!vehicle.expiredAt);
  if (!wasVerified) return false;
  if (vehicle.rejectionReason) return false;
  const end = parseIsoMs(vehicle.rentalEndAt);
  if (end == null) return true; // legacy rental without a window: first window, same plates
  return nowMs - end <= RENEWAL_GRACE_DAYS * 24 * HOUR_MS;
}

/**
 * Calendar date (`YYYY-MM-DD`) of `nowMs` in `tz`. `en-CA` is the locale whose
 * default date pattern is ISO-shaped; the parts API is used anyway so the
 * result cannot depend on a locale's separator choice. Falls back to UTC when
 * the runtime rejects the zone rather than throwing inside a gate.
 */
export function serviceDate(nowMs: number, tz: string = DEFAULT_PLATFORM_TZ): string {
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date(nowMs));
  } catch {
    return new Date(nowMs).toISOString().slice(0, 10);
  }
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  const y = get('year');
  const m = get('month');
  const d = get('day');
  if (y.length !== 4 || m.length !== 2 || d.length !== 2) {
    return new Date(nowMs).toISOString().slice(0, 10);
  }
  return `${y}-${m}-${d}`;
}

/**
 * Master §5. Owned drivers need a verified current vehicle. Rented drivers
 * additionally need today's SAME confirmation and no pending post-move
 * re-confirmation. The driver KYC gate (`verificationStatus`) is included so a
 * single call answers "service-ready" everywhere.
 */
export function vehicleServiceReady(
  profile: VehicleProfileFields | null | undefined,
  nowMs: number,
  tz: string = DEFAULT_PLATFORM_TZ,
): boolean {
  if (!profile) return false;
  if (profile.verificationStatus !== 'verified') return false;
  if (profile.vehicleStatus !== 'verified') return false;
  if (!profile.currentVehicleId) return false;
  if (profile.vehicleOwnership === 'rented') {
    if (profile.vehicleReconfirmRequired === true) return false;
    // Plan wave-2026-10/1 §5: a windowed rental is ready until its end instant;
    // the daily tap applies only to multi-day windows. Legacy rentals (no
    // window) keep the confirmed-today rule unchanged.
    const endMs = parseIsoMs(profile.vehicleRentalEndAt);
    if (endMs != null) {
      if (nowMs >= endMs) return false;
      const hours =
        typeof profile.vehicleRentalHours === 'number' && Number.isFinite(profile.vehicleRentalHours)
          ? profile.vehicleRentalHours
          : (() => {
              const start = parseIsoMs(profile.vehicleRentalStartAt);
              return start == null || endMs <= start ? null : (endMs - start) / HOUR_MS;
            })();
      const daily = hours == null ? true : hours > DAILY_CONFIRM_MIN_HOURS;
      if (daily && profile.vehicleConfirmedServiceDate !== serviceDate(nowMs, tz)) return false;
      return true;
    }
    if (profile.vehicleConfirmedServiceDate !== serviceDate(nowMs, tz)) return false;
  }
  return true;
}

/**
 * UI state for banners, prompts and the daily modal. `vehicle` is the current
 * `vehicles` row when the caller has it; only `replacesVehicleId` is read, to
 * tell a first rental submission from a CHANGE.
 */
export function vehicleServiceState(
  profile: VehicleProfileFields | null | undefined,
  vehicle: { replacesVehicleId?: string | null } | null | undefined,
  nowMs: number,
  tz: string = DEFAULT_PLATFORM_TZ,
): VehicleServiceState {
  const ownership: VehicleOwnership = profile?.vehicleOwnership === 'rented' ? 'rented' : 'owned';
  const status = (profile?.vehicleStatus ?? 'none') as ProfileVehicleStatus;

  if (status === 'rejected') return 'VEHICLE_REJECTED';

  if (ownership === 'owned') {
    if (status === 'verified' && profile?.currentVehicleId) return 'OWN_VERIFIED';
    if (status === 'pending_review') return 'OWN_VEHICLE_REVIEW';
    return 'OWN_PENDING_VEHICLE';
  }

  if (status === 'none' || !profile?.currentVehicleId) return 'RENTAL_PENDING_VEHICLE';
  if (status === 'pending_review') {
    return vehicle?.replacesVehicleId ? 'RENTAL_CHANGE_PENDING' : 'RENTAL_VEHICLE_REVIEW';
  }
  // verified
  if (profile.vehicleReconfirmRequired === true) return 'RENTAL_DAILY_CONFIRMATION_REQUIRED';
  const remaining = rentalRemainingMs(profile, nowMs);
  if (remaining != null) {
    if (remaining <= 0) return 'RENTAL_EXPIRED';
    if (rentalNeedsDailyConfirm(profile) && profile.vehicleConfirmedServiceDate !== serviceDate(nowMs, tz)) {
      return 'RENTAL_DAILY_CONFIRMATION_REQUIRED';
    }
    return remaining <= RENTAL_EXPIRING_MS ? 'RENTAL_EXPIRING' : 'RENTAL_ACTIVE';
  }
  if (profile.vehicleConfirmedServiceDate !== serviceDate(nowMs, tz)) {
    return 'RENTAL_DAILY_CONFIRMATION_REQUIRED';
  }
  return 'RENTAL_VERIFIED_TODAY';
}

/** States in which the driver must act before service can resume. */
export const RESTRICTED_VEHICLE_STATES: ReadonlySet<VehicleServiceState> = new Set([
  'OWN_PENDING_VEHICLE',
  'OWN_VEHICLE_REVIEW',
  'RENTAL_PENDING_VEHICLE',
  'RENTAL_VEHICLE_REVIEW',
  'RENTAL_CHANGE_PENDING',
  'RENTAL_DAILY_CONFIRMATION_REQUIRED',
  'RENTAL_EXPIRED',
  'VEHICLE_REJECTED',
]);

/** Registration number as compared for duplicates: upper-case, `[A-Z0-9]` only. */
export function normalizePlate(input: string | null | undefined): string {
  return String(input ?? '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

export const MIN_CAPACITY_M3 = 1;
export const MAX_CAPACITY_M3 = 120;
export const VEHICLE_TYPES = ['small_van', 'medium_truck', 'large_truck'] as const;
export type VehicleType = (typeof VEHICLE_TYPES)[number];

export interface VehicleFormInput {
  ownership: VehicleOwnership;
  registrationNumber: string;
  brand: string;
  model: string;
  year?: string | null;
  vehicleType: string;
  capacityM3?: number | string | null;
  frontPlatePhoto: string;
  rearPlatePhoto: string;
  fullVehiclePhoto: string;
  /** Required for rented vehicles once the wave-2026-10 rules are on (`requireRentalWindow`). */
  rental?: RentalWindowInput | null;
}

/**
 * Wire-stable validation codes (master §6.1). Emitted by `submitvehicle` as
 * `fnCode`, mapped to `errors:vehicle.*` in the apps. The same function runs
 * client-side before the network call so the driver sees the error at once.
 */
export type VehicleValidationCode =
  | 'vehicle.photosRequired'
  | 'vehicle.plateInvalid'
  | 'vehicle.fieldsRequired'
  | 'vehicle.typeInvalid'
  | 'vehicle.capacityOutOfRange'
  | 'vehicle.yearInvalid'
  | RentalWindowValidationCode;

export interface ValidateVehicleOptions {
  /** Demand a valid rental window when `ownership === 'rented'` (plan wave-2026-10/1 R1). */
  requireRentalWindow?: boolean;
  nowMs?: number;
}

export function validateVehicleInput(
  input: Partial<VehicleFormInput>,
  opts: ValidateVehicleOptions = {},
): VehicleValidationCode[] {
  const codes: VehicleValidationCode[] = [];
  if (opts.requireRentalWindow && input.ownership === 'rented') {
    const r = resolveRentalWindow(input.rental ?? null, opts.nowMs ?? Date.now());
    if (!r.ok) codes.push(...r.codes);
  }
  const has = (v: unknown) => typeof v === 'string' && v.trim().length > 0;
  if (!has(input.frontPlatePhoto) || !has(input.rearPlatePhoto) || !has(input.fullVehiclePhoto)) {
    codes.push('vehicle.photosRequired');
  }
  const plateRaw = String(input.registrationNumber ?? '').trim();
  const plate = normalizePlate(plateRaw);
  if (plateRaw.length < 2 || plateRaw.length > 32 || plate.length < 2) {
    codes.push('vehicle.plateInvalid');
  }
  if (!has(input.brand) || !has(input.model)) codes.push('vehicle.fieldsRequired');
  if (!(VEHICLE_TYPES as readonly string[]).includes(String(input.vehicleType ?? ''))) {
    codes.push('vehicle.typeInvalid');
  }
  if (input.capacityM3 !== undefined && input.capacityM3 !== null && String(input.capacityM3).trim() !== '') {
    const n = Number(input.capacityM3);
    if (!Number.isFinite(n) || n < MIN_CAPACITY_M3 || n > MAX_CAPACITY_M3) {
      codes.push('vehicle.capacityOutOfRange');
    }
  }
  if (input.year !== undefined && input.year !== null && String(input.year).trim() !== '') {
    if (!/^\d{4}$/.test(String(input.year).trim())) codes.push('vehicle.yearInvalid');
  }
  return codes;
}
