'use client'

import { useAuth } from '@/context/auth'
import {
  cancellationDisposition,
  loadShownIds,
  onCancellationCheckRequested,
  pendingCancellations,
  recentCancellationsUrl,
  saveShownIds,
} from '@/lib/cancellation-alerts'
import { parseNotificationData, resolveNotificationText } from '@/lib/notification-i18n'
import { markNotificationRead } from '@/lib/notifications-client'
import type { NotificationDoc } from '@/lib/types'
import ButtonPrimary from '@/shared/ButtonPrimary'
import NcModal from '@/shared/NcModal'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

/** Catch-up cadence: the realtime nudge is the fast path, this covers the rest. */
const POLL_MS = 15000

function browserStorage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage
  } catch {
    return null
  }
}

/**
 * In-app popup for a cancelled move, on top of the push (owner 2026-10-03):
 * whoever cancels, the other party sees it while the site is open. Reads the
 * caller's unread `move_cancelled` rows from the last day — on mount, on
 * returning to the tab, every 15 s and when NotificationWrapper's moves socket
 * sees a cancel — and shows each once on this browser, oldest first. OK (or
 * closing the modal) marks it read, which also drops the bell dot.
 * Mirrors `components/cancellation-alerts.tsx` in the two mobile apps.
 */
export default function CancellationAlerts() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const userKey = user?.authId ?? null

  const shownRef = useRef<Set<string> | null>(null)
  const queueRef = useRef<NotificationDoc[]>([])
  const lastRef = useRef<NotificationDoc | null>(null)
  const [current, setCurrent] = useState<NotificationDoc | null>(null)
  const currentRef = useRef<NotificationDoc | null>(null)

  const shownIds = useCallback(() => {
    if (!shownRef.current) shownRef.current = loadShownIds(browserStorage())
    return shownRef.current
  }, [])

  const rememberShown = useCallback(
    (id: string) => {
      const shown = shownIds()
      shown.add(id)
      saveShownIds(browserStorage(), shown)
    },
    [shownIds]
  )

  const show = useCallback(
    (next: NotificationDoc | null) => {
      currentRef.current = next
      if (next) {
        lastRef.current = next
        // Marked as shown before the user answers: a reload must not replay it.
        rememberShown(next.$id)
      }
      setCurrent(next)
    },
    [rememberShown]
  )

  const showNext = useCallback(() => {
    if (currentRef.current) return
    show(queueRef.current.shift() ?? null)
  }, [show])

  const dismiss = useCallback(() => {
    const done = currentRef.current
    if (!done) return
    markNotificationRead(done.$id).catch(() => undefined)
    currentRef.current = null
    show(queueRef.current.shift() ?? null)
  }, [show])

  const check = useCallback(async () => {
    if (!userKey) return
    try {
      const nowMs = Date.now()
      const res = await fetch(recentCancellationsUrl(nowMs), { cache: 'no-store' })
      if (!res.ok) return
      const json = (await res.json()) as { documents?: NotificationDoc[] }
      const queued = new Set(queueRef.current.map((n) => n.$id))
      if (currentRef.current) queued.add(currentRef.current.$id)
      const fresh: NotificationDoc[] = []
      for (const n of pendingCancellations(json.documents ?? [], shownIds(), nowMs)) {
        if (queued.has(n.$id)) continue
        const moveId = parseNotificationData(n.data).moveId
        const disposition = cancellationDisposition(
          typeof moveId === 'string' ? moveId : null,
          Date.parse(n.$createdAt),
          nowMs
        )
        if (disposition === 'defer') continue
        if (disposition === 'retire') {
          // The open page said it in its own words; just retire the row.
          rememberShown(n.$id)
          markNotificationRead(n.$id).catch(() => undefined)
          continue
        }
        fresh.push(n)
      }
      if (fresh.length === 0) return
      queueRef.current.push(...fresh)
      showNext()
    } catch (e) {
      console.warn('[CancellationAlerts] check failed', e)
    }
  }, [userKey, shownIds, rememberShown, showNext])

  useEffect(() => {
    if (!userKey) {
      queueRef.current = []
      currentRef.current = null
      setCurrent(null)
      return
    }
    void check()
    const onVisible = () => {
      if (document.visibilityState === 'visible') void check()
    }
    const timer = setInterval(onVisible, POLL_MS)
    window.addEventListener('focus', onVisible)
    document.addEventListener('visibilitychange', onVisible)
    // The status write lands before the notification row: look now and again
    // shortly after, the 15 s poll covers anything slower.
    let nudgeTimer: ReturnType<typeof setTimeout> | null = null
    const offNudge = onCancellationCheckRequested(() => {
      void check()
      if (nudgeTimer) clearTimeout(nudgeTimer)
      nudgeTimer = setTimeout(() => void check(), 3000)
    })
    return () => {
      clearInterval(timer)
      if (nudgeTimer) clearTimeout(nudgeTimer)
      window.removeEventListener('focus', onVisible)
      document.removeEventListener('visibilitychange', onVisible)
      offNudge()
    }
  }, [userKey, check])

  // Keep the last row on screen while the modal fades out.
  const displayed = current ?? lastRef.current
  const text = displayed ? resolveNotificationText(displayed, t) : null

  return (
    <NcModal
      isOpenProp={!!current}
      onCloseModal={dismiss}
      renderTrigger={() => null}
      contentExtraClass="max-w-md"
      modalTitle={text?.title ?? ''}
      renderContent={() => (
        <div className="space-y-6 text-center">
          <p className="text-sm text-neutral-600 dark:text-neutral-300">{text?.body}</p>
          <ButtonPrimary onClick={dismiss} className="w-full">
            {t('common:action.ok.cta')}
          </ButtonPrimary>
        </div>
      )}
    />
  )
}
