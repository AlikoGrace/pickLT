import { describe, expect, it } from 'vitest'

import {
  centsToAmountParam,
  isDuplicateError,
  ledgerEntryFromDoc,
  snapshotOf,
  snapshotPatch,
  verifyFeeSettlementIntent,
} from '../fee-ledger-server'
import { computeFeeStanding } from '../feeLedger'
import { stripeForm } from '../stripe-server'

const DAY = 24 * 60 * 60 * 1000
const NOW = Date.parse('2026-10-20T12:00:00.000Z')
const iso = (ms: number) => new Date(ms).toISOString()

describe('fee-ledger-server — snapshot', () => {
  it('a legacy profile without the fee fields reads as ok, nothing owed', () => {
    expect(snapshotOf({ $id: 'mp1' })).toEqual({
      feeBalanceCents: 0,
      feeOwedCents: 0,
      feeOldestDueAt: null,
      feeStanding: 'ok',
      feeSuspendSuggested: false,
    })
    expect(snapshotOf({ feeStanding: 'nonsense' }).feeStanding).toBe('ok')
  })

  it('ledger rows map to entries using $createdAt as the row time', () => {
    const rows = [
      { $id: 'a', kind: 'cash_fee_due', amountCents: -2260, dueAt: iso(NOW - 8 * DAY), $createdAt: iso(NOW - 15 * DAY) },
      { $id: 'b', kind: 'driver_payment', amountCents: 2260, dueAt: null, $createdAt: iso(NOW) },
    ]
    const entries = rows.map(ledgerEntryFromDoc)
    expect(entries[0]).toEqual({ kind: 'cash_fee_due', amountCents: -2260, dueAt: iso(NOW - 8 * DAY), createdAt: iso(NOW - 15 * DAY) })
    expect(computeFeeStanding(entries.slice(0, 1), NOW).standing).toBe('restricted')
    expect(computeFeeStanding(entries, NOW).standing).toBe('ok')
  })

  it('feeStandingSince moves only when the standing changes', () => {
    const result = computeFeeStanding([], NOW)
    const same = snapshotPatch({ feeStanding: 'ok', feeStandingSince: iso(NOW - DAY) }, result, iso(NOW))
    expect(same).not.toHaveProperty('feeStandingSince')
    expect(same).toMatchObject({ feeBalanceCents: 0, feeOwedCents: 0, feeOldestDueAt: null, feeStanding: 'ok', feeSuspendSuggested: false })
    const changed = snapshotPatch({ feeStanding: 'restricted', feeStandingSince: iso(NOW - DAY) }, result, iso(NOW))
    expect(changed.feeStandingSince).toBe(iso(NOW))
    // First write on a legacy row stamps it.
    expect(snapshotPatch({}, result, iso(NOW)).feeStandingSince).toBe(iso(NOW))
  })

  it('amount params are unsigned two-decimal strings', () => {
    expect(centsToAmountParam(-2260)).toBe('22.60')
    expect(centsToAmountParam(4473)).toBe('44.73')
  })

  it('a duplicate idempotency key is recognised', () => {
    expect(isDuplicateError({ code: 409 })).toBe(true)
    expect(isDuplicateError({ type: 'document_already_exists' })).toBe(true)
    expect(isDuplicateError(new Error('boom'))).toBe(false)
  })
})

describe('fee-ledger-server — settlefees confirm verification', () => {
  const good = {
    id: 'pi_1',
    status: 'succeeded',
    amount: 4473,
    amount_received: 4473,
    currency: 'eur',
    metadata: { kind: 'fee_settlement', moverProfileId: 'mp1' },
  }

  it('accepts a succeeded fee settlement for this driver and credits its amount', () => {
    expect(verifyFeeSettlementIntent(good, 'mp1')).toEqual({ ok: true, amountCents: 4473 })
  })

  it('refuses unfinished intents, other drivers, other kinds and amount mismatches', () => {
    expect(verifyFeeSettlementIntent({ ...good, status: 'requires_payment_method' }, 'mp1')).toEqual({
      ok: false,
      fnCode: 'payment.intentNotSucceeded',
    })
    expect(verifyFeeSettlementIntent(good, 'mp2')).toEqual({ ok: false, fnCode: 'payment.metadataMismatch' })
    expect(verifyFeeSettlementIntent({ ...good, metadata: { moveId: 'm1', moverProfileId: 'mp1' } }, 'mp1')).toEqual({
      ok: false,
      fnCode: 'payment.metadataMismatch',
    })
    expect(verifyFeeSettlementIntent({ ...good, amount_received: 100 }, 'mp1')).toEqual({ ok: false, fnCode: 'payment.amountMismatch' })
    expect(verifyFeeSettlementIntent({ ...good, currency: 'usd' }, 'mp1')).toEqual({ ok: false, fnCode: 'payment.amountMismatch' })
  })
})

describe('stripe-server — form encoding', () => {
  it('nests objects with brackets and drops empty values', () => {
    const form = stripeForm({
      amount: 4473,
      currency: 'eur',
      customer: undefined,
      automatic_payment_methods: { enabled: true },
      metadata: { kind: 'fee_settlement', moverProfileId: 'mp1' },
    })
    expect(form.toString()).toBe(
      'amount=4473&currency=eur&automatic_payment_methods%5Benabled%5D=true&metadata%5Bkind%5D=fee_settlement&metadata%5BmoverProfileId%5D=mp1',
    )
  })
})
