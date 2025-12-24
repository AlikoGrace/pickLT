'use client'

import { useState } from 'react'
import {
  MapIcon,
  ListBulletIcon,
  MapPinIcon,
  CurrencyEuroIcon,
  ClockIcon,
  TruckIcon,
} from '@heroicons/react/24/outline'
import { Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps'
import ButtonPrimary from '@/shared/ButtonPrimary'

interface AvailableMove {
  id: string
  pickup: string
  pickupAddress: string
  dropoff: string
  dropoffAddress: string
  distance: string
  estimatedTime: string
  price: number
  moveType: string
  items: string[]
  requestedTime: string
  clientName: string
  lat: number
  lng: number
}

const AVAILABLE_MOVES: AvailableMove[] = [
  {
    id: '1',
    pickup: 'Berlin Mitte',
    pickupAddress: 'Alexanderplatz 1, 10178 Berlin',
    dropoff: 'Berlin Kreuzberg',
    dropoffAddress: 'Oranienstraße 25, 10999 Berlin',
    distance: '4.2 km',
    estimatedTime: '45 min',
    price: 85,
    moveType: 'Apartment',
    items: ['Sofa', 'Bed', 'Boxes (10)'],
    requestedTime: 'Today, 14:30',
    clientName: 'Max M.',
    lat: 52.5219,
    lng: 13.4132,
  },
  {
    id: '2',
    pickup: 'Berlin Prenzlauer Berg',
    pickupAddress: 'Schönhauser Allee 80, 10439 Berlin',
    dropoff: 'Berlin Charlottenburg',
    dropoffAddress: 'Kantstraße 45, 10627 Berlin',
    distance: '8.5 km',
    estimatedTime: '1h 15min',
    price: 150,
    moveType: 'House',
    items: ['Full household', 'Piano'],
    requestedTime: 'Today, 16:00',
    clientName: 'Anna S.',
    lat: 52.5389,
    lng: 13.4113,
  },
  {
    id: '3',
    pickup: 'Berlin Wedding',
    pickupAddress: 'Müllerstraße 120, 13353 Berlin',
    dropoff: 'Berlin Tempelhof',
    dropoffAddress: 'Tempelhofer Damm 70, 12101 Berlin',
    distance: '10.2 km',
    estimatedTime: '1h 30min',
    price: 180,
    moveType: 'Office',
    items: ['Desks (5)', 'Chairs (10)', 'Filing cabinets'],
    requestedTime: 'Tomorrow, 09:00',
    clientName: 'Tech GmbH',
    lat: 52.5503,
    lng: 13.3591,
  },
  {
    id: '4',
    pickup: 'Berlin Neukölln',
    pickupAddress: 'Karl-Marx-Straße 100, 12043 Berlin',
    dropoff: 'Berlin Friedrichshain',
    dropoffAddress: 'Warschauer Straße 30, 10243 Berlin',
    distance: '5.8 km',
    estimatedTime: '50 min',
    price: 95,
    moveType: 'Single Item',
    items: ['Large wardrobe'],
    requestedTime: 'Today, 18:00',
    clientName: 'Lisa K.',
    lat: 52.4816,
    lng: 13.4334,
  },
  {
    id: '5',
    pickup: 'Berlin Schöneberg',
    pickupAddress: 'Hauptstraße 50, 10827 Berlin',
    dropoff: 'Berlin Spandau',
    dropoffAddress: 'Falkenseer Damm 10, 13585 Berlin',
    distance: '15.3 km',
    estimatedTime: '2h',
    price: 220,
    moveType: 'Apartment',
    items: ['2-bedroom apartment contents'],
    requestedTime: 'Tomorrow, 11:00',
    clientName: 'Thomas W.',
    lat: 52.4839,
    lng: 13.3536,
  },
]

const AvailableMovesPage = () => {
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map')
  const [selectedMove, setSelectedMove] = useState<AvailableMove | null>(null)
  const [hoveredMoveId, setHoveredMoveId] = useState<string | null>(null)

  const handleAcceptMove = (move: AvailableMove) => {
    console.log('Accepting move:', move)
    // TODO: Implement accept move logic
    alert(`Move accepted! You will pick up from ${move.pickup}`)
  }

  return (
    <div className="h-[calc(100vh-64px)] lg:h-screen flex flex-col">
      {/* Header */}
      <div className="p-4 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-700">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
              Available Moves
            </h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              {AVAILABLE_MOVES.length} moves near you
            </p>
          </div>
          <div className="flex items-center bg-neutral-100 dark:bg-neutral-800 rounded-full p-1">
            <button
              onClick={() => setViewMode('map')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                viewMode === 'map'
                  ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-sm'
                  : 'text-neutral-500 dark:text-neutral-400'
              }`}
            >
              <MapIcon className="w-4 h-4" />
              Map
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-sm'
                  : 'text-neutral-500 dark:text-neutral-400'
              }`}
            >
              <ListBulletIcon className="w-4 h-4" />
              List
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 relative overflow-hidden">
        {viewMode === 'map' ? (
          <div className="h-full relative">
            {/* Map */}
            <Map
              defaultCenter={{ lat: 52.52, lng: 13.405 }}
              defaultZoom={12}
              mapId="available-moves-map"
              className="w-full h-full"
              disableDefaultUI
            >
              {AVAILABLE_MOVES.map((move) => (
                <AdvancedMarker
                  key={move.id}
                  position={{ lat: move.lat, lng: move.lng }}
                  onClick={() => setSelectedMove(move)}
                >
                  <div
                    className={`relative cursor-pointer transition-transform ${
                      hoveredMoveId === move.id ? 'scale-110 z-10' : ''
                    }`}
                    onMouseEnter={() => setHoveredMoveId(move.id)}
                    onMouseLeave={() => setHoveredMoveId(null)}
                  >
                    <Pin
                      background={
                        selectedMove?.id === move.id ? '#3b82f6' : '#10b981'
                      }
                      borderColor={
                        selectedMove?.id === move.id ? '#1d4ed8' : '#059669'
                      }
                      glyphColor="#ffffff"
                    />
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-white dark:bg-neutral-800 px-2 py-1 rounded-lg shadow-lg whitespace-nowrap">
                      <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                        €{move.price}
                      </span>
                    </div>
                  </div>
                </AdvancedMarker>
              ))}
            </Map>

            {/* Move Cards Carousel at bottom */}
            <div className="absolute bottom-20 lg:bottom-4 left-0 right-0 px-4">
              <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide">
                {AVAILABLE_MOVES.map((move) => (
                  <div
                    key={move.id}
                    onClick={() => setSelectedMove(move)}
                    onMouseEnter={() => setHoveredMoveId(move.id)}
                    onMouseLeave={() => setHoveredMoveId(null)}
                    className={`flex-shrink-0 w-72 bg-white dark:bg-neutral-800 rounded-2xl p-4 shadow-lg snap-start cursor-pointer transition-all ${
                      selectedMove?.id === move.id
                        ? 'ring-2 ring-primary-500'
                        : ''
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <span className="text-xs font-medium px-2 py-0.5 bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 rounded-full">
                          {move.moveType}
                        </span>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                          {move.requestedTime}
                        </p>
                      </div>
                      <p className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
                        €{move.price}
                      </p>
                    </div>
                    <div className="space-y-2 mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        <span className="text-sm text-neutral-900 dark:text-neutral-100 truncate">
                          {move.pickup}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-red-500" />
                        <span className="text-sm text-neutral-900 dark:text-neutral-100 truncate">
                          {move.dropoff}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
                      <span>{move.distance}</span>
                      <span>{move.estimatedTime}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* List View */
          <div className="h-full overflow-y-auto p-4 pb-24 lg:pb-4 space-y-3">
            {AVAILABLE_MOVES.map((move) => (
              <div
                key={move.id}
                className="bg-white dark:bg-neutral-800 rounded-2xl p-4 shadow-sm"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium px-2 py-0.5 bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 rounded-full">
                        {move.moveType}
                      </span>
                      <span className="text-xs text-neutral-500 dark:text-neutral-400">
                        {move.clientName}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                      <ClockIcon className="w-3.5 h-3.5" />
                      <span>{move.requestedTime}</span>
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                    €{move.price}
                  </p>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5" />
                    <div>
                      <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                        {move.pickup}
                      </p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        {move.pickupAddress}
                      </p>
                    </div>
                  </div>
                  <div className="w-px h-3 bg-neutral-300 dark:bg-neutral-600 ml-1" />
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5" />
                    <div>
                      <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                        {move.dropoff}
                      </p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        {move.dropoffAddress}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1 mb-4">
                  {move.items.map((item, index) => (
                    <span
                      key={index}
                      className="text-xs px-2 py-1 bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 rounded-full"
                    >
                      {item}
                    </span>
                  ))}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-sm text-neutral-500 dark:text-neutral-400">
                    <span className="flex items-center gap-1">
                      <MapPinIcon className="w-4 h-4" />
                      {move.distance}
                    </span>
                    <span className="flex items-center gap-1">
                      <ClockIcon className="w-4 h-4" />
                      {move.estimatedTime}
                    </span>
                  </div>
                  <button
                    onClick={() => handleAcceptMove(move)}
                    className="px-4 py-2 bg-primary-600 text-white rounded-full text-sm font-medium hover:bg-primary-700 transition-colors"
                  >
                    Accept
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Selected Move Detail Modal */}
      {selectedMove && viewMode === 'map' && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-neutral-800 rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-4">
              <div>
                <span className="text-sm font-medium px-3 py-1 bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 rounded-full">
                  {selectedMove.moveType}
                </span>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2">
                  Requested by {selectedMove.clientName}
                </p>
              </div>
              <button
                onClick={() => setSelectedMove(null)}
                className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-full"
              >
                ✕
              </button>
            </div>

            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400">
                <ClockIcon className="w-5 h-5" />
                <span>{selectedMove.requestedTime}</span>
              </div>
              <p className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">
                €{selectedMove.price}
              </p>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex items-start gap-3">
                <div className="w-3 h-3 rounded-full bg-green-500 mt-1" />
                <div>
                  <p className="font-semibold text-neutral-900 dark:text-neutral-100">
                    {selectedMove.pickup}
                  </p>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    {selectedMove.pickupAddress}
                  </p>
                </div>
              </div>
              <div className="w-px h-6 bg-neutral-300 dark:bg-neutral-600 ml-1.5" />
              <div className="flex items-start gap-3">
                <div className="w-3 h-3 rounded-full bg-red-500 mt-1" />
                <div>
                  <p className="font-semibold text-neutral-900 dark:text-neutral-100">
                    {selectedMove.dropoff}
                  </p>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    {selectedMove.dropoffAddress}
                  </p>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <h4 className="text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-2">
                Items to Move
              </h4>
              <div className="flex flex-wrap gap-2">
                {selectedMove.items.map((item, index) => (
                  <span
                    key={index}
                    className="text-sm px-3 py-1 bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 rounded-full"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-4 mb-6 text-neutral-500 dark:text-neutral-400">
              <div className="flex items-center gap-2">
                <TruckIcon className="w-5 h-5" />
                <span>{selectedMove.distance}</span>
              </div>
              <div className="flex items-center gap-2">
                <ClockIcon className="w-5 h-5" />
                <span>{selectedMove.estimatedTime}</span>
              </div>
            </div>

            <ButtonPrimary
              onClick={() => handleAcceptMove(selectedMove)}
              className="w-full"
            >
              Accept This Move
            </ButtonPrimary>
          </div>
        </div>
      )}
    </div>
  )
}

export default AvailableMovesPage
