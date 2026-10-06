import { beforeEach, describe, expect, it, vi } from 'vitest'

// sync-user refuses an existing account of another type (plan auth/2) and
// writes nothing; the right type is updated as before.
const db = { getDocument: vi.fn(), createDocument: vi.fn(), updateDocument: vi.fn(), listDocuments: vi.fn() }
const users = { get: vi.fn() }

vi.mock('@/lib/i18n-server', () => ({ getTranslations: async () => ({ t: (k: string) => k }) }))
vi.mock('@/lib/auth-session', () => ({ getSessionUserId: async () => 'u1' }))
vi.mock('@/lib/constants', () => ({
  APPWRITE: { DATABASE_ID: 'db', COLLECTIONS: { USERS: 'users', MOVER_PROFILES: 'profiles', CREW_MEMBERS: 'crew' } },
}))
vi.mock('@/lib/appwrite-server', () => ({
  createAdminClient: () => ({ databases: db, users }),
  withRetry: (fn: () => unknown) => fn(),
}))
vi.mock('@/lib/appwrite-write', () => ({
  writeDroppingUnknownAttributes: (data: Record<string, unknown>, write: (d: Record<string, unknown>) => unknown) => write(data),
}))

import { POST } from '../sync-user/route'

function call(body: Record<string, unknown>) {
  return POST(new Request('http://x/api/auth/sync-user', { method: 'POST', body: JSON.stringify(body) }) as never)
}

describe('POST /api/auth/sync-user role gate', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    users.get.mockResolvedValue({ email: 'a@b.co', name: 'A', phone: '', emailVerification: true, phoneVerification: true })
    db.updateDocument.mockImplementation(async (_d, _c, id, data) => ({ $id: id, userType: 'client', ...data }))
    db.listDocuments.mockResolvedValue({ documents: [] })
  })

  it.each([
    ['client', 'mover', 'auth.registeredAsClient'],
    ['mover', 'client', 'auth.registeredAsMover'],
    ['admin', 'client', 'auth.adminAccount'],
    ['admin', 'mover', 'auth.adminAccount'],
  ])('refuses a %s account on the %s side with %s and writes nothing', async (existing, side, code) => {
    db.getDocument.mockResolvedValue({ $id: 'u1', userType: existing })
    const res = await call({ userType: side })
    expect(res.status).toBe(403)
    await expect(res.json()).resolves.toMatchObject({ code })
    expect(db.updateDocument).not.toHaveBeenCalled()
    expect(db.createDocument).not.toHaveBeenCalled()
  })

  it('updates an account on its own side without touching the role', async () => {
    db.getDocument.mockResolvedValue({ $id: 'u1', userType: 'client' })
    const res = await call({ userType: 'client' })
    expect(res.status).toBe(200)
    expect(db.updateDocument.mock.calls[0][3]).not.toHaveProperty('userType')
  })

  it('gives a legacy row without a role the side it signs in to', async () => {
    db.getDocument.mockResolvedValue({ $id: 'u1', userType: null })
    const res = await call({ userType: 'mover' })
    expect(res.status).toBe(200)
    expect(db.updateDocument.mock.calls[0][3]).toMatchObject({ userType: 'mover' })
  })

  it('does not gate a refresh that names no side', async () => {
    db.getDocument.mockResolvedValue({ $id: 'u1', userType: 'mover' })
    const res = await call({})
    expect(res.status).toBe(200)
  })
})
