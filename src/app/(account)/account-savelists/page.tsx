'use client'

import MoveCard from '@/components/MoveCard'
import { MoveStatus, StoredMove } from '@/context/moveSearch'
import { Divider } from '@/shared/divider'
import { TruckIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'

/** Map database status → display‑level MoveStatus */
function mapDbStatus(dbStatus: string): MoveStatus {
  if (['draft', 'pending_payment', 'paid', 'mover_assigned'].includes(dbStatus)) return 'pending'
  if (
    [
      'mover_accepted',
      'mover_en_route',
      'mover_arrived',
      'loading',
      'in_transit',
      'arrived_destination',
      'unloading',
    ].includes(dbStatus)
  )
    return 'in_progress'
  if (dbStatus === 'completed') return 'completed'
  if (['cancelled', 'cancelled_by_client', 'cancelled_by_mover', 'disputed'].includes(dbStatus))
    return 'cancelled'
  return 'pending'
}

function docToStoredMove(doc: any): StoredMove {
  return {
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
  }
}

const STATUS_TABS = [
  { label: 'All', value: undefined },
  { label: 'Pending', value: 'pending' as MoveStatus },
  { label: 'In Progress', value: 'in_progress' as MoveStatus },
  { label: 'Completed', value: 'completed' as MoveStatus },
  { label: 'Cancelled', value: 'cancelled' as MoveStatus },
]

export default function MyMovesPage() {
  const [moves, setMoves] = useState<StoredMove[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<MoveStatus | undefined>(undefined)

  const fetchMoves = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch('/api/moves?limit=100')
      if (!res.ok) throw new Error('Failed to fetch moves')
      const data = await res.json()
      const mapped = (data.documents ?? []).map(docToStoredMove)
      setMoves(mapped)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMoves()
  }, [fetchMoves])

  const filteredMoves = activeTab ? moves.filter((m) => m.status === activeTab) : moves

  // Count per status for badge display
  const counts: Record<string, number> = {}
  for (const m of moves) counts[m.status] = (counts[m.status] ?? 0) + 1

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
          const count = tab.value ? counts[tab.value] ?? 0 : moves.length
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
              {count > 0 && (
                <span
                  className={`ml-1.5 text-xs ${isActive ? 'text-white/80' : 'text-neutral-400'}`}
                >
                  ({count})
                </span>
              )}
            </button>
          )
        })}
      </div>

      {loading ? (
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse rounded-2xl bg-neutral-100 dark:bg-neutral-800 h-64" />
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <button
            onClick={fetchMoves}
            className="px-6 py-2.5 bg-primary-600 text-white rounded-full text-sm font-medium hover:bg-primary-700 transition-colors"
          >
            Retry
          </button>
        </div>
      ) : filteredMoves.length > 0 ? (
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
