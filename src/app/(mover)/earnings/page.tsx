'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  ArrowTrendingUpIcon,
  ArrowPathIcon,
  CalendarDaysIcon,
  BanknotesIcon,
  TruckIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'

type TimePeriod = 'today' | 'week' | 'month' | 'year'

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
  const [period, setPeriod] = useState<TimePeriod>('week')
  const [data, setData] = useState<EarningsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const periodLabels: Record<TimePeriod, string> = {
    today: 'Today',
    week: 'This Week',
    month: 'This Month',
    year: 'This Year',
  }

  const fetchEarnings = useCallback(async (p: TimePeriod) => {
    try {
      setIsLoading(true)
      setError(null)
      const res = await fetch(`/api/mover/earnings?period=${p}`)
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || 'Failed to fetch earnings')
      }
      const result = await res.json()
      setData({
        total: result.total || 0,
        moves: result.moves || 0,
        entries: (result.entries || []).map((e: Record<string, unknown>) => ({
          id: e.id as string,
          date: new Date(e.date as string).toLocaleDateString('en-DE', {
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
      setError(err instanceof Error ? err.message : 'Failed to load earnings')
    } finally {
      setIsLoading(false)
    }
  }, [])

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
        <p className="text-neutral-600 dark:text-neutral-400 font-medium">Loading earnings...</p>
      </div>
    )
  }

  // Error state
  if (error && !data) {
    return (
      <div className="p-4 lg:p-6 pb-24 lg:pb-6 flex flex-col items-center justify-center min-h-[50vh]">
        <ExclamationTriangleIcon className="w-12 h-12 text-amber-500 mb-4" />
        <p className="text-neutral-900 dark:text-neutral-100 font-semibold mb-2">Unable to load earnings</p>
        <p className="text-neutral-500 dark:text-neutral-400 text-sm text-center mb-4">{error}</p>
        <button
          onClick={() => fetchEarnings(period)}
          className="px-4 py-2 bg-primary-600 text-white rounded-full text-sm font-medium hover:bg-primary-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    )
  }

  const total = data?.total || 0
  const moves = data?.moves || 0
  const entries = data?.entries || []
  const averagePerMove = data?.averagePerMove || 0

  return (
    <div className="p-4 lg:p-6 pb-24 lg:pb-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
              Earnings
            </h1>
            <p className="text-neutral-500 dark:text-neutral-400">
              Track your income and performance
            </p>
          </div>
          <button
            onClick={() => fetchEarnings(period)}
            disabled={isLoading}
            className="p-2 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <ArrowPathIcon className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Period Selector */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
        {(['today', 'week', 'month', 'year'] as TimePeriod[]).map((p) => (
          <button
            key={p}
            onClick={() => handlePeriodChange(p)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              period === p
                ? 'bg-primary-600 text-white'
                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
            }`}
          >
            {periodLabels[p]}
          </button>
        ))}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl p-4 text-white">
          <div className="flex items-center gap-2 mb-2">
            <BanknotesIcon className="w-5 h-5" />
            <span className="text-sm opacity-90">Total Earnings</span>
          </div>
          <p className="text-3xl font-bold mb-1">€{total.toLocaleString()}</p>
          <div className="flex items-center gap-1 text-sm">
            <ArrowTrendingUpIcon className="w-4 h-4" />
            <span>{periodLabels[period].toLowerCase()}</span>
          </div>
        </div>
        <div className="bg-white dark:bg-neutral-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2 text-neutral-500 dark:text-neutral-400">
            <TruckIcon className="w-5 h-5" />
            <span className="text-sm">Moves Completed</span>
          </div>
          <p className="text-3xl font-bold text-neutral-900 dark:text-neutral-100 mb-1">
            {moves}
          </p>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            {periodLabels[period].toLowerCase()}
          </p>
        </div>
      </div>

      {/* Average Earning */}
      <div className="bg-white dark:bg-neutral-800 rounded-2xl p-4 shadow-sm mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">
              Average per Move
            </p>
            <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
              €{averagePerMove}
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
          Breakdown
        </h2>
        <div className="space-y-3">
          {entries.length === 0 ? (
            <div className="text-center py-8">
              <TruckIcon className="w-12 h-12 text-neutral-300 dark:text-neutral-600 mx-auto mb-3" />
              <p className="text-neutral-500 dark:text-neutral-400 text-sm">No earnings for this period yet</p>
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
                  +€{entry.amount}
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
              Available for Payout
            </p>
            <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
              €{total}
            </p>
          </div>
          <button className="px-4 py-2 bg-primary-600 text-white rounded-full text-sm font-medium hover:bg-primary-700 transition-colors">
            Request Payout
          </button>
        </div>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          Payouts are processed weekly
        </p>
      </div>
    </div>
  )
}

export default EarningsPage
