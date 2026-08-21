'use client'

import type { NotificationDoc } from '@/lib/types'
import T from '@/utils/getT'
import { CloseButton, Popover, PopoverButton, PopoverPanel } from '@headlessui/react'
import { BellIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'
import { FC, useEffect, useState } from 'react'

/**
 * Reads the real notification feed (`GET /api/notifications`, backed by the
 * Appwrite `notifications` collection that `src/lib/notify.ts` writes).
 *
 * This used to render three hardcoded fake notifications from the marketplace
 * template ("John Doe — Measure actions your users take"). They were shown to
 * every signed-in and signed-out visitor on every desktop page.
 */

interface Props {
  className?: string
}

function relativeTime(iso: string): string {
  const deltaMs = Date.now() - new Date(iso).getTime()
  const minutes = Math.round(deltaMs / 60000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  return `${days}d ago`
}

const NotifyDropdown: FC<Props> = ({ className = '' }) => {
  const [notifications, setNotifications] = useState<NotificationDoc[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const res = await fetch('/api/notifications?limit=10')
        if (!res.ok) {
          // 401 for a signed-out visitor is expected — show the empty state.
          if (!cancelled) setNotifications([])
          return
        }
        const json = (await res.json()) as { documents?: NotificationDoc[] }
        if (!cancelled) setNotifications(json.documents ?? [])
      } catch {
        if (!cancelled) setNotifications([])
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  const hasUnread = notifications.some((item) => !item.isRead)

  return (
    <Popover className={className}>
      <>
        <PopoverButton
          className={
            'relative -m-2.5 flex cursor-pointer items-center justify-center rounded-full p-2.5 hover:bg-neutral-100 focus-visible:outline-hidden dark:hover:bg-neutral-800'
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
            <h3 className="text-xl font-semibold">{T['Header']['Notifications']['Notifications']}</h3>

            {isLoading && <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>}

            {!isLoading && notifications.length === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400">You have no notifications.</p>
            )}

            {notifications.map((item) => (
              <CloseButton
                as={Link}
                key={item.$id}
                href="/account"
                className="relative -m-3 flex rounded-lg p-2 pe-8 transition duration-150 ease-in-out hover:bg-gray-100 focus:outline-hidden focus-visible:ring-3 focus-visible:ring-orange-500/50 dark:hover:bg-gray-700"
              >
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-200">{item.title}</p>
                  {item.body && <p className="text-xs text-gray-500 sm:text-sm dark:text-gray-400">{item.body}</p>}
                  <p className="text-xs text-gray-400 dark:text-gray-400">{relativeTime(item.$createdAt)}</p>
                </div>
                {!item.isRead && (
                  <span className="absolute end-1 top-1/2 h-2 w-2 -translate-y-1/2 transform rounded-full bg-blue-500"></span>
                )}
              </CloseButton>
            ))}
          </div>
        </PopoverPanel>
      </>
    </Popover>
  )
}

export default NotifyDropdown
