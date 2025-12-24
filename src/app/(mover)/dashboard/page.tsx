'use client'

import { useAuth } from '@/context/auth'
import { CalendarDaysIcon, CurrencyEuroIcon, TruckIcon, UsersIcon } from '@heroicons/react/24/outline'
import Image from 'next/image'
import Link from 'next/link'

const DashboardPage = () => {
  const { user, crewMembers } = useAuth()

  const stats = [
    {
      name: 'Available Moves',
      value: 12,
      icon: TruckIcon,
      href: '/available-moves',
      color: 'bg-blue-500',
    },
    {
      name: 'Completed This Month',
      value: 28,
      icon: CalendarDaysIcon,
      href: '#',
      color: 'bg-green-500',
    },
    {
      name: 'Crew Members',
      value: crewMembers?.length || 0,
      icon: UsersIcon,
      href: '/my-crew',
      color: 'bg-purple-500',
    },
    {
      name: 'Earnings This Month',
      value: '€2,450',
      icon: CurrencyEuroIcon,
      href: '/earnings',
      color: 'bg-yellow-500',
    },
  ]

  const recentMoves = [
    {
      id: 1,
      pickup: 'Berlin Mitte',
      dropoff: 'Berlin Kreuzberg',
      date: 'Today, 14:30',
      status: 'completed',
      amount: '€85',
    },
    {
      id: 2,
      pickup: 'Berlin Prenzlauer Berg',
      dropoff: 'Berlin Charlottenburg',
      date: 'Today, 10:00',
      status: 'completed',
      amount: '€120',
    },
    {
      id: 3,
      pickup: 'Berlin Wedding',
      dropoff: 'Berlin Tempelhof',
      date: 'Yesterday, 16:00',
      status: 'completed',
      amount: '€95',
    },
  ]

  return (
    <div className="p-4 lg:p-6 pb-24 lg:pb-6">
      {/* Welcome Header */}
      <div className="mb-6">
        <div className="flex items-center gap-4">
          <div className="relative w-16 h-16 rounded-full overflow-hidden bg-neutral-200 dark:bg-neutral-700">
            {user?.profilePhoto ? (
              <Image
                src={user.profilePhoto}
                alt={user.fullName}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl font-semibold text-neutral-500">
                {user?.fullName?.charAt(0) || 'M'}
              </div>
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
              Welcome back, {user?.fullName?.split(' ')[0] || 'Mover'}!
            </h1>
            <p className="text-neutral-500 dark:text-neutral-400">
              Here&apos;s what&apos;s happening today
            </p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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
          Quick Actions
        </h2>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/available-moves"
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-full text-sm font-medium hover:bg-primary-700 transition-colors"
          >
            <TruckIcon className="w-4 h-4" />
            Find Moves
          </Link>
          <Link
            href="/my-crew"
            className="flex items-center gap-2 px-4 py-2 bg-neutral-100 dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 rounded-full text-sm font-medium hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-colors"
          >
            <UsersIcon className="w-4 h-4" />
            Manage Crew
          </Link>
        </div>
      </div>

      {/* Recent Moves */}
      <div>
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
          Recent Moves
        </h2>
        <div className="space-y-3">
          {recentMoves.map((move) => (
            <div
              key={move.id}
              className="bg-white dark:bg-neutral-800 rounded-2xl p-4 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400 mb-1">
                    <span>{move.date}</span>
                    <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-full text-xs">
                      {move.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        <span className="text-sm text-neutral-900 dark:text-neutral-100">
                          {move.pickup}
                        </span>
                      </div>
                      <div className="w-px h-3 bg-neutral-300 dark:bg-neutral-600 ml-1" />
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-red-500" />
                        <span className="text-sm text-neutral-900 dark:text-neutral-100">
                          {move.dropoff}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                    {move.amount}
                  </p>
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
