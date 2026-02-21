'use client'

import { Search01Icon } from '@/components/Icons'
import T from '@/utils/getT'
import { MapPinIcon } from '@heroicons/react/24/outline'
import { Navigation03Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import clsx from 'clsx'
import { FC, useCallback, useEffect, useRef, useState } from 'react'

// Shared type with the desktop LocationInputField
export type LocationSuggestion = {
  id: string
  name: string
  fullAddress: string
  coordinates?: {
    latitude: number
    longitude: number
  }
}

// ─── Mapbox helpers ──────────────────────────────────────────
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN

async function searchLocations(
  query: string,
  proximity?: { latitude: number; longitude: number } | null
): Promise<LocationSuggestion[]> {
  if (!query || query.length < 2) return []
  if (!MAPBOX_TOKEN) return []

  try {
    const params: Record<string, string> = {
      access_token: MAPBOX_TOKEN,
      autocomplete: 'true',
      fuzzyMatch: 'true',
      types: 'address,poi,poi.landmark,postcode,neighborhood,locality,place,district,region,country',
      limit: '10',
      language: 'en',
    }

    if (proximity) {
      params.proximity = `${proximity.longitude},${proximity.latitude}`
    }

    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?` +
        new URLSearchParams(params)
    )
    if (!response.ok) throw new Error('Failed to fetch locations')

    const data = await response.json()

    return data.features.map((feature: any) => {
      const isAddress = feature.place_type?.includes('address')
      const displayName = isAddress
        ? (feature.address ? `${feature.address} ${feature.text}` : feature.text)
        : feature.text

      return {
        id: feature.id,
        name: displayName,
        fullAddress: feature.place_name,
        coordinates: {
          latitude: feature.center[1],
          longitude: feature.center[0],
        },
      }
    })
  } catch (error) {
    console.error('Error fetching locations:', error)
    return []
  }
}

/** Reverse-geocode coordinates → human-readable address */
async function reverseGeocode(
  lat: number,
  lng: number
): Promise<LocationSuggestion | null> {
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
    return {
      id: f.id,
      name: f.text,
      fullAddress: f.place_name,
      coordinates: { latitude: lat, longitude: lng },
    }
  } catch {
    return null
  }
}

interface Props {
  onClick?: () => void
  onChange?: (location: LocationSuggestion | null) => void
  className?: string
  defaultValue?: string
  headingText?: string
  imputName?: string
}

const LocationInput: FC<Props> = ({
  onChange,
  className,
  defaultValue = '',
  headingText = T['HeroSearchForm']['Where to?'],
  imputName = 'location',
}) => {
  const [inputValue, setInputValue] = useState('')
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const containerRef = useRef(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  // ─── Geolocation state ───
  const [userCoords, setUserCoords] = useState<{ latitude: number; longitude: number } | null>(null)
  const [geoLoading, setGeoLoading] = useState(false)
  const [geoError, setGeoError] = useState<string | null>(null)

  // Silently request location on mount for proximity bias
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300_000 }
    )
  }, [])

  useEffect(() => {
    setInputValue(defaultValue)
  }, [defaultValue])

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setInputValue(value)

    // Clear previous debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    // Debounce the API call
    debounceRef.current = setTimeout(async () => {
      if (value.length >= 2) {
        setIsLoading(true)
        const results = await searchLocations(value, userCoords)
        setSuggestions(results)
        setIsLoading(false)
      } else {
        setSuggestions([])
      }
    }, 300)
  }, [userCoords])

  const handleSelectLocation = (location: LocationSuggestion) => {
    setInputValue(location.fullAddress)
    setSuggestions([])
    onChange && onChange(location)
  }

  const handleUseCurrentLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser')
      return
    }

    setGeoLoading(true)
    setGeoError(null)

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        setUserCoords({ latitude, longitude })
        setGeoLoading(false)
        // Use exact GPS coordinates — no reverse geocoding
        const location: LocationSuggestion = {
          id: 'current-location',
          name: 'My Location',
          fullAddress: 'Current Location',
          coordinates: { latitude, longitude },
        }
        handleSelectLocation(location)
      },
      (err) => {
        setGeoLoading(false)
        setGeoError(
          err.code === 1
            ? 'Location access denied. Please enable it in your browser settings.'
            : 'Unable to get your location. Please try again.'
        )
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 }
    )
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const renderSearchValues = ({ heading, items }: { heading: string; items: LocationSuggestion[] }) => {
    return (
      <>
        <p className="block text-base font-semibold">{heading}</p>
        <div className="mt-3">
          {items.map((item) => {
            return (
              <div
                className="-mx-2 mb-1 flex cursor-pointer items-center gap-x-3 rounded-lg px-2 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800"
                onClick={() => handleSelectLocation(item)}
                key={item.id}
              >
                <MapPinIcon className="h-5 w-5 shrink-0 text-neutral-500 dark:text-neutral-400" />
                <div className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-neutral-700 dark:text-neutral-200">
                    {item.name}
                  </span>
                  <span className="block truncate text-xs text-neutral-500 dark:text-neutral-400">
                    {item.fullAddress}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </>
    )
  }

  return (
    <div className={clsx(className)} ref={containerRef}>
      <h3 className="text-xl font-semibold sm:text-2xl">{headingText}</h3>
      <div className="relative mt-5">
        <input
          className="block w-full truncate rounded-xl border border-neutral-300 bg-transparent px-4 py-3 pe-12 leading-none font-normal placeholder-neutral-500 placeholder:truncate focus:border-primary-300 focus:ring-3 focus:ring-primary-200/50 sm:text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:placeholder-neutral-300 dark:focus:ring-primary-600/25"
          placeholder="Search for a location..."
          value={inputValue}
          onChange={handleInputChange}
          ref={inputRef}
          name={imputName}
          autoComplete="off"
          autoFocus
          data-autofocus
        />
        <span className="absolute end-2.5 top-1/2 -translate-y-1/2">
          <Search01Icon className="h-5 w-5 text-neutral-700 dark:text-neutral-400" />
        </span>
      </div>
      <div className="mt-7">
        {/* Use Current Location button */}
        <button
          type="button"
          onClick={handleUseCurrentLocation}
          disabled={geoLoading}
          className="-mx-2 mb-3 flex w-[calc(100%+1rem)] cursor-pointer items-center gap-x-3 rounded-lg px-2 py-2.5 hover:bg-neutral-100 dark:hover:bg-neutral-800"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-50 dark:bg-primary-900/30">
            <HugeiconsIcon
              icon={Navigation03Icon}
              className={clsx('h-4 w-4 text-primary-600 dark:text-primary-400', geoLoading && 'animate-pulse')}
            />
          </span>
          <div className="min-w-0 flex-1 text-start">
            <span className="block text-sm font-medium text-primary-600 dark:text-primary-400">
              {geoLoading ? 'Getting your location...' : 'Use my current location'}
            </span>
            {geoError && (
              <span className="block text-xs text-red-500">{geoError}</span>
            )}
          </div>
        </button>

        {isLoading && (
          <p className="text-sm text-neutral-500 dark:text-neutral-400">Searching...</p>
        )}

        {!isLoading && inputValue.length < 2 && (
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Type at least 2 characters to search
          </p>
        )}

        {!isLoading && inputValue.length >= 2 && suggestions.length === 0 && (
          <p className="text-sm text-neutral-500">No locations found. Try a different search.</p>
        )}

        {!isLoading && suggestions.length > 0 &&
          renderSearchValues({
            heading: 'Suggested locations',
            items: suggestions,
          })}
      </div>
    </div>
  )
}

export default LocationInput
