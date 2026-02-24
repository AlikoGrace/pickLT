'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { Cancel01Icon, Location01Icon, Navigation03Icon, Tick01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import clsx from 'clsx'
import ButtonPrimary from '@/shared/ButtonPrimary'

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || ''

export interface PickedLocation {
  id: string
  name: string
  fullAddress: string
  coordinates: {
    latitude: number
    longitude: number
  }
}

interface MapLocationPickerProps {
  open: boolean
  onClose: () => void
  onSelect: (location: PickedLocation) => void
  initialCoordinates?: { latitude: number; longitude: number } | null
  label?: string
}

// ─── Mapbox geocoding helpers ────────────────────────────────
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || ''

async function forwardGeocode(
  query: string,
  proximity?: { latitude: number; longitude: number } | null
): Promise<PickedLocation[]> {
  if (!query || query.length < 2 || !MAPBOX_TOKEN) return []
  try {
    const params: Record<string, string> = {
      access_token: MAPBOX_TOKEN,
      autocomplete: 'true',
      fuzzyMatch: 'true',
      types: 'address,poi,poi.landmark,postcode,neighborhood,locality,place,district,region,country',
      limit: '8',
      language: 'en',
    }
    if (proximity) params.proximity = `${proximity.longitude},${proximity.latitude}`

    const res = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?` +
        new URLSearchParams(params)
    )
    if (!res.ok) return []
    const data = await res.json()
    return (data.features || []).map((f: any) => {
      const isAddr = f.place_type?.includes('address')
      return {
        id: f.id,
        name: isAddr ? (f.address ? `${f.address} ${f.text}` : f.text) : f.text,
        fullAddress: f.place_name,
        coordinates: { latitude: f.center[1], longitude: f.center[0] },
      }
    })
  } catch {
    return []
  }
}

async function reverseGeocode(lat: number, lng: number): Promise<PickedLocation | null> {
  if (!MAPBOX_TOKEN) return null
  try {
    const res = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?` +
        new URLSearchParams({
          access_token: MAPBOX_TOKEN,
          types: 'address,poi,place',
          limit: '1',
          language: 'en',
        })
    )
    if (!res.ok) return null
    const data = await res.json()
    const f = data.features?.[0]
    if (!f) return null
    return { id: f.id, name: f.text, fullAddress: f.place_name, coordinates: { latitude: lat, longitude: lng } }
  } catch {
    return null
  }
}

// ─────────────────────────────────────────────────────────────
const MapLocationPicker = ({ open, onClose, onSelect, initialCoordinates, label = 'Select location' }: MapLocationPickerProps) => {
  // ── refs ───────────────────────────────────────────────────
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const markerRef = useRef<mapboxgl.Marker | null>(null)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // ── state ──────────────────────────────────────────────────
  const [mapReady, setMapReady] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PickedLocation[]>([])
  const [searching, setSearching] = useState(false)
  const [picked, setPicked] = useState<PickedLocation | null>(null)
  const [reverseLoading, setReverseLoading] = useState(false)
  const [userCoords, setUserCoords] = useState<{ latitude: number; longitude: number } | null>(null)

  const proximity = initialCoordinates || userCoords

  // ── get user coords once ───────────────────────────────────
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (p) => setUserCoords({ latitude: p.coords.latitude, longitude: p.coords.longitude }),
      () => {},
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300_000 }
    )
  }, [])

  // ── create / destroy map when open toggles ─────────────────
  useEffect(() => {
    if (!open) {
      // Tear down
      markerRef.current?.remove()
      markerRef.current = null
      mapRef.current?.remove()
      mapRef.current = null
      setMapReady(false)
      return
    }

    // Wait for the CSS translate-y transition to finish (200ms) + extra buffer
    // so the container has its full layout dimensions before Mapbox reads them.
    const timerId = setTimeout(() => {
      const el = mapContainerRef.current
      if (!el || mapRef.current) return

      const center: [number, number] = initialCoordinates
        ? [initialCoordinates.longitude, initialCoordinates.latitude]
        : userCoords
          ? [userCoords.longitude, userCoords.latitude]
          : [13.405, 52.52]

      const m = new mapboxgl.Map({
        container: el,
        style: 'mapbox://styles/mapbox/streets-v12',
        center,
        zoom: 14,
      })

      m.addControl(new mapboxgl.NavigationControl(), 'bottom-right')

      m.on('load', () => {
        setMapReady(true)
        // Resize immediately on load
        m.resize()
        // Extra resize after a short delay in case the browser hasn't
        // fully painted the flex layout yet
        setTimeout(() => m.resize(), 100)
        setTimeout(() => m.resize(), 400)
      })

      // Click to pick a location
      m.on('click', async (e) => {
        const { lng, lat } = e.lngLat
        placePin(lat, lng)
        setReverseLoading(true)
        const loc = await reverseGeocode(lat, lng)
        setReverseLoading(false)
        const resolved: PickedLocation = loc || {
          id: `pin-${Date.now()}`,
          name: 'Selected Location',
          fullAddress: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
          coordinates: { latitude: lat, longitude: lng },
        }
        setPicked(resolved)
        setQuery(resolved.fullAddress)
        setResults([])
      })

      mapRef.current = m
    }, 350)

    return () => clearTimeout(timerId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // ── place initial marker after map ready ───────────────────
  useEffect(() => {
    if (mapReady && initialCoordinates) {
      placePin(initialCoordinates.latitude, initialCoordinates.longitude)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady, initialCoordinates])

  // ── reset form when picker opens ───────────────────────────
  useEffect(() => {
    if (open) {
      setQuery('')
      setResults([])
      setPicked(null)
      setReverseLoading(false)
      setTimeout(() => inputRef.current?.focus(), 250)
    }
  }, [open])

  // ── cleanup debounce ───────────────────────────────────────
  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current) }, [])

  // ── marker helper (inline styles so Tailwind purge doesn't matter) ──
  const placePin = useCallback((lat: number, lng: number) => {
    const m = mapRef.current
    if (!m) return
    markerRef.current?.remove()
    const el = document.createElement('div')
    el.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center">
        <div style="background:#111827;border-radius:9999px;padding:8px;box-shadow:0 2px 8px rgba(0,0,0,.25);display:flex;align-items:center;justify-content:center">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="10" r="3"/><path d="M12 2a8 8 0 0 0-8 8c0 1.892.402 3.13 1.5 4.5L12 22l6.5-7.5c1.098-1.37 1.5-2.608 1.5-4.5a8 8 0 0 0-8-8Z"/></svg>
        </div>
      </div>`
    markerRef.current = new mapboxgl.Marker({ element: el, anchor: 'bottom' }).setLngLat([lng, lat]).addTo(m)
  }, [])

  // ── search input ───────────────────────────────────────────
  const onSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value
      setQuery(v)
      setPicked(null)
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(async () => {
        if (v.length >= 2) {
          setSearching(true)
          setResults(await forwardGeocode(v, proximity))
          setSearching(false)
        } else {
          setResults([])
        }
      }, 300)
    },
    [proximity]
  )

  // ── select suggestion ──────────────────────────────────────
  const selectSuggestion = useCallback(
    (loc: PickedLocation) => {
      setPicked(loc)
      setQuery(loc.fullAddress)
      setResults([])
      mapRef.current?.flyTo({ center: [loc.coordinates.longitude, loc.coordinates.latitude], zoom: 16, duration: 800 })
      placePin(loc.coordinates.latitude, loc.coordinates.longitude)
    },
    [placePin]
  )

  // ── use current location ───────────────────────────────────
  const useCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        setUserCoords({ latitude, longitude })
        const loc: PickedLocation = {
          id: 'current-location',
          name: 'My Location',
          fullAddress: 'Current Location',
          coordinates: { latitude, longitude },
        }
        setPicked(loc)
        setQuery('Current Location')
        setResults([])
        mapRef.current?.flyTo({ center: [longitude, latitude], zoom: 16, duration: 800 })
        placePin(latitude, longitude)
      },
      () => {},
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 }
    )
  }, [placePin])

  const confirm = useCallback(() => { if (picked) onSelect(picked) }, [picked, onSelect])

  const close = useCallback(() => {
    setQuery('')
    setResults([])
    setPicked(null)
    onClose()
  }, [onClose])

  // ── render (always in DOM — toggle via CSS) ────────────────
  return (
    <div
      className={clsx(
        'fixed inset-0 z-[70] flex flex-col bg-white transition-transform duration-200 dark:bg-neutral-900',
        open ? 'translate-y-0' : 'translate-y-full pointer-events-none'
      )}
    >
      {/* Header */}
      <div className="flex shrink-0 items-center gap-3 border-b border-neutral-200 px-4 py-3 dark:border-neutral-700">
        <button
          type="button"
          onClick={close}
          className="flex size-9 shrink-0 items-center justify-center rounded-full hover:bg-neutral-100 transition dark:hover:bg-neutral-800"
        >
          <HugeiconsIcon icon={Cancel01Icon} size={20} strokeWidth={1.5} className="text-neutral-700 dark:text-neutral-300" />
        </button>
        <h2 className="truncate text-base font-semibold text-neutral-900 dark:text-white">{label}</h2>
      </div>

      {/* Search */}
      <div className="relative shrink-0 border-b border-neutral-200 px-4 py-3 dark:border-neutral-700">
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            className="block w-full rounded-xl border border-neutral-300 bg-transparent px-4 py-3 pe-10 text-sm leading-none placeholder-neutral-500 focus:border-primary-300 focus:ring-3 focus:ring-primary-200/50 dark:border-neutral-700 dark:bg-neutral-800 dark:placeholder-neutral-400 dark:focus:ring-primary-600/25"
            placeholder="Search for a location…"
            value={query}
            onChange={onSearchChange}
            autoComplete="off"
          />
          <span className="absolute end-3 top-1/2 -translate-y-1/2">
            <HugeiconsIcon icon={Location01Icon} size={18} strokeWidth={1.5} className="text-neutral-400" />
          </span>
        </div>

        <button
          type="button"
          onClick={useCurrentLocation}
          className="mt-2 flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-sm hover:bg-neutral-100 transition dark:hover:bg-neutral-800"
        >
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary-50 dark:bg-primary-900/30">
            <HugeiconsIcon icon={Navigation03Icon} size={14} strokeWidth={1.5} className="text-primary-600 dark:text-primary-400" />
          </span>
          <span className="text-sm font-medium text-primary-600 dark:text-primary-400">Use my current location</span>
        </button>

        {/* Suggestions dropdown */}
        {results.length > 0 && (
          <div className="absolute inset-x-4 top-full z-30 mt-1 max-h-64 overflow-y-auto rounded-xl border border-neutral-200 bg-white shadow-lg dark:border-neutral-700 dark:bg-neutral-800">
            {results.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => selectSuggestion(item)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-neutral-50 transition dark:hover:bg-neutral-700/60"
              >
                <HugeiconsIcon icon={Location01Icon} size={16} strokeWidth={1.5} className="shrink-0 text-neutral-400" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-neutral-800 dark:text-neutral-200">{item.name}</p>
                  <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">{item.fullAddress}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {searching && <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">Searching…</p>}
      </div>

      {/* Map */}
      <div className="relative flex-1" style={{ minHeight: '200px' }}>
        <div ref={mapContainerRef} className="absolute inset-0" style={{ width: '100%', height: '100%' }} />

        {reverseLoading && (
          <div className="absolute left-1/2 top-4 z-10 -translate-x-1/2 rounded-full bg-white/90 px-4 py-2 shadow-md backdrop-blur-sm dark:bg-neutral-800/90">
            <p className="animate-pulse text-xs font-medium text-neutral-700 dark:text-neutral-300">Getting address…</p>
          </div>
        )}

        {!picked && !reverseLoading && mapReady && (
          <div className="absolute left-1/2 top-4 z-10 -translate-x-1/2 rounded-full bg-white/90 px-4 py-2 shadow-md backdrop-blur-sm dark:bg-neutral-800/90">
            <p className="text-xs font-medium text-neutral-600 dark:text-neutral-400">Tap the map to select a location</p>
          </div>
        )}
      </div>

      {/* Confirm bar */}
      <div className="shrink-0 border-t border-neutral-200 bg-white px-4 pb-6 pt-4 dark:border-neutral-700 dark:bg-neutral-900">
        {picked && (
          <div className="mb-3 flex items-start gap-2.5">
            <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <HugeiconsIcon icon={Tick01Icon} size={14} strokeWidth={2} className="text-green-600 dark:text-green-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-neutral-900 dark:text-white">{picked.name}</p>
              <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">{picked.fullAddress}</p>
            </div>
          </div>
        )}
        <ButtonPrimary onClick={confirm} disabled={!picked} className="w-full">
          Confirm location
        </ButtonPrimary>
      </div>
    </div>
  )
}

export default MapLocationPicker