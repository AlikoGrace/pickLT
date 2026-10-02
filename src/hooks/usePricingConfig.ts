'use client'

import { useEffect, useState } from 'react'
import { countryToIso2 } from '@/lib/countryCode'
import { toPricingConfig, type PricingConfig } from '@/lib/pricing'

/**
 * Admin rate overrides for the client-side quote *display*.
 *
 * `{}` until the fetch lands (and if it fails), which means the compiled
 * defaults apply — a config outage must show the previous price, never a blank
 * or a zero. The server re-quotes on create (master D5), so a stale value here
 * can only ever mis-preview, never mis-charge.
 *
 * Per-country (plan wave-2026-10/4 C5): pass the PICKUP country and the hook
 * fetches that market's merged config, cached per country for the session so
 * flipping between addresses does not refetch.
 */
const cache = new Map<string, PricingConfig>()
const inflight = new Map<string, Promise<PricingConfig>>()

async function fetchConfig(country: string | null): Promise<PricingConfig> {
  const key = country ?? ''
  const hit = cache.get(key)
  if (hit) return hit
  const pending = inflight.get(key)
  if (pending) return pending
  const p = fetch(`/api/pricing/config${country ? `?country=${encodeURIComponent(country)}` : ''}`)
    .then((r) => (r.ok ? r.json() : { rates: {} }))
    .then((data: { rates?: Record<string, unknown> }) => {
      const cfg = toPricingConfig(data?.rates ?? {})
      cache.set(key, cfg)
      return cfg
    })
    .catch(() => ({}) as PricingConfig)
    .finally(() => inflight.delete(key))
  inflight.set(key, p)
  return p
}

export function usePricingConfig(country?: string | null): PricingConfig {
  const cc = countryToIso2(country)
  const [config, setConfig] = useState<PricingConfig>(() => cache.get(cc ?? '') ?? {})

  useEffect(() => {
    let cancelled = false
    const cached = cache.get(cc ?? '')
    if (cached) {
      setConfig(cached)
      return
    }
    fetchConfig(cc).then((cfg) => {
      if (!cancelled) setConfig(cfg)
    })
    return () => {
      cancelled = true
    }
  }, [cc])

  return config
}
