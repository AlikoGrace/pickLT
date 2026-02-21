'use client'

import { useInteractOutside } from '@/hooks/useInteractOutside'
import { Divider } from '@/shared/divider'
import T from '@/utils/getT'
import * as Headless from '@headlessui/react'
import { MapPinIcon } from '@heroicons/react/24/outline'
import { Location01Icon, Navigation03Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import clsx from 'clsx'
import { FC, useCallback, useEffect, useRef, useState } from 'react'
import { ClearDataButton } from './ClearDataButton'

export type LocationSuggestion = {
  id: string
  name: string
  fullAddress: string
  coordinates?: {
    latitude: number
    longitude: number
  }
}

const styles = {
  button: {
    base: 'relative z-10 shrink-0 w-full cursor-pointer flex items-center gap-x-3 focus:outline-hidden text-start',
    focused: 'rounded-full bg-transparent focus-visible:outline-hidden dark:bg-white/5 custom-shadow-1',
    default: 'px-7 py-4 xl:px-8 xl:py-6',
    small: 'py-3 px-7 xl:px-8',
  },
  input: {
    base: 'block w-full truncate border-none bg-transparent p-0 font-semibold placeholder-neutral-800 focus:placeholder-neutral-300 focus:ring-0 focus:outline-hidden dark:placeholder-neutral-200',
    default: 'text-base xl:text-lg',
    small: 'text-base',
  },
  panel: {
    base: 'absolute start-0 top-full z-40 mt-3 hidden-scrollbar max-h-96 overflow-y-auto rounded-3xl bg-white py-3 shadow-xl transition duration-150 data-closed:translate-y-1 data-closed:opacity-0 dark:bg-neutral-800',
    default: 'w-lg sm:py-6',
    small: 'w-md sm:py-5',
  },
}

interface Props {
  placeholder?: string
  description?: string
  className?: string
  inputName?: string
  fieldStyle: 'default' | 'small'
  onChange?: (location: LocationSuggestion | null) => void
}

// ─── Mapbox Geocoding helpers ────────────────────────────────
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

    // Proximity bias hugely improves POI / building relevance
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

export const LocationInputField: FC<Props> = ({
  placeholder = T['HeroSearchForm']['Location'],
  description = T['HeroSearchForm']['Where are you going?'],
  className = 'flex-1',
  inputName = 'location',
  fieldStyle = 'default',
  onChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [showPopover, setShowPopover] = useState(false)
  const [selected, setSelected] = useState<LocationSuggestion | null>(null)
  const [inputValue, setInputValue] = useState('')
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  // ─── Geolocation state ───
  const [userCoords, setUserCoords] = useState<{ latitude: number; longitude: number } | null>(null)
  const [geoLoading, setGeoLoading] = useState(false)
  const [geoError, setGeoError] = useState<string | null>(null)

  // Request user location on mount (prompt once)
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      () => { /* silently ignore — user denied or unavailable */ },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300_000 }
    )
  }, [])

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

  useEffect(() => {
    const _inputFocusTimeOut = setTimeout(() => {
      if (showPopover && inputRef.current) {
        inputRef.current.focus()
      }
    }, 200)
    return () => {
      clearTimeout(_inputFocusTimeOut)
    }
  }, [showPopover])

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [])

  const closePopover = useCallback(() => {
    setShowPopover(false)
  }, [])

  useInteractOutside(containerRef, closePopover)

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setInputValue(value)
    setShowPopover(true)

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

  const handleSelectLocation = useCallback(
    (location: LocationSuggestion | null) => {
      setSelected(location)
      setInputValue(location?.fullAddress || '')
      setSuggestions([])

      if (location?.id) {
        setShowPopover(false)
        setTimeout(() => {
          inputRef.current?.blur()
        }, 50)
      }

      // Notify parent component
      onChange?.(location)
    },
    [onChange]
  )

  return (
    <div
      className={`group relative z-10 flex ${className}`}
      ref={containerRef}
      {...(showPopover && {
        'data-open': 'true',
      })}
    >
      <Headless.Combobox
        value={selected}
        onChange={handleSelectLocation}
      >
        <div
          onMouseDown={() => setShowPopover(true)}
          onTouchStart={() => setShowPopover(true)}
          className={clsx(styles.button.base, styles.button[fieldStyle], showPopover && styles.button.focused)}
        >
          {fieldStyle === 'default' && (
            <MapPinIcon className="size-5 text-neutral-300 lg:size-7 dark:text-neutral-400" />
          )}

          <div className="grow">
            <Headless.ComboboxInput
              ref={inputRef}
              aria-label="Search for a location"
              className={clsx(styles.input.base, styles.input[fieldStyle])}
              name={inputName}
              placeholder={placeholder}
              autoComplete="off"
              value={inputValue}
              displayValue={(item?: LocationSuggestion) => item?.fullAddress || inputValue}
              onChange={handleInputChange}
            />
            <div className="mt-0.5 text-start text-sm font-light text-neutral-400">
              <span className="line-clamp-1">{description}</span>
            </div>

            <ClearDataButton
              className={clsx(!selected?.id && !inputValue && 'sr-only')}
              onClick={() => {
                setSelected(null)
                setInputValue('')
                setSuggestions([])
                setShowPopover(false)
                inputRef.current?.focus()
                onChange?.(null)
              }}
            />
          </div>
        </div>

        <Headless.Transition show={showPopover} unmount={false}>
          <div className={clsx(styles.panel.base, styles.panel[fieldStyle])}>
            {/* Use Current Location button */}
            <button
              type="button"
              onClick={handleUseCurrentLocation}
              disabled={geoLoading}
              className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-start hover:bg-neutral-100 sm:gap-4.5 sm:px-8 dark:hover:bg-neutral-700"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-50 dark:bg-primary-900/30">
                <HugeiconsIcon
                  icon={Navigation03Icon}
                  className={clsx('size-4 text-primary-600 dark:text-primary-400', geoLoading && 'animate-pulse')}
                />
              </span>
              <div className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-primary-600 dark:text-primary-400">
                  {geoLoading ? 'Getting your location...' : 'Use my current location'}
                </span>
                {geoError && (
                  <span className="block text-xs text-red-500">{geoError}</span>
                )}
              </div>
            </button>
            <Divider className="opacity-50" />

            {isLoading && (
              <p className="px-4 py-3 text-sm text-neutral-500 sm:px-8 dark:text-neutral-400">
                Searching...
              </p>
            )}

            {!isLoading && inputValue.length < 2 && (
              <p className="px-4 py-3 text-sm text-neutral-500 sm:px-8 dark:text-neutral-400">
                Type to search for locations
              </p>
            )}

            {!isLoading && inputValue.length >= 2 && suggestions.length === 0 && (
              <p className="px-4 py-3 text-sm text-neutral-500 sm:px-8 dark:text-neutral-400">
                No locations found
              </p>
            )}

            {suggestions.length > 0 && (
              <>
                <p className="mt-2 mb-3 px-4 text-xs/6 font-normal text-neutral-600 sm:mt-0 sm:px-8 dark:text-neutral-400">
                  {T['HeroSearchForm']['Suggested locations']}
                </p>
                <Divider className="opacity-50" />
              </>
            )}

            <Headless.ComboboxOptions static unmount={false}>
              {suggestions.map((item) => (
                <Headless.ComboboxOption
                  key={item.id}
                  value={item}
                  className="flex cursor-pointer items-center gap-3 p-4 data-focus:bg-neutral-100 sm:gap-4.5 sm:px-8 dark:data-focus:bg-neutral-700"
                >
                  <HugeiconsIcon
                    icon={Location01Icon}
                    className="size-4 shrink-0 text-neutral-400 sm:size-6 dark:text-neutral-500"
                  />
                  <div className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-neutral-700 dark:text-neutral-200">
                      {item.name}
                    </span>
                    <span className="block truncate text-sm text-neutral-500 dark:text-neutral-400">
                      {item.fullAddress}
                    </span>
                  </div>
                </Headless.ComboboxOption>
              ))}
            </Headless.ComboboxOptions>
          </div>
        </Headless.Transition>
      </Headless.Combobox>
    </div>
  )
}
