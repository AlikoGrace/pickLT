'use client'

import { MoveStatus, StoredMove } from '@/context/moveSearch'
import ButtonPrimary from '@/shared/ButtonPrimary'
import T from '@/utils/getT'
import { ArrowRightIcon } from '@heroicons/react/24/solid'
import { FC, ReactNode, useCallback, useEffect, useState } from 'react'
import MoveCard from './MoveCard'
import SectionTabHeader from './SectionTabHeader'

//
interface SectionGridFeaturePlacesProps {
  gridClass?: string
  heading?: ReactNode
  subHeading?: string
  headingIsCenter?: boolean
}

const SectionGridFeaturePlaces: FC<SectionGridFeaturePlacesProps> = ({
  gridClass = '',
  heading = 'Your Moves',
  subHeading = 'Track all your moves',
}) => {
  const tabs = ['All Moves', 'Pending', 'In Progress', 'Completed', 'Cancelled']
  const [activeTab, setActiveTab] = useState('All Moves')

  const [moves, setMoves] = useState<StoredMove[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchMoves = useCallback(async () => {
    try {
      setIsLoading(true)
      const res = await fetch('/api/moves?limit=100')
      if (!res.ok) return
      const data = await res.json()
      const mapped = (data.documents ?? []).map(docToStoredMove)
      setMoves(mapped)
    } catch {
      // silently fail — component is non-critical
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMoves()
  }, [fetchMoves])

  // Map tab to status filter
  const getStatusFromTab = (tab: string): MoveStatus | undefined => {
    switch (tab) {
      case 'Pending':
        return 'pending'
      case 'In Progress':
        return 'in_progress'
      case 'Completed':
        return 'completed'
      case 'Cancelled':
        return 'cancelled'
      default:
        return undefined
    }
  }

  const status = getStatusFromTab(activeTab)
  const filteredMoves = status ? moves.filter((m) => m.status === status) : moves

  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
  }

  return (
    <div className="relative">
      <SectionTabHeader 
        tabActive={activeTab} 
        subHeading={subHeading} 
        tabs={tabs} 
        heading={heading}
        onChangeTab={handleTabChange}
      />
      {isLoading ? (
        <div className={`mt-8 grid gap-x-6 gap-y-8 sm:grid-cols-2 md:gap-x-8 md:gap-y-12 lg:grid-cols-3 xl:grid-cols-4 ${gridClass}`}>
          {[...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse rounded-2xl bg-neutral-100 dark:bg-neutral-800 h-64" />
          ))}
        </div>
      ) : filteredMoves.length > 0 ? (
        <div
          className={`mt-8 grid gap-x-6 gap-y-8 sm:grid-cols-2 md:gap-x-8 md:gap-y-12 lg:grid-cols-3 xl:grid-cols-4 ${gridClass}`}
        >
          {filteredMoves.map((move) => (
            <MoveCard key={move.id} data={move} />
          ))}
        </div>
      ) : (
        <div className="mt-8 flex flex-col items-center justify-center py-16 text-center">
          <p className="text-lg text-neutral-500 dark:text-neutral-400 mb-6">
            {activeTab === 'All Moves' 
              ? 'No moves yet. Start by booking your first move!'
              : `No ${activeTab.toLowerCase()} moves found.`}
          </p>
        </div>
      )}
      <div className="mt-16 flex items-center justify-center">
        <ButtonPrimary href={'/(account)/account-savelists'}>
          {T['common']['Show me more']}
          <ArrowRightIcon className="h-5 w-5 rtl:rotate-180" />
        </ButtonPrimary>
      </div>
    </div>
  )
}

export default SectionGridFeaturePlaces
