'use client'

import { useAuth } from '@/context/auth'
import { useLocationBroadcast } from '@/hooks/useLocationBroadcast'
import MoveRequestPopup from '@/components/MoveRequestPopup'
import Logo from '@/shared/Logo'
import {
  Bars3Icon,
  CalendarDaysIcon,
  Cog6ToothIcon,
  HomeIcon,
  MapIcon,
  UserGroupIcon,
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
  BellIcon,
  TruckIcon,
} from '@heroicons/react/24/outline'
import clsx from 'clsx'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { ReactNode, useState } from 'react'

const MOVER_NAV_ITEMS = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: HomeIcon,
  },
  {
    name: 'Available Moves',
    href: '/available-moves',
    icon: MapIcon,
  },
  {
    name: 'My Crew',
    href: '/my-crew',
    icon: UserGroupIcon,
  },
  {
    name: 'Earnings',
    href: '/earnings',
    icon: CalendarDaysIcon,
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: Cog6ToothIcon,
  },
]

const MOBILE_NAV_ITEMS = [
  {
    name: 'Home',
    href: '/dashboard',
    icon: HomeIcon,
  },
  {
    name: 'Moves',
    href: '/available-moves',
    icon: MapIcon,
  },
  {
    name: 'Crew',
    href: '/my-crew',
    icon: UserGroupIcon,
  },
  {
    name: 'Earnings',
    href: '/earnings',
    icon: CalendarDaysIcon,
  },
  {
    name: 'Profile',
    href: '/settings',
    icon: UserCircleIcon,
  },
]

interface Props {
  children: ReactNode
}

const MoverDashboardLayout = ({ children }: Props) => {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout, isLoading } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Broadcast mover's GPS location while they're logged in
  useLocationBroadcast({
    enabled: !!user && user.userType === 'mover',
  })

  const handleLogout = () => {
    logout()
    router.push('/')
  }

  // While auth is still loading, show a full-screen spinner
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50 dark:bg-neutral-900">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
      </div>
    )
  }

  // Profile gate: if the user is on the mover side but has no mover profile yet,
  // redirect them to /complete-profile (unless they are already there).
  const hasCompletedProfile = !!user?.moverDetails?.profileId
  const isOnCompleteProfilePage = pathname === '/complete-profile'

  if (!hasCompletedProfile && !isOnCompleteProfilePage) {
    router.replace('/complete-profile')
    return null
  }

  // If profile IS completed but user is manually visiting /complete-profile, let them through
  // (they might want to view their submitted info)

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
      {/* Real-time Move Request Popup */}
      <MoveRequestPopup moverProfileId={user?.moverDetails?.profileId || null} />

      {/* Desktop Sidebar */}
      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 border-r border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-800 lg:block">
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center gap-2 border-b border-neutral-200 px-6 dark:border-neutral-700">
            <Logo className="w-24" />
            <span className="rounded-full bg-primary-100 px-2 py-0.5 text-xs font-medium text-primary-700 dark:bg-primary-900/30 dark:text-primary-400">
              Mover
            </span>
          </div>

          {/* User Info */}
          <div className="border-b border-neutral-200 px-4 py-4 dark:border-neutral-700">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
                {user?.profilePhoto ? (
                  <img
                    src={user.profilePhoto}
                    alt={user.fullName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <UserCircleIcon className="h-full w-full text-neutral-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium text-neutral-900 dark:text-white">
                  {user?.fullName || 'Mover Name'}
                </p>
                <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">
                  {user?.email || 'mover@example.com'}
                </p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
            {MOVER_NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={clsx(
                    'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
                      : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-700'
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Link>
              )
            })}
          </nav>

          {/* Logout */}
          <div className="border-t border-neutral-200 p-4 dark:border-neutral-700">
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-700"
            >
              <ArrowRightOnRectangleIcon className="h-5 w-5" />
              Sign out
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="fixed left-0 right-0 top-0 z-30 flex h-16 items-center justify-between border-b border-neutral-200 bg-white px-4 dark:border-neutral-700 dark:bg-neutral-800 lg:hidden">
        <div className="flex items-center gap-2">
          <Logo className="w-20" />
          <span className="rounded-full bg-primary-100 px-2 py-0.5 text-xs font-medium text-primary-700 dark:bg-primary-900/30 dark:text-primary-400">
            Mover
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button className="rounded-full p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700">
            <BellIcon className="h-6 w-6 text-neutral-600 dark:text-neutral-300" />
          </button>
          <div className="h-8 w-8 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
            {user?.profilePhoto ? (
              <img
                src={user.profilePhoto}
                alt={user.fullName}
                className="h-full w-full object-cover"
              />
            ) : (
              <UserCircleIcon className="h-full w-full text-neutral-400" />
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-16 pb-20 lg:ml-64 lg:pt-0 lg:pb-0">
        <div className="min-h-screen">{children}</div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 flex items-center justify-around border-t border-neutral-200 bg-white py-2 dark:border-neutral-700 dark:bg-neutral-800 lg:hidden">
        {MOBILE_NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.name}
              href={item.href}
              className={clsx(
                'flex flex-col items-center gap-1 px-3 py-1',
                isActive
                  ? 'text-primary-600 dark:text-primary-400'
                  : 'text-neutral-500 dark:text-neutral-400'
              )}
            >
              <item.icon className="h-6 w-6" />
              <span className="text-xs font-medium">{item.name}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}

export default MoverDashboardLayout
