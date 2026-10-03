import { describe, expect, it } from 'vitest'

import { ACTIVE_MOVE_RECONCILE_MS, activeMoveOutcome } from '../active-move-reconcile'

describe('activeMoveOutcome (active-job screen reconcile — mirrors the mover app)', () => {
  it('a client cancel takes the mover off the job with the cancel notice', () => {
    expect(activeMoveOutcome('cancelled_by_client')).toBe('cancelled_by_client')
  })
  it('completion keeps the completed screen', () => {
    expect(activeMoveOutcome('completed')).toBe('completed')
  })
  it('execution statuses stay on the job', () => {
    for (const s of ['mover_accepted', 'mover_en_route', 'loading', 'in_transit', 'unloading', 'awaiting_payment']) {
      expect(activeMoveOutcome(s)).toBe('active')
    }
  })
  it('other cancellations, disputes, a withdraw back to pending, or nothing at all end it', () => {
    for (const s of ['cancelled', 'cancelled_by_mover', 'disputed', 'pending', null, undefined, '']) {
      expect(activeMoveOutcome(s)).toBe('ended')
    }
  })
  it('reconciles on the mover app cadence', () => {
    expect(ACTIVE_MOVE_RECONCILE_MS).toBe(15_000)
  })
})
