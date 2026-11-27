import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * `POST /api/mover/fees/pay` in the currency of the driver's ledger (plan
 * `currency/0.master.md` W1/W3; web port of `settlefees` `pay`).
 *
 * One balance, one currency, nothing converted: the PaymentIntent is created
 * in the ledger's currency for exactly what is owed, a cash-only currency and
 * an amount under the card minimum are refused, and a payment or a posting in
 * another currency than the ledger is refused.
 */

vi.hoisted(() => {
  process.env.APPWRITE_DATABASE_ID = 'db'
  process.env.APPWRITE_COLLECTION_USERS = 'users'
  process.env.APPWRITE_COLLECTION_MOVER_PROFILES = 'mover_profiles'
  process.env.APPWRITE_COLLECTION_NOTIFICATIONS = 'notifications'
})

type Doc = Record<string, any>

const h = vi.hoisted(() => ({
  ledger: [] as Record<string, any>[],
  profile: { $id: 'mp_1', userId: 'auth_1', countryCode: 'PL', feeStanding: 'due' } as Record<string, any>,
  intents: [] as Record<string, any>[],
  retrieved: null as Record<string, any> | null,
  notifications: [] as Record<string, any>[],
}))

const db = vi.hoisted(() => ({
  listDocuments: vi.fn(),
  getDocument: vi.fn(),
  updateDocument: vi.fn(),
  createDocument: vi.fn(),
}))

vi.mock('@/lib/appwrite-server', () => ({ createAdminClient: () => ({ databases: db }) }))
vi.mock('@/lib/i18n-server', () => ({ getTranslations: async () => ({ t: (k: string) => k }) }))
vi.mock('@/lib/mover-auth', () => ({
  requireMoverProfile: async () => ({ userId: 'auth_1', moverProfile: h.profile }),
  isErrorResponse: () => false,
}))
vi.mock('@/lib/notify', () => ({
  writeNotification: async (n: Doc) => {
    h.notifications.push(n)
  },
}))
vi.mock('@/lib/stripe-server', () => ({
  stripeConfigured: () => true,
  stripePublishableKey: () => 'pk_test',
  createPaymentIntent: async (params: Doc) => {
    h.intents.push(params)
    return { id: 'pi_new', client_secret: 'secret' }
  },
  retrievePaymentIntent: async () => h.retrieved,
}))

import { appendLedgerRow, CURRENCY_MISMATCH, ledgerCurrency, verifyFeeSettlementIntent } from '@/lib/fee-ledger-server'
import { POST } from '../fees/pay/route'

const NOW = Date.parse('2026-11-26T10:00:00.000Z')
const iso = (ms: number) => new Date(ms).toISOString()

/** A cash fee of `cents` the driver owes, in `currency` (absent = a row from before markets had currencies). */
function owe(cents: number, currency?: string) {
  h.ledger.push({
    $id: `row_${h.ledger.length + 1}`,
    $createdAt: iso(NOW - 3_600_000 + h.ledger.length),
    moverProfileId: 'mp_1',
    kind: 'cash_fee_due',
    amountCents: -cents,
    dueAt: iso(NOW + 86_400_000),
    ...(currency ? { currency } : {}),
  })
}

beforeEach(() => {
  h.ledger.length = 0
  h.intents.length = 0
  h.notifications.length = 0
  h.retrieved = null
  h.profile = { $id: 'mp_1', userId: 'auth_1', countryCode: 'PL', feeStanding: 'due' }
  for (const fn of Object.values(db)) fn.mockReset()
  db.listDocuments.mockImplementation(async (_d: string, col: string, queries: string[] = []) => {
    if (col === 'mover_ledger') {
      const q = queries.map(String).join(' ')
      const rows = [...h.ledger]
      if (q.includes('orderDesc')) rows.reverse()
      return { documents: q.includes('"limit","values":[1]') ? rows.slice(0, 1) : rows, total: rows.length }
    }
    if (col === 'platform_config') return { documents: [] }
    throw new Error(`unexpected ${col}`)
  })
  db.getDocument.mockImplementation(async () => ({ $id: 'auth_1', stripeCustomerId: 'cus_1' }))
  db.updateDocument.mockImplementation(async (_d: string, _c: string, _id: string, data: Doc) => data)
  db.createDocument.mockImplementation(async (_d: string, col: string, id: string, data: Doc) => {
    if (col === 'mover_ledger') h.ledger.push({ $id: id, $createdAt: iso(NOW + h.ledger.length), ...data })
    return { ...data, $id: id }
  })
})

const post = (body: Doc) => POST({ json: async () => body } as unknown as Parameters<typeof POST>[0])
const ledgerWrites = () => db.createDocument.mock.calls.filter((c) => c[1] === 'mover_ledger').map((c) => c[3] as Doc)

describe('fees/pay intent', () => {
  it('charges what is owed in the currency of the ledger', async () => {
    owe(4520, 'PLN')
    const res = await post({ mode: 'intent' })
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ ok: true, amountCents: 4520, currency: 'PLN', paymentIntentId: 'pi_new' })
    expect(h.intents).toHaveLength(1)
    expect(h.intents[0]).toMatchObject({ amount: 4520, currency: 'pln', metadata: { kind: 'fee_settlement', moverProfileId: 'mp_1' } })
  })

  it('a euro ledger, and one from before markets had currencies, is charged in euro as before', async () => {
    owe(2260, 'EUR')
    owe(1000)
    const res = await post({ mode: 'intent' })
    expect(await res.json()).toMatchObject({ ok: true, amountCents: 3260, currency: 'EUR' })
    expect(h.intents[0]).toMatchObject({ amount: 3260, currency: 'eur' })
  })

  it('refuses a cash-only currency and creates no intent', async () => {
    owe(4520, 'GHS')
    const res = await post({ mode: 'intent' })
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ fnCode: 'payment.currencyNotSupported', error: 'web:mover.fees.pay.cardUnavailable.helper' })
    expect(h.intents).toHaveLength(0)
  })

  it('refuses an amount under the card minimum of the currency', async () => {
    owe(150, 'PLN') // the PLN minimum is 2.00
    const res = await post({ mode: 'intent' })
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ fnCode: 'payment.belowMinimum', error: 'errors:payment.belowMinimum' })
    expect(h.intents).toHaveLength(0)
  })
})

describe('fees/pay confirm', () => {
  const intent = (currency: string) => ({
    id: 'pi_abc',
    status: 'succeeded',
    amount: 4520,
    amount_received: 4520,
    currency,
    metadata: { kind: 'fee_settlement', moverProfileId: 'mp_1' },
  })

  it('posts the payment in the ledger\'s currency and tells the driver in it', async () => {
    owe(4520, 'PLN')
    h.retrieved = intent('pln')
    const res = await post({ mode: 'confirm', paymentIntentId: 'pi_abc' })
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ ok: true, owedCents: 0, standing: 'ok' })
    expect(ledgerWrites()).toEqual([
      expect.objectContaining({ kind: 'driver_payment', amountCents: 4520, currency: 'PLN', idempotencyKey: 'pi:pi_abc' }),
    ])
    expect(h.notifications).toHaveLength(1)
    expect(h.notifications[0].i18n).toEqual({ key: 'fees.paid', params: { amount: '45.20', currency: 'PLN', dueDate: '' } })
    expect(h.notifications[0].body).toBe('We received 45.20 PLN. Your platform balance is settled.')
  })

  it('refuses a payment in another currency than the ledger and posts nothing', async () => {
    owe(4520, 'PLN')
    h.retrieved = intent('eur')
    const res = await post({ mode: 'confirm', paymentIntentId: 'pi_abc' })
    expect(res.status).toBe(400)
    expect((await res.json()).fnCode).toBe('payment.amountMismatch')
    expect(ledgerWrites()).toHaveLength(0)
    expect(h.notifications).toHaveLength(0)
  })

  it('a euro payment on a euro ledger is posted exactly as before', async () => {
    owe(4520, 'EUR')
    h.retrieved = intent('eur')
    const res = await post({ mode: 'confirm', paymentIntentId: 'pi_abc' })
    expect(res.status).toBe(200)
    expect(ledgerWrites()[0]).toMatchObject({ kind: 'driver_payment', amountCents: 4520, currency: 'EUR' })
    expect(h.notifications[0].i18n.params).toEqual({ amount: '45.20', currency: 'EUR', dueDate: '' })
    expect(h.notifications[0].body).toBe('We received 45.20 EUR. Your platform balance is settled.')
  })
})

describe('one ledger, one currency', () => {
  const row = (currency?: string) => ({
    moverProfileId: 'mp_1',
    driverUserId: 'auth_1',
    kind: 'cash_fee_due' as const,
    amountCents: -1000,
    idempotencyKey: `move:${currency ?? 'none'}`,
    actorRole: 'system' as const,
    ...(currency ? { currency } : {}),
  })

  it('a posting in another currency than the ledger is refused, never converted', async () => {
    owe(4520, 'PLN')
    const res = await appendLedgerRow(db as never, row('EUR'))
    expect(res).toEqual({ created: false, refused: CURRENCY_MISMATCH })
    expect(ledgerWrites()).toHaveLength(0)
    // A row that names no currency is euro, so it is refused on a PLN ledger too.
    expect(await appendLedgerRow(db as never, row())).toEqual({ created: false, refused: 'fees.currencyMismatch' })
    expect(ledgerWrites()).toHaveLength(0)
  })

  it('a posting in the ledger\'s currency, and the first row of an empty ledger, are written', async () => {
    expect(await appendLedgerRow(db as never, row('PLN'))).toEqual({ created: true })
    expect(await appendLedgerRow(db as never, { ...row('PLN'), idempotencyKey: 'move:2' })).toEqual({ created: true })
    expect(ledgerWrites().map((r) => r.currency)).toEqual(['PLN', 'PLN'])
  })

  it('the ledger currency is that of its latest row; an old or empty ledger is euro', () => {
    expect(ledgerCurrency([])).toBe('EUR')
    expect(ledgerCurrency(null)).toBe('EUR')
    expect(ledgerCurrency([{ kind: 'cash_fee_due' }])).toBe('EUR')
    expect(ledgerCurrency([{ currency: 'pln' }])).toBe('PLN')
    expect(ledgerCurrency([{ currency: 'EUR' }, { currency: 'PLN' }, {}])).toBe('PLN')
  })

  it('the settlement check takes the expected currency, euro by default', () => {
    const good = { status: 'succeeded', amount: 500, amount_received: 500, currency: 'pln', metadata: { kind: 'fee_settlement', moverProfileId: 'mp_1' } }
    expect(verifyFeeSettlementIntent(good, 'mp_1', 'PLN')).toEqual({ ok: true, amountCents: 500 })
    expect(verifyFeeSettlementIntent(good, 'mp_1')).toEqual({ ok: false, fnCode: 'payment.amountMismatch' })
    expect(verifyFeeSettlementIntent({ ...good, currency: 'eur' }, 'mp_1')).toEqual({ ok: true, amountCents: 500 })
  })
})
