import type { TFunction } from 'i18next'
import { ID, Query } from 'node-appwrite'

import { writeDroppingUnknownAttributes } from './appwrite-write'
import { APPWRITE, PLATFORM_TZ } from './constants'
import { vehiclePermissions } from './doc-permissions'
import { profileOwnershipOnSubmit } from './mover-gates'
import { relId, writeNotification } from './notify'
import {
  canAutoRenew,
  normalizePlate,
  rentalWindowEnded,
  resolveRentalWindow,
  serviceDate,
  validateVehicleInput,
  type RentalWindow,
  type RentalWindowInput,
  type VehicleEventAction,
  type VehicleEventSource,
  type VehicleOwnership,
  type VehicleStatus,
} from './vehicle-service'

/**
 * Vehicle writes — the web port of the `submitvehicle` / `confirmvehicle`
 * cloud functions (`.agent/plans/vehicles/0.master.md` §6.1 / §6.2) and of the
 * D12 completion hook. Same semantics, same `fnCode`s, run with the admin key
 * under the session's identity (the existing route architecture).
 *
 * The `databases` handle is a parameter rather than a module import so the
 * branches below run against an in-memory fake in
 * `__tests__/vehicle-validation.test.ts`; the routes pass
 * `createAdminClient().databases`.
 *
 * Invariants (master D1/D2): nothing here touches `verificationStatus`. The
 * six legacy `vehicle*` snapshot columns are written by the admin verify route
 * — and, since plan `wave-2026-10/1` R6, by `selectVehicle` / `renewRental`,
 * which only ever copy them from a row that is already `verified` (the D2
 * rule "only verified vehicles feed pricing" is preserved; the writer set grew).
 *
 * Schema/enum staging: the wave's columns (`vehicles.rental*`,
 * `mover_profiles.vehicleRental*`, `ownedVehicleId`) and enum values
 * (`renewed`, `selected`, `renewal`, …) may reach production after this code.
 * Writes therefore retry without an attribute Appwrite does not know yet, and
 * event writes fall back to the nearest existing enum value — the same
 * self-healing pattern `writeNotification` uses for notification types.
 */

/** Appwrite rows are schemaless at the SDK boundary. */
type AnyDoc = Record<string, any>

/** The slice of `node-appwrite`'s `Databases` this module uses. */
export interface VehicleDb {
  listDocuments(
    databaseId: string,
    collectionId: string,
    queries?: string[],
  ): Promise<{ total: number; documents: AnyDoc[] }>
  getDocument(databaseId: string, collectionId: string, documentId: string): Promise<AnyDoc>
  createDocument(
    databaseId: string,
    collectionId: string,
    documentId: string,
    data: Record<string, unknown>,
    permissions?: string[],
  ): Promise<AnyDoc>
  updateDocument(
    databaseId: string,
    collectionId: string,
    documentId: string,
    data: Record<string, unknown>,
  ): Promise<AnyDoc>
}

/** Wire-stable failure: `fnCode` maps to `errors:<fnCode>`, `status` is the HTTP status. */
export class VehicleRepoError extends Error {
  constructor(
    public readonly fnCode: string,
    public readonly status: number,
    public readonly codes?: string[],
  ) {
    super(fnCode)
    this.name = 'VehicleRepoError'
  }
}

/**
 * `fnCode` → catalog sentence. The function contract's `mover.notAMover` has
 * no shared key of its own on the web; the profile-not-found sentence says the
 * same thing. Everything else is `errors:<fnCode>` (sub-plan 7).
 */
export function vehicleErrorMessage(t: TFunction, fnCode: string): string {
  if (fnCode === 'mover.notAMover') return t('errors:mover.profileNotFound')
  // i18n-keys: errors:vehicle.photosRequired, errors:vehicle.plateInvalid,
  // errors:vehicle.fieldsRequired, errors:vehicle.typeInvalid, errors:vehicle.capacityOutOfRange,
  // errors:vehicle.yearInvalid, errors:vehicle.plateInUse, errors:vehicle.notFound,
  // errors:vehicle.notPending, errors:vehicle.notRental, errors:vehicle.notVerified,
  // errors:vehicle.rentalWindowRequired, errors:vehicle.rentalWindowInvalid,
  // errors:vehicle.rentalWindowTooLong, errors:vehicle.rentalExpired, errors:vehicle.notInWindow,
  // errors:vehicle.notOwnVehicle
  return t(`errors:${fnCode}`)
}

export const SUBMIT_SOURCES: readonly VehicleEventSource[] = ['registration', 'settings', 'login', 'post_move']
export const CONFIRM_SOURCES: readonly VehicleEventSource[] = ['login', 'post_move']

export interface SubmitVehicleBody {
  ownership?: string | null
  registrationNumber?: string | null
  brand?: string | null
  model?: string | null
  year?: string | null
  vehicleType?: string | null
  capacityM3?: number | string | null
  frontPlatePhoto?: string | null
  rearPlatePhoto?: string | null
  fullVehiclePhoto?: string | null
  source?: string | null
  vehicleId?: string | null
  /** The completed move a post-move CHANGE follows; looked up server-side when absent. */
  moveId?: string | null
  /** Optional device/session id for the audit note. */
  note?: string | null
  /** Rental window (plan wave-2026-10/1 R1) — required when `ownership === 'rented'`. */
  rental?: RentalWindowInput | null
}

const DB = () => APPWRITE.DATABASE_ID
const PROFILES = () => APPWRITE.COLLECTIONS.MOVER_PROFILES
const VEHICLES = () => APPWRITE.COLLECTIONS.VEHICLES
const EVENTS = () => APPWRITE.COLLECTIONS.VEHICLE_EVENTS

const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '')

/** Writes that may carry the wave's new columns retry without any attribute the schema lacks (see `appwrite-write.ts`). */
const updateDoc = (db: VehicleDb, col: string, id: string, data: Record<string, unknown>) =>
  writeDroppingUnknownAttributes(data, (d) => db.updateDocument(DB(), col, id, d), 'vehicle-repo')
const createDoc = (db: VehicleDb, col: string, data: Record<string, unknown>, permissions?: string[]) =>
  writeDroppingUnknownAttributes(data, (d) => db.createDocument(DB(), col, ID.unique(), d, permissions), 'vehicle-repo')

/**
 * The legacy `mover_profiles.vehicle*` snapshot of the vehicle IN SERVICE
 * (master D2) — the columns pricing and the client lists read. Same mapping as
 * the admin verify route (`pickltadmin/src/lib/vehicle-decision.ts`).
 */
export function snapshotColumns(vehicle: AnyDoc): Record<string, unknown> {
  return {
    vehicleBrand: vehicle.brand ?? null,
    vehicleModel: vehicle.model ?? null,
    vehicleYear: vehicle.year ?? null,
    vehicleRegistration: vehicle.registrationNumber ?? null,
    vehicleType: vehicle.vehicleType ?? null,
    vehicleCapacity: vehicle.capacityM3 != null ? String(vehicle.capacityM3) : '',
  }
}

/** Profile window fields for a vehicle put in service: the rental's window, or nulls for an owned one. */
export function profileWindowColumns(vehicle: AnyDoc | null): Record<string, unknown> {
  const rented = vehicle?.ownership === 'rented'
  return {
    vehicleRentalStartAt: rented ? (vehicle?.rentalStartAt ?? null) : null,
    vehicleRentalEndAt: rented ? (vehicle?.rentalEndAt ?? null) : null,
    vehicleRentalHours: rented && typeof vehicle?.rentalHours === 'number' ? vehicle.rentalHours : null,
  }
}

/** `vehicles` columns of a resolved window (null when the vehicle is owned). */
export function vehicleWindowColumns(window: RentalWindow | null): Record<string, unknown> {
  return {
    rentalStartAt: window?.startAt ?? null,
    rentalEndAt: window?.endAt ?? null,
    rentalHours: window?.hours ?? null,
    rentalProvider: window?.provider ?? null,
  }
}

/** Resolve the body's window for a rented vehicle, or throw the 400 the contract names. */
export function requireRentalWindow(input: RentalWindowInput | null | undefined, nowMs: number): RentalWindow {
  const r = resolveRentalWindow(input ?? null, nowMs)
  if (!r.ok) throw new VehicleRepoError(r.codes[0], 400, r.codes)
  return r.window
}

/** Resolve the caller's profile; `null` when the session is not a mover. */
export async function getMoverProfileByUserId(db: VehicleDb, userId: string): Promise<AnyDoc | null> {
  const res = await db.listDocuments(DB(), PROFILES(), [Query.equal('userId', [userId]), Query.limit(1)])
  return res.documents[0] ?? null
}

async function requireProfile(db: VehicleDb, userId: string): Promise<AnyDoc> {
  const profile = await getMoverProfileByUserId(db, userId)
  if (!profile) throw new VehicleRepoError('mover.notAMover', 403)
  return profile
}

/** The mover's `isCurrent` vehicle row, or null. */
export async function getCurrentVehicle(db: VehicleDb, moverProfileId: string): Promise<AnyDoc | null> {
  const res = await db.listDocuments(DB(), VEHICLES(), [
    Query.equal('moverProfileId', [moverProfileId]),
    Query.equal('isCurrent', [true]),
    Query.limit(1),
  ])
  return res.documents[0] ?? null
}

/** Newest-first audit trail for the mover (master D8). */
export async function getVehicleHistory(db: VehicleDb, moverProfileId: string, limit = 50): Promise<AnyDoc[]> {
  const res = await db.listDocuments(DB(), EVENTS(), [
    Query.equal('moverProfileId', [moverProfileId]),
    Query.orderDesc('at'),
    Query.limit(limit),
  ])
  return res.documents
}

interface EventInput {
  moverProfileId: string
  ownerUserId: string
  vehicleId?: string | null
  moveId?: string | null
  action: VehicleEventAction
  previousStatus?: string | null
  newStatus?: string | null
  source: VehicleEventSource
  serviceDate?: string | null
  actorId: string
  actorRole: 'mover' | 'admin' | 'system'
  note?: string | null
  at: string
}

/**
 * Wave-2026-10 enum values → the nearest value that existed before the enums
 * were widened (plan §4: "writers fall back to existing values until widened").
 * The note keeps the intended action so the audit trail stays readable.
 */
const LEGACY_ACTION: Partial<Record<VehicleEventAction, VehicleEventAction>> = {
  renewed: 'resubmitted',
  selected: 'confirmed_same',
  expired: 'retired',
  fallback: 'retired',
  expiring_soon: 'confirmed_same',
}
const LEGACY_SOURCE: Partial<Record<VehicleEventSource, VehicleEventSource>> = {
  renewal: 'settings',
  cron: 'system',
}

/** One append-only `vehicle_events` row; owner-readable like the vehicle itself. */
export async function appendVehicleEvent(db: VehicleDb, e: EventInput): Promise<AnyDoc> {
  const row = (action: VehicleEventAction, source: VehicleEventSource, note: string | null) => ({
    moverProfileId: e.moverProfileId,
    ownerUserId: e.ownerUserId,
    vehicleId: e.vehicleId ?? null,
    moveId: e.moveId ?? null,
    action,
    previousStatus: e.previousStatus ?? null,
    newStatus: e.newStatus ?? null,
    source,
    serviceDate: e.serviceDate ?? null,
    actorId: e.actorId,
    actorRole: e.actorRole,
    note: note ? String(note).slice(0, 512) : null,
    at: e.at,
  })
  const perms = vehiclePermissions(e.ownerUserId)
  try {
    return await db.createDocument(DB(), EVENTS(), ID.unique(), row(e.action, e.source, e.note ?? null), perms)
  } catch (err) {
    const action = LEGACY_ACTION[e.action]
    const source = LEGACY_SOURCE[e.source]
    if (!action && !source) throw err
    console.warn(`[vehicle-repo] vehicle_events enum rejected ${e.action}/${e.source}; writing legacy values:`, err)
    const note = [`[${e.action}/${e.source}]`, e.note ?? ''].filter(Boolean).join(' ')
    return db.createDocument(DB(), EVENTS(), ID.unique(), row(action ?? e.action, source ?? e.source, note), perms)
  }
}

/**
 * The mover's fleet (plan wave-2026-10/1 R3): every non-retired vehicle, plus
 * the newest rental even when the cron has retired it — that row is what
 * "Rent again" renews. Newest first.
 */
export async function getFleet(db: VehicleDb, moverProfileId: string): Promise<AnyDoc[]> {
  const res = await db.listDocuments(DB(), VEHICLES(), [
    Query.equal('moverProfileId', [moverProfileId]),
    Query.orderDesc('submittedAt'),
    Query.limit(25),
  ])
  const rows = res.documents
  const active = rows.filter((v) => v.status !== 'retired')
  const newestRental = rows.find((v) => v.ownership === 'rented')
  if (newestRental && !active.some((v) => v.$id === newestRental.$id)) active.push(newestRental)
  return active
}

/**
 * Master §6.1. Validates, rejects a plate another driver holds, then either
 * resubmits `vehicleId` in place or retires the current vehicle and creates
 * the new one. Updates the profile's vehicle pointer/status and clears the
 * rental confirmation so the new vehicle starts unconfirmed.
 */
/**
 * Audit note for a web submission or confirmation (spec §8/§11 "session/login
 * identifier"): the caller's own note when it sent one, else the browser's
 * user agent. Capped to the column size.
 */
export function webAuditNote(bodyNote: unknown, userAgent: string | null): string | null {
  if (typeof bodyNote === 'string' && bodyNote.trim()) return bodyNote.trim().slice(0, 512)
  const ua = (userAgent ?? '').trim()
  return ua ? `web; ${ua}`.slice(0, 512) : 'web'
}

/**
 * Backfilled vehicles (D14) predate plate photos: their three required photo
 * columns hold the literal `backfill:missing`, not a URL. Blank anything that
 * is not an http(s) URL before a row reaches a screen, so it renders as "no
 * photo" rather than a broken image.
 */
export function withoutPhotoPlaceholders<T extends Record<string, unknown>>(vehicle: T | null): T | null {
  if (!vehicle) return vehicle
  const out: Record<string, unknown> = { ...vehicle }
  for (const key of ['frontPlatePhoto', 'rearPlatePhoto', 'fullVehiclePhoto']) {
    const v = out[key]
    if (typeof v !== 'string' || !/^https?:\/\//i.test(v)) out[key] = null
  }
  return out as T
}

/** Reviewer hint, never a rejection — mirrors `plateFormatHint` in `functions/submitvehicle`. */
export function plateFormatHint(normalized: string): 'ok' | 'unusual' {
  if (normalized.length < 4 || normalized.length > 10) return 'unusual'
  if (!/[A-Z]/.test(normalized) || !/[0-9]/.test(normalized)) return 'unusual'
  return 'ok'
}

/** The automated, ML-free checks stored on the vehicle row (master D7) — same shape as the function's. */
export function buildVehicleChecks(p: { registrationNormalized: string; previouslyUsedByDriver: boolean }): string {
  return JSON.stringify({
    v: 1,
    photosPresent: true,
    plateNormalized: p.registrationNormalized,
    plateFormat: plateFormatHint(p.registrationNormalized),
    duplicatePlate: false,
    previouslyUsedByDriver: p.previouslyUsedByDriver,
    ocr: null,
  })
}

/** The move behind an outstanding post-move re-confirmation (newest `reconfirm_required` event). */
async function pendingReconfirmMoveId(db: VehicleDb, moverProfileId: string): Promise<string | null> {
  try {
    const rows = await db.listDocuments(DB(), EVENTS(), [
      Query.equal('moverProfileId', [moverProfileId]),
      Query.equal('action', ['reconfirm_required']),
      Query.orderDesc('at'),
      Query.limit(1),
    ])
    const id = rows.documents[0]?.moveId
    return id ? String(id).slice(0, 36) : null
  } catch {
    return null
  }
}

export async function submitVehicle(
  db: VehicleDb,
  params: { userId: string; body: SubmitVehicleBody; nowMs?: number; tz?: string },
): Promise<{ vehicle: AnyDoc; profile: AnyDoc }> {
  const { userId, body } = params
  const nowMs = params.nowMs ?? Date.now()
  const tz = params.tz ?? PLATFORM_TZ
  const now = new Date(nowMs).toISOString()
  const today = serviceDate(nowMs, tz)

  const profile = await requireProfile(db, userId)
  const ownerUserId = relId(profile.userId) ?? userId

  const ownership: VehicleOwnership =
    body.ownership === 'rented' || body.ownership === 'owned'
      ? body.ownership
      : profile.vehicleOwnership === 'rented'
        ? 'rented'
        : 'owned'
  const source: VehicleEventSource = (SUBMIT_SOURCES as readonly string[]).includes(String(body.source))
    ? (body.source as VehicleEventSource)
    : 'settings'

  const input = {
    ownership,
    registrationNumber: str(body.registrationNumber),
    brand: str(body.brand),
    model: str(body.model),
    year: str(body.year) || null,
    vehicleType: str(body.vehicleType),
    capacityM3: body.capacityM3 ?? null,
    frontPlatePhoto: str(body.frontPlatePhoto),
    rearPlatePhoto: str(body.rearPlatePhoto),
    fullVehiclePhoto: str(body.fullVehiclePhoto),
  }
  const codes = validateVehicleInput(input)
  if (codes.length) throw new VehicleRepoError(codes[0], 400, codes)
  // Plan wave-2026-10/1 R1: every rental has a window. Validated with the same
  // function the browser ran, so the same `fnCode` comes back either way.
  const window: RentalWindow | null = ownership === 'rented' ? requireRentalWindow(body.rental, nowMs) : null

  const registrationNumber = input.registrationNumber.toUpperCase()
  const registrationNormalized = normalizePlate(registrationNumber)
  const capacityM3 =
    input.capacityM3 === null || input.capacityM3 === undefined || String(input.capacityM3).trim() === ''
      ? null
      : Number(input.capacityM3)

  // Duplicate plate across other movers' non-retired vehicles (master D7).
  const dupes = await db.listDocuments(DB(), VEHICLES(), [
    Query.equal('registrationNormalized', [registrationNormalized]),
    Query.notEqual('status', 'retired'),
    Query.limit(25),
  ])
  if (dupes.documents.some((v) => v.moverProfileId !== profile.$id)) {
    throw new VehicleRepoError('vehicle.plateInUse', 409)
  }

  let previouslyUsedByDriver = false
  try {
    const mine = await db.listDocuments(DB(), VEHICLES(), [
      Query.equal('registrationNormalized', [registrationNormalized]),
      Query.equal('moverProfileId', [profile.$id]),
      Query.equal('status', ['retired']),
      Query.limit(1),
    ])
    previouslyUsedByDriver = mine.documents.length > 0
  } catch {
    previouslyUsedByDriver = false
  }
  const checks = buildVehicleChecks({ registrationNormalized, previouslyUsedByDriver })

  // A CHANGE after a completed move belongs to that move.
  const moveId =
    str(body.moveId) || (profile.vehicleReconfirmRequired === true ? await pendingReconfirmMoveId(db, profile.$id) : null)

  const fields = {
    ownership,
    registrationNumber,
    registrationNormalized,
    brand: input.brand,
    model: input.model,
    year: input.year,
    vehicleType: input.vehicleType,
    capacityM3,
    frontPlatePhoto: input.frontPlatePhoto,
    rearPlatePhoto: input.rearPlatePhoto,
    fullVehiclePhoto: input.fullVehiclePhoto,
    checks,
    ...vehicleWindowColumns(window),
  }

  let vehicle: AnyDoc
  // R3/R8: an owned driver whose verified own vehicle is in service may ADD a
  // rental for a period. The owned vehicle is not retired and stays in service
  // (the profile stays verified); the rental is reviewed in the background and
  // the admin verify route puts it in service once approved.
  let keepsOwnedInService = false
  const vehicleId = str(body.vehicleId)
  if (vehicleId) {
    // Resubmission: must be the caller's own pending/rejected vehicle.
    let existing: AnyDoc
    try {
      existing = await db.getDocument(DB(), VEHICLES(), vehicleId)
    } catch {
      throw new VehicleRepoError('vehicle.notFound', 404)
    }
    if (existing.moverProfileId !== profile.$id) throw new VehicleRepoError('vehicle.notFound', 404)
    const prev = existing.status as VehicleStatus
    if (prev !== 'pending_review' && prev !== 'rejected') throw new VehicleRepoError('vehicle.notPending', 409)

    vehicle = await updateDoc(db, VEHICLES(), vehicleId, {
      ...fields,
      status: 'pending_review',
      rejectionReason: null,
      isCurrent: existing.isCurrent !== false,
      submittedAt: now,
    })
    keepsOwnedInService = existing.isCurrent === false && !!profile.currentVehicleId
    await appendVehicleEvent(db, {
      moverProfileId: profile.$id,
      ownerUserId,
      vehicleId,
      moveId,
      action: 'resubmitted',
      previousStatus: prev,
      newStatus: 'pending_review',
      source,
      serviceDate: today,
      actorId: userId,
      actorRole: 'mover',
      note: body.note ?? null,
      at: now,
    })
  } else {
    // Retire whatever is current, then create the replacement — unless the
    // current vehicle is the driver's verified OWN vehicle and this is a
    // rental added alongside it (R3).
    const current = await getCurrentVehicle(db, profile.$id)
    keepsOwnedInService =
      !!current && current.ownership === 'owned' && current.status === 'verified' && ownership === 'rented'
    if (current && !keepsOwnedInService) {
      await db.updateDocument(DB(), VEHICLES(), current.$id, {
        status: 'retired',
        isCurrent: false,
        retiredAt: now,
      })
      await appendVehicleEvent(db, {
        moverProfileId: profile.$id,
        ownerUserId,
        vehicleId: current.$id,
        moveId,
      action: 'retired',
        previousStatus: current.status ?? null,
        newStatus: 'retired',
        source,
        serviceDate: today,
        actorId: userId,
        actorRole: 'mover',
        at: now,
      })
    }

    vehicle = await createDoc(
      db,
      VEHICLES(),
      {
        moverProfileId: profile.$id,
        ownerUserId,
        ...fields,
        status: 'pending_review',
        rejectionReason: null,
        isCurrent: !keepsOwnedInService,
        replacesVehicleId: keepsOwnedInService ? null : (current?.$id ?? null),
        submittedAt: now,
        verifiedAt: null,
        reviewedBy: null,
        retiredAt: null,
        expiredAt: null,
        renewalCount: 0,
      },
      vehiclePermissions(ownerUserId),
    )
    await appendVehicleEvent(db, {
      moverProfileId: profile.$id,
      ownerUserId,
      vehicleId: vehicle.$id,
      moveId,
      action: 'submitted',
      previousStatus: null,
      newStatus: 'pending_review',
      source,
      serviceDate: today,
      actorId: userId,
      actorRole: 'mover',
      note: body.note ?? null,
      at: now,
    })
    if ((source === 'login' || source === 'post_move') && !keepsOwnedInService) {
      await appendVehicleEvent(db, {
        moverProfileId: profile.$id,
        ownerUserId,
        vehicleId: vehicle.$id,
        moveId,
      action: 'change_requested',
        previousStatus: current?.status ?? null,
        newStatus: 'pending_review',
        source,
        serviceDate: today,
        actorId: userId,
        actorRole: 'mover',
        at: now,
      })
    }
  }

  const updatedProfile = keepsOwnedInService
    ? await updateDoc(db, PROFILES(), profile.$id, {
        // The own vehicle keeps the service; only remember it as the fallback (R4).
        ownedVehicleId: profile.ownedVehicleId ?? profile.currentVehicleId,
      })
    : await updateDoc(db, PROFILES(), profile.$id, {
        vehicleOwnership: profileOwnershipOnSubmit(profile.vehicleOwnership, ownership),
        currentVehicleId: vehicle.$id,
        vehicleStatus: 'pending_review',
        vehicleReconfirmRequired: false,
        vehicleConfirmedServiceDate: null,
        ...profileWindowColumns(vehicle),
      })

  return { vehicle, profile: updatedProfile }
}

export interface RenewRentalParams {
  userId: string
  vehicleId: string
  rental: RentalWindowInput | null | undefined
  /** Fresh plate photos — used only when the renewal needs review again. */
  frontPlatePhoto?: string | null
  rearPlatePhoto?: string | null
  fullVehiclePhoto?: string | null
  note?: string | null
  nowMs?: number
  tz?: string
}

/**
 * Plan wave-2026-10/1 R5 — "Rent again" / "Extend" for the SAME rental row:
 * only the window is new. When `canAutoRenew` holds (verified, never rejected,
 * last window ended ≤ 30 days ago or not yet) the vehicle stays `verified`,
 * goes (back) into service with the window snapshot and today's confirmation,
 * `renewalCount` grows and the audit gets `renewed`/`renewal`. Otherwise the
 * row returns to `pending_review` (photos re-requested) with `resubmitted`.
 */
export async function renewRental(
  db: VehicleDb,
  params: RenewRentalParams,
): Promise<{ vehicle: AnyDoc; profile: AnyDoc; autoVerified: boolean }> {
  const nowMs = params.nowMs ?? Date.now()
  const tz = params.tz ?? PLATFORM_TZ
  const now = new Date(nowMs).toISOString()
  const today = serviceDate(nowMs, tz)

  const profile = await requireProfile(db, params.userId)
  const ownerUserId = relId(profile.userId) ?? params.userId

  let vehicle: AnyDoc
  try {
    vehicle = await db.getDocument(DB(), VEHICLES(), str(params.vehicleId))
  } catch {
    throw new VehicleRepoError('vehicle.notFound', 404)
  }
  if (vehicle.moverProfileId !== profile.$id) throw new VehicleRepoError('vehicle.notOwnVehicle', 403)
  if (vehicle.ownership !== 'rented') throw new VehicleRepoError('vehicle.notRental', 400)

  const window = requireRentalWindow(params.rental, nowMs)
  const previous = { startAt: vehicle.rentalStartAt ?? null, endAt: vehicle.rentalEndAt ?? null }
  // `canAutoRenew` also accepts a rental the cron closed (`retired` + `expiredAt`): same verified plates (R5).
  const auto = canAutoRenew(vehicle, nowMs)
  const prevStatus = (vehicle.status ?? null) as string | null

  const photos =
    str(params.frontPlatePhoto) && str(params.rearPlatePhoto) && str(params.fullVehiclePhoto)
      ? {
          frontPlatePhoto: str(params.frontPlatePhoto),
          rearPlatePhoto: str(params.rearPlatePhoto),
          fullVehiclePhoto: str(params.fullVehiclePhoto),
        }
      : {}
  if (!auto && !Object.keys(photos).length && vehicle.rejectionReason) {
    // A rejected rental needs new evidence before it can be reviewed again.
    throw new VehicleRepoError('vehicle.photosRequired', 400, ['vehicle.photosRequired'])
  }

  const ownedInService =
    !!profile.currentVehicleId && profile.currentVehicleId !== vehicle.$id && profile.vehicleOwnership !== 'rented'

  if (auto) {
    // Any other current row of this mover steps aside; the owned vehicle (if
    // that is what was in service) stays verified and remains the fallback.
    const others = await db.listDocuments(DB(), VEHICLES(), [
      Query.equal('moverProfileId', [profile.$id]),
      Query.equal('isCurrent', [true]),
      Query.limit(10),
    ])
    for (const other of others.documents) {
      if (other.$id !== vehicle.$id) await db.updateDocument(DB(), VEHICLES(), other.$id, { isCurrent: false })
    }
    const updated = await updateDoc(db, VEHICLES(), vehicle.$id, {
      ...vehicleWindowColumns(window),
      status: 'verified',
      isCurrent: true,
      retiredAt: null,
      expiredAt: null,
      renewalCount: (typeof vehicle.renewalCount === 'number' ? vehicle.renewalCount : 0) + 1,
    })
    const updatedProfile = await updateDoc(db, PROFILES(), profile.$id, {
      currentVehicleId: vehicle.$id,
      vehicleOwnership: 'rented',
      vehicleStatus: 'verified',
      vehicleReconfirmRequired: false,
      vehicleConfirmedAt: now,
      vehicleConfirmedServiceDate: today,
      ...profileWindowColumns(updated),
      ...(ownedInService ? { ownedVehicleId: profile.ownedVehicleId ?? profile.currentVehicleId } : {}),
      ...snapshotColumns(updated),
    })
    await appendVehicleEvent(db, {
      moverProfileId: profile.$id,
      ownerUserId,
      vehicleId: vehicle.$id,
      action: 'renewed',
      previousStatus: prevStatus,
      newStatus: 'verified',
      source: 'renewal',
      serviceDate: today,
      actorId: params.userId,
      actorRole: 'mover',
      note: JSON.stringify({ previous, next: { startAt: window.startAt, endAt: window.endAt }, note: params.note ?? null }),
      at: now,
    })
    return { vehicle: updated, profile: updatedProfile, autoVerified: true }
  }

  // Back to review: the rental is the pending row; an own vehicle in service
  // keeps the service meanwhile (R8), a rental in service is replaced in place.
  const updated = await updateDoc(db, VEHICLES(), vehicle.$id, {
    ...vehicleWindowColumns(window),
    ...photos,
    status: 'pending_review',
    rejectionReason: null,
    isCurrent: !ownedInService,
    retiredAt: null,
    expiredAt: null,
    submittedAt: now,
  })
  const updatedProfile = ownedInService
    ? await updateDoc(db, PROFILES(), profile.$id, {
        ownedVehicleId: profile.ownedVehicleId ?? profile.currentVehicleId,
      })
    : await updateDoc(db, PROFILES(), profile.$id, {
        currentVehicleId: vehicle.$id,
        vehicleOwnership: 'rented',
        vehicleStatus: 'pending_review',
        vehicleReconfirmRequired: false,
        vehicleConfirmedServiceDate: null,
        ...profileWindowColumns(updated),
      })
  await appendVehicleEvent(db, {
    moverProfileId: profile.$id,
    ownerUserId,
    vehicleId: vehicle.$id,
    action: 'resubmitted',
    previousStatus: prevStatus,
    newStatus: 'pending_review',
    source: 'renewal',
    serviceDate: today,
    actorId: params.userId,
    actorRole: 'mover',
    note: JSON.stringify({ previous, next: { startAt: window.startAt, endAt: window.endAt }, note: params.note ?? null }),
    at: now,
  })
  return { vehicle: updated, profile: updatedProfile, autoVerified: false }
}

/**
 * Plan wave-2026-10/1 R6 — the one-tap "Vehicle in service" control. The
 * chosen row must be the mover's, `verified`, and (for a rental with a window)
 * inside it. Writes `currentVehicleId`, `vehicleOwnership` (= the chosen
 * vehicle's), the snapshot columns, the window fields and the `isCurrent`
 * flags; a rental put in service counts as confirmed for today.
 */
export async function selectVehicle(
  db: VehicleDb,
  params: { userId: string; vehicleId: string; note?: string | null; nowMs?: number; tz?: string },
): Promise<{ vehicle: AnyDoc; profile: AnyDoc }> {
  const nowMs = params.nowMs ?? Date.now()
  const tz = params.tz ?? PLATFORM_TZ
  const now = new Date(nowMs).toISOString()
  const today = serviceDate(nowMs, tz)

  const profile = await requireProfile(db, params.userId)
  const ownerUserId = relId(profile.userId) ?? params.userId

  let vehicle: AnyDoc
  try {
    vehicle = await db.getDocument(DB(), VEHICLES(), str(params.vehicleId))
  } catch {
    throw new VehicleRepoError('vehicle.notFound', 404)
  }
  if (vehicle.moverProfileId !== profile.$id) throw new VehicleRepoError('vehicle.notOwnVehicle', 403)
  if (vehicle.status !== 'verified') throw new VehicleRepoError('vehicle.notVerified', 409)
  if (vehicle.ownership === 'rented') {
    const end = typeof vehicle.rentalEndAt === 'string' ? Date.parse(vehicle.rentalEndAt) : NaN
    if (Number.isFinite(end) && nowMs >= end) throw new VehicleRepoError('vehicle.notInWindow', 409)
  }

  const mine = await db.listDocuments(DB(), VEHICLES(), [
    Query.equal('moverProfileId', [profile.$id]),
    Query.notEqual('status', 'retired'),
    Query.limit(25),
  ])
  for (const row of mine.documents) {
    const shouldBeCurrent = row.$id === vehicle.$id
    if ((row.isCurrent === true) !== shouldBeCurrent) {
      await db.updateDocument(DB(), VEHICLES(), row.$id, { isCurrent: shouldBeCurrent })
    }
  }
  const previousId = profile.currentVehicleId ?? null
  const rented = vehicle.ownership === 'rented'
  const updatedProfile = await updateDoc(db, PROFILES(), profile.$id, {
    currentVehicleId: vehicle.$id,
    vehicleOwnership: rented ? 'rented' : 'owned',
    vehicleStatus: 'verified',
    vehicleReconfirmRequired: false,
    vehicleConfirmedAt: rented ? now : (profile.vehicleConfirmedAt ?? null),
    vehicleConfirmedServiceDate: rented ? today : null,
    ...profileWindowColumns(vehicle),
    ...snapshotColumns(vehicle),
    ...(rented ? {} : { ownedVehicleId: vehicle.$id }),
  })
  await appendVehicleEvent(db, {
    moverProfileId: profile.$id,
    ownerUserId,
    vehicleId: vehicle.$id,
    action: 'selected',
    previousStatus: 'verified',
    newStatus: 'verified',
    source: 'settings',
    serviceDate: today,
    actorId: params.userId,
    actorRole: 'mover',
    note: JSON.stringify({ previousVehicleId: previousId, note: params.note ?? null }),
    at: now,
  })
  return { vehicle, profile: updatedProfile }
}

/**
 * Master §6.2 — SAME confirmation for today's service day. Rental drivers
 * with a verified current vehicle only.
 */
export async function confirmVehicleSame(
  db: VehicleDb,
  params: { userId: string; source: string; moveId?: string | null; note?: string | null; nowMs?: number; tz?: string },
): Promise<{ serviceDate: string; profile: AnyDoc }> {
  const nowMs = params.nowMs ?? Date.now()
  const tz = params.tz ?? PLATFORM_TZ
  const now = new Date(nowMs).toISOString()
  const today = serviceDate(nowMs, tz)
  const source: VehicleEventSource = (CONFIRM_SOURCES as readonly string[]).includes(params.source)
    ? (params.source as VehicleEventSource)
    : 'login'

  const profile = await requireProfile(db, params.userId)
  if (profile.vehicleOwnership !== 'rented') throw new VehicleRepoError('vehicle.notRental', 400)
  if (profile.vehicleStatus !== 'verified' || !profile.currentVehicleId) {
    throw new VehicleRepoError('vehicle.notVerified', 409)
  }
  // Plan wave-2026-10/1 §6: a confirmation cannot revive a window that has ended.
  if (rentalWindowEnded(profile, nowMs)) throw new VehicleRepoError('vehicle.rentalExpired', 409)
  const ownerUserId = relId(profile.userId) ?? params.userId

  const updated = await db.updateDocument(DB(), PROFILES(), profile.$id, {
    vehicleConfirmedAt: now,
    vehicleConfirmedServiceDate: today,
    vehicleReconfirmRequired: false,
  })
  await appendVehicleEvent(db, {
    moverProfileId: profile.$id,
    ownerUserId,
    vehicleId: profile.currentVehicleId,
    moveId:
      params.moveId ??
      (profile.vehicleReconfirmRequired === true ? await pendingReconfirmMoveId(db, profile.$id) : null),
    action: 'confirmed_same',
    previousStatus: 'verified',
    newStatus: 'verified',
    source,
    serviceDate: today,
    actorId: params.userId,
    actorRole: 'mover',
    note: params.note ?? null,
    at: now,
  })
  return { serviceDate: today, profile: updated }
}

type NotifyFn = typeof writeNotification

/**
 * Master D12 — called from both true-completion paths (`confirm-payment`
 * both-confirmed, `update-move-status → completed`). Rental drivers only:
 * sets the server flag the dashboard prompt reads, appends the audit event and
 * writes the `vehicle_confirmation_required` notification (`sendpush` fans it
 * out; `writeNotification` falls back to `system` until the enum is widened).
 * Best-effort by design: a failure here must not fail the completion, and
 * never throws. Returns whether the flag was set.
 */
export async function markReconfirmRequired(
  db: VehicleDb,
  profile: AnyDoc,
  params: { moveId: string; handle?: string | null; nowMs?: number; tz?: string; notify?: NotifyFn },
): Promise<boolean> {
  if (profile?.vehicleOwnership !== 'rented') return false
  const nowMs = params.nowMs ?? Date.now()
  const tz = params.tz ?? PLATFORM_TZ
  const now = new Date(nowMs).toISOString()
  const ownerUserId = relId(profile.userId)
  if (!ownerUserId) return false
  const notify = params.notify ?? writeNotification

  // The flag write is the point of no return: it is what gates the next
  // accept. Once it lands, the audit event and the notification are each
  // best-effort and independent, and the function reports the flag as set.
  try {
    await db.updateDocument(DB(), PROFILES(), profile.$id, { vehicleReconfirmRequired: true })
  } catch (err) {
    console.warn('[vehicle-repo] markReconfirmRequired failed (non-fatal):', err)
    return false
  }

  try {
    await appendVehicleEvent(db, {
      moverProfileId: profile.$id,
      ownerUserId,
      vehicleId: profile.currentVehicleId ?? null,
      moveId: params.moveId,
      action: 'reconfirm_required',
      previousStatus: profile.vehicleStatus ?? null,
      newStatus: profile.vehicleStatus ?? null,
      source: 'system',
      serviceDate: serviceDate(nowMs, tz),
      actorId: 'system',
      actorRole: 'system',
      at: now,
    })
  } catch (err) {
    console.warn('[vehicle-repo] markReconfirmRequired: event write failed (flag is set):', err)
  }

  try {
    await notify({
      userId: ownerUserId,
      type: 'vehicle_confirmation_required',
      title: 'Confirm your vehicle',
      body: 'Before your next move, confirm whether you are still using the same vehicle.',
      data: { handle: params.handle ?? null, moveId: params.moveId },
      i18n: { key: 'vehicle.confirmationRequired' },
    })
  } catch (err) {
    console.warn('[vehicle-repo] markReconfirmRequired: notification failed (flag is set):', err)
  }
  return true
}

/**
 * D12 for the completion path that holds only the move: when the *client*
 * confirms payment second, the route knows `moves.moverProfileId`, not the
 * profile row. Loads it and defers to `markReconfirmRequired`. Never throws.
 */
export async function markReconfirmRequiredForMover(
  db: VehicleDb,
  moverProfileId: string | null | undefined,
  params: Parameters<typeof markReconfirmRequired>[2],
): Promise<boolean> {
  if (!moverProfileId) return false
  let profile: AnyDoc
  try {
    profile = await db.getDocument(DB(), PROFILES(), moverProfileId)
  } catch (err) {
    console.warn('[vehicle-repo] markReconfirmRequiredForMover: profile lookup failed (non-fatal):', err)
    return false
  }
  return markReconfirmRequired(db, profile, params)
}
