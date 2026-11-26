import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/constants', () => ({
  APPWRITE: { DATABASE_ID: 'db', COLLECTIONS: { MOVES: 'moves', MOVER_PROFILES: 'mover_profiles' } },
  PLATFORM_TZ: 'Europe/Berlin',
}))
vi.mock('../constants', () => ({
  APPWRITE: { DATABASE_ID: 'db', COLLECTIONS: { MOVES: 'moves', MOVER_PROFILES: 'mover_profiles' } },
  PLATFORM_TZ: 'Europe/Berlin',
}))

import { directAssignmentBlock, mayMarkOnline, residenceBlock, startGate } from '../mover-gates'
import { goOnlineBlock } from '../mover-position-server'
import { dailyCapCheck, filterUnderDailyCap, loadVettingConfig, vettingPatch } from '../mover-vetting'
import { vettingView } from '../mover-vetting-view'
import { insuranceColumns, VehicleRepoError } from '../vehicle-repo'

// The function the web route ports. Imported so the two cannot drift apart.
import * as fn from '../../../functions/submitmoverprofile/src/main.js'

/**
 * Driver vetting on the web server (plan `legal/7.driver-vetting.md`): the
 * port of `functions/submitmoverprofile` `vettingPatch`, the database helpers,
 * the gates and the driver-facing view.
 */

type AnyDoc = Record<string, any>

const DAY = 86_400_000
const NOW = Date.parse('2026-12-01T10:00:00.000Z')
const TZ = 'Europe/Berlin'
const iso = (ms: number) => new Date(ms).toISOString()
const GATE_ON = NOW - DAY

const ready = (over: AnyDoc = {}): AnyDoc => ({
  $id: 'mp_1',
  verificationStatus: 'verified',
  vehicleStatus: 'verified',
  currentVehicleId: 'v1',
  vehicleOwnership: 'owned',
  isOnline: true,
  locationUpdatedAt: iso(NOW - 30_000),
  residenceStatus: 'verified',
  ...over,
})

describe('vettingPatch is the same rule as the function', () => {
  const bodies: AnyDoc[] = [
    {},
    { fullName: 'Max' },
    { residenceDocType: 'residence_permit', residenceDocFront: ' a ', residenceDocBack: 'b', residenceDocExpiresAt: '2027-06-30' },
    { residenceDocType: 'residence_permit', residenceDocFront: 'a', residenceDocBack: 'b' },
    { residenceDocType: 'residence_permit', residenceDocFront: 'a', residenceDocBack: 'b', residenceDocExpiresAt: '2020-01-01' },
    { residenceDocType: 'passport', residenceDocFront: 'a', residenceDocBack: 'b' },
    { residenceDocType: 'passport', residenceDocFront: 'a' },
    { residenceDocType: 'id_card', residenceDocFront: 'a', residenceDocBack: 'b' },
    { residenceDocFront: 'a', residenceDocBack: 'b' },
    { hasMovingCertificate: true },
    { hasMovingCertificate: true, movingCertificatePhoto: ' c ' },
    { hasMovingCertificate: false, movingCertificatePhoto: 'c' },
    { hasMovingCertificate: 'yes' },
    { hasBusinessInsurance: true },
    { hasBusinessInsurance: false },
    { hasBusinessInsurance: null },
    {
      residenceDocType: 'passport', residenceDocFront: 'a', residenceDocBack: 'b', residenceStatus: 'verified',
      hasMovingCertificate: true, movingCertificatePhoto: 'c', movingCertificateStatus: 'verified', hasBusinessInsurance: true,
    },
  ]

  it.each(bodies.map((b, i) => [i, b] as const))('case %i', (_i, body) => {
    expect(vettingPatch(body, NOW)).toEqual(fn.vettingPatch(body, NOW))
  })

  it('a driver can never write a review outcome', () => {
    const out = vettingPatch(bodies[bodies.length - 1], NOW)
    expect(out.patch).toMatchObject({ residenceStatus: 'pending_review', movingCertificateStatus: 'pending_review' })
  })
})

describe('gates', () => {
  it('residenceBlock: nothing until the gate date, then anything but a verified document; an expired one always', () => {
    expect(residenceBlock(ready({ residenceStatus: 'none' }), NOW, null)).toBeNull()
    expect(residenceBlock(ready({ residenceStatus: 'none' }), NOW, GATE_ON)).toBe('mover.residenceNotVerified')
    expect(residenceBlock(ready(), NOW, GATE_ON)).toBeNull()
    expect(residenceBlock(ready({ residenceDocExpiresAt: iso(NOW - 1) }), NOW, null)).toBe('mover.residenceExpired')
  })

  it('every work-handing gate carries it, after the existing checks', () => {
    const pending = ready({ residenceStatus: 'pending_review' })
    expect(directAssignmentBlock(pending, NOW, TZ)).toBeNull()
    expect(directAssignmentBlock(pending, NOW, TZ, GATE_ON)).toBe('mover.residenceNotVerified')
    expect(directAssignmentBlock(ready({ verificationStatus: 'pending_verification', residenceStatus: 'none' }), NOW, TZ, GATE_ON)).toBe('mover.notVerified')
    expect(goOnlineBlock(pending, NOW, TZ)).toBeNull()
    expect(goOnlineBlock(pending, NOW, TZ, GATE_ON)).toBe('mover.residenceNotVerified')
    expect(goOnlineBlock(ready({ feeStanding: 'restricted', residenceStatus: 'none' }), NOW, TZ, GATE_ON)).toBe('fees.restricted')
    expect(mayMarkOnline(pending, NOW, TZ)).toBe(true)
    expect(mayMarkOnline(pending, NOW, TZ, GATE_ON)).toBe(false)
    expect(mayMarkOnline(ready(), NOW, TZ, GATE_ON)).toBe(true)
  })

  it('startGate blocks taking a pinned move, never a move already under way', () => {
    const pending = ready({ residenceStatus: 'pending_review' })
    expect(startGate({ status: 'mover_assigned' }, pending, NOW, TZ, GATE_ON)).toEqual({
      blocked: true,
      vehicleId: null,
      fnCode: 'mover.residenceNotVerified',
    })
    expect(startGate({ status: 'mover_assigned' }, ready(), NOW, TZ, GATE_ON)).toMatchObject({ blocked: false, taking: true })
    for (const status of ['mover_accepted', 'mover_en_route', 'loading', 'in_transit']) {
      const gate = startGate({ status }, ready({ residenceDocExpiresAt: iso(NOW - DAY) }), NOW, TZ, GATE_ON)
      expect(gate).toEqual({ blocked: false, vehicleId: null })
    }
  })
})

describe('database helpers', () => {
  const config = { uncertifiedDailyMoveCap: 2, residenceGateFromMs: null }
  const db = (rows: AnyDoc[]) => ({ listDocuments: vi.fn().mockResolvedValue({ documents: rows }) }) as any
  const moves = [
    { $id: 'm1', status: 'completed' },
    { $id: 'm2', status: 'mover_accepted' },
    { $id: 'm3', status: 'cancelled_by_client' },
  ]

  it('loadVettingConfig reads the two rows; a failed read gives the defaults', async () => {
    const good = db([{ key: 'uncertified_daily_move_cap', value: '4' }, { key: 'residence_gate_from', value: '2027-01-15' }])
    await expect(loadVettingConfig(good)).resolves.toEqual({ uncertifiedDailyMoveCap: 4, residenceGateFromMs: Date.parse('2027-01-15') })
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const broken = { listDocuments: vi.fn().mockRejectedValue(new Error('down')) } as any
    await expect(loadVettingConfig(broken)).resolves.toEqual({ uncertifiedDailyMoveCap: 2, residenceGateFromMs: null })
    spy.mockRestore()
  })

  it('the third move of the day is refused without a certificate', async () => {
    await expect(dailyCapCheck(db(moves), { $id: 'mp_1' }, config, NOW, TZ)).resolves.toEqual({ ok: false, cap: 2, acceptedToday: 2 })
    await expect(dailyCapCheck(db(moves), { $id: 'mp_1' }, config, NOW, TZ, 'm2')).resolves.toMatchObject({ ok: true, acceptedToday: 1 })
    await expect(dailyCapCheck(db(moves), { $id: 'mp_1', movingCertificateStatus: 'pending_review' }, config, NOW, TZ)).resolves.toMatchObject({ ok: false })
  })

  it('a certified driver costs no query and has no cap', async () => {
    const d = db(moves)
    await expect(dailyCapCheck(d, { $id: 'mp_1', movingCertificateStatus: 'verified' }, config, NOW, TZ)).resolves.toEqual({
      ok: true,
      cap: null,
      acceptedToday: 0,
    })
    expect(d.listDocuments).not.toHaveBeenCalled()
  })

  it('fails open when the count cannot be read (column not created yet)', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const broken = { listDocuments: vi.fn().mockRejectedValue(new Error('Attribute not found: acceptedServiceDate')) } as any
    await expect(dailyCapCheck(broken, { $id: 'mp_1' }, config, NOW, TZ)).resolves.toMatchObject({ ok: true })
    spy.mockRestore()
  })

  it('filterUnderDailyCap drops only the capped, uncertified driver', async () => {
    const d = {
      listDocuments: vi.fn(async (_db: string, _col: string, queries: unknown[]) => ({
        documents: JSON.stringify(queries).includes('capped') ? moves : [moves[0]],
      })),
    } as any
    const kept = await filterUnderDailyCap(
      d,
      [{ $id: 'capped' }, { $id: 'fresh' }, { $id: 'cert', movingCertificateStatus: 'verified' }],
      config,
      NOW,
      TZ,
    )
    expect(kept.map((m) => m.$id)).toEqual(['fresh', 'cert'])
  })
})

describe('vettingView', () => {
  const config = { uncertifiedDailyMoveCap: 2, residenceGateFromMs: GATE_ON }

  it('states the cap before a profile exists', () => {
    expect(vettingView(null, config, null, NOW)).toMatchObject({
      cap: 2,
      hasProfile: false,
      residenceGateActive: true,
      residence: { status: 'none', prompt: 'residenceMissing', onFile: false },
      certificate: { status: 'none', declared: null, certified: false },
      today: null,
    })
  })

  it('never returns a photograph, only whether one is on file', () => {
    const view = vettingView(
      {
        residenceDocType: 'residence_permit',
        residenceDocFront: 'https://files/front',
        residenceDocBack: 'https://files/back',
        residenceDocExpiresAt: iso(NOW + 90 * DAY),
        residenceStatus: 'rejected',
        residenceRejectionReason: 'Back side unreadable',
        hasMovingCertificate: true,
        movingCertificatePhoto: 'https://files/cert',
        movingCertificateStatus: 'verified',
        hasBusinessInsurance: false,
        insuranceDeclaredAt: iso(NOW - DAY),
        socialSecurityNumber: '12 345678 A 901',
      },
      config,
      { ok: true, cap: null, acceptedToday: 0 },
      NOW,
    )
    expect(JSON.stringify(view)).not.toMatch(/https:\/\/files|345678/)
    expect(view).toMatchObject({
      residence: { status: 'rejected', prompt: 'residenceRejected', docType: 'residence_permit', rejectionReason: 'Back side unreadable', onFile: true },
      certificate: { status: 'verified', declared: true, onFile: true, certified: true },
      insurance: { hasBusinessInsurance: false },
      today: { acceptedToday: 0, cap: null, reached: false },
    })
  })

  it('reports a reached cap and an unset gate', () => {
    const view = vettingView({ residenceStatus: 'verified' }, { uncertifiedDailyMoveCap: 2, residenceGateFromMs: null }, { ok: false, cap: 2, acceptedToday: 2 }, NOW)
    expect(view).toMatchObject({ residenceGateFrom: null, residenceGateActive: false, today: { acceptedToday: 2, cap: 2, reached: true } })
    expect(view.residence.prompt).toBeNull()
  })
})

describe('motor liability declaration (web vehicle routes)', () => {
  it('needs a real yes or no; a renewal needs yes', () => {
    expect(insuranceColumns(true, 'T', { renew: false })).toEqual({ hasMotorInsurance: true, insuranceDeclaredAt: 'T' })
    expect(insuranceColumns(false, 'T', { renew: false })).toEqual({ hasMotorInsurance: false, insuranceDeclaredAt: 'T' })
    expect(insuranceColumns(true, 'T', { renew: true })).toEqual({ hasMotorInsurance: true, insuranceDeclaredAt: 'T' })
    for (const [answer, renew] of [[undefined, false], [null, false], ['yes', false], [undefined, true], [false, true]] as const) {
      let caught: unknown
      try {
        insuranceColumns(answer, 'T', { renew })
      } catch (e) {
        caught = e
      }
      expect(caught).toBeInstanceOf(VehicleRepoError)
      expect((caught as VehicleRepoError).fnCode).toBe('vehicle.insuranceRequired')
    }
  })
})
