import { describe, expect, it } from 'vitest'

import {
  DEFAULT_FEE_POLICY,
  computeFeeStanding,
  feeStandingAllowsWork,
  parseFeePolicy,
  platformFeeCents,
  postingForCompletedMove,
  type LedgerEntryLike,
} from '@/lib/feeLedger'

const DAY = 24 * 60 * 60 * 1000
const NOW = Date.parse('2026-10-20T12:00:00.000Z')
const iso = (ms: number) => new Date(ms).toISOString()

// The device-pass quote (GH, v3): total 363.12, net 305.14, platformFee 22.60.
const breakdown = {
  version: 'v3',
  currency: 'EUR',
  total: 363.12,
  net: 305.14,
  platformFee: 22.6,
  vat: 57.98,
  adjustedSubtotal: 282.54,
  operationalSubtotal: 245.69,
  modeAdjustment: 36.85,
  discount: 0,
  rates: { 'tax.vatRate': 0.19, 'platformFee.rate': 0.08, 'platformFee.fixed': 0 },
}

describe('fee-ledger — postings', () => {
  it('a cash move owes exactly the quote platform fee, due 7 days after completion', () => {
    const p = postingForCompletedMove(
      { $id: 'm1', paymentMethod: 'cash', estimatedPrice: 363.12, priceBreakdown: JSON.stringify(breakdown), completedAt: iso(NOW) },
      iso(NOW),
    )
    expect(p).toEqual({
      kind: 'cash_fee_due',
      amountCents: -2260,
      dueAt: iso(NOW + 7 * DAY),
      idempotencyKey: 'move:m1:cash_fee_due',
    })
  })

  it('a card move credits the payout the platform holds (net − fee)', () => {
    const p = postingForCompletedMove(
      { $id: 'm2', paymentMethod: 'card', estimatedPrice: 363.12, priceBreakdown: JSON.stringify(breakdown), completedAt: iso(NOW) },
      iso(NOW),
    )
    expect(p).toEqual({ kind: 'card_earning', amountCents: 28254, dueAt: null, idempotencyKey: 'move:m2:card_earning' })
  })

  it('a final price that differs from the quote uses the formula; no price posts nothing', () => {
    // 119 gross, 19 % VAT, 8 % fee: ex-VAT 100.00, payout 92.59 → fee 7.41
    expect(platformFeeCents({ finalPrice: 119, priceBreakdown: JSON.stringify(breakdown) })).toBe(741)
    expect(postingForCompletedMove({ $id: 'm3', paymentMethod: 'cash' }, iso(NOW))).toBeNull()
  })
})

describe('fee-ledger — standing (owner D2: 7 days grace, restricted at 7 days overdue or > €100)', () => {
  const debt = (cents: number, dueMs: number): LedgerEntryLike => ({
    kind: 'cash_fee_due',
    amountCents: -cents,
    dueAt: iso(dueMs),
    createdAt: iso(dueMs - 7 * DAY),
  })
  const credit = (cents: number, atMs: number, kind = 'driver_payment'): LedgerEntryLike => ({
    kind,
    amountCents: cents,
    createdAt: iso(atMs),
  })

  it('nothing owed → ok', () => {
    expect(computeFeeStanding([], NOW)).toMatchObject({ balanceCents: 0, owedCents: 0, standing: 'ok', oldestUnpaidDueAt: null })
  })

  it('owed but not yet due → due; just past due → overdue; 7 days past due → restricted', () => {
    expect(computeFeeStanding([debt(2260, NOW + DAY)], NOW).standing).toBe('due')
    expect(computeFeeStanding([debt(2260, NOW - 1000)], NOW).standing).toBe('overdue')
    expect(computeFeeStanding([debt(2260, NOW - 7 * DAY + 1000)], NOW).standing).toBe('overdue')
    expect(computeFeeStanding([debt(2260, NOW - 7 * DAY)], NOW).standing).toBe('restricted')
  })

  it('more than €100 owed → restricted even before anything is due; exactly €100 is not', () => {
    expect(computeFeeStanding([debt(10000, NOW + DAY)], NOW).standing).toBe('due')
    expect(computeFeeStanding([debt(10001, NOW + DAY)], NOW).standing).toBe('restricted')
  })

  it('card earnings net against fees (D4) and pay off the oldest debt first', () => {
    const entries = [debt(2260, NOW - 10 * DAY), debt(2213, NOW + DAY), credit(2260, NOW - DAY, 'card_earning')]
    const r = computeFeeStanding(entries, NOW)
    expect(r.owedCents).toBe(2213)
    expect(r.oldestUnpaidDueAt).toBe(iso(NOW + DAY))
    expect(r.standing).toBe('due')
  })

  it('a payment lifts the restriction at once; a positive balance is ok', () => {
    const restricted = [debt(2260, NOW - 8 * DAY)]
    expect(computeFeeStanding(restricted, NOW).standing).toBe('restricted')
    expect(computeFeeStanding([...restricted, credit(2260, NOW)], NOW).standing).toBe('ok')
    expect(computeFeeStanding([...restricted, credit(30000, NOW)], NOW)).toMatchObject({ balanceCents: 27740, standing: 'ok' })
  })

  it('suspension suggested at 30 days past due', () => {
    expect(computeFeeStanding([debt(500, NOW - 29 * DAY)], NOW).suspendSuggested).toBe(false)
    expect(computeFeeStanding([debt(500, NOW - 30 * DAY)], NOW).suspendSuggested).toBe(true)
  })

  it('the device-pass example: 2 cash fees + 1 card payout → platform owes €237.81, ok', () => {
    const r = computeFeeStanding([debt(2213, NOW - DAY), debt(2260, NOW - DAY), credit(28254, NOW)], NOW)
    expect(r).toMatchObject({ balanceCents: 23781, owedCents: 0, standing: 'ok' })
  })
})

describe('fee-ledger — policy and gate', () => {
  it('parseFeePolicy: defaults, GLOBAL, per-market override, junk ignored', () => {
    expect(parseFeePolicy(null)).toEqual(DEFAULT_FEE_POLICY)
    expect(parseFeePolicy('not json')).toEqual(DEFAULT_FEE_POLICY)
    const raw = JSON.stringify({ GLOBAL: { graceDays: 5 }, GH: { restrictBalanceCents: 5000, graceDays: -1 } })
    expect(parseFeePolicy(raw, 'gh')).toEqual({ ...DEFAULT_FEE_POLICY, graceDays: 5, restrictBalanceCents: 5000 })
    expect(parseFeePolicy(raw, 'DE')).toEqual({ ...DEFAULT_FEE_POLICY, graceDays: 5 })
    expect(parseFeePolicy({ restrictOverdueDays: 3 }, 'DE')).toEqual({ ...DEFAULT_FEE_POLICY, restrictOverdueDays: 3 })
  })

  it('only restricted blocks work; legacy profiles without the field work', () => {
    expect(feeStandingAllowsWork({ feeStanding: 'restricted' })).toBe(false)
    for (const s of ['ok', 'due', 'overdue', null, undefined]) expect(feeStandingAllowsWork({ feeStanding: s })).toBe(true)
    expect(feeStandingAllowsWork(null)).toBe(true)
  })
})
