'use client'

import Input from '@/shared/Input'
import { useEffect, useRef, useState } from 'react'

/**
 * Street-address input with inline Mapbox suggestions (T4 parity with the
 * mobile apps' AddressSearchField). Selecting a suggestion fills the text;
 * free-typed text always stands — an address Mapbox misses must remain
 * enterable. Nothing here touches the wizard-level pickup/dropoff coordinates
 * or the quote; those stay owned by the location picker.
 */

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || ''
const MIN_QUERY = 3
const DEBOUNCE_MS = 300

interface Suggestion {
  id: string
  name: string
  fullAddress: string
}

async function searchAddresses(
  query: string,
  proximity: { latitude: number; longitude: number } | null,
  signal: AbortSignal,
): Promise<Suggestion[]> {
  if (!MAPBOX_TOKEN) return []
  const params = new URLSearchParams({
    q: query,
    access_token: MAPBOX_TOKEN,
    autocomplete: 'true',
    types: 'address,street',
    limit: '5',
    language: 'en',
  })
  if (proximity) params.set('proximity', `${proximity.longitude},${proximity.latitude}`)
  const res = await fetch(
    `https://api.mapbox.com/search/geocode/v6/forward?${params.toString()}`,
    { signal },
  )
  if (!res.ok) return []
  const data = (await res.json()) as {
    features?: { id: string; properties?: { name?: string; full_address?: string } }[]
  }
  return (data.features ?? []).map((f) => ({
    id: f.id,
    name: f.properties?.name ?? '',
    fullAddress: f.properties?.full_address ?? f.properties?.name ?? '',
  }))
}

export default function AddressAutocompleteInput({
  name,
  value,
  onChangeText,
  placeholder,
  proximity,
}: {
  name: string
  value: string
  onChangeText: (text: string) => void
  placeholder?: string
  proximity?: { latitude: number; longitude: number } | null
}) {
  const [results, setResults] = useState<Suggestion[]>([])
  const [open, setOpen] = useState(false)
  const suppressRef = useRef(false)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (suppressRef.current) {
      suppressRef.current = false
      return
    }
    abortRef.current?.abort()
    if (!open || value.trim().length < MIN_QUERY) {
      setResults([])
      return
    }
    const controller = new AbortController()
    abortRef.current = controller
    const timer = setTimeout(async () => {
      try {
        const found = await searchAddresses(value.trim(), proximity ?? null, controller.signal)
        if (!controller.signal.aborted) setResults(found)
      } catch {
        /* aborted or offline — dropdown just stays empty */
      }
    }, DEBOUNCE_MS)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, open])

  function pick(s: Suggestion) {
    suppressRef.current = true
    onChangeText(s.fullAddress || s.name)
    setResults([])
    setOpen(false)
  }

  return (
    <div className="relative">
      <Input
        name={name}
        value={value}
        onChange={(e) => onChangeText(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && results.length > 0 && (
        <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-lg dark:border-neutral-700 dark:bg-neutral-800">
          {results.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                className="w-full px-4 py-2.5 text-left text-sm hover:bg-neutral-50 dark:hover:bg-neutral-700"
                onMouseDown={(e) => {
                  e.preventDefault()
                  pick(s)
                }}
              >
                <span className="font-medium text-neutral-900 dark:text-neutral-100">{s.name}</span>
                {s.fullAddress && s.fullAddress !== s.name && (
                  <span className="block text-xs text-neutral-500 dark:text-neutral-400">
                    {s.fullAddress}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
