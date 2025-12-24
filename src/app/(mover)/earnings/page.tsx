'use client'

import { useState } from 'react'
import {
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CalendarDaysIcon,
  BanknotesIcon,
  TruckIcon,
} from '@heroicons/react/24/outline'

type TimePeriod = 'today' | 'week' | 'month' | 'year'

interface EarningEntry {
  id: string
  date: string
  description: string
  amount: number
  type: 'earning' | 'tip' | 'bonus'
}

const EARNINGS_DATA: Record<TimePeriod, { total: number; moves: number; change: number; entries: EarningEntry[] }> = {
  today: {
    total: 285,
    moves: 3,
    change: 15,
    entries: [
      { id: '1', date: '14:30', description: 'Move: Mitte → Kreuzberg', amount: 85, type: 'earning' },
      { id: '2', date: '14:30', description: 'Tip from Max M.', amount: 15, type: 'tip' },
      { id: '3', date: '10:00', description: 'Move: Prenzlauer Berg → Charlottenburg', amount: 120, type: 'earning' },
      { id: '4', date: '10:00', description: 'Tip from Anna S.', amount: 20, type: 'tip' },
      { id: '5', date: '08:00', description: 'Move: Wedding → Tempelhof', amount: 45, type: 'earning' },
    ],
  },
  week: {
    total: 1250,
    moves: 12,
    change: 8,
    entries: [
      { id: '1', date: 'Today', description: '3 moves completed', amount: 285, type: 'earning' },
      { id: '2', date: 'Yesterday', description: '2 moves completed', amount: 195, type: 'earning' },
      { id: '3', date: 'Mon', description: '3 moves completed', amount: 320, type: 'earning' },
      { id: '4', date: 'Sun', description: '2 moves completed', amount: 180, type: 'earning' },
      { id: '5', date: 'Sat', description: '2 moves completed', amount: 270, type: 'earning' },
    ],
  },
  month: {
    total: 4850,
    moves: 48,
    change: 12,
    entries: [
      { id: '1', date: 'Week 4', description: '12 moves completed', amount: 1250, type: 'earning' },
      { id: '2', date: 'Week 3', description: '14 moves completed', amount: 1450, type: 'earning' },
      { id: '3', date: 'Week 2', description: '10 moves completed', amount: 980, type: 'earning' },
      { id: '4', date: 'Week 1', description: '12 moves completed', amount: 1170, type: 'earning' },
    ],
  },
  year: {
    total: 52400,
    moves: 520,
    change: 25,
    entries: [
      { id: '1', date: 'Dec', description: '48 moves', amount: 4850, type: 'earning' },
      { id: '2', date: 'Nov', description: '52 moves', amount: 5200, type: 'earning' },
      { id: '3', date: 'Oct', description: '45 moves', amount: 4500, type: 'earning' },
      { id: '4', date: 'Sep', description: '48 moves', amount: 4800, type: 'earning' },
      { id: '5', date: 'Aug', description: '42 moves', amount: 4200, type: 'earning' },
    ],
  },
}

const EarningsPage = () => {
  const [period, setPeriod] = useState<TimePeriod>('week')
  const data = EARNINGS_DATA[period]

  const periodLabels: Record<TimePeriod, string> = {
    today: 'Today',
    week: 'This Week',
    month: 'This Month',
    year: 'This Year',
  }

  return (
    <div className="p-4 lg:p-6 pb-24 lg:pb-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
          Earnings
        </h1>
        <p className="text-neutral-500 dark:text-neutral-400">
          Track your income and performance
        </p>
      </div>

      {/* Period Selector */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
        {(['today', 'week', 'month', 'year'] as TimePeriod[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
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
          <p className="text-3xl font-bold mb-1">€{data.total.toLocaleString()}</p>
          <div className="flex items-center gap-1 text-sm">
            {data.change >= 0 ? (
              <>
                <ArrowTrendingUpIcon className="w-4 h-4" />
                <span>+{data.change}% vs last {period === 'today' ? 'day' : period}</span>
              </>
            ) : (
              <>
                <ArrowTrendingDownIcon className="w-4 h-4" />
                <span>{data.change}% vs last {period === 'today' ? 'day' : period}</span>
              </>
            )}
          </div>
        </div>
        <div className="bg-white dark:bg-neutral-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2 text-neutral-500 dark:text-neutral-400">
            <TruckIcon className="w-5 h-5" />
            <span className="text-sm">Moves Completed</span>
          </div>
          <p className="text-3xl font-bold text-neutral-900 dark:text-neutral-100 mb-1">
            {data.moves}
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
              €{data.moves > 0 ? Math.round(data.total / data.moves) : 0}
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
          {data.entries.map((entry) => (
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
          ))}
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
              €{data.total}
            </p>
          </div>
          <button className="px-4 py-2 bg-primary-600 text-white rounded-full text-sm font-medium hover:bg-primary-700 transition-colors">
            Request Payout
          </button>
        </div>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          Next automatic payout: Monday, Dec 30
        </p>
      </div>
    </div>
  )
}

export default EarningsPage
