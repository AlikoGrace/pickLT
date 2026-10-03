'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { formatMoney } from '@/lib/format'
import ButtonPrimary from '@/shared/ButtonPrimary'

/**
 * Pay the platform balance by card (plan `fees/0.master.md` D3): asks
 * `/api/mover/fees/pay` for an intent over the full owed amount, mounts
 * Stripe's Payment Element, confirms in place (3-D Secure opens Stripe's own
 * modal; a redirect-only method comes back to this page with
 * `?payment_intent=…`, which `confirmFeePayment` finishes), then has the server
 * verify and post the payment.
 *
 * Stripe.js is loaded from js.stripe.com as Stripe requires — the web carries
 * no Stripe package.
 */

interface StripeElement {
  mount: (el: HTMLElement) => void
  destroy: () => void
}
interface StripeElements {
  create: (type: 'payment', options?: Record<string, unknown>) => StripeElement
}
interface StripeJs {
  elements: (options: { clientSecret: string; appearance?: Record<string, unknown> }) => StripeElements
  confirmPayment: (options: {
    elements: StripeElements
    redirect: 'if_required'
    confirmParams: { return_url: string }
  }) => Promise<{ error?: { message?: string }; paymentIntent?: { id: string; status: string } }>
}
declare global {
  interface Window {
    Stripe?: (publishableKey: string) => StripeJs
  }
}

const STRIPE_JS = 'https://js.stripe.com/v3/'
let stripeJsPromise: Promise<void> | null = null

function loadStripeJs(): Promise<void> {
  if (typeof window !== 'undefined' && window.Stripe) return Promise.resolve()
  if (!stripeJsPromise) {
    stripeJsPromise = new Promise<void>((resolve, reject) => {
      const script = document.createElement('script')
      script.src = STRIPE_JS
      script.async = true
      script.onload = () => resolve()
      script.onerror = () => {
        stripeJsPromise = null
        reject(new Error('stripe.js failed to load'))
      }
      document.head.appendChild(script)
    })
  }
  return stripeJsPromise
}

/** Server-side verification + ledger posting. Throws with the server's message. */
export async function confirmFeePayment(paymentIntentId: string): Promise<{ standing: string; owedCents: number }> {
  const res = await fetch('/api/mover/fees/pay', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode: 'confirm', paymentIntentId }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'confirm failed')
  return data
}

interface Props {
  onPaid: () => void
  onCancel: () => void
}

export default function FeePayPanel({ onPaid, onCancel }: Props) {
  const { t } = useTranslation()
  const mountRef = useRef<HTMLDivElement>(null)
  const stripeRef = useRef<{ stripe: StripeJs; elements: StripeElements } | null>(null)
  const [amountCents, setAmountCents] = useState<number | null>(null)
  const [ready, setReady] = useState(false)
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    let element: StripeElement | null = null
    ;(async () => {
      try {
        const res = await fetch('/api/mover/fees/pay', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode: 'intent' }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok || !data.clientSecret || !data.publishableKey) {
          throw new Error(data.error || t('web:mover.fees.pay.unavailable'))
        }
        await loadStripeJs()
        if (cancelled || !window.Stripe || !mountRef.current) return
        const stripe = window.Stripe(data.publishableKey)
        const dark = document.documentElement.classList.contains('dark')
        const elements = stripe.elements({
          clientSecret: data.clientSecret,
          appearance: { theme: dark ? 'night' : 'stripe', variables: { colorPrimary: '#1D64EC' } },
        })
        element = elements.create('payment', { layout: 'tabs' })
        element.mount(mountRef.current)
        stripeRef.current = { stripe, elements }
        setAmountCents(data.amountCents)
        setReady(true)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : t('web:mover.fees.pay.unavailable'))
      }
    })()
    return () => {
      cancelled = true
      element?.destroy()
    }
  }, [t])

  const handlePay = async () => {
    const s = stripeRef.current
    if (!s) return
    setPaying(true)
    setError(null)
    try {
      const { error: stripeError, paymentIntent } = await s.stripe.confirmPayment({
        elements: s.elements,
        redirect: 'if_required',
        confirmParams: { return_url: `${window.location.origin}/earnings` },
      })
      if (stripeError) throw new Error(stripeError.message || t('errors:payment.charge.failed'))
      if (!paymentIntent || paymentIntent.status !== 'succeeded') throw new Error(t('errors:payment.charge.failed'))
      await confirmFeePayment(paymentIntent.id)
      onPaid()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors:fees.payFailed'))
    } finally {
      setPaying(false)
    }
  }

  return (
    <div className="mt-4 space-y-3 rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900">
      <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{t('web:mover.fees.pay.title')}</p>
      {!ready && !error && (
        <div className="flex justify-center py-6">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
        </div>
      )}
      <div ref={mountRef} />
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <p className="text-xs text-neutral-500 dark:text-neutral-400">{t('web:mover.fees.pay.secure.helper')}</p>
      <div className="flex flex-wrap gap-2">
        <ButtonPrimary onClick={handlePay} disabled={!ready || paying} className="flex-1">
          {paying
            ? t('web:mover.fees.pay.paying.cta')
            : amountCents != null
              ? t('web:mover.fees.pay.amount.cta', { amount: formatMoney(amountCents / 100) })
              : t('web:mover.fees.pay.cta')}
        </ButtonPrimary>
        <button
          type="button"
          onClick={onCancel}
          disabled={paying}
          className="rounded-full px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100 disabled:opacity-50 dark:text-neutral-300 dark:hover:bg-neutral-800"
        >
          {t('web:mover.fees.pay.cancel.cta')}
        </button>
      </div>
    </div>
  )
}
