import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/constants', () => ({
  APPWRITE: { DATABASE_ID: 'db', COLLECTIONS: { CREW_MEMBERS: 'crew', MOVER_PROFILES: 'profiles' } },
}))

import { computeCrewSize, profileCrewSize, syncCrewSize, type CrewSizeDb } from '../crew-size'

describe('computeCrewSize (crew master §4)', () => {
  it('driver only with no crew', () => {
    expect(computeCrewSize([])).toBe(1)
  })
  it('1 + active helpers; driver-role and inactive rows do not count', () => {
    expect(
      computeCrewSize([
        { role: 'helper', isActive: true },
        { role: 'helper', isActive: true },
        { role: 'helper', isActive: false },
        { role: 'driver', isActive: true },
      ])
    ).toBe(3)
  })
  it('clamps to the schema max of 10', () => {
    expect(computeCrewSize(Array.from({ length: 12 }, () => ({ role: 'helper' })))).toBe(10)
  })
})

describe('profileCrewSize', () => {
  it('reads the synced crewSize as-is (no +1)', () => {
    expect(profileCrewSize({ crewSize: 3, crew_members: [] })).toBe(3)
  })
  it('falls back to crew_members only when crewSize is missing', () => {
    expect(profileCrewSize({ crew_members: [{ role: 'helper' }] })).toBe(2)
  })
  it('null when nothing is known', () => {
    expect(profileCrewSize({})).toBeNull()
  })
})

describe('syncCrewSize', () => {
  const db = {
    listDocuments: vi.fn(),
    getDocument: vi.fn(),
    updateDocument: vi.fn(),
  }
  beforeEach(() => {
    vi.resetAllMocks()
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  it('writes the recomputed size when it differs', async () => {
    db.listDocuments.mockResolvedValue({ documents: [{ role: 'helper', isActive: true }] })
    db.getDocument.mockResolvedValue({ crewSize: 2 })
    db.updateDocument.mockResolvedValue({})
    await expect(syncCrewSize(db as unknown as CrewSizeDb, 'p1')).resolves.toBe(2)
    expect(db.updateDocument).not.toHaveBeenCalled()

    db.listDocuments.mockResolvedValue({ documents: [] })
    await expect(syncCrewSize(db as unknown as CrewSizeDb, 'p1')).resolves.toBe(1)
    expect(db.updateDocument).toHaveBeenCalledWith('db', 'profiles', 'p1', { crewSize: 1 })
  })

  it('never throws', async () => {
    db.listDocuments.mockRejectedValue(new Error('down'))
    await expect(syncCrewSize(db as unknown as CrewSizeDb, 'p1')).resolves.toBeNull()
  })
})
