'use client'

import { resolveNotificationText } from '@/lib/notification-i18n'
import {
  applyReadChange,
  markAllNotificationsRead,
  markNotificationRead,
  notificationHref,
  onNotificationsRead,
} from '@/lib/notifications-client'
import type { NotificationDoc } from '@/lib/types'
import { CloseButton, Popover, PopoverButton, PopoverPanel } from '@headlessui/react'
import { BellIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { FC, useCallback, useEffect, useState } from 'react'
import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'

/**
 * Reads the real notification feed (`GET /api/notifications`, backed by the
 * Appwrite `notifications` collection that `src/lib/notify.ts` writes).
 *
 * This used to render three hardcoded fake notifications from the marketplace
 * template ("John Doe — Measure actions your users take"). They were shown to
 * every signed-in and signed-out visitor on every desktop page.
 *
 * Copy is re-resolved at RENDER time from `data.i18nKey`
 * (`@/lib/notification-i18n`), exactly as the two React Native notification
 * lists do. A row stores a key plus params rather than a finished sentence, so
 * that notification *history* follows a language switch instead of staying
 * frozen in the language it was sent in. Rows with no key — everything written
 * before the contract existed — keep rendering their stored `title`/`body`.
 *
 * This is a client component, so resolution goes through the `useTranslation()`
 * hook, never `@/lib/i18n-server`.
 *
 * Opening a row marks it read and "Mark all read" clears the rest; the dot
 * drops at once through the in-page read broadcast
 * (`@/lib/notifications-client`) rather than waiting on a refetch. The feed is
 * also re-read when the tab regains focus and on every route change, so a row
 * read elsewhere (the mobile app) does not keep the dot lit.
 */

interface Props {
  className?: string
  /** Where a row leads; the client account page by default. */
  itemHref?: string
  /** Extra classes for the bell button (the mover header sizes it differently). */
  buttonClassName?: string
  /** Which side's move page a missed call opens (client move details / mover job details). */
  side?: 'client' | 'mover'
}

function relativeTime(iso: string, t: TFunction): string {
  const deltaMs = Date.now() - new Date(iso).getTime()
  const minutes = Math.round(deltaMs / 60000)
  if (minutes < 1) return t('common:timeAgo.justNow.label')
  if (minutes < 60) return t('common:timeAgo.minutes.label', { count: minutes })
  const hours = Math.round(minutes / 60)
  if (hours < 24) return t('common:timeAgo.hours.label', { count: hours })
  const days = Math.round(hours / 24)
  return t('common:timeAgo.days.label', { count: days })
}

const NotifyDropdown: FC<Props> = ({ className = '', itemHref = '/account', buttonClassName = '', side = 'client' }) => {
  const { t } = useTranslation()
  const pathname = usePathname()
  const [notifications, setNotifications] = useState<NotificationDoc[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [markingAll, setMarkingAll] = useState(false)

  const load = useCallback(async (isCancelled: () => boolean = () => false) => {
    try {
      const res = await fetch('/api/notifications?limit=10', { cache: 'no-store' })
      if (!res.ok) {
        // 401 for a signed-out visitor is expected — show the empty state.
        if (!isCancelled()) setNotifications([])
        return
      }
      const json = (await res.json()) as { documents?: NotificationDoc[] }
      if (!isCancelled()) setNotifications(json.documents ?? [])
    } catch {
      if (!isCancelled()) setNotifications([])
    } finally {
      if (!isCancelled()) setIsLoading(false)
    }
  }, [])

  // On mount and on every route change.
  useEffect(() => {
    let cancelled = false
    load(() => cancelled)
    return () => {
      cancelled = true
    }
  }, [load, pathname])

  // Back to the tab: re-read, in case something was read elsewhere.
  useEffect(() => {
    const onFocus = () => {
      if (document.visibilityState === 'visible') void load()
    }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onFocus)
    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onFocus)
    }
  }, [load])

  // A mark-read in this page lowers the dot at once.
  useEffect(() => onNotificationsRead((change) => setNotifications((prev) => applyReadChange(prev, change))), [])

  const hasUnread = notifications.some((item) => !item.isRead)

  const handleMarkAll = async () => {
    setMarkingAll(true)
    try {
      await markAllNotificationsRead()
    } catch {
      // The rows stay unread; the next fetch shows the truth.
    } finally {
      setMarkingAll(false)
    }
  }

  return (
    <Popover className={className}>
      <>
        <PopoverButton
          aria-label={t('common:nav.notifications.label')}
          className={
            'relative -m-2.5 flex cursor-pointer items-center justify-center rounded-full p-2.5 hover:bg-neutral-100 focus-visible:outline-hidden dark:hover:bg-neutral-800 ' +
            buttonClassName
          }
        >
          {hasUnread && <span className="absolute end-2 top-2 h-2 w-2 rounded-full bg-blue-500"></span>}
          <BellIcon className="h-6 w-6" />
        </PopoverButton>

        <PopoverPanel
          transition
          anchor={{
            to: 'bottom end',
            gap: 16,
          }}
          className="z-40 w-sm rounded-3xl shadow-lg ring-1 ring-black/5 transition duration-200 ease-in-out data-closed:translate-y-1 data-closed:opacity-0"
        >
          <div className="relative grid gap-8 bg-white p-7 dark:bg-neutral-800">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-xl font-semibold">{t('common:nav.notifications.label')}</h3>
              {hasUnread && (
                <button
                  type="button"
                  onClick={handleMarkAll}
                  disabled={markingAll}
                  className="text-sm font-medium text-primary-600 hover:underline disabled:opacity-50 dark:text-primary-400"
                >
                  {t('common:notifications.markAll.cta')}
                </button>
              )}
            </div>

            {isLoading && <p className="text-sm text-gray-500 dark:text-gray-400">{t('common:state.loadingEllipsis.label')}</p>}

            {!isLoading && notifications.length === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('web:notify.empty')}</p>
            )}

            {notifications.map((item) => {
              const { title, body } = resolveNotificationText(item, t)
              return (
                <CloseButton
                  as={Link}
                  key={item.$id}
                  href={notificationHref(item, side, itemHref)}
                  onClick={() => {
                    // Fire and forget: navigation must not wait on the write.
                    if (!item.isRead) markNotificationRead(item.$id).catch(() => {})
                  }}
                  className="relative -m-3 flex rounded-lg p-2 pe-8 transition duration-150 ease-in-out hover:bg-gray-100 focus:outline-hidden focus-visible:ring-3 focus-visible:ring-orange-500/50 dark:hover:bg-gray-700"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-200">{title}</p>
                    {body && <p className="text-xs text-gray-500 sm:text-sm dark:text-gray-400">{body}</p>}
                    <p className="text-xs text-gray-400 dark:text-gray-400">{relativeTime(item.$createdAt, t)}</p>
                  </div>
                  {!item.isRead && (
                    <span className="absolute end-1 top-1/2 h-2 w-2 -translate-y-1/2 transform rounded-full bg-blue-500"></span>
                  )}
                </CloseButton>
              )
            })}
          </div>
        </PopoverPanel>
      </>
    </Popover>
  )
}

export default NotifyDropdown
