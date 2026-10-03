import { getTranslations } from '@/lib/i18n-server'
import { createAdminClient } from '@/lib/appwrite-server'
import { APPWRITE } from '@/lib/constants'
import {
  appendLedgerRow,
  centsToAmountParam,
  recomputeFeeSnapshot,
  verifyFeeSettlementIntent,
} from '@/lib/fee-ledger-server'
import { isErrorResponse, requireMoverProfile } from '@/lib/mover-auth'
import { writeNotification } from '@/lib/notify'
import {
  createPaymentIntent,
  retrievePaymentIntent,
  stripeConfigured,
  stripePublishableKey,
} from '@/lib/stripe-server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/mover/fees/pay — the driver pays what they owe the platform by
 * card (plan `fees/0.master.md` D3). Same contract as `settlefees` `pay`:
 *
 *   { mode: 'intent' }                    → { ok, clientSecret, paymentIntentId, amountCents, publishableKey }
 *                                           for the full owed amount (400 `fees.nothingOwed` when 0)
 *   { mode: 'confirm', paymentIntentId }  → verifies succeeded + metadata + amount, posts
 *                                           `driver_payment` (key `pi:<id>`), recomputes the
 *                                           snapshot → { ok, balanceCents, owedCents, standing }
 */
export async function POST(req: NextRequest) {
  const { t } = await getTranslations()
  try {
    const auth = await requireMoverProfile()
    if (isErrorResponse(auth)) return auth
    const { userId, moverProfile } = auth

    const body = await req.json().catch(() => ({}))
    const mode = body?.mode
    if (mode !== 'intent' && mode !== 'confirm') {
      return NextResponse.json({ error: 'mode must be intent or confirm' }, { status: 400 })
    }
    if (!stripeConfigured()) {
      return NextResponse.json({ error: t('errors:fees.payUnavailable'), fnCode: 'fees.payUnavailable' }, { status: 503 })
    }

    const { databases } = createAdminClient()

    if (mode === 'intent') {
      // The live amount, not a stale snapshot: recompute (and store) first.
      const { result } = await recomputeFeeSnapshot(databases, moverProfile)
      if (result.owedCents <= 0) {
        return NextResponse.json({ error: t('errors:fees.nothingOwed'), fnCode: 'fees.nothingOwed' }, { status: 400 })
      }
      let customer: string | undefined
      try {
        const userDoc = await databases.getDocument(APPWRITE.DATABASE_ID, APPWRITE.COLLECTIONS.USERS, userId)
        customer = typeof userDoc.stripeCustomerId === 'string' && userDoc.stripeCustomerId ? userDoc.stripeCustomerId : undefined
      } catch {
        /* no user row → a guest intent; the card is entered on the page */
      }
      const intent = await createPaymentIntent({
        amount: result.owedCents,
        currency: 'eur',
        customer,
        automatic_payment_methods: { enabled: true },
        description: 'PickLT platform fees',
        metadata: { kind: 'fee_settlement', moverProfileId: moverProfile.$id },
      })
      return NextResponse.json({
        ok: true,
        clientSecret: intent.client_secret,
        paymentIntentId: intent.id,
        amountCents: result.owedCents,
        publishableKey: stripePublishableKey(),
      })
    }

    const paymentIntentId = typeof body.paymentIntentId === 'string' ? body.paymentIntentId : ''
    if (!/^pi_[A-Za-z0-9]+$/.test(paymentIntentId)) {
      return NextResponse.json({ error: 'paymentIntentId is required' }, { status: 400 })
    }
    const intent = await retrievePaymentIntent(paymentIntentId)
    const verdict = verifyFeeSettlementIntent(intent, moverProfile.$id)
    if (!verdict.ok) {
      return NextResponse.json({ error: t('errors:fees.payFailed'), fnCode: verdict.fnCode }, { status: 400 })
    }

    const { created } = await appendLedgerRow(databases, {
      moverProfileId: moverProfile.$id,
      driverUserId: userId,
      kind: 'driver_payment',
      amountCents: verdict.amountCents,
      currency: 'EUR',
      countryCode: typeof (moverProfile as Record<string, unknown>).countryCode === 'string'
        ? ((moverProfile as Record<string, unknown>).countryCode as string)
        : null,
      actorRole: 'mover',
      actorId: userId,
      method: 'card',
      reference: paymentIntentId,
      idempotencyKey: `pi:${paymentIntentId}`,
    })
    const { before, result } = await recomputeFeeSnapshot(databases, moverProfile)

    // Back to ok after this payment → one `fee_paid` (contract: one per transition).
    if (created && before.feeStanding !== 'ok' && result.standing === 'ok') {
      const amount = centsToAmountParam(verdict.amountCents)
      await writeNotification({
        userId,
        type: 'fee_paid',
        title: 'Platform fees paid',
        body: `We received ${amount} EUR. Your platform balance is settled.`,
        data: { kind: 'fee_paid', paymentIntentId },
        i18n: { key: 'fees.paid', params: { amount, currency: 'EUR', dueDate: '' } },
      })
    }

    return NextResponse.json({
      ok: true,
      balanceCents: result.balanceCents,
      owedCents: result.owedCents,
      standing: result.standing,
    })
  } catch (error) {
    console.error('POST /api/mover/fees/pay error:', error)
    return NextResponse.json({ error: t('errors:fees.payFailed') }, { status: 500 })
  }
}
