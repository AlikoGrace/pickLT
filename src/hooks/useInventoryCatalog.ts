'use client'

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { InventoryItemDef } from '@/lib/classifyMove'

/**
 * The admin catalog as engine item definitions, for pages that quote.
 *
 * `useInventoryNames` (lib/inventory-labels.ts) is the id → name map for
 * labelling; this is the full row — dimensions, weight, `unitPriceEur`,
 * `requiredCrew` — which `quoteMove` needs to price a basket. Empty until the
 * fetch lands; a quote over an empty catalog prices every item as unknown, so
 * callers should treat `ready === false` as "not priced yet", not as "free".
 *
 * Re-fetched on a language change because `/api/inventory/catalog` localises
 * `name` server-side; the numbers do not change, the labels do.
 */
export function useInventoryCatalog(): { catalog: InventoryItemDef[]; ready: boolean } {
  const { i18n } = useTranslation()
  const locale = i18n.language
  const [catalog, setCatalog] = useState<InventoryItemDef[]>([])
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch('/api/inventory/catalog')
      .then((r) => r.json())
      .then((data: { items?: InventoryItemDef[] }) => {
        if (cancelled) return
        setCatalog(Array.isArray(data.items) ? data.items : [])
        setReady(true)
      })
      .catch(() => {
        if (!cancelled) setReady(true)
      })
    return () => {
      cancelled = true
    }
  }, [locale])

  return { catalog, ready }
}
