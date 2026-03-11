'use client'

import { MoveStatus, StoredMove } from '@/context/moveSearch'
import { useAuth } from '@/context/auth'
import ButtonPrimary from '@/shared/ButtonPrimary'
import T from '@/utils/getT'
import { ArrowRightIcon } from '@heroicons/react/24/solid'
import { TruckIcon } from '@heroicons/react/24/outline'
import { FC, ReactNode, useCallback, useEffect, useState } from 'react'
import MoveCard from './MoveCard'
import SectionTabHeader from './SectionTabHeader'

function mapDbStatus(dbStatus: string): MoveStatus {
  if (['draft', 'pending_payment', 'paid', 'mover_assigned'].includes(dbStatus)) return 'pending'
  if (
    ['mover_accepted', 'mover_en_route', 'mover_arrived', 'loading', 'in_transit',
     'arrived_destination', 'unloading', 'awaiting_payment'].includes(dbStatus)
  )
    return 'in_progress'
  if (dbStatus === 'completed') return 'completed'
  if (['cancelled', 'cancelled_by_client', 'cancelled_by_mover', 'disputed'].includes(dbStatus))
    return 'cancelled'
  return 'pending'
}

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
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()
  const tabs = ['All Moves', 'Pending', 'In Progress', 'Completed', 'Cancelled']
  const [activeTab, setActiveTab] = useState('All Moves')

  const [moves, setMoves] = useState<StoredMove[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchMoves = useCallback(async () => {
    if (!isAuthenticated) {
      setIsLoading(false)
      return
    }
    try {
      setIsLoading(true)
      const res = await fetch('/api/moves?limit=20')
      if (!res.ok) return
      const data = await res.json()
      const mapped: StoredMove[] = (data.documents ?? []).map((doc: any) => ({
        id: doc.$id,
        handle: doc.handle ?? '',
        status: mapDbStatus(doc.status ?? ''),
        createdAt: doc.$createdAt ?? '',
        paidAt: doc.paidAt ?? doc.$createdAt ?? '',
        totalPrice: doc.estimatedPrice ?? 0,
        bookingCode: doc.handle ?? '',
        moveType: doc.moveType ?? doc.systemMoveType ?? null,
        moveDate: doc.moveDate ?? null,
        pickupLocation: doc.pickupLocation ?? '',
        pickupStreetAddress: doc.pickupLocation ?? '',
        pickupApartmentUnit: doc.pickupApartmentUnit ?? '',
        dropoffStreetAddress: doc.dropoffLocation ?? '',
        dropoffApartmentUnit: doc.dropoffApartmentUnit ?? '',
        dropoffFloorLevel: doc.dropoffFloorLevel ?? null,
        homeType: doc.homeType ?? null,
        floorLevel: doc.floorLevel ?? null,
        elevatorAvailable: doc.elevatorAvailable ?? false,
        dropoffElevatorAvailable: doc.dropoffElevatorAvailable ?? false,
        parkingSituation: doc.parkingSituation ?? null,
        dropoffParkingSituation: doc.dropoffParkingSituation ?? null,
        packingServiceLevel: doc.packingServiceLevel ?? null,
        additionalServices: doc.additionalServices ?? [],
        storageWeeks: doc.storageWeeks ?? 0,
        crewSize: doc.crewSize ?? null,
        vehicleType: doc.vehicleType ?? null,
        arrivalWindow: doc.arrivalWindow ?? null,
        inventoryCount: doc.totalItemCount ?? 0,
        contactInfo: doc.contactInfo ?? { fullName: '', phone: '', email: '' },
        coverPhotoId: doc.coverPhotoId ?? null,
        galleryPhotoIds: doc.galleryPhotoIds ?? [],
      }))
      setMoves(mapped)
    } catch {
      // silently fail — component is non-critical
    } finally {
      setIsLoading(false)
    }
  }, [isAuthenticated])

  useEffect(() => {
    if (!authLoading) {
      fetchMoves()
    }
  }, [fetchMoves, authLoading])

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
  const filteredMoves = (status ? moves.filter((m) => m.status === status) : moves).slice(0, 4)

  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
  }

  // ─── Not logged in: show CTA ────────────────────────────
  if (!authLoading && !isAuthenticated) {
    return (
      <div className="relative">
        <div className="text-center py-16">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary-50 dark:bg-primary-900/20">
            <TruckIcon className="h-10 w-10 text-primary-600 dark:text-primary-400" />
          </div>
          <h2 className="text-2xl font-semibold text-neutral-900 dark:text-white mb-2">
            Your moves will appear here
          </h2>
          <p className="text-neutral-500 dark:text-neutral-400 mb-8 max-w-md mx-auto">
            Sign in to track your moves, view booking details, and manage your moving schedule.
          </p>
          <ButtonPrimary href="/login">
            Sign in to get started
            <ArrowRightIcon className="h-5 w-5 rtl:rotate-180" />
          </ButtonPrimary>
        </div>
      </div>
    )
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
        <ButtonPrimary href={'/account-savelists'}>
          {T['common']['Show me more']}
          <ArrowRightIcon className="h-5 w-5 rtl:rotate-180" />
        </ButtonPrimary>
      </div>
    </div>
  )
}

export default SectionGridFeaturePlaces
