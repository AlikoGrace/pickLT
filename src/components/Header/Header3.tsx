'use client'

import { useInteractOutside } from '@/hooks/useInteractOutside'
import { Button } from '@/shared/Button'
import Logo from '@/shared/Logo'
import { ListingType } from '@/type'
import T from '@/utils/getT'
import * as Headless from '@headlessui/react'
import { Search01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import clsx from 'clsx'
import { FC, useCallback, useEffect, useRef, useState } from 'react'
import HeroSearchFormSmall from '../HeroSearchForm/HeroSearchFormSmall'
import AvatarDropdown from './AvatarDropdown'
import HamburgerBtnMenu from './HamburgerBtnMenu'
import NotifyDropdown from './NotifyDropdown'

interface Header3Props {
  hasBorderBottom?: boolean
  className?: string
  initSearchFormTab: ListingType
}

const Header3: FC<Header3Props> = ({ className, hasBorderBottom = true, initSearchFormTab = 'Stays' }) => {
  const headerInnerRef = useRef<HTMLDivElement>(null)
  const [showHeroSearch, setShowHeroSearch] = useState<boolean>(false)
  const lastScrollY = useRef<number>(0)
  const rafId = useRef<number | null>(null)

  // for memoization of the close function
  const closeHeroSearch = useCallback(() => {
    setShowHeroSearch(false)
  }, [])

  // HIDE HERO SEARCH FORM WHEN CLICK OUTSIDE
  useInteractOutside(headerInnerRef, closeHeroSearch)

  useEffect(() => {
    // update the lastScrollY position when the hero search is shown/hidden
    lastScrollY.current = window.pageYOffset
  }, [showHeroSearch])

  const handleHideSearchForm = useCallback(() => {
    if (!document.querySelector('#nc-Header-3-anchor')) {
      return
    }
    const currentScrollY = window.pageYOffset
    const scrollDifference = Math.abs(lastScrollY.current - currentScrollY)
    if (scrollDifference > 150) {
      setShowHeroSearch(false)
      lastScrollY.current = currentScrollY
    }
  }, [])

  const handleEventScroll = useCallback(() => {
    rafId.current = window.requestAnimationFrame(handleHideSearchForm)
  }, [handleHideSearchForm])

  // HIDDEN WHEN SCROLL EVENT
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

  return (
    <>
      <div
        className={clsx(
          `fixed inset-0 top-0 z-10 bg-black/30 transition-opacity dark:bg-black/50`,
          showHeroSearch ? 'visible' : 'pointer-events-none invisible opacity-0'
        )}
      />

      {/* Anchor for the header to avoid jumping when the hero search form is shown */}
      {showHeroSearch && <div id="nc-Header-3-anchor" />}

      {/* The header here */}
      <header
        ref={headerInnerRef}
        className={clsx(
          'relative z-20 w-full bg-white dark:bg-neutral-900',
          hasBorderBottom && 'border-b border-neutral-100 dark:border-neutral-700',
          className
        )}
      >
        <div className="relative flex h-20 px-4 lg:px-8">
          <div className="flex flex-1 justify-between">
            {/* Logo (lg+) */}
            <div className="relative z-11 flex flex-1/2 items-center">
              <Logo />
            </div>

            <div className="mx-auto flex w-full max-w-sm shrink-0 justify-center">
              {/* BUTTON SHOW HERO SEARCH FORM DESKTOP */}
              <Headless.Transition show={!showHeroSearch}>
                <div
                  className={clsx(
                    'relative flex cursor-pointer items-center justify-between self-center rounded-full border border-neutral-200 shadow-xs transition ease-in-out hover:shadow-md dark:border-neutral-600',
                    // Entering styles
                    'data-enter:duration-300 data-enter:data-closed:-translate-y-5 data-enter:data-closed:opacity-0',
                    // Leaving styles
                    'data-leave:duration-100 data-leave:data-closed:opacity-0'
                  )}
                  onClick={() => setShowHeroSearch(true)}
                  onTouchStart={() => setShowHeroSearch(true)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="flex items-center text-sm font-medium">
                    <div className="block cursor-pointer py-3 ps-5 pe-4">{T['HeroSearchForm']['Location']}</div>
                    <div className="h-5 w-px bg-neutral-300 dark:bg-neutral-700"></div>
                    <div className="block cursor-pointer px-4 py-3">{T['HeroSearchForm']['CheckIn']}</div>
                    <div className="h-5 w-px bg-neutral-300 dark:bg-neutral-700"></div>
                    <div className="block cursor-pointer px-4 py-3 font-normal">
                      {T['HeroSearchForm']['Add guests']}
                    </div>
                  </div>

                  <div className="ms-auto shrink-0 cursor-pointer pe-2">
                    <span className="flex size-8 items-center justify-center rounded-full bg-primary-600 text-white">
                      <HugeiconsIcon icon={Search01Icon} size={16} color="currentColor" strokeWidth={1.5} />
                    </span>
                  </div>
                </div>
              </Headless.Transition>

              {/* HERO SEARCH FORM - DESKTOP */}
              <Headless.Transition show={showHeroSearch}>
                <div
                  className={clsx(
                    'absolute inset-x-0 top-0 z-10 transition ease-in-out',
                    // Entering styles
                    'data-enter:duration-200 data-enter:data-closed:-translate-y-20 data-enter:data-closed:opacity-0',
                    // Leaving styles
                    'data-leave:duration-100 data-leave:data-closed:opacity-0'
                  )}
                >
                  <div className="absolute inset-x-0 right-0 -z-10 h-full bg-white dark:bg-neutral-900" />
                  <div className="mx-auto w-full max-w-4xl pb-8">
                    <HeroSearchFormSmall initTab={initSearchFormTab} />
                  </div>
                </div>
              </Headless.Transition>
            </div>

            {/* NAVIGATIONS */}
            <div className="relative z-10 flex flex-1/2 items-center justify-end gap-x-2.5 text-neutral-700 sm:gap-x-6 dark:text-neutral-100">
              <div className="hidden xl:block">
                <Button color="light" className="-mx-1 py-1.75!" href={'/add-listing/1'}>
                  {T['Header']['List your property']}
                </Button>
              </div>

              <NotifyDropdown />
              <AvatarDropdown />
              <HamburgerBtnMenu />
            </div>
          </div>
        </div>
      </header>
    </>
  )
}

export default Header3
