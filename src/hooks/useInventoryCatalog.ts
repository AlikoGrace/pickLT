'use client'

import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { CatalogItem } from '@/components/inventory/selector-logic'

export type CatalogStatus = 'loading' | 'ready' | 'empty' | 'error'

/**
 * The admin catalog as engine item definitions, for the selector and for
 * pages that quote.
 *
 * `status` is `ready` only for a non-empty catalog: a quote over an empty or
 * failed catalog would price every item as unknown, so callers block quoting
 * until `ready` (crew plan 1 #8) and offer `retry` on `error` / `empty`.
 * Inactive rows are included — they still label and price existing moves;
 * the selector filters them out itself.
 *
 * Re-fetched on a language change because `/api/inventory/catalog` localises
 * `name` server-side; the numbers do not change, the labels do.
 */
export function useInventoryCatalog(): {
  catalog: CatalogItem[]
  status: CatalogStatus
  ready: boolean
  retry: () => void
} {
  const { i18n } = useTranslation()
  const locale = i18n.language
  const [catalog, setCatalog] = useState<CatalogItem[]>([])
  const [status, setStatus] = useState<CatalogStatus>('loading')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    setStatus((s) => (s === 'ready' ? s : 'loading'))
    fetch('/api/inventory/catalog')
      .then(async (r) => {
        if (!r.ok) throw new Error(`catalog ${r.status}`)
        return (await r.json()) as { items?: CatalogItem[] }
      })
      .then((data) => {
        if (cancelled) return
        const items = Array.isArray(data.items) ? data.items : []
        setCatalog(items)
        setStatus(items.length > 0 ? 'ready' : 'empty')
      })
      .catch((err) => {
        if (cancelled) return
        console.warn('[inventory] catalog fetch failed', err)
        setStatus('error')
      })
    return () => {
      cancelled = true
    }
  }, [locale, attempt])

  const retry = useCallback(() => setAttempt((n) => n + 1), [])

  return { catalog, status, ready: status === 'ready', retry }
}
