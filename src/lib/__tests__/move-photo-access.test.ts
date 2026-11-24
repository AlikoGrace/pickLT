import { describe, expect, it, vi } from 'vitest'

vi.mock('node-appwrite', () => ({
  Permission: { read: (r: string) => `read("${r}")` },
  Role: { user: (id: string) => `user:${id}`, any: () => 'any' },
  ID: { unique: () => 'id' },
  Query: {},
}))

import { movePhotoPermissions, uploadedPhotoPermissions } from '../doc-permissions'
import { authorizeMovePhoto, inOpenPool, mayViewMovePhotos, moveHasPhoto, type PhotoAccessDeps } from '../move-photo-access'

/**
 * Plan `legal/4.private-photos`. The photo route streams bytes with the server
 * key, so `authorizeMovePhoto` is the access control for every move photo on
 * the web. Same table as the `getphotourls` function's `access.js`.
 */

const MOVER = { $id: 'prof_1', verificationStatus: 'verified', countryCode: 'DE', feeStanding: 'ok' }
const OTHER = { ...MOVER, $id: 'prof_2' }
const POOL = { $id: 'm_pool', clientId: 'client_a', status: 'booked', moveCategory: 'scheduled', countryCode: 'DE' }
const view = (over: Record<string, unknown>) =>
  mayViewMovePhotos({ callerId: 'mover_auth', move: POOL, profile: MOVER, hasOffer: false, ...over } as never)

describe('mayViewMovePhotos', () => {
  it('client of the move: yes, in any status; another client: no', () => {
    for (const status of ['draft', 'in_transit', 'completed', 'cancelled_by_client']) {
      expect(view({ callerId: 'client_a', profile: null, move: { ...POOL, status } })).toBe(true)
    }
    expect(view({ callerId: 'client_b', profile: null })).toBe(false)
  })

  it('assigned mover: yes; any other mover: no, even with an offer', () => {
    const taken = { ...POOL, status: 'mover_accepted', moverProfileId: { $id: 'prof_1' } }
    expect(view({ move: taken })).toBe(true)
    expect(view({ move: taken, profile: OTHER })).toBe(false)
    expect(view({ move: taken, profile: OTHER, hasOffer: true })).toBe(false)
  })

  it('mover with an offer on an open job: yes', () => {
    const instant = { $id: 'm_i', clientId: 'client_a', status: 'paid', moveCategory: 'instant', countryCode: 'DE' }
    expect(view({ move: instant, hasOffer: true })).toBe(true)
    expect(view({ move: instant })).toBe(false)
  })

  it('open scheduled pool: an eligible mover in the same country', () => {
    expect(view({})).toBe(true)
    expect(inOpenPool(POOL)).toBe(true)
    expect(view({ move: { ...POOL, countryCode: 'FR' } })).toBe(false)
    expect(view({ profile: { ...MOVER, verificationStatus: 'pending_verification' } })).toBe(false)
    expect(view({ profile: { ...MOVER, feeStanding: 'restricted' } })).toBe(false)
    expect(view({ move: { ...POOL, wizardDraft: true } })).toBe(false)
    expect(view({ move: { ...POOL, moveCategory: 'instant' } })).toBe(false)
    expect(view({ move: { ...POOL, status: 'cancelled_by_client' } })).toBe(false)
  })

  it('unverified mover: no, even with an offer; missing input: no', () => {
    expect(view({ profile: { ...MOVER, verificationStatus: 'suspended' }, hasOffer: true })).toBe(false)
    expect(view({ callerId: null })).toBe(false)
    expect(view({ move: null })).toBe(false)
  })
})

describe('moveHasPhoto', () => {
  const legacy = 'https://fra.cloud.appwrite.io/v1/storage/buckets/b/files/g2/view?project=p'
  const move = { coverPhotoId: 'c1', galleryPhotoIds: ['g1', legacy] }
  it('matches the cover and gallery by file id, in either stored shape', () => {
    expect(moveHasPhoto(move, 'c1')).toBe(true)
    expect(moveHasPhoto(move, 'g1')).toBe(true)
    expect(moveHasPhoto(move, 'g2')).toBe(true)
  })
  it('refuses any other file', () => {
    expect(moveHasPhoto(move, 'licence_1')).toBe(false)
    expect(moveHasPhoto(move, '')).toBe(false)
    expect(moveHasPhoto({}, 'c1')).toBe(false)
    expect(moveHasPhoto(null, 'c1')).toBe(false)
  })
})

describe('authorizeMovePhoto', () => {
  const MINE = { $id: 'm1', handle: 'PL-1', clientId: 'client_a', status: 'completed', coverPhotoId: 'c1', galleryPhotoIds: ['g1'] }
  const deps = (over: Partial<PhotoAccessDeps> = {}): PhotoAccessDeps => ({
    findMove: vi.fn(async (key: string) => (key === 'm1' || key === 'PL-1' ? MINE : null)),
    findProfile: vi.fn(async () => null),
    hasOffer: vi.fn(async () => false),
    ...over,
  })
  const ask = (d: PhotoAccessDeps, userId: string | null, fileId = 'c1', moveKey: string | null = 'm1') =>
    authorizeMovePhoto(d, { userId, moveKey, fileId })

  it('logged out: 401, and nothing is looked up', async () => {
    const d = deps()
    await expect(ask(d, null)).resolves.toEqual({ ok: false, status: 401 })
    expect(d.findMove).not.toHaveBeenCalled()
  })

  it('the client gets their photo, by id or by handle', async () => {
    await expect(ask(deps(), 'client_a')).resolves.toEqual({ ok: true, moveId: 'm1' })
    await expect(ask(deps(), 'client_a', 'g1', 'PL-1')).resolves.toEqual({ ok: true, moveId: 'm1' })
  })

  it('a stranger: 403', async () => {
    await expect(ask(deps(), 'client_b')).resolves.toEqual({ ok: false, status: 403 })
  })

  it('a file that is not on that move: 404, even for its client', async () => {
    await expect(ask(deps(), 'client_a', 'licence_1')).resolves.toEqual({ ok: false, status: 404 })
  })

  it('an unknown move or a missing key: 404', async () => {
    await expect(ask(deps(), 'client_a', 'c1', 'nope')).resolves.toEqual({ ok: false, status: 404 })
    await expect(ask(deps(), 'client_a', 'c1', null)).resolves.toEqual({ ok: false, status: 404 })
  })

  it('a mover with an offer on an open job gets it; without one does not', async () => {
    const open = { ...MINE, status: 'paid', moveCategory: 'instant', countryCode: 'DE' }
    const base = { findMove: vi.fn(async () => open), findProfile: vi.fn(async () => MOVER) }
    await expect(ask(deps({ ...base, hasOffer: vi.fn(async () => true) }), 'mover_auth')).resolves.toMatchObject({ ok: true })
    await expect(ask(deps({ ...base, hasOffer: vi.fn(async () => false) }), 'mover_auth')).resolves.toEqual({ ok: false, status: 403 })
  })

  it('failing lookups never widen access', async () => {
    const boom = vi.fn(async () => {
      throw new Error('boom')
    })
    await expect(ask(deps({ findMove: boom }), 'client_a')).resolves.toEqual({ ok: false, status: 404 })
    const open = { ...MINE, status: 'paid', moveCategory: 'instant' }
    await expect(
      ask(deps({ findMove: vi.fn(async () => open), findProfile: boom }), 'mover_auth'),
    ).resolves.toEqual({ ok: false, status: 403 })
    await expect(
      ask(deps({ findMove: vi.fn(async () => open), findProfile: vi.fn(async () => MOVER), hasOffer: boom }), 'mover_auth'),
    ).resolves.toEqual({ ok: false, status: 403 })
  })
})

describe('upload permissions', () => {
  it('a move photo is readable by its uploader only', () => {
    expect(movePhotoPermissions('user_1')).toEqual(['read("user:user_1")'])
  })
  it('a selfie is the profile picture and is readable by link; KYC photos are not', () => {
    expect(uploadedPhotoPermissions('selfie', 'user_1')).toEqual(['read("any")'])
    expect(uploadedPhotoPermissions('license', 'user_1')).toEqual(['read("user:user_1")'])
    expect(uploadedPhotoPermissions('vehicle', 'user_1')).toEqual(['read("user:user_1")'])
  })
})
