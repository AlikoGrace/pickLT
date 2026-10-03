'use client'

import { BanknotesIcon, CheckCircleIcon, ExclamationTriangleIcon, NoSymbolIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import FeePayPanel, { confirmFeePayment } from '@/components/mover/FeePayPanel'
import { useAuth } from '@/context/auth'
import { formatDate, formatMoney } from '@/lib/format'

/**
 * "Platform balance" (plan `fees/0.master.md` §6): what the driver owes the
 * platform on cash moves, or what it holds for them from card moves, the due
 * date and standing, the ledger history, and Pay now.
 */

type Standing = 'ok' | 'due' | 'overdue' | 'restricted'

interface LedgerRow {
  id: string
  kind: string
  amountCents: number
  moveHandle: string | null
  dueAt: string | null
  createdAt: string
}

interface FeesResponse {
  feeBalanceCents: number
  feeOwedCents: number
  feeOldestDueAt: string | null
  feeStanding: Standing
  payAvailable: boolean
  entries: LedgerRow[]
  nextCursor: string | null
}

/** `cash_fee_due` → `cashFeeDue`, the catalog's key shape. */
const KIND_KEYS: Record<string, string> = {
  cash_fee_due: 'cashFeeDue',
  card_earning: 'cardEarning',
  driver_payment: 'driverPayment',
  payout: 'payout',
  adjustment: 'adjustment',
  waiver: 'waiver',
  charge: 'charge',
}

export default function FeeBalanceCard() {
  const { t } = useTranslation()
  const { refreshProfile } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [data, setData] = useState<FeesResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [paying, setPaying] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)

  const load = useCallback(async () => {
    try {
      setError(null)
      const res = await fetch('/api/mover/fees')
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || t('errors:fees.loadFailed'))
      setData(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors:fees.loadFailed'))
    }
  }, [t])

  useEffect(() => {
    void load()
  }, [load])

  const afterPaid = useCallback(async () => {
    setPaying(false)
    setNotice(t('web:mover.fees.pay.success'))
    await load()
    void refreshProfile({ background: true })
  }, [load, refreshProfile, t])

  // A redirect-based payment method returns here with the intent in the URL.
  const returnedIntent = searchParams.get('payment_intent')
  const handledReturn = useRef(false)
  useEffect(() => {
    if (!returnedIntent || handledReturn.current) return
    handledReturn.current = true
    router.replace(pathname)
    confirmFeePayment(returnedIntent)
      .then(afterPaid)
      .catch((err) => setError(err instanceof Error ? err.message : t('errors:fees.payFailed')))
  }, [returnedIntent, router, pathname, afterPaid, t])

  const loadMore = async () => {
    if (!data?.nextCursor) return
    setLoadingMore(true)
    try {
      const res = await fetch(`/api/mover/fees?cursor=${encodeURIComponent(data.nextCursor)}`)
      const json = await res.json()
      if (res.ok) setData({ ...data, entries: [...data.entries, ...json.entries], nextCursor: json.nextCursor })
    } finally {
      setLoadingMore(false)
    }
  }

  if (!data) {
    return error ? (
      <div className="mb-6 rounded-2xl bg-white p-4 text-sm text-neutral-500 shadow-sm dark:bg-neutral-800 dark:text-neutral-400">
        {error}
      </div>
    ) : null
  }

  const owed = data.feeOwedCents > 0
  const credit = !owed && data.feeBalanceCents > 0
  const standing: Standing = owed ? data.feeStanding : 'ok'
  const dueDate = data.feeOldestDueAt ? formatDate(data.feeOldestDueAt) : null
  const amount = owed ? data.feeOwedCents : Math.max(0, data.feeBalanceCents)

  const tone = standing === 'restricted' ? 'red' : standing === 'overdue' ? 'amber' : owed ? 'blue' : 'green'
  const Icon = standing === 'restricted' ? NoSymbolIcon : standing === 'overdue' ? ExclamationTriangleIcon : owed ? BanknotesIcon : CheckCircleIcon

  const headline = owed
    ? t('web:mover.fees.balance.owe.label')
    : credit
      ? t('web:mover.fees.balance.owed.label')
      : t('web:mover.fees.balance.settled.label')
  const message =
    standing === 'restricted'
      ? t('web:mover.fees.balance.restricted.body')
      : standing === 'overdue'
        ? t('web:mover.fees.balance.overdue.body', { date: dueDate ?? '' })
        : owed
          ? dueDate
            ? t('web:mover.fees.balance.due.body', { date: dueDate })
            : t('web:mover.fees.balance.dueNow.body')
          : credit
            ? t('web:mover.fees.balance.credit.body')
            : t('web:mover.fees.balance.settled.body')

  return (
    <section className="mb-6">
      <div
        className={clsx(
          'rounded-2xl border p-4',
          tone === 'red' && 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950',
          tone === 'amber' && 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950',
          tone === 'blue' && 'border-primary-200 bg-primary-50 dark:border-primary-800 dark:bg-primary-950',
          tone === 'green' && 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950',
        )}
      >
        <div className="flex items-center gap-2 text-sm font-semibold text-neutral-700 dark:text-neutral-200">
          <Icon
            className={clsx(
              'h-5 w-5',
              tone === 'red' && 'text-red-500',
              tone === 'amber' && 'text-amber-500',
              tone === 'blue' && 'text-primary-600',
              tone === 'green' && 'text-green-600',
            )}
          />
          {t('web:mover.fees.balance.title')}
        </div>
        <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-300">{headline}</p>
        <p className="text-3xl font-bold break-words text-neutral-900 dark:text-neutral-100">{formatMoney(amount / 100)}</p>
        <p
          className={clsx(
            'mt-1 text-sm',
            tone === 'red' && 'text-red-700 dark:text-red-300',
            tone === 'amber' && 'text-amber-700 dark:text-amber-300',
            tone === 'blue' && 'text-primary-700 dark:text-primary-300',
            tone === 'green' && 'text-green-700 dark:text-green-300',
          )}
        >
          {message}
        </p>
        {notice && <p className="mt-2 text-sm font-medium text-green-700 dark:text-green-300">{notice}</p>}
        {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
        {owed && !paying && (
          <div className="mt-4">
            {data.payAvailable ? (
              <button
                type="button"
                onClick={() => {
                  setNotice(null)
                  setPaying(true)
                }}
                className="rounded-full bg-primary-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700 max-sm:min-h-10"
              >
                {t('web:mover.fees.pay.cta')}
              </button>
            ) : (
              <p className="text-xs text-neutral-500 dark:text-neutral-400">{t('web:mover.fees.pay.unavailable')}</p>
            )}
          </div>
        )}
        {paying && <FeePayPanel onPaid={afterPaid} onCancel={() => setPaying(false)} />}
        <p className="mt-3 text-xs text-neutral-500 dark:text-neutral-400">{t('web:mover.fees.balance.helper')}</p>
      </div>

      <h2 className="mt-6 mb-3 text-lg font-semibold text-neutral-900 dark:text-neutral-100">
        {t('web:mover.fees.history.title')}
      </h2>
      {data.entries.length === 0 ? (
        <p className="py-4 text-center text-sm text-neutral-500 dark:text-neutral-400">{t('web:mover.fees.history.empty')}</p>
      ) : (
        <ul className="divide-y divide-neutral-100 rounded-2xl bg-white shadow-sm dark:divide-neutral-700 dark:bg-neutral-800">
          {data.entries.map((row) => {
            const kindKey = KIND_KEYS[row.kind] ?? 'adjustment'
            const positive = row.amountCents > 0
            return (
              <li key={row.id} className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  {/* i18n-keys: web:mover.fees.kind.cashFeeDue.label, web:mover.fees.kind.cardEarning.label,
                      web:mover.fees.kind.driverPayment.label, web:mover.fees.kind.payout.label,
                      web:mover.fees.kind.adjustment.label, web:mover.fees.kind.waiver.label, web:mover.fees.kind.charge.label */}
                  <p className="truncate font-medium text-neutral-900 dark:text-neutral-100">
                    {t(`web:mover.fees.kind.${kindKey}.label`)}
                  </p>
                  <p className="truncate text-sm text-neutral-500 dark:text-neutral-400">
                    {[row.moveHandle ? t('web:mover.fees.history.move.label', { handle: row.moveHandle }) : null, formatDate(row.createdAt)]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                </div>
                <p
                  className={clsx(
                    'flex-shrink-0 font-semibold',
                    positive ? 'text-green-600 dark:text-green-400' : 'text-neutral-900 dark:text-neutral-100',
                  )}
                >
                  {positive ? '+' : '−'}
                  {formatMoney(Math.abs(row.amountCents) / 100)}
                </p>
              </li>
            )
          })}
        </ul>
      )}
      {data.nextCursor && (
        <button
          type="button"
          onClick={loadMore}
          disabled={loadingMore}
          className="mt-3 w-full rounded-full bg-neutral-100 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-200 disabled:opacity-50 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
        >
          {t('web:mover.fees.history.loadMore.cta')}
        </button>
      )}
    </section>
  )
}
