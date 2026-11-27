'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { formatDistanceKm, formatMoney } from '@/lib/format'
import { openPendingOffer, parsePendingOffer, priceIncrease, secondsLeft } from '@/lib/pending-offer'

/** `m:ss`, the same in every language. */
export function formatCountdown(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

type Busy = 'accept' | 'decline' | null

/**
 * The client's prompt for a mover's higher price (plan pricing/8, option B).
 *
 * A mover other than the one the client chose accepted, and their drive to
 * the pickup address makes the move cost more. The move is not assigned until
 * the client says yes; no answer within the countdown counts as a no, and the
 * server closes the offer. Renders nothing unless `moves.pendingOffer` holds an
 * offer that is still open.
 */
export default function PendingOfferPrompt({
  moveId,
  pendingOffer,
  currency,
  onResolved,
}: {
  moveId: string | null | undefined
  /** `moves.pendingOffer` as stored: a JSON string, an object, or nothing. */
  pendingOffer: unknown
  /** The move's currency (plan currency/0): the offer is in it. Omit for the user's own. */
  currency?: string | null
  /** Called after the server took the answer (or said the offer is gone), so the page can reload the move. */
  onResolved?: (outcome: 'accepted' | 'declined' | 'closed') => void
}) {
  const { t } = useTranslation()
  const parsed = useMemo(() => parsePendingOffer(pendingOffer), [pendingOffer])
  const [nowMs, setNowMs] = useState(() => Date.now())
  const [busy, setBusy] = useState<Busy>(null)
  // The request this client already answered (or was told is gone): the row
  // may take a moment to lose its `pendingOffer`.
  const [answeredRequestId, setAnsweredRequestId] = useState<string | null>(null)
  const [notice, setNotice] = useState<{ kind: 'info' | 'error'; text: string } | null>(null)

  const expiresMs = parsed ? Date.parse(parsed.expiresAt) : null
  useEffect(() => {
    if (expiresMs === null) return
    setNowMs(Date.now())
    const id = setInterval(() => setNowMs(Date.now()), 1000)
    return () => clearInterval(id)
  }, [expiresMs])

  const offer = openPendingOffer(pendingOffer, nowMs)
  const showPrompt = !!offer && !!moveId && offer.requestId !== answeredRequestId

  const answer = async (decision: 'accept' | 'decline') => {
    if (!offer || !moveId || busy) return
    setBusy(decision)
    setNotice(null)
    try {
      const res = await fetch('/api/moves/offer-decision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ moveId, decision }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.ok) {
        setAnsweredRequestId(offer.requestId)
        if (decision === 'decline') setNotice({ kind: 'info', text: t('web:priceConfirm.declined.notice') })
        onResolved?.(decision === 'accept' ? 'accepted' : 'declined')
        return
      }
      if (res.status === 409) {
        // The offer is gone (answered too late, or the move went elsewhere).
        // i18n-keys: errors:offer.notPending, errors:offer.expired
        const code = data.fnCode === 'offer.notPending' || data.fnCode === 'offer.expired' ? data.fnCode : 'offer.expired'
        setAnsweredRequestId(offer.requestId)
        setNotice({ kind: 'error', text: t(`errors:${code}`) })
        onResolved?.('closed')
        return
      }
      setNotice({ kind: 'error', text: data.error || t('web:priceConfirm.failed.error') })
    } catch {
      setNotice({ kind: 'error', text: t('web:priceConfirm.failed.error') })
    } finally {
      setBusy(null)
    }
  }

  if (!showPrompt) {
    if (!notice) return null
    return (
      <div className="fixed inset-x-0 bottom-4 z-[90] flex justify-center px-4" role="status">
        <div
          className={`flex max-w-md items-start gap-3 rounded-2xl px-4 py-3 text-sm shadow-xl ${
            notice.kind === 'error'
              ? 'bg-red-50 text-red-800 ring-1 ring-red-200 dark:bg-red-950 dark:text-red-200 dark:ring-red-800'
              : 'bg-white text-neutral-800 ring-1 ring-neutral-200 dark:bg-neutral-800 dark:text-neutral-100 dark:ring-neutral-700'
          }`}
        >
          <p className="flex-1">{notice.text}</p>
          <button type="button" onClick={() => setNotice(null)} className="font-semibold underline">
            {t('common:action.ok.cta')}
          </button>
        </div>
      </div>
    )
  }

  const left = secondsLeft(offer, nowMs)
  const increase = priceIncrease(offer)

  return (
    <div
      className="fixed inset-0 z-[90] flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pending-offer-title"
    >
      <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl ring-2 ring-amber-400/60 dark:bg-neutral-800">
        <div className="bg-amber-500 px-5 py-4 text-white">
          <h2 id="pending-offer-title" className="text-lg font-bold">
            {t('web:priceConfirm.title')}
          </h2>
          <p className="mt-1 text-sm font-medium tabular-nums" aria-live="polite">
            {t('web:priceConfirm.countdown.label', { time: formatCountdown(left) })}
          </p>
        </div>

        <div className="space-y-4 p-5">
          <p className="text-sm text-neutral-700 dark:text-neutral-200">
            {offer.moverName
              ? t('web:priceConfirm.body.named', { name: offer.moverName })
              : t('web:priceConfirm.body.unnamed')}
          </p>

          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-neutral-500 dark:text-neutral-400">{t('web:priceConfirm.distance.label')}</dt>
              <dd className="font-medium text-neutral-900 dark:text-neutral-100">{formatDistanceKm(offer.approachM / 1000)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-neutral-500 dark:text-neutral-400">{t('web:priceConfirm.previous.label')}</dt>
              <dd className="font-medium text-neutral-900 dark:text-neutral-100">{formatMoney(offer.previousTotal, { currency })}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-neutral-500 dark:text-neutral-400">{t('web:priceConfirm.difference.label')}</dt>
              <dd className="font-medium text-amber-700 dark:text-amber-300">+{formatMoney(increase, { currency })}</dd>
            </div>
            <div className="flex justify-between gap-4 border-t border-neutral-200 pt-2 text-base dark:border-neutral-700">
              <dt className="font-semibold text-neutral-900 dark:text-neutral-100">{t('web:priceConfirm.new.label')}</dt>
              <dd className="font-bold text-neutral-900 dark:text-neutral-100">{formatMoney(offer.total, { currency })}</dd>
            </div>
          </dl>

          <p className="text-xs text-neutral-500 dark:text-neutral-400">{t('web:priceConfirm.helper')}</p>

          {notice?.kind === 'error' && (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-200" role="alert">
              {notice.text}
            </p>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => answer('decline')}
              disabled={busy !== null}
              className="flex-1 rounded-xl border-2 border-neutral-300 px-4 py-3 text-sm font-semibold text-neutral-700 transition-colors hover:bg-neutral-100 disabled:opacity-50 dark:border-neutral-600 dark:text-neutral-200 dark:hover:bg-neutral-700"
            >
              {busy === 'decline' ? t('common:state.declining.label') : t('web:priceConfirm.decline.cta')}
            </button>
            <button
              type="button"
              onClick={() => answer('accept')}
              disabled={busy !== null}
              className="flex-[2] rounded-xl bg-primary-600 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy === 'accept'
                ? t('common:state.accepting.label')
                : t('web:priceConfirm.accept.cta', { amount: formatMoney(offer.total, { currency }) })}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
