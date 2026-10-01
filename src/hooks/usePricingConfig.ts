'use client'

import { useEffect, useState } from 'react'
import { toPricingConfig, type PricingConfig } from '@/lib/pricing'

/**
 * Admin rate overrides for the client-side quote *display*.
 *
 * `{}` until the fetch lands (and if it fails), which means the compiled
 * defaults apply — a config outage must show the previous price, never a blank
 * or a zero. The server re-quotes on create (master D5), so a stale value here
 * can only ever mis-preview, never mis-charge.
 */
export function usePricingConfig(): PricingConfig {
  const [config, setConfig] = useState<PricingConfig>({})

  useEffect(() => {
    let cancelled = false
    fetch('/api/pricing/config')
      .then((r) => (r.ok ? r.json() : { rates: {} }))
      .then((data: { rates?: Record<string, unknown> }) => {
        if (!cancelled && data?.rates) setConfig(toPricingConfig(data.rates))
      })
      .catch(() => {
        /* defaults already cover this */
      })
    return () => {
      cancelled = true
    }
  }, [])

  return config
}
