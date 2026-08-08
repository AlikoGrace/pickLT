'use client'

import { useEffect, useState } from 'react'

/**
 * Human labels for persisted inventory, and the field-scoping rules that decide
 * which rows a move detail page should show at all.
 *
 * Detail pages used to render item IDs through a generic `formatLabel`, which
 * only humanises underscores — so `tv` became "Tv" and `sofa_2seater` became
 * "Sofa 2seater", neither matching what the client picked in the wizard. The
 * admin-managed catalog holds the real wording, so labels are resolved against
 * it and only fall back to humanising for an item the admin has since deleted.
 */

export interface CatalogName {
  id: string
  name: string
}

export function humaniseId(value: string): string {
  return value
    .split('_')
    .filter((p) => p.length > 0)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/** Catalog wording wins; humanising is the fallback for unknown IDs. */
export function formatInventoryLabel(
  id: string,
  catalog?: Map<string, string> | null,
): string {
  const known = catalog?.get(id)
  if (known) return known
  return humaniseId(id)
}

export interface InventoryLine {
  label: string
  quantity: number
  custom: boolean
}

interface CustomEntry {
  name?: unknown
  quantity?: unknown
}

function coerceCustom(raw: unknown): { name: string; quantity: number } | null {
  let entry: CustomEntry
  if (typeof raw === 'string') {
    try {
      entry = JSON.parse(raw) as CustomEntry
    } catch {
      return null
    }
  } else if (raw && typeof raw === 'object') {
    entry = raw as CustomEntry
  } else {
    return null
  }
  const name = typeof entry.name === 'string' && entry.name.trim() ? entry.name : null
  const quantity =
    typeof entry.quantity === 'number' && entry.quantity > 0 ? entry.quantity : 1
  if (!name) return null
  return { name, quantity }
}

/**
 * Catalog items plus custom items, as one labelled list. Mirrors
 * `parseLineItems` in the two React Native apps so all three surfaces agree.
 */
export function parseInventoryLines(
  inventoryItems: string | null | undefined,
  customItems: unknown[] | null | undefined,
  catalog?: Map<string, string> | null,
): InventoryLine[] {
  const out: InventoryLine[] = []

  if (inventoryItems) {
    try {
      const counts = JSON.parse(inventoryItems) as Record<string, number>
      for (const [id, n] of Object.entries(counts)) {
        if (typeof n !== 'number' || n <= 0) continue
        out.push({ label: formatInventoryLabel(id, catalog), quantity: n, custom: false })
      }
    } catch {
      /* malformed JSON — drop silently */
    }
  }

  for (const raw of customItems ?? []) {
    const entry = coerceCustom(raw)
    if (entry) out.push({ label: entry.name, quantity: entry.quantity, custom: true })
  }

  return out
}

/**
 * The admin catalog as an id → name map, for labelling persisted moves.
 *
 * Returns an empty map until the fetch resolves; `formatInventoryLabel` falls
 * back to humanising in the meantime, so labels never render as raw slugs.
 */
export function useInventoryNames(): Map<string, string> {
  const [names, setNames] = useState<Map<string, string>>(new Map())

  useEffect(() => {
    let cancelled = false
    fetch('/api/inventory/catalog')
      .then((r) => r.json())
      .then((data: { items?: CatalogName[] }) => {
        if (cancelled) return
        const items = data.items ?? []
        setNames(new Map(items.filter((i) => i.id && i.name).map((i) => [i.id, i.name])))
      })
      .catch(() => {
        /* humanised fallback already covers this */
      })
    return () => {
      cancelled = true
    }
  }, [])

  return names
}

// ── Field scoping ────────────────────────────────────────────────────────────

/**
 * The instant wizard collects ~20 fields; the scheduled wizard ~45. Rendering
 * the scheduled superset for an instant move fills the page with
 * "Not specified" for questions the client was never asked.
 *
 * Instant never collects: moveDate, street address / unit / floor / elevator /
 * parking / haltverbot on both ends, homeType, packing level and notes,
 * additionalServices, storageWeeks, arrivalWindow, flexibility, business
 * fields, contactNotes, crewSize, vehicleType.
 */
export function isInstantMove(move: { moveCategory?: string | null }): boolean {
  // Instant only when explicitly so: rows predating `moveCategory` are all
  // scheduled moves, and treating them as instant would hide real data.
  return move.moveCategory === 'instant'
}

export interface DetailRowSpec {
  label: string
  value: string | null | undefined
}

export interface PresentRow {
  label: string
  value: string
}

/** Drops rows the move has no value for. */
export function presentRows(rows: DetailRowSpec[]): PresentRow[] {
  const out: PresentRow[] = []
  for (const row of rows) {
    if (row.value === null || row.value === undefined) continue
    const trimmed = row.value.trim()
    if (!trimmed) continue
    out.push({ label: row.label, value: trimmed })
  }
  return out
}

export function yesNo(v: boolean | null | undefined): string | null {
  if (v === true) return 'Yes'
  if (v === false) return 'No'
  return null
}

export function formatDistanceKm(meters: number | null | undefined): string | null {
  if (meters === null || meters === undefined || meters <= 0) return null
  return `${(meters / 1000).toFixed(1)} km`
}

export function formatDuration(seconds: number | null | undefined): string | null {
  if (seconds === null || seconds === undefined || seconds <= 0) return null
  const mins = Math.round(seconds / 60)
  if (mins < 60) return `~${mins} min`
  const hrs = Math.floor(mins / 60)
  const rem = mins % 60
  return rem ? `~${hrs} hr ${rem} min` : `~${hrs} hr`
}

/** Instant moves start immediately and carry no `moveDate`. */
export function formatRequestedAt(iso: string | null | undefined): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
