'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ArrowTrendingUpIcon,
  ArrowPathIcon,
  CalendarDaysIcon,
  BanknotesIcon,
  TruckIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'
import { formatDateWith, formatMoney } from '@/lib/format'

type TimePeriod = 'today' | 'week' | 'month' | 'year'

/** Stored/queried slugs. Labels are looked up per render — never persisted. */
const PERIODS: TimePeriod[] = ['today', 'week', 'month', 'year']

interface EarningEntry {
  id: string
  date: string
  description: string
  amount: number
  type: 'earning' | 'tip' | 'bonus'
  moveType?: string
}

interface EarningsData {
  total: number
  moves: number
  entries: EarningEntry[]
  period: string
  averagePerMove: number
}

const EarningsPage = () => {
  const { t } = useTranslation()
  const [period, setPeriod] = useState<TimePeriod>('week')
  const [data, setData] = useState<EarningsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // i18n-keys: web:mover.earnings.period.today.label, web:mover.earnings.period.week.label, web:mover.earnings.period.month.label, web:mover.earnings.period.year.label
  const periodOptions = PERIODS.map((p) => ({
    value: p,
    label: t(`web:mover.earnings.period.${p}.label`),
  }))

  // A lowercased caption, not `.toLowerCase()` on the label — German capitalises nouns.
  // i18n-keys: web:mover.earnings.period.today.caption, web:mover.earnings.period.week.caption, web:mover.earnings.period.month.caption, web:mover.earnings.period.year.caption
  const periodCaption = (p: TimePeriod) => t(`web:mover.earnings.period.${p}.caption`)

  const fetchEarnings = useCallback(async (p: TimePeriod) => {
    try {
      setIsLoading(true)
      setError(null)
      const res = await fetch(`/api/mover/earnings?period=${p}`)
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || t('errors:mover.earningsFetchFailed'))
      }
      const result = await res.json()
      setData({
        total: result.total || 0,
        moves: result.moves || 0,
        entries: (result.entries || []).map((e: Record<string, unknown>) => ({
          id: e.id as string,
          date: formatDateWith(e.date as string, {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
          }),
          description: e.description as string,
          amount: e.amount as number,
          type: 'earning' as const,
          moveType: e.moveType as string | undefined,
        })),
        period: result.period,
        averagePerMove: result.averagePerMove || 0,
      })
    } catch (err) {
      console.error('Failed to fetch earnings:', err)
      setError(err instanceof Error ? err.message : t('errors:mover.earningsLoadFailed'))
    } finally {
      setIsLoading(false)
    }
  }, [t])

  useEffect(() => {
    fetchEarnings(period)
  }, [period, fetchEarnings])

  const handlePeriodChange = (p: TimePeriod) => {
    setPeriod(p)
  }

  // Loading state
  if (isLoading && !data) {
    return (
      <div className="p-4 lg:p-6 pb-24 lg:pb-6 flex flex-col items-center justify-center min-h-[50vh]">
        <ArrowPathIcon className="w-8 h-8 text-primary-500 animate-spin mb-4" />
        <p className="text-neutral-600 dark:text-neutral-400 font-medium">{t('web:mover.earnings.loading')}</p>
      </div>
    )
  }

  // Error state
  if (error && !data) {
    return (
      <div className="p-4 lg:p-6 pb-24 lg:pb-6 flex flex-col items-center justify-center min-h-[50vh]">
        <ExclamationTriangleIcon className="w-12 h-12 text-amber-500 mb-4" />
        <p className="text-neutral-900 dark:text-neutral-100 font-semibold mb-2">{t('web:mover.earnings.error.title')}</p>
        <p className="text-neutral-500 dark:text-neutral-400 text-sm text-center mb-4">{error}</p>
        <button
          onClick={() => fetchEarnings(period)}
          className="px-4 py-2 bg-primary-600 text-white rounded-full text-sm font-medium hover:bg-primary-700 transition-colors"
        >
          {t('common:action.tryAgain.cta')}
        </button>
      </div>
    )
  }

  const total = data?.total || 0
  const moves = data?.moves || 0
  const entries = data?.entries || []
  const averagePerMove = data?.averagePerMove || 0

  return (
    <div className="p-4 lg:p-6 pb-24 lg:pb-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
              {t('web:mover.earnings.title')}
            </h1>
            <p className="text-neutral-500 dark:text-neutral-400">
              {t('web:mover.earnings.subtitle')}
            </p>
          </div>
          <button
            onClick={() => fetchEarnings(period)}
            disabled={isLoading}
            className="p-2 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors disabled:opacity-50"
            title={t('web:mover.earnings.refresh.a11y')}
          >
            <ArrowPathIcon className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Period Selector */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
        {periodOptions.map(({ value: p, label }) => (
          <button
            key={p}
            onClick={() => handlePeriodChange(p)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              period === p
                ? 'bg-primary-600 text-white'
                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl p-4 text-white">
          <div className="flex items-center gap-2 mb-2">
            <BanknotesIcon className="w-5 h-5" />
            <span className="text-sm opacity-90">{t('web:mover.earnings.total.label')}</span>
          </div>
          <p className="text-3xl font-bold mb-1">{formatMoney(total, { compact: true })}</p>
          <div className="flex items-center gap-1 text-sm">
            <ArrowTrendingUpIcon className="w-4 h-4" />
            <span>{periodCaption(period)}</span>
          </div>
        </div>
        <div className="bg-white dark:bg-neutral-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2 text-neutral-500 dark:text-neutral-400">
            <TruckIcon className="w-5 h-5" />
            <span className="text-sm">{t('web:mover.earnings.movesCompleted.label')}</span>
          </div>
          <p className="text-3xl font-bold text-neutral-900 dark:text-neutral-100 mb-1">
            {moves}
          </p>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            {periodCaption(period)}
          </p>
        </div>
      </div>

      {/* Average Earning */}
      <div className="bg-white dark:bg-neutral-800 rounded-2xl p-4 shadow-sm mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">
              {t('web:mover.earnings.average.label')}
            </p>
            <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
              {formatMoney(averagePerMove, { compact: true })}
            </p>
          </div>
          <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
            <CalendarDaysIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
        </div>
      </div>

      {/* Earnings List */}
      <div>
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
          {t('web:mover.earnings.breakdown.title')}
        </h2>
        <div className="space-y-3">
          {entries.length === 0 ? (
            <div className="text-center py-8">
              <TruckIcon className="w-12 h-12 text-neutral-300 dark:text-neutral-600 mx-auto mb-3" />
              <p className="text-neutral-500 dark:text-neutral-400 text-sm">{t('web:mover.earnings.empty')}</p>
            </div>
          ) : (
          entries.map((entry) => (
            <div
              key={entry.id}
              className="bg-white dark:bg-neutral-800 rounded-2xl p-4 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      entry.type === 'tip'
                        ? 'bg-yellow-100 dark:bg-yellow-900/30'
                        : entry.type === 'bonus'
                        ? 'bg-purple-100 dark:bg-purple-900/30'
                        : 'bg-green-100 dark:bg-green-900/30'
                    }`}
                  >
                    {entry.type === 'tip' ? (
                      <span className="text-lg">💰</span>
                    ) : entry.type === 'bonus' ? (
                      <span className="text-lg">🎁</span>
                    ) : (
                      <TruckIcon
                        className={`w-5 h-5 ${
                          entry.type === 'earning'
                            ? 'text-green-600 dark:text-green-400'
                            : ''
                        }`}
                      />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-neutral-900 dark:text-neutral-100">
                      {entry.description}
                    </p>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      {entry.date}
                    </p>
                  </div>
                </div>
                <p
                  className={`text-lg font-semibold ${
                    entry.type === 'tip'
                      ? 'text-yellow-600 dark:text-yellow-400'
                      : entry.type === 'bonus'
                      ? 'text-purple-600 dark:text-purple-400'
                      : 'text-green-600 dark:text-green-400'
                  }`}
                >
                  +{formatMoney(entry.amount, { compact: true })}
                </p>
              </div>
            </div>
          ))
          )}
        </div>
      </div>

      {/* Payout Section */}
      <div className="mt-8 bg-neutral-100 dark:bg-neutral-800 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              {t('web:mover.earnings.payoutAvailable.label')}
            </p>
            <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
              {formatMoney(Number(total))}
            </p>
          </div>
          <button className="px-4 py-2 bg-primary-600 text-white rounded-full text-sm font-medium hover:bg-primary-700 transition-colors">
            {t('web:mover.earnings.requestPayout.cta')}
          </button>
        </div>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          {t('web:mover.earnings.payout.helper')}
        </p>
      </div>
    </div>
  )
}

export default EarningsPage
