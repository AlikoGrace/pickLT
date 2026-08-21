'use client'

import {
  Bars3Icon,
  HeartIcon,
  MagnifyingGlassIcon,
  UserCircleIcon,
  HomeIcon,
  TruckIcon,
  UsersIcon,
  CurrencyEuroIcon,
  ClipboardDocumentListIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline'
import clsx from 'clsx'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { RefObject, useCallback, useEffect, useRef } from 'react'
import { useIntersection } from 'react-use'
import { useAside } from './aside'
import { useAuth } from '@/context/auth'
import { useTranslation } from 'react-i18next'

// § 7.6 — these were module-scope label arrays, which freeze at import and
// keep the boot language after a switch. They now carry a stable `id`; the
// caption is looked up during render, and `id` is what the code compares on.
const CLIENT_NAV = [
  { id: 'home', labelKey: 'web:nav.home.label', link: '/', icon: HomeIcon },
  { id: 'scheduled', labelKey: 'web:nav.scheduled.label', link: '/my-scheduled-moves', icon: CalendarDaysIcon },
  { id: 'myMoves', labelKey: 'web:nav.myMoves.label', link: '/account-savelists', icon: ClipboardDocumentListIcon },
  { id: 'account', labelKey: 'web:nav.account.label', link: '/account', icon: UserCircleIcon },
]

// Mover navigation items
const MOVER_NAV = [
  { id: 'dashboard', labelKey: 'web:nav.dashboard.label', link: '/dashboard', icon: HomeIcon },
  { id: 'moves', labelKey: 'web:nav.moves.label', link: '/available-moves', icon: TruckIcon },
  { id: 'myCrew', labelKey: 'web:nav.myCrew.label', link: '/my-crew', icon: UsersIcon },
  { id: 'earnings', labelKey: 'web:nav.earnings.label', link: '/earnings', icon: CurrencyEuroIcon },
  { id: 'menu', labelKey: 'common:nav.menu.label', link: undefined as string | undefined, icon: Bars3Icon },
]
const SCROLL_THRESHOLD = 80

// Routes where the bottom nav should be hidden (move booking flow)
const HIDDEN_PATHS = [
  '/move-choice',
  '/add-listing',
  '/instant-move',
  '/move-preview',
  '/checkout',
  '/pay-done',
]

const FooterQuickNavigation = () => {
  const { t } = useTranslation()
  const containerRef = useRef<HTMLDivElement>(null)
  const rafId = useRef<number | null>(null)
  const lastScrollY = useRef<number>(0)
  const pathname = usePathname()
  const { open: openAside } = useAside()
  const { user } = useAuth()
  const intersection = useIntersection(containerRef as RefObject<HTMLDivElement>, {
    root: null,
    rootMargin: '0px',
    threshold: 1,
  })
  const isInViewport = intersection && intersection.intersectionRatio >= 1

  // Determine which nav items to show based on user type
  const navItems = (user?.userType === 'mover' ? MOVER_NAV : CLIENT_NAV).map((item) => ({
    ...item,
    // i18n-keys: web.nav.home.label, web.nav.scheduled.label, web.nav.myMoves.label,
    // web.nav.account.label, web.nav.dashboard.label, web.nav.moves.label,
    // web.nav.myCrew.label, web.nav.earnings.label, common.nav.menu.label
    name: t(item.labelKey),
  }))

  // Hide navigation on move booking flow pages
  const isBookingFlow = HIDDEN_PATHS.some((path) => pathname.startsWith(path))

  useEffect(() => {
    // update the lastScrollY position when the showNav is shown/hidden
    lastScrollY.current = window.pageYOffset
  }, [isInViewport])

  const showHideHeaderMenu = useCallback(() => {
    if (!containerRef?.current) {
      return
    }
    const currentScrollPos = window.pageYOffset

    // SHOW _ HIDE NAV MENU
    if (currentScrollPos > lastScrollY.current) {
      if (isInViewport && currentScrollPos - lastScrollY.current < SCROLL_THRESHOLD) {
        return
      }
      containerRef.current.classList.add('translate-y-[calc(100%+1.5rem)]')
    } else {
      if (!isInViewport && lastScrollY.current - currentScrollPos < SCROLL_THRESHOLD) {
        return
      }
      containerRef.current.classList.remove('translate-y-[calc(100%+1.5rem)]')
    }
    lastScrollY.current = currentScrollPos
  }, [isInViewport])

  const handleEventScroll = useCallback(() => {
    rafId.current = window.requestAnimationFrame(showHideHeaderMenu)
  }, [showHideHeaderMenu])

  useEffect(() => {
    window.addEventListener('scroll', handleEventScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', handleEventScroll)
      // Cleanup requestAnimationFrame if pending
      if (rafId.current) {
        window.cancelAnimationFrame(rafId.current)
      }
    }
  }, [handleEventScroll])

  //

  if (isBookingFlow) return null

  return (
    <div
      ref={containerRef}
      className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-6 bg-white/90 px-2.5 py-4 shadow ring-1 shadow-slate-200/80 ring-slate-900/5 backdrop-blur-sm transition-transform lg:hidden dark:bg-neutral-950/90"
    >
      <div className="mx-auto flex w-full max-w-lg justify-around text-center">
        {/* MENU */}
        {navItems.map((item) => {
          const linkPath = item.link?.split('?')[0]
          const isActive = item.link?.includes('?')
            ? pathname === linkPath && item.link === `${pathname}${typeof window !== 'undefined' ? window.location.search : ''}`
            : pathname === item.link
          return item.link ? (
            <Link
              key={item.id}
              href={item.link}
              tabIndex={0}
              role="menuitem"
              aria-label={t('web:nav.navigateTo.a11y', { name: item.name })}
              className={clsx(
                '-mx-2 flex flex-col items-center justify-between px-2 text-neutral-500 dark:text-neutral-300',
                isActive && 'text-red-600'
              )}
            >
              <item.icon className="size-6" />
              <p className="text-xs/6">{item.name}</p>
            </Link>
          ) : (
            <div
              key={item.id}
              role="menuitem"
              tabIndex={0}
              aria-label={t('common:nav.openMenu.a11y')}
              className={clsx(
                '-mx-2 flex cursor-pointer flex-col items-center justify-between px-2 text-neutral-500 dark:text-neutral-300',
                isActive && 'text-red-600'
              )}
              onClick={() => {
                if (item.id === 'menu') {
                  openAside('sidebar-navigation')
                }
              }}
            >
              <item.icon className="size-6" />
              <p className="text-xs/6">{item.name}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default FooterQuickNavigation
