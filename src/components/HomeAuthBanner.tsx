'use client'

import { useAuth } from '@/context/auth'
import Avatar from '@/shared/Avatar'
import Link from 'next/link'

const HomeAuthBanner = () => {
  const { user, isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="mb-4 h-14 animate-pulse rounded-2xl bg-neutral-100 dark:bg-neutral-800 lg:hidden" />
    )
  }

  // Authenticated: show welcome banner on all screen sizes
  if (isAuthenticated && user) {
    const isMover = user.userType === 'mover'
    const initials = user.fullName
      ? user.fullName
          .split(' ')
          .map((n) => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2)
      : '?'

    return (
      <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl bg-primary-50 px-4 py-3 dark:bg-primary-900/20">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar
            src={user.profilePhoto || undefined}
            initials={!user.profilePhoto ? initials : undefined}
            className="size-9 shrink-0 bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300"
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">
              Welcome back, {user.fullName?.split(' ')[0] || 'there'}!
            </p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {isMover ? 'Mover account' : 'Client account'}
            </p>
          </div>
        </div>
        <Link
          href={isMover ? '/dashboard' : '/account-savelists'}
          className="shrink-0 rounded-full bg-primary-600 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-primary-700"
        >
          {isMover ? 'Dashboard' : 'My Moves'}
        </Link>
      </div>
    )
  }

  // Not authenticated: show mover sign-in banner (mobile only)
  return (
    <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl bg-orange-50 px-4 py-3 dark:bg-orange-900/20 lg:hidden">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-orange-800 dark:text-orange-200">
          Are you a mover?
        </p>
        <p className="text-xs text-orange-600 dark:text-orange-400">
          Sign in to start accepting moves
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Link
          href="/login?type=mover"
          className="rounded-full bg-orange-600 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-orange-700"
        >
          Sign in
        </Link>
        <Link
          href="/signup?type=mover"
          className="rounded-full border border-orange-300 px-4 py-1.5 text-xs font-semibold text-orange-700 transition hover:bg-orange-100 dark:border-orange-700 dark:text-orange-300 dark:hover:bg-orange-900/30"
        >
          Sign up
        </Link>
      </div>
    </div>
  )
}

export default HomeAuthBanner
