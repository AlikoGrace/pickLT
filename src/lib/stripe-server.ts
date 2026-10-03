/**
 * The two Stripe calls the web needs (create / retrieve a PaymentIntent), over
 * Stripe's REST API — the web has no other card charging and does not carry
 * the `stripe` SDK for it. Same API version as `chargemove` /
 * `settlefees`. Server-only: reads `STRIPE_SECRET_KEY`.
 */

import type { StripeIntentLike } from '@/lib/fee-ledger-server'

const STRIPE_API = 'https://api.stripe.com/v1'
const STRIPE_VERSION = '2024-12-18.acacia'

export interface StripeIntent extends StripeIntentLike {
  id: string
  client_secret?: string | null
}

export class StripeUnavailableError extends Error {}

/** Publishable key for Stripe.js, handed to the page with the intent. */
export function stripePublishableKey(): string | null {
  return process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || process.env.STRIPE_PUBLISHABLE_KEY || null
}

export function stripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY && !!stripePublishableKey()
}

/** `{ a: { b: 1 } }` → `a[b]=1`, Stripe's form encoding. */
export function stripeForm(params: Record<string, unknown>, prefix = '', out = new URLSearchParams()): URLSearchParams {
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue
    const name = prefix ? `${prefix}[${key}]` : key
    if (typeof value === 'object') stripeForm(value as Record<string, unknown>, name, out)
    else out.append(name, String(value))
  }
  return out
}

async function stripeRequest(path: string, init: { method: 'GET' | 'POST'; body?: URLSearchParams; idempotencyKey?: string }) {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new StripeUnavailableError('STRIPE_SECRET_KEY is not set')
  const res = await fetch(`${STRIPE_API}${path}`, {
    method: init.method,
    headers: {
      Authorization: `Bearer ${key}`,
      'Stripe-Version': STRIPE_VERSION,
      ...(init.body ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
      ...(init.idempotencyKey ? { 'Idempotency-Key': init.idempotencyKey } : {}),
    },
    body: init.body,
    cache: 'no-store',
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(`Stripe ${init.method} ${path} failed: ${json?.error?.message ?? res.status}`)
  }
  return json as StripeIntent
}

export function createPaymentIntent(params: Record<string, unknown>, idempotencyKey?: string): Promise<StripeIntent> {
  return stripeRequest('/payment_intents', { method: 'POST', body: stripeForm(params), idempotencyKey })
}

export function retrievePaymentIntent(id: string): Promise<StripeIntent> {
  return stripeRequest(`/payment_intents/${encodeURIComponent(id)}`, { method: 'GET' })
}
