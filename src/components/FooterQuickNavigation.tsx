'use client'

import { Bars3Icon, HeartIcon, MagnifyingGlassIcon, UserCircleIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { RefObject, useCallback, useEffect, useRef } from 'react'
import { useIntersection } from 'react-use'
import { useAside } from './aside'

const FOOTER_QUICK_NAV = [
  {
    name: 'Explore',
    link: '/',
    icon: MagnifyingGlassIcon,
  },
  {
    name: 'Wishlists',
    link: '/account-savelists',
    icon: HeartIcon,
  },
  {
    name: 'Account',
    link: '/authors/john-doe',
    icon: UserCircleIcon,
  },
  {
    name: 'Menu',
    icon: Bars3Icon,
  },
]
const SCROLL_THRESHOLD = 80

const FooterQuickNavigation = () => {
  const containerRef = useRef<HTMLDivElement>(null)
  const rafId = useRef<number | null>(null)
  const lastScrollY = useRef<number>(0)
  const pathname = usePathname()
  const { open: openAside } = useAside()
  const intersection = useIntersection(containerRef as RefObject<HTMLDivElement>, {
    root: null,
    rootMargin: '0px',
    threshold: 1,
  })
  const isInViewport = intersection && intersection.intersectionRatio >= 1

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

  return (
    <div
      ref={containerRef}
      className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-6 bg-white/90 px-2.5 py-4 shadow ring-1 shadow-slate-200/80 ring-slate-900/5 backdrop-blur-sm transition-transform lg:hidden dark:bg-neutral-950/90"
    >
      <div className="mx-auto flex w-full max-w-lg justify-around text-center">
        {/* MENU */}
        {FOOTER_QUICK_NAV.map((item) => {
          const isActive = pathname === item.link
          return item.link ? (
            <Link
              key={item.name}
              href={item.link}
              tabIndex={0}
              role="menuitem"
              aria-label={`Navigate to ${item.name}`}
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
              key={item.name}
              role="menuitem"
              tabIndex={0}
              aria-label={`Open menu`}
              className={clsx(
                '-mx-2 flex cursor-pointer flex-col items-center justify-between px-2 text-neutral-500 dark:text-neutral-300',
                isActive && 'text-red-600'
              )}
              onClick={() => {
                if (item.name === 'Menu') {
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
