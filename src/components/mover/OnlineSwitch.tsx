'use client'

import clsx from 'clsx'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { DOCUMENTS_HREF, isVettingRefusal } from '@/lib/vetting-form'
import { Switch } from '@/shared/switch'

interface OnlineSwitchProps {
  /** `mover_profiles.isOnline` as the session last read it. */
  isOnline: boolean
  /** The vehicle or fee gate fails: going online is refused server-side too. */
  canGoOnline: boolean
  /** Told the new state after the server accepted it. */
  onChanged: (isOnline: boolean) => void
}

/**
 * The mover's online switch (plan legal/2, P3).
 *
 * Being online used to be a side effect of having a dashboard tab open: every
 * location ping set `isOnline`. It is now a choice, made here, and it is also
 * what decides whether this browser sends the mover's location at all. Going
 * offline is always possible, including while a gate blocks going online.
 */
export default function OnlineSwitch({ isOnline, canGoOnline, onChanged }: OnlineSwitchProps) {
  const { t } = useTranslation()
  const [online, setOnline] = useState(isOnline)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // A residence-document refusal (plan legal/7) is fixed on the documents page: link there.
  const [errorNeedsDocuments, setErrorNeedsDocuments] = useState(false)

  // Follow the session when it changes underneath us (another tab, the app,
  // or a fee restriction taking the mover offline).
  useEffect(() => {
    if (!busy) setOnline(isOnline)
  }, [isOnline, busy])

  const toggle = async (next: boolean) => {
    if (busy) return
    setBusy(true)
    setError(null)
    setErrorNeedsDocuments(false)
    setOnline(next)
    try {
      const res = await fetch('/api/mover/online', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isOnline: next }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || data.ok !== true) {
        setOnline(!next)
        setError(typeof data.error === 'string' && data.error ? data.error : t('web:mover.online.failed.body'))
        setErrorNeedsDocuments(isVettingRefusal(data.fnCode))
        return
      }
      onChanged(data.isOnline === true)
    } catch {
      setOnline(!next)
      setError(t('web:mover.online.failed.body'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="border-b border-neutral-200 bg-white px-4 py-3 dark:border-neutral-700 dark:bg-neutral-800">
      <div className="mx-auto flex max-w-3xl items-center gap-4">
        <span
          aria-hidden
          className={clsx('h-2.5 w-2.5 flex-shrink-0 rounded-full', online ? 'bg-green-500' : 'bg-neutral-400')}
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            {online ? t('web:mover.online.on.label') : t('web:mover.online.off.label')}
          </p>
          <p className="text-sm text-neutral-600 dark:text-neutral-300">
            {online ? t('web:mover.online.on.helper') : t('web:mover.online.off.helper')}
          </p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">{t('web:mover.online.location.helper')}</p>
          {error && (
            <p role="alert" className="mt-1 text-sm text-red-600 dark:text-red-400">
              {error}
              {errorNeedsDocuments && (
                <>
                  {' '}
                  <Link href={DOCUMENTS_HREF} className="font-semibold underline">
                    {t('web:mover.vetting.documents.open.cta')}
                  </Link>
                </>
              )}
            </p>
          )}
        </div>
        <Switch
          aria-label={t('web:mover.online.switch.label')}
          checked={online}
          onChange={toggle}
          // Off is always allowed; on only when the gates pass.
          disabled={busy || (!online && !canGoOnline)}
        />
      </div>
    </div>
  )
}
