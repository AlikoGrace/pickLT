import type { TFunction } from 'i18next'
import { ID, Query } from 'node-appwrite'

import { APPWRITE, PLATFORM_TZ } from './constants'
import { vehiclePermissions } from './doc-permissions'
import { relId, writeNotification } from './notify'
import {
  normalizePlate,
  serviceDate,
  validateVehicleInput,
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
 * Invariants (master D1/D2): nothing here touches `verificationStatus` or the
 * six legacy `vehicle*` snapshot columns — those belong to driver KYC and to
 * the admin verify route respectively.
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
  // errors:vehicle.notPending, errors:vehicle.notRental, errors:vehicle.notVerified
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
}

const DB = () => APPWRITE.DATABASE_ID
const PROFILES = () => APPWRITE.COLLECTIONS.MOVER_PROFILES
const VEHICLES = () => APPWRITE.COLLECTIONS.VEHICLES
const EVENTS = () => APPWRITE.COLLECTIONS.VEHICLE_EVENTS

const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '')

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

/** One append-only `vehicle_events` row; owner-readable like the vehicle itself. */
export async function appendVehicleEvent(db: VehicleDb, e: EventInput): Promise<AnyDoc> {
  return db.createDocument(
    DB(),
    EVENTS(),
    ID.unique(),
    {
      moverProfileId: e.moverProfileId,
      ownerUserId: e.ownerUserId,
      vehicleId: e.vehicleId ?? null,
      moveId: e.moveId ?? null,
      action: e.action,
      previousStatus: e.previousStatus ?? null,
      newStatus: e.newStatus ?? null,
      source: e.source,
      serviceDate: e.serviceDate ?? null,
      actorId: e.actorId,
      actorRole: e.actorRole,
      note: e.note ? String(e.note).slice(0, 512) : null,
      at: e.at,
    },
    vehiclePermissions(e.ownerUserId),
  )
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
  }

  let vehicle: AnyDoc
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

    vehicle = await db.updateDocument(DB(), VEHICLES(), vehicleId, {
      ...fields,
      status: 'pending_review',
      rejectionReason: null,
      isCurrent: true,
      submittedAt: now,
    })
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
    // Retire whatever is current, then create the replacement.
    const current = await getCurrentVehicle(db, profile.$id)
    if (current) {
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

    vehicle = await db.createDocument(
      DB(),
      VEHICLES(),
      ID.unique(),
      {
        moverProfileId: profile.$id,
        ownerUserId,
        ...fields,
        status: 'pending_review',
        rejectionReason: null,
        isCurrent: true,
        replacesVehicleId: current?.$id ?? null,
        submittedAt: now,
        verifiedAt: null,
        reviewedBy: null,
        retiredAt: null,
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
    if (source === 'login' || source === 'post_move') {
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

  const updatedProfile = await db.updateDocument(DB(), PROFILES(), profile.$id, {
    vehicleOwnership: ownership,
    currentVehicleId: vehicle.$id,
    vehicleStatus: 'pending_review',
    vehicleReconfirmRequired: false,
    vehicleConfirmedServiceDate: null,
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
 * Best-effort by design: a failure here must not fail the completion.
 * Returns whether the flag was set.
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

  try {
    await db.updateDocument(DB(), PROFILES(), profile.$id, { vehicleReconfirmRequired: true })
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
    console.warn('[vehicle-repo] markReconfirmRequired failed (non-fatal):', err)
    return false
  }

  await notify({
    userId: ownerUserId,
    type: 'vehicle_confirmation_required',
    title: 'Confirm your vehicle',
    body: 'Before your next move, confirm whether you are still using the same vehicle.',
    data: { handle: params.handle ?? null, moveId: params.moveId },
    i18n: { key: 'vehicle.confirmationRequired' },
  })
  return true
}
