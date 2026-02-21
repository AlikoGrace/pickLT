'use client'

import MoveCard from '@/components/MoveCard'
import { MoveStatus, useMoveSearch } from '@/context/moveSearch'
import { Divider } from '@/shared/divider'
import { TruckIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'
import { useState } from 'react'

const STATUS_TABS = [
  { label: 'All', value: undefined },
  { label: 'Pending', value: 'pending' as MoveStatus },
  { label: 'In Progress', value: 'in_progress' as MoveStatus },
  { label: 'Completed', value: 'completed' as MoveStatus },
  { label: 'Cancelled', value: 'cancelled' as MoveStatus },
]

export default function MyMovesPage() {
  const { storedMoves, getFilteredMoves } = useMoveSearch()
  const [activeTab, setActiveTab] = useState<MoveStatus | undefined>(undefined)

  const filteredMoves = activeTab ? getFilteredMoves(activeTab) : storedMoves

  return (
    <div>
      <h1 className="text-3xl font-semibold">My Moves</h1>
      <p className="mt-2 text-neutral-500 dark:text-neutral-400">
        Track and manage all your moves in one place.
      </p>

      <Divider className="my-8 w-14!" />

      {/* Status filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-4 hidden-scrollbar">
        {STATUS_TABS.map((tab) => {
          const isActive = activeTab === tab.value
          return (
            <button
              key={tab.label}
              onClick={() => setActiveTab(tab.value)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                isActive
                  ? 'bg-primary-600 text-white'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
              }`}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {filteredMoves.length > 0 ? (
        <div className="mt-8 grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 md:gap-x-8 md:gap-y-12 lg:grid-cols-3 xl:grid-cols-4">
          {filteredMoves.map((move) => (
            <MoveCard key={move.id} data={move} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <TruckIcon className="w-16 h-16 text-neutral-300 dark:text-neutral-600 mb-4" />
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
            {activeTab ? `No ${activeTab.replace('_', ' ')} moves` : 'No moves yet'}
          </h3>
          <p className="text-neutral-500 dark:text-neutral-400 mb-6 max-w-sm">
            {activeTab
              ? 'Try selecting a different filter.'
              : 'Book your first move and it will show up here.'}
          </p>
          {!activeTab && (
            <Link
              href="/"
              className="px-6 py-2.5 bg-primary-600 text-white rounded-full text-sm font-medium hover:bg-primary-700 transition-colors"
            >
              Book a Move
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
