'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  CalendarDaysIcon,
  MapPinIcon,
  ClockIcon,
  TruckIcon,
  CubeIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline'
import { Badge } from '@/shared/Badge'
import Link from 'next/link'
import { client } from '@/lib/appwrite'
import { formatDateWith, formatMoney } from '@/lib/format'
import { useTranslation } from 'react-i18next'

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || ''
const MOVES_COLLECTION = process.env.NEXT_PUBLIC_COLLECTION_MOVES || ''

interface ScheduledMove {
  id: string
  handle: string
  moveType: string | null
  status: string
  pickupLocation: string | null
  dropoffLocation: string | null
  totalItemCount: number
  estimatedPrice: number | null
  vehicleType: string | null
  moveDate: string | null
  arrivalWindow: string | null
  routeDistanceMeters: number | null
  createdAt: string
}

const ScheduledMovesPage = () => {
  const { t } = useTranslation()

  // Defined inside the component so the fallback copy re-resolves on a
  // language change instead of freezing at module-import time.
  const formatLabel = (value: string | null | undefined): string => {
    if (!value) return t('common:value.notSpecified.empty')
    return value
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return t('common:value.notSelected.empty')
    try {
      return formatDateWith(dateStr, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return dateStr
    }
  }

  const [moves, setMoves] = useState<ScheduledMove[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMoves = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const res = await fetch('/api/mover/scheduled-moves')
      if (!res.ok) {
        setError(t('errors:moves.scheduledLoadFailed'))
        return
      }
      const data = await res.json()
      setMoves(
        (data.moves ?? []).map((doc: any) => ({
          id: doc.$id,
          handle: doc.handle ?? '',
          moveType: doc.moveType ?? doc.systemMoveType ?? null,
          status: doc.status ?? '',
          pickupLocation: doc.pickupLocation ?? null,
          dropoffLocation: doc.dropoffLocation ?? null,
          totalItemCount: doc.totalItemCount ?? 0,
          estimatedPrice: doc.estimatedPrice ?? null,
          vehicleType: doc.vehicleType ?? null,
          moveDate: doc.moveDate ?? null,
          arrivalWindow: doc.arrivalWindow ?? null,
          routeDistanceMeters: doc.routeDistanceMeters ?? null,
          createdAt: doc.$createdAt ?? '',
        })),
      )
    } catch {
      setError(t('errors:moves.scheduledLoadFailed'))
    } finally {
      setIsLoading(false)
    }
  }, [t])

  useEffect(() => {
    fetchMoves()
  }, [fetchMoves])

  // Appwrite realtime — re-fetch on any changes to moves collection
  useEffect(() => {
    if (!DATABASE_ID || !MOVES_COLLECTION) return
    const channel = `databases.${DATABASE_ID}.collections.${MOVES_COLLECTION}.documents`
    const unsubscribe = client.subscribe(channel, () => {
      fetchMoves()
    })
    return () => unsubscribe()
  }, [fetchMoves])

  return (
    <div className="p-4 lg:p-6 pb-24 lg:pb-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
            {t('web:moverNav.scheduledMoves.label')}
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 text-sm mt-1">
            {t('web:mover.scheduledMoves.subtitle')}
          </p>
        </div>
        <button
          onClick={fetchMoves}
          disabled={isLoading}
          className="p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
          title={t('common:action.refresh.a11y')}
        >
          <ArrowPathIcon className={`w-5 h-5 text-neutral-600 dark:text-neutral-300 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Loading */}
      {isLoading && moves.length === 0 && (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse rounded-2xl bg-neutral-100 dark:bg-neutral-800 h-32" />
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 rounded-2xl p-4 border border-red-200 dark:border-red-800 mb-4">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Empty */}
      {!isLoading && !error && moves.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <CalendarDaysIcon className="w-16 h-16 text-neutral-300 dark:text-neutral-600 mb-4" />
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
            {t('web:mover.scheduledMoves.empty.title')}
          </h2>
          <p className="text-neutral-500 dark:text-neutral-400 mb-6 max-w-sm">
            {t('web:mover.scheduledMoves.empty.subtitle')}
          </p>
          <Link
            href="/available-moves"
            className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 font-medium"
          >
            {t('web:mover.browseAvailable.cta')}
          </Link>
        </div>
      )}

      {/* Move Cards */}
      {moves.length > 0 && (
        <div className="space-y-4">
          {moves.map((move) => (
            <Link
              key={move.id}
              href={`/job-details/${move.handle}`}
              className="block bg-white dark:bg-neutral-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow border border-neutral-100 dark:border-neutral-700"
            >
              <div className="flex items-start justify-between mb-3">
                <Badge color="blue">{t('moves:status.assigned.label')}</Badge>
                <span className="text-sm text-neutral-500 dark:text-neutral-400">
                  #{move.handle}
                </span>
              </div>

              {/* Route */}
              <div className="flex items-center gap-2 mb-3">
                <MapPinIcon className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span className="text-sm text-neutral-900 dark:text-neutral-100 truncate">
                  {move.pickupLocation?.split(',')[0] || t('moves:card.route.pickupFallback.label')}
                </span>
                <span className="text-neutral-400 mx-1">&rarr;</span>
                <MapPinIcon className="w-4 h-4 text-red-500 flex-shrink-0" />
                <span className="text-sm text-neutral-900 dark:text-neutral-100 truncate">
                  {move.dropoffLocation?.split(',')[0] || t('moves:card.route.dropoffFallback.label')}
                </span>
              </div>

              {/* Details row */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-500 dark:text-neutral-400">
                {move.moveDate && (
                  <span className="flex items-center gap-1">
                    <CalendarDaysIcon className="w-3.5 h-3.5" />
                    {formatDate(move.moveDate)}
                  </span>
                )}
                {move.arrivalWindow && (
                  <span className="flex items-center gap-1">
                    <ClockIcon className="w-3.5 h-3.5" />
                    {formatLabel(move.arrivalWindow)}
                  </span>
                )}
                {move.vehicleType && (
                  <span className="flex items-center gap-1">
                    <TruckIcon className="w-3.5 h-3.5" />
                    {formatLabel(move.vehicleType)}
                  </span>
                )}
                {move.totalItemCount > 0 && (
                  <span className="flex items-center gap-1">
                    <CubeIcon className="w-3.5 h-3.5" />
                    {t('moves:itemCount', { count: move.totalItemCount })}
                  </span>
                )}
                {move.routeDistanceMeters && move.routeDistanceMeters > 0 && (
                  <span>{(move.routeDistanceMeters / 1000).toFixed(1)} km</span>
                )}
              </div>

              {/* Price */}
              {move.estimatedPrice != null && move.estimatedPrice > 0 && (
                <div className="mt-3 text-right">
                  <span className="font-bold text-lg text-neutral-900 dark:text-neutral-100">
                    {formatMoney(move.estimatedPrice)}
                  </span>
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

export default ScheduledMovesPage
