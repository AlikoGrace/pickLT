import { getTranslations } from '@/lib/i18n-server'
import { createAdminClient } from '@/lib/appwrite-server'
import { APPWRITE } from '@/lib/constants'
import { dailyCapRefusal, isErrorResponse, requireServiceReadyMover } from '@/lib/mover-auth'
import { relId, writeNotification } from '@/lib/notify'
import { displayNameOf } from '@/lib/account-delete'
import {
  ASSIGNABLE_STATUSES,
  AWAITING_CLIENT,
  assignMoveToMover,
  buildPendingOffer,
  closeOtherOffers,
  loadPricingOverrides,
  movePriceColumns,
  offerNeedsClientConfirmation,
  parsePendingOffer,
  pendingOfferExpired,
  priceOfferForMover,
  type MoverOffer,
} from '@/lib/offer-pricing-server'
import { NextRequest, NextResponse } from 'next/server'

// POST /api/mover/accept-move — Accept a move request
export async function POST(request: NextRequest) {
  const { t } = await getTranslations()
  try {
    // Verified driver AND service-ready vehicle (master D4): accepting is
    // handing out new work, so the readiness term applies here.
    const auth = await requireServiceReadyMover()
    if (isErrorResponse(auth)) return auth
    const { moverProfile } = auth

    const body = await request.json()
    const { requestId, moveId } = body

    if (!requestId || !moveId) {
      return NextResponse.json({ error: 'requestId and moveId are required' }, { status: 400 })
    }

    // Daily cap for a driver without a verified certificate (plan legal/7, V2).
    const capRefusal = await dailyCapRefusal(moverProfile, auth.vettingConfig, moveId)
    if (capRefusal) return capRefusal

    const { databases } = createAdminClient()

    // Verify request belongs to this mover
    // Handle moverProfileId as string or relationship object
    const moveRequest = await databases.getDocument(
      APPWRITE.DATABASE_ID,
      APPWRITE.COLLECTIONS.MOVE_REQUESTS,
      requestId
    )

    const reqMoverProfileId = typeof moveRequest.moverProfileId === 'string'
      ? moveRequest.moverProfileId
      : (moveRequest.moverProfileId as Record<string, string>)?.$id || ''

    if (reqMoverProfileId !== moverProfile.$id) {
      return NextResponse.json({ error: t('errors:request.notOwned') }, { status: 403 })
    }

    if (moveRequest.status !== 'pending') {
      return NextResponse.json({ error: t('errors:request.notPending') }, { status: 409 })
    }

    // The request authorises exactly one move. Without this check a mover
    // holding any pending request could accept an arbitrary moveId and take
    // over a job assigned to someone else — including one already in transit.
    if (relId(moveRequest.moveId) !== moveId) {
      return NextResponse.json(
        { error: t('errors:request.moveMismatch') },
        { status: 403 }
      )
    }

    // Refuse a move that is already claimed or past the assignable stage.
    const targetMove = await databases.getDocument(
      APPWRITE.DATABASE_ID,
      APPWRITE.COLLECTIONS.MOVES,
      moveId
    )
    const existingMover = relId(targetMove.moverProfileId)
    if (existingMover && existingMover !== moverProfile.$id) {
      return NextResponse.json({ error: t('errors:move.alreadyAssigned') }, { status: 409 })
    }
    if (!ASSIGNABLE_STATUSES.has(targetMove.status)) {
      return NextResponse.json(
        // No status word is injected. `"…while it is {{status}}"` put a
        // `moves:status.*` label in a predicative slot: fr/es/it need it to
        // agree in gender with "move", de/pl govern its case, and Turkish
        // built "{{status}} durumundayken" around a label that is often a
        // whole finite clause ("Nakliyeci yolda"). Seventeen statuses × four
        // sentences is not a proportionate key family for a diagnostic the
        // reader cannot act on, so the sentence loses the slot instead —
        // the same repair `errors:move.notCancellableUnknownStage` already is.
        { error: t('errors:move.noLongerAcceptable') },
        { status: 409 }
      )
    }

    // ── The price for THIS mover (plan pricing/8, option B) ──────────────
    // The offer was priced for this mover's own drive to the pickup. The same
    // price or a lower one goes through (the client pays the lower amount). A
    // higher one is the client's to accept: the move is not assigned yet.
    // An offer row without `offerApproachM` (sent before the feature, or the
    // column does not exist yet) is accepted at the stored price, as before.
    let priceColumns: Record<string, unknown> | null = null
    const offerApproachM = typeof moveRequest.offerApproachM === 'number' ? moveRequest.offerApproachM : null
    if (offerApproachM !== null && targetMove.moveCategory === 'instant') {
      let offer: MoverOffer | null = null
      try {
        const overrides = await loadPricingOverrides(databases, targetMove.countryCode)
        offer = priceOfferForMover({ move: targetMove, mover: moverProfile, config: overrides, approachM: offerApproachM })
      } catch (e) {
        console.error(`[accept-move] offer price unavailable for request ${requestId} (accepting at the stored price):`, e)
      }
      if (offer && offerNeedsClientConfirmation(targetMove.estimatedPrice, offer.total)) {
        const open = parsePendingOffer(targetMove.pendingOffer)
        if (open && open.requestId !== requestId && !pendingOfferExpired(open, Date.now())) {
          // Another mover's higher price is already with the client.
          return NextResponse.json(
            { ok: false, alreadyTaken: true, reason: 'awaiting_other_offer', error: t('errors:move.noLongerAcceptable') },
            { status: 409 }
          )
        }
        const nowMs = Date.now()
        // The name the client reads on the prompt.
        let moverName = ''
        try {
          const moverUser = await databases.getDocument(APPWRITE.DATABASE_ID, APPWRITE.COLLECTIONS.USERS, auth.userId)
          moverName = displayNameOf(moverUser.fullName, '', '')
        } catch {
          /* the prompt then names no one */
        }
        const pendingOffer = buildPendingOffer({
          requestId,
          moverProfileId: moverProfile.$id,
          moverName,
          total: offer.total,
          previousTotal: targetMove.estimatedPrice,
          approachM: offer.approachM,
          nowMs,
        })
        await databases.updateDocument(APPWRITE.DATABASE_ID, APPWRITE.COLLECTIONS.MOVE_REQUESTS, requestId, {
          status: AWAITING_CLIENT,
          respondedAt: new Date(nowMs).toISOString(),
        })
        try {
          await databases.updateDocument(APPWRITE.DATABASE_ID, APPWRITE.COLLECTIONS.MOVES, moveId, { pendingOffer })
        } catch (e) {
          // The client cannot be asked (for example `moves.pendingOffer` does
          // not exist yet), and a higher price is never charged unasked: put
          // the offer back as it was and fail the tap.
          await databases
            .updateDocument(APPWRITE.DATABASE_ID, APPWRITE.COLLECTIONS.MOVE_REQUESTS, requestId, { status: 'pending', respondedAt: null })
            .catch(() => {})
          throw e
        }
        const pending = parsePendingOffer(pendingOffer)
        const clientAuthId = relId(targetMove.clientId)
        if (clientAuthId) {
          await writeNotification({
            userId: clientAuthId,
            type: 'system',
            title: 'New price to confirm',
            body: 'A mover farther away can take your move at a different price. Please confirm.',
            data: { moveId, handle: targetMove.handle ?? null },
            i18n: {
              key: 'offer.priceConfirm',
              params: {
                amount: offer.total.toFixed(2),
                previousAmount: Number(targetMove.estimatedPrice || 0).toFixed(2),
                currency: 'EUR',
              },
            },
          })
        }
        return NextResponse.json({
          ok: true,
          awaitingClient: true,
          expiresAt: pending?.expiresAt ?? new Date(nowMs).toISOString(),
          total: offer.total,
          moveId,
          handle: targetMove.handle ?? null,
          requestId,
        })
      }
      if (offer) priceColumns = movePriceColumns(offer)
    }

    // Another mover's price that may be with the client, as read before the assignment clears it.
    const pendingBefore = targetMove.pendingOffer

    // Accept the request
    await databases.updateDocument(
      APPWRITE.DATABASE_ID,
      APPWRITE.COLLECTIONS.MOVE_REQUESTS,
      requestId,
      {
        status: 'accepted',
        respondedAt: new Date().toISOString(),
      }
    )

    // Update the move to assign this mover
    // Per architecture: move_requests.status = 'accepted', moves.status = 'mover_accepted'
    // With this mover's price when the offer carried one, and any price prompt cleared.
    const move = await assignMoveToMover({ databases, moveId, moverProfile, priceColumns, tag: 'accept-move' })

    // Notify the client that a mover accepted their move.
    const clientId = relId(move.clientId)
    if (clientId) {
      await writeNotification({
        userId: clientId,
        type: 'move_accepted',
        title: 'Mover Accepted',
        body: 'A mover has accepted your move request!',
        data: { moveId, handle: move.handle, status: 'mover_accepted' },
        i18n: { key: 'status.moverAccepted', params: { handle: move.handle ?? '' } },
      })
    }

    // Best-effort: decline all other pending requests for this move, and close
    // another mover's price that was still with the client. Never throws, so a
    // failure here doesn't fail an accept that already succeeded.
    await closeOtherOffers({ databases, moveId, acceptedRequestId: requestId, pendingOfferRaw: pendingBefore })

    return NextResponse.json({ ok: true, success: true, moveId, requestId, handle: move.handle ?? null })
  } catch (error) {
    console.error('Error accepting move:', error)
    return NextResponse.json({ error: t('errors:generic.internal') }, { status: 500 })
  }
}
