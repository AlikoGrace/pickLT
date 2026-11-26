import { NextRequest, NextResponse } from 'next/server'

import { createAdminClient } from '@/lib/appwrite-server'
import { getSessionUserId } from '@/lib/auth-session'
import { APPWRITE } from '@/lib/constants'
import { getTranslations } from '@/lib/i18n-server'
import { relId } from '@/lib/notify'
import {
  ASSIGNABLE_STATUSES,
  AWAITING_CLIENT,
  assignMoveToMover,
  closeOtherOffers,
  closePendingOffer,
  loadPricingOverrides,
  movePriceColumns,
  offerNeedsClientConfirmation,
  parsePendingOffer,
  pendingOfferExpired,
  priceOfferForMover,
} from '@/lib/offer-pricing-server'

/**
 * POST /api/moves/offer-decision
 *
 * The client's answer to a mover's higher price (plan pricing/8, option B).
 * Web port of `clientDecision` in `functions/acceptmove/src/main.js`.
 *
 * Body: `{ moveId, decision: 'accept' | 'decline' }`. The session must be the
 * client of the move.
 *
 * - accept: the mover is assigned at the price the client was shown (or less,
 *   never more). `{ ok: true, action: 'clientAccept', moveId, handle, total }`.
 * - decline: the offer is closed and the mover is told at once
 *   (`offer.clientDeclined`). `{ ok: true, action: 'clientDecline', moveId }`.
 * - 409 `offer.notPending`: there is no price to confirm, or the move went
 *   elsewhere. 409 `offer.expired`: the answer came too late, or the price
 *   would now be higher than the one shown; the mover is told
 *   (`offer.clientNoAnswer`).
 *
 * The prompts nobody answers are closed by the `expirepriorityrequests`
 * function, so this route has no timer of its own.
 */
export async function POST(req: NextRequest) {
  const { t } = await getTranslations()
  try {
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: t('errors:auth.unauthorized') }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const moveId: unknown = body?.moveId
    const decision: unknown = body?.decision
    if (!moveId || typeof moveId !== 'string') {
      return NextResponse.json({ error: 'moveId is required' }, { status: 400 })
    }
    if (decision !== 'accept' && decision !== 'decline') {
      return NextResponse.json({ error: 'decision must be accept|decline' }, { status: 400 })
    }

    const { databases } = createAdminClient()
    const move = await databases.getDocument(APPWRITE.DATABASE_ID, APPWRITE.COLLECTIONS.MOVES, moveId)
    if (relId(move.clientId) !== userId) {
      return NextResponse.json({ error: t('errors:auth.forbidden') }, { status: 403 })
    }

    // i18n-keys: errors:offer.notPending, errors:offer.expired
    const refuse = (fnCode: 'offer.notPending' | 'offer.expired') =>
      NextResponse.json({ ok: false, error: t(`errors:${fnCode}`), fnCode }, { status: 409 })

    const pending = parsePendingOffer(move.pendingOffer)
    if (!pending) return refuse('offer.notPending')

    const request = await databases.getDocument(
      APPWRITE.DATABASE_ID,
      APPWRITE.COLLECTIONS.MOVE_REQUESTS,
      pending.requestId,
    )
    if (request.status !== AWAITING_CLIENT) {
      await databases
        .updateDocument(APPWRITE.DATABASE_ID, APPWRITE.COLLECTIONS.MOVES, moveId, { pendingOffer: null })
        .catch(() => {})
      return refuse('offer.notPending')
    }

    if (decision === 'decline') {
      await closePendingOffer({
        databases,
        move,
        moveId,
        pending,
        requestStatus: 'cancelled',
        i18nKey: 'offer.clientDeclined',
        title: 'Price not accepted',
        body: 'The client did not accept the price for your distance. The move was not assigned to you.',
      })
      return NextResponse.json({ ok: true, action: 'clientDecline', moveId })
    }

    const expire = async (fnCode: 'offer.notPending' | 'offer.expired') => {
      await closePendingOffer({
        databases,
        move,
        moveId,
        pending,
        requestStatus: 'expired',
        i18nKey: 'offer.clientNoAnswer',
        title: 'Offer closed',
        body: 'The client did not confirm the price in time. The move was not assigned to you.',
      })
      return refuse(fnCode)
    }
    if (pendingOfferExpired(pending, Date.now())) return expire('offer.expired')

    const existingMover = relId(move.moverProfileId)
    if ((existingMover && existingMover !== pending.moverProfileId) || !ASSIGNABLE_STATUSES.has(move.status)) {
      return expire('offer.notPending')
    }

    const moverProfile = await databases.getDocument(
      APPWRITE.DATABASE_ID,
      APPWRITE.COLLECTIONS.MOVER_PROFILES,
      pending.moverProfileId,
    )
    const overrides = await loadPricingOverrides(databases, move.countryCode)
    const offer = priceOfferForMover({ move, mover: moverProfile, config: overrides, approachM: pending.approachM })
    // The client agreed to `pending.total`. If the rates moved in between and the
    // price would now be higher still, the offer is closed rather than charged.
    if (!offer || offerNeedsClientConfirmation(pending.total, offer.total)) return expire('offer.expired')

    await databases.updateDocument(APPWRITE.DATABASE_ID, APPWRITE.COLLECTIONS.MOVE_REQUESTS, pending.requestId, {
      status: 'accepted',
      respondedAt: new Date().toISOString(),
    })
    const assigned = await assignMoveToMover({
      databases,
      moveId,
      moverProfile,
      priceColumns: movePriceColumns(offer),
      tag: 'offer-decision',
    })
    // The other open offers for this move stop showing. Never throws.
    await closeOtherOffers({ databases, moveId, acceptedRequestId: pending.requestId })

    return NextResponse.json({
      ok: true,
      action: 'clientAccept',
      moveId,
      handle: assigned.handle ?? move.handle ?? null,
      total: offer.total,
    })
  } catch (err) {
    console.error('POST /api/moves/offer-decision error:', err)
    return NextResponse.json({ error: t('errors:generic.internal') }, { status: 500 })
  }
}
