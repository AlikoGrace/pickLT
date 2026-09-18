'use client'

import { useAuth } from '@/context/auth'
import Avatar from '@/shared/Avatar'
import { useLocationBroadcast } from '@/hooks/useLocationBroadcast'
import Logo from '@/shared/Logo'
import SwitchDarkMode from '@/shared/SwitchDarkMode'
import LanguageDropdown from '@/components/Header/LanguageDropdown'
import VehicleConfirmModal from '@/components/mover/VehicleConfirmModal'
import VehicleStatusBanner from '@/components/mover/VehicleStatusBanner'
import type { VehicleDoc } from '@/lib/types'
import { fetchVehicleOverview } from '@/lib/vehicle-client'
import { vehicleServiceReady, vehicleServiceState } from '@/lib/vehicle-service'
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
  BanknotesIcon,
  DocumentTextIcon,
  LockClosedIcon,
  ShieldExclamationIcon,
  ClockIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'
import clsx from 'clsx'
import type { TFunction } from 'i18next'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { ReactNode, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

interface NavItem {
  key: string
  name: string
  href: string
  icon: typeof HomeIcon
  /** Locked until driver KYC is verified. */
  requiresVerification: boolean
  /** Locked until `vehicleServiceReady` — new work only (master D4). */
  requiresServiceReady?: boolean
}

// Built per render from `t` — a module-scope array would freeze at the boot language.
const getMoverNavItems = (t: TFunction): NavItem[] => [
  {
    key: 'dashboard',
    name: t('web:moverNav.dashboard.label'),
    href: '/dashboard',
    icon: HomeIcon,
    requiresVerification: false,
  },
  {
    key: 'activeMove',
    name: t('web:moverNav.activeMove.label'),
    href: '/active-move',
    icon: TruckIcon,
    requiresVerification: true,
  },
  {
    key: 'availableMoves',
    name: t('web:moverNav.availableMoves.label'),
    href: '/available-moves',
    icon: MapIcon,
    requiresVerification: true,
    requiresServiceReady: true,
  },
  {
    key: 'scheduledMoves',
    name: t('web:moverNav.scheduledMoves.label'),
    href: '/scheduled-moves',
    icon: CalendarDaysIcon,
    requiresVerification: true,
  },
  {
    key: 'myCrew',
    name: t('web:moverNav.myCrew.label'),
    href: '/my-crew',
    icon: UserGroupIcon,
    requiresVerification: true,
  },
  {
    key: 'earnings',
    name: t('web:moverNav.earnings.label'),
    href: '/earnings',
    icon: BanknotesIcon,
    requiresVerification: true,
  },
  {
    key: 'taxDocuments',
    name: t('web:moverNav.taxDocuments.label'),
    href: '/tax-documents',
    icon: DocumentTextIcon,
    requiresVerification: true,
  },
  {
    key: 'vehicle',
    name: t('web:moverNav.vehicle.label'),
    href: '/vehicle',
    icon: TruckIcon,
    requiresVerification: false,
  },
  {
    key: 'settings',
    name: t('common:nav.settings.label'),
    href: '/settings',
    icon: Cog6ToothIcon,
    requiresVerification: false,
  },
]

const getMobileNavItems = (t: TFunction): NavItem[] => [
  {
    key: 'home',
    name: t('web:moverNav.home.label'),
    href: '/dashboard',
    icon: HomeIcon,
    requiresVerification: false,
  },
  {
    key: 'active',
    name: t('web:moverNav.active.label'),
    href: '/active-move',
    icon: TruckIcon,
    requiresVerification: true,
  },
  {
    key: 'moves',
    name: t('web:moverNav.moves.label'),
    href: '/available-moves',
    icon: MapIcon,
    requiresVerification: true,
    requiresServiceReady: true,
  },
  {
    key: 'crew',
    name: t('web:moverNav.crew.label'),
    href: '/my-crew',
    icon: UserGroupIcon,
    requiresVerification: true,
  },
  {
    key: 'earnings',
    name: t('web:moverNav.earnings.label'),
    href: '/earnings',
    icon: BanknotesIcon,
    requiresVerification: true,
  },
]

interface Props {
  children: ReactNode
}

const PROFILE_REFRESH_INTERVAL_MS = 60_000
const PROFILE_REFRESH_MIN_GAP_MS = 10_000

// Full-screen map pages — hide mobile header to maximise visible map area
const MAP_PAGES = ['/available-moves', '/active-move']

const MoverDashboardLayout = ({ children }: Props) => {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout, isLoading, refreshProfile } = useAuth()
  const { t } = useTranslation()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const moverNavItems = getMoverNavItems(t)
  const mobileNavItems = getMobileNavItems(t)

  // Verification state
  const verificationStatus = user?.moverDetails?.verificationStatus
  const isVerified = verificationStatus === 'verified'

  // ── Vehicle service state (master §5) ──────────────────────────────
  // The clock ticks once a minute so a rental driver's confirmation lapses at
  // midnight (platform zone) without a reload.
  const [nowMs, setNowMs] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 60_000)
    return () => clearInterval(id)
  }, [])
  // The vehicle columns reach the UI only through the auth profile, and the
  // writers are elsewhere: an admin approves or rejects, a completion sets the
  // post-move flag (D12). Re-read the profile when the tab comes back and once
  // a minute while it is visible, never more than once per 10 s.
  const refreshProfileRef = useRef(refreshProfile)
  refreshProfileRef.current = refreshProfile
  const hasMoverProfile = !!user?.moverDetails?.profileId
  useEffect(() => {
    if (!hasMoverProfile) return
    let lastAt = Date.now()
    const refresh = () => {
      if (document.visibilityState !== 'visible') return
      const now = Date.now()
      if (now - lastAt < PROFILE_REFRESH_MIN_GAP_MS) return
      lastAt = now
      void refreshProfileRef.current({ background: true })
    }
    document.addEventListener('visibilitychange', refresh)
    const id = setInterval(refresh, PROFILE_REFRESH_INTERVAL_MS)
    return () => {
      document.removeEventListener('visibilitychange', refresh)
      clearInterval(id)
    }
  }, [hasMoverProfile])
  const moverDetails = user?.moverDetails
  // The current `vehicles` row is only needed to tell a first rental review
  // from a CHANGE review, and for the rejection reason / plate in the prompts.
  const [currentVehicle, setCurrentVehicle] = useState<VehicleDoc | null>(null)
  const profileId = moverDetails?.profileId
  const currentVehicleId = moverDetails?.currentVehicleId ?? null
  const vehicleStatus = moverDetails?.vehicleStatus ?? 'none'
  useEffect(() => {
    if (!profileId || !currentVehicleId) {
      setCurrentVehicle(null)
      return
    }
    let cancelled = false
    fetchVehicleOverview()
      .then((d) => {
        if (!cancelled) setCurrentVehicle(d.vehicle)
      })
      .catch(() => {
        /* the banner degrades to the profile-only state */
      })
    return () => {
      cancelled = true
    }
  }, [profileId, currentVehicleId, vehicleStatus])
  const vehicleState = vehicleServiceState(moverDetails, currentVehicle, nowMs)
  const isServiceReady = vehicleServiceReady(moverDetails, nowMs)

  // Hide the mobile header and its offset on full-screen map pages
  const isMapPage = MAP_PAGES.some((p) => pathname === p || pathname.startsWith(p + '/'))

  // Broadcast mover's GPS location only when verified
  useLocationBroadcast({
    enabled: !!user && user.userType === 'mover' && isVerified,
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

  // Redirect unauthenticated users to mover login
  if (!user) {
    router.replace(`/login?type=mover&redirect=${encodeURIComponent(pathname)}`)
    return null
  }

  // Block client accounts from accessing the mover dashboard
  if (user.userType === 'client') {
    router.replace(`/login?type=mover&redirect=${encodeURIComponent(pathname)}`)
    return null
  }

  // Profile gate: if the user is on the mover side but has no mover profile yet,
  // redirect them to /complete-profile (unless they are already there).
  const hasCompletedProfile = !!user?.moverDetails?.profileId
  const isOnCompleteProfilePage = pathname === '/complete-profile'

  if (!hasCompletedProfile && !isOnCompleteProfilePage) {
    router.replace('/complete-profile')
    return null
  }

  // Redirect unverified movers away from restricted pages
  const restrictedPaths = ['/active-move', '/available-moves', '/scheduled-moves', '/my-crew', '/earnings']
  const isOnRestrictedPage = restrictedPaths.some(
    (p) => pathname === p || pathname.startsWith(p + '/')
  )
  // Also block job-details for unverified movers
  const isOnJobDetailsPage = pathname.startsWith('/job-details/')

  if (hasCompletedProfile && !isVerified && !isOnCompleteProfilePage && (isOnRestrictedPage || isOnJobDetailsPage)) {
    router.replace('/dashboard')
    return null
  }

  // New work needs a service-ready vehicle too (master D4). A mover mid-move
  // keeps `/active-move`; the browse page is what hands out new moves.
  const isOnVehiclePages = pathname === '/vehicle' || pathname.startsWith('/vehicle/')
  const serviceReadyPaths = ['/available-moves']
  const isOnServiceReadyPage = serviceReadyPaths.some((p) => pathname === p || pathname.startsWith(p + '/'))
  if (hasCompletedProfile && isVerified && !isServiceReady && isOnServiceReadyPage) {
    router.replace('/dashboard')
    return null
  }

  // The rental driver's daily / post-move SAME-CHANGE prompt. From server
  // state, so it survives a reload; hidden on the vehicle pages (where the
  // driver may be mid-CHANGE) and on the active-move screen (a move in
  // progress must be finished first — the prompt shows when it ends).
  const showConfirmModal =
    hasCompletedProfile &&
    isVerified &&
    vehicleState === 'RENTAL_DAILY_CONFIRMATION_REQUIRED' &&
    !isOnCompleteProfilePage &&
    !isOnVehiclePages &&
    !pathname.startsWith('/active-move')

    // Compute initials from user's full name
  const initials = user?.fullName
    ? user.fullName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?'

  // If profile IS completed but user is manually visiting /complete-profile, let them through
  // (they might want to view their submitted info)

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
      {/* Desktop Sidebar */}
      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 border-r border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-800 lg:block">
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center gap-2 border-b border-neutral-200 px-6 dark:border-neutral-700">
            <Logo className="w-24" />
            <span className="rounded-full bg-primary-100 px-2 py-0.5 text-xs font-medium text-primary-700 dark:bg-primary-900/30 dark:text-primary-400">
              {t('web:mover.roleLabel')}
            </span>
          </div>

          {/* User Info */}
          <div className="border-b border-neutral-200 px-4 py-4 dark:border-neutral-700">
            <div className="flex items-center gap-3">
              <Avatar
                src={user?.profilePhoto || undefined}
                initials={!user?.profilePhoto ? initials : undefined}
                className="size-10 bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300"
              />
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium text-neutral-900 dark:text-white">
                  {user?.fullName || t('common:mover.nameFallback.label')}
                </p>
                <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">
                  {user?.email || 'mover@example.com'}
                </p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
            {moverNavItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
              const isLocked =
                hasCompletedProfile &&
                ((item.requiresVerification && !isVerified) || (item.requiresServiceReady && !isServiceReady))

              if (isLocked) {
                return (
                  <div
                    key={item.key}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-neutral-400 dark:text-neutral-500 cursor-not-allowed"
                  >
                    <item.icon className="h-5 w-5" />
                    {item.name}
                    <LockClosedIcon className="ml-auto h-4 w-4" />
                  </div>
                )
              }

              return (
                <Link
                  key={item.key}
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

          {/* Language + logout */}
          <div className="border-t border-neutral-200 p-4 dark:border-neutral-700">
            <div className="mb-1 px-3 py-1">
              <LanguageDropdown panelAnchor={{ to: 'top start', gap: 12 }} panelClassName="w-56" />
            </div>
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-700"
            >
              <ArrowRightOnRectangleIcon className="h-5 w-5" />
              {t('common:action.logout.cta')}
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Header — hidden on full-screen map pages */}
      <header className={clsx(
        'fixed left-0 right-0 top-0 z-30 flex h-16 items-center justify-between border-b border-neutral-200 bg-white px-4 dark:border-neutral-700 dark:bg-neutral-800',
        isMapPage ? 'hidden' : 'lg:hidden',
      )}>
        <div className="flex items-center gap-2">
          <Logo className="w-20" />
          <span className="rounded-full bg-primary-100 px-2 py-0.5 text-xs font-medium text-primary-700 dark:bg-primary-900/30 dark:text-primary-400">
            {t('web:mover.roleLabel')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <LanguageDropdown panelClassName="w-56" />
          <SwitchDarkMode className="!h-9 !w-9 !text-xl" />
          <button className="rounded-full p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700">
            <BellIcon className="h-6 w-6 text-neutral-600 dark:text-neutral-300" />
          </button>
          <div className="h-8 w-8 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
            <Link href="/settings">
            {user?.profilePhoto ? (
              <img
                src={user.profilePhoto}
                alt={user.fullName}
                className="h-full w-full object-cover"
              />
            ) : (
              <Avatar
                src={user?.profilePhoto || undefined}
                initials={!user?.profilePhoto ? initials : undefined}
                className="size-8 bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300"
              />            
              )}
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className={clsx(
        'lg:ml-64 lg:pt-0 lg:pb-0',
        !isMapPage && 'pt-16 pb-20',
      )}>
        {/* Verification Status Banner */}
        {hasCompletedProfile && !isVerified && !isOnCompleteProfilePage && (
          <div className={clsx(
            'border-b px-4 py-3',
            verificationStatus === 'rejected'
              ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950'
              : verificationStatus === 'suspended'
                ? 'border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950'
                : 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950'
          )}>
            <div className="mx-auto flex max-w-3xl items-start gap-3">
              {verificationStatus === 'rejected' ? (
                <XCircleIcon className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500" />
              ) : verificationStatus === 'suspended' ? (
                <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 flex-shrink-0 text-orange-500" />
              ) : (
                <ClockIcon className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-500" />
              )}
              <div>
                <p className={clsx(
                  'text-sm font-semibold',
                  verificationStatus === 'rejected'
                    ? 'text-red-800 dark:text-red-200'
                    : verificationStatus === 'suspended'
                      ? 'text-orange-800 dark:text-orange-200'
                      : 'text-amber-800 dark:text-amber-200'
                )}>
                  {verificationStatus === 'rejected'
                    ? t('web:mover.verification.rejected.title')
                    : verificationStatus === 'suspended'
                      ? t('web:mover.verification.suspended.title')
                      : t('web:mover.verification.pending.title')}
                </p>
                <p className={clsx(
                  'text-sm',
                  verificationStatus === 'rejected'
                    ? 'text-red-700 dark:text-red-300'
                    : verificationStatus === 'suspended'
                      ? 'text-orange-700 dark:text-orange-300'
                      : 'text-amber-700 dark:text-amber-300'
                )}>
                  {verificationStatus === 'rejected'
                    ? t('web:mover.verification.rejected.body')
                    : verificationStatus === 'suspended'
                      ? t('web:mover.verification.suspended.body')
                      : t('web:mover.verification.pending.body')}
                </p>
              </div>
            </div>
          </div>
        )}
        {/* Vehicle state banner — every non-ready state names the restoring action */}
        {hasCompletedProfile && !isOnCompleteProfilePage && !isOnVehiclePages && !showConfirmModal && (
          <VehicleStatusBanner state={vehicleState} rejectionReason={currentVehicle?.rejectionReason ?? null} />
        )}
        <div className="min-h-screen">{children}</div>
      </main>

      <VehicleConfirmModal
        open={showConfirmModal}
        postMove={moverDetails?.vehicleReconfirmRequired === true}
        vehicleLabel={currentVehicle ? [currentVehicle.brand, currentVehicle.model].filter(Boolean).join(' ') : null}
        plate={currentVehicle?.registrationNumber ?? null}
        onConfirmed={() => refreshProfile()}
      />

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 flex items-center justify-around border-t border-neutral-200 bg-white py-2 dark:border-neutral-700 dark:bg-neutral-800 lg:hidden">
        {mobileNavItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          const isLocked =
            hasCompletedProfile &&
            ((item.requiresVerification && !isVerified) || (item.requiresServiceReady && !isServiceReady))

          if (isLocked) {
            return (
              <div
                key={item.key}
                className="flex flex-col items-center gap-1 px-3 py-1 text-neutral-300 dark:text-neutral-600 cursor-not-allowed"
              >
                <item.icon className="h-6 w-6" />
                <span className="text-xs font-medium">{item.name}</span>
              </div>
            )
          }

          return (
            <Link
              key={item.key}
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
