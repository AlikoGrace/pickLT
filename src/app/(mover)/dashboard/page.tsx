'use client'

import { useAuth } from '@/context/auth'
import { CalendarDaysIcon, CurrencyEuroIcon, TruckIcon, UsersIcon, ClockIcon, MapPinIcon } from '@heroicons/react/24/outline'
import { Badge } from '@/shared/Badge'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Avatar from '@/shared/Avatar'
import { formatDateWith, formatMoney } from '@/lib/format'

interface DashboardData {
  activeMoves: string[]
  completedThisMonth: number
  earningsThisMonth: number
  crewCount: number
  pendingRequests: number
  activeMovesCount: number
  scheduledMovesCount: number
  recentMoves: RecentMoveFromApi[] // now returned by API
}

interface RecentMoveFromApi {
  $id: string
  pickupLabel: string
  pickupAddress: string
  dropoffLabel: string
  dropoffAddress: string
  scheduledDate: string
  status: string
  estimatedPrice: number
  moveCategory: string
  totalItems: number
  routeDistanceMeters: number | null
}

interface RecentMove {
  id: string
  pickup: string
  pickupAddress: string
  dropoff: string
  dropoffAddress: string
  date: string
  status: 'completed' | 'in_progress' | 'pending' | 'cancelled'
  amount: number
  moveTypeLabel: string
  itemCount: number
  distance: string
}

const DashboardPage = () => {
  const { user, crewMembers } = useAuth()
  const { t } = useTranslation()
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [availableMovesCount, setAvailableMovesCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const isVerified = user?.moverDetails?.verificationStatus === 'verified'

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const [dashRes, nearbyRes] = await Promise.all([
          fetch('/api/mover/dashboard'),
          fetch('/api/mover/nearby-moves'),
        ])
        if (dashRes.ok) {
          const data = await dashRes.json()
          setDashboard(data)
        }
        if (nearbyRes.ok) {
          const nearbyData = await nearbyRes.json()
          setAvailableMovesCount(nearbyData.total ?? 0)
        }
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchDashboard()
  }, [])

  const mapApiMoveStatus = (status: string): RecentMove['status'] => {
    if (status === 'completed') return 'completed'
    if (status === 'cancelled_by_client' || status === 'cancelled_by_mover') return 'cancelled'
    if (status === 'draft' || status === 'booked' || status === 'pending_payment') return 'pending'
    return 'in_progress'
  }

  // Compute initials from user's full name
  const initials = user?.fullName
    ? user.fullName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?'


  // "Instant Move" / "Scheduled Move" — built as one interpolated sentence so the
  // word order stays translatable. `moveCategory` is only ever 'instant' | 'scheduled'.
  const moveTypeLabelFor = (moveCategory: string): string => {
    if (moveCategory === 'instant') {
      return t('web:moverDashboard.recentMoves.moveType.label', {
        type: t('moves:moveCategory.instant.label'),
      })
    }
    if (moveCategory === 'scheduled') {
      return t('web:moverDashboard.recentMoves.moveType.label', {
        type: t('moves:moveCategory.scheduled.label'),
      })
    }
    return t('moves:card.title.generic.label')
  }

  const recentMoves: RecentMove[] = (dashboard?.recentMoves || []).map((m) => ({
    id: m.$id,
    pickup: m.pickupLabel || t('moves:card.route.pickupFallback.label'),
    pickupAddress: m.pickupAddress || '',
    dropoff: m.dropoffLabel || t('moves:card.route.dropoffFallback.label'),
    dropoffAddress: m.dropoffAddress || '',
    date: m.scheduledDate
      ? formatDateWith(m.scheduledDate, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
      : '',
    status: mapApiMoveStatus(m.status),
    amount: m.estimatedPrice || 0,
    moveTypeLabel: moveTypeLabelFor(m.moveCategory),
    itemCount: m.totalItems || 0,
    distance: m.routeDistanceMeters ? `${(m.routeDistanceMeters / 1000).toFixed(1)} km` : '—',
  }))
  const stats = [
    {
      name: t('web:moverDashboard.stat.availableMoves.label'),
      value: availableMovesCount,
      icon: TruckIcon,
      href: '/available-moves',
      color: 'bg-neutral-500',
    },
    {
      name: t('web:moverDashboard.stat.activeMoves.label'),
      value: dashboard?.activeMovesCount ?? 0,
      icon: ClockIcon,
      href: '/active-move',
      color: 'bg-blue-500',
    },
    {
      name: t('web:moverDashboard.stat.scheduledMoves.label'),
      value: dashboard?.scheduledMovesCount ?? 0,
      icon: CalendarDaysIcon,
      href: '/scheduled-moves',
      color: 'bg-indigo-500',
    },
    {
      name: t('web:moverDashboard.stat.completedThisMonth.label'),
      value: dashboard?.completedThisMonth ?? 0,
      icon: CalendarDaysIcon,
      href: '#',
      color: 'bg-neutral-500',
    },
    {
      name: t('web:moverDashboard.stat.crewMembers.label'),
      value: dashboard?.crewCount ?? crewMembers?.length ?? 0,
      icon: UsersIcon,
      href: '/my-crew',
      color: 'bg-neutral-500',
    },
    {
      name: t('web:moverDashboard.stat.earningsThisMonth.label'),
      value: formatMoney(dashboard?.earningsThisMonth ?? 0, { compact: true }),
      icon: CurrencyEuroIcon,
      href: '/earnings',
      color: 'bg-neutral-500',
    },
  ]

  const getStatusBadgeColor = (status: RecentMove['status']): 'green' | 'yellow' | 'red' | 'blue' => {
    switch (status) {
      case 'completed':
        return 'green'
      case 'in_progress':
        return 'blue'
      case 'pending':
        return 'yellow'
      case 'cancelled':
        return 'red'
      default:
        return 'yellow'
    }
  }

  const getStatusLabel = (status: RecentMove['status']): string => {
    switch (status) {
      case 'completed':
        return t('moves:status.completed.label')
      case 'in_progress':
        return t('moves:status.inProgress.label')
      case 'pending':
        return t('moves:status.pending.label')
      case 'cancelled':
        return t('moves:status.cancelled.label')
      default:
        return t('moves:status.unknown.label')
    }
  }

  return (
    <div className="p-4 lg:p-6 pb-24 lg:pb-6 max-w-3xl mx-auto">
      {/* Welcome Header */}
      <div className="mb-6">
        <div className="flex items-center gap-4">
          <Avatar
            src={user?.profilePhoto || undefined}
            initials={!user?.profilePhoto ? initials : undefined}
            className="size-20 bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300"
          />
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
              {t('web:moverDashboard.welcome.title', {
                name: user?.fullName?.split(' ')[0] || t('common:mover.unnamed.label'),
              })}
            </h1>
            <p className="text-neutral-500 dark:text-neutral-400">
              {t('web:moverDashboard.welcome.subtitle')}
            </p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {stats.map((stat) => (
          <Link
            key={stat.name}
            href={stat.href}
            className="bg-white dark:bg-neutral-800 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className={`w-10 h-10 ${stat.color} rounded-xl flex items-center justify-center mb-3`}>
              <stat.icon className="w-5 h-5 text-white" />
            </div>
            <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
              {stat.value}
            </p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              {stat.name}
            </p>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
          {t('web:moverDashboard.quickActions.title')}
        </h2>
        <div className="flex flex-wrap gap-3">
          {isVerified ? (
            <>
              <Link
                href="/available-moves"
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-full text-sm font-medium hover:bg-primary-700 transition-colors"
              >
                <TruckIcon className="w-4 h-4" />
                {t('web:moverDashboard.findMoves.cta')}
              </Link>
              <Link
                href="/my-crew"
                className="flex items-center gap-2 px-4 py-2 bg-neutral-100 dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 rounded-full text-sm font-medium hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-colors"
              >
                <UsersIcon className="w-4 h-4" />
                {t('web:moverDashboard.manageCrew.cta')}
              </Link>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 px-4 py-2 bg-neutral-200 dark:bg-neutral-700 text-neutral-400 dark:text-neutral-500 rounded-full text-sm font-medium cursor-not-allowed">
                <TruckIcon className="w-4 h-4" />
                {t('web:moverDashboard.findMoves.cta')}
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-neutral-200 dark:bg-neutral-700 text-neutral-400 dark:text-neutral-500 rounded-full text-sm font-medium cursor-not-allowed">
                <UsersIcon className="w-4 h-4" />
                {t('web:moverDashboard.manageCrew.cta')}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Recent Moves */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            {t('web:moverDashboard.recentMoves.title')}
          </h2>
          <Link 
            href="/earnings" 
            className="text-sm text-primary-600 hover:underline"
          >
            {t('common:action.viewAll.cta')}
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recentMoves.map((move) => (
            <div
              key={move.id}
              className="bg-white dark:bg-neutral-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
            >
              {/* Card Header with gradient */}
              <div className="relative h-20 bg-gradient-to-br from-green-50 to-green-100 dark:from-neutral-700 dark:to-neutral-800 flex items-center justify-center">
                <TruckIcon className="h-10 w-10 text-green-200 dark:text-neutral-600" />
                <Badge color={getStatusBadgeColor(move.status)} className="absolute top-2 left-2">
                  {getStatusLabel(move.status)}
                </Badge>
                <span className="absolute top-2 right-2 text-xs px-2 py-0.5 bg-white/80 dark:bg-neutral-800/80 rounded-full text-neutral-600 dark:text-neutral-400">
                  {move.moveTypeLabel}
                </span>
              </div>

              <div className="p-4">
                {/* Title row */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400 mb-1">
                      <ClockIcon className="w-3.5 h-3.5" />
                      <span>{move.date}</span>
                    </div>
                    <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                      {move.pickup} → {move.dropoff}
                    </h3>
                  </div>
                  <p className="text-xl font-bold text-green-600 dark:text-green-400 ml-2">
                    {formatMoney(move.amount, { compact: true })}
                  </p>
                </div>

                {/* Route visualization */}
                <div className="space-y-1 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                    <span className="text-sm text-neutral-600 dark:text-neutral-400 truncate">
                      {move.pickupAddress}
                    </span>
                  </div>
                  <div className="w-px h-2 bg-neutral-300 dark:bg-neutral-600 ml-1" />
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                    <span className="text-sm text-neutral-600 dark:text-neutral-400 truncate">
                      {move.dropoffAddress}
                    </span>
                  </div>
                </div>

                {/* Stats footer */}
                <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400 pt-2 border-t border-neutral-100 dark:border-neutral-700">
                  <span>{t('moves:itemCount', { count: move.itemCount })}</span>
                  <span className="flex items-center gap-1">
                    <MapPinIcon className="w-3.5 h-3.5" />
                    {move.distance}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default DashboardPage
