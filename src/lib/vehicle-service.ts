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
  | 'reconfirm_required';

export type VehicleEventSource =
  | 'registration'
  | 'settings'
  | 'login'
  | 'post_move'
  | 'admin'
  | 'system'
  | 'backfill';

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
}

export const DEFAULT_PLATFORM_TZ = 'Europe/Berlin';

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
  | 'vehicle.yearInvalid';

export function validateVehicleInput(input: Partial<VehicleFormInput>): VehicleValidationCode[] {
  const codes: VehicleValidationCode[] = [];
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
