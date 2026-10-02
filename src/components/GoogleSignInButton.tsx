'use client'

import { useAuth } from '@/context/auth'
import {
  getGoogleClientId,
  initializeGoogleId,
  renderGoogleButton,
  type GoogleButtonText,
} from '@/lib/google-identity'
import { googleAuthErrorKey } from '@/lib/googleauth-client'
import { GoogleIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

type Props = {
  /** GIS button copy: `continue_with` on login, `signup_with` on signup. */
  text: Extract<GoogleButtonText, 'continue_with' | 'signup_with'>
  /** Receives the Google ID token; the button stays disabled until it settles. */
  onCredential: (idToken: string) => Promise<void> | void
  /** Already-translated message. */
  onError: (message: string) => void
  /**
   * Hosted-OAuth fallback (`loginWithGoogle`), used when no
   * `NEXT_PUBLIC_GOOGLE_CLIENT_ID` is configured or the GIS script cannot load
   * (content blockers).
   */
  fallback: () => void
}

/**
 * "Continue with Google" — the Google Identity Services button wired to the
 * `googleauth` function (parity with the mobile apps, same Appwrite account
 * for the same Google e-mail), with the previous hosted-OAuth button as the
 * fallback when the feature is not configured.
 */
export default function GoogleSignInButton({ text, onCredential, onError, fallback }: Props) {
  const { t, i18n } = useTranslation()
  const { isLoading: authLoading } = useAuth()
  const locale = i18n.resolvedLanguage ?? i18n.language

  const clientId = getGoogleClientId()
  const [mode, setMode] = useState<'gis' | 'fallback'>(clientId ? 'gis' : 'fallback')
  const [ready, setReady] = useState(false)
  const [exchanging, setExchanging] = useState(false)
  const [width, setWidth] = useState(0)

  const containerRef = useRef<HTMLDivElement>(null)
  // Latest handlers, so a prop change never requires re-initialising GIS.
  const onCredentialRef = useRef(onCredential)
  const onErrorRef = useRef(onError)
  useEffect(() => {
    onCredentialRef.current = onCredential
    onErrorRef.current = onError
  }, [onCredential, onError])
  const tRef = useRef(t)
  useEffect(() => {
    tRef.current = t
  }, [t])

  const handleCredential = useCallback(async (idToken: string) => {
    setExchanging(true)
    try {
      await onCredentialRef.current(idToken)
    } catch (err) {
      onErrorRef.current(tRef.current(googleAuthErrorKey(err)))
    } finally {
      setExchanging(false)
    }
  }, [])

  // Load + initialise GIS once per mount. A load failure (blocked script)
  // degrades to the hosted button rather than a dead control.
  useEffect(() => {
    if (mode !== 'gis' || !clientId) return
    let cancelled = false
    initializeGoogleId({ clientId, onCredential: handleCredential })
      .then(() => {
        if (!cancelled) setReady(true)
      })
      .catch(() => {
        if (!cancelled) setMode('fallback')
      })
    return () => {
      cancelled = true
    }
  }, [mode, clientId, handleCredential])

  // Track the container width so the GIS button (fixed-width iframe) fills it.
  useEffect(() => {
    if (mode !== 'gis') return
    const el = containerRef.current
    if (!el) return
    const measure = () => setWidth(el.getBoundingClientRect().width)
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [mode])

  // (Re)render the button whenever its inputs change.
  useEffect(() => {
    if (mode !== 'gis' || !ready) return
    const el = containerRef.current
    if (!el || width <= 0) return
    renderGoogleButton(el, { text, width, theme: 'outline', size: 'large', locale }).catch(() => {
      setMode('fallback')
    })
  }, [mode, ready, width, locale, text])

  if (mode === 'fallback') {
    return (
      <button
        type="button"
        onClick={fallback}
        disabled={authLoading}
        className="flex w-full items-center justify-center gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm font-medium text-neutral-900 transition hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white dark:hover:bg-neutral-700"
      >
        <HugeiconsIcon icon={GoogleIcon} size={20} strokeWidth={1.5} />
        {t('auth:login.google.cta')}
      </button>
    )
  }

  const busy = exchanging || authLoading
  return (
    <div
      className="relative w-full"
      aria-busy={busy}
      // GIS renders a 40px-tall iframe for size=large; reserve it so the
      // choice screen does not jump while the script loads.
      style={{ minHeight: 44 }}
    >
      <div
        ref={containerRef}
        className={`flex w-full justify-center transition-opacity ${busy ? 'pointer-events-none opacity-60' : ''}`}
      />
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm font-medium text-neutral-400 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-500">
          <HugeiconsIcon icon={GoogleIcon} size={20} strokeWidth={1.5} />
          {t('auth:login.google.cta')}
        </div>
      )}
      {exchanging && (
        <p className="mt-2 text-center text-xs text-neutral-500 dark:text-neutral-400">
          {t('auth:login.submitting.cta')}
        </p>
      )}
    </div>
  )
}
