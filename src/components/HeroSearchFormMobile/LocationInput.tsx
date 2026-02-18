'use client'

import { Search01Icon } from '@/components/Icons'
import T from '@/utils/getT'
import { MapPinIcon } from '@heroicons/react/24/outline'
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

// Mapbox Geocoding API function (same as desktop)
async function searchLocations(query: string): Promise<LocationSuggestion[]> {
  if (!query || query.length < 2) return []

  const accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN
  if (!accessToken) {
    console.error('Mapbox access token is not configured')
    return []
  }

  try {
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?` +
        new URLSearchParams({
          access_token: accessToken,
          autocomplete: 'true',
          types: 'place,locality,neighborhood,address,poi',
          limit: '6',
        })
    )

    if (!response.ok) {
      throw new Error('Failed to fetch locations')
    }

    const data = await response.json()

    return data.features.map((feature: any) => ({
      id: feature.id,
      name: feature.text,
      fullAddress: feature.place_name,
      coordinates: {
        latitude: feature.center[1],
        longitude: feature.center[0],
      },
    }))
  } catch (error) {
    console.error('Error fetching locations:', error)
    return []
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
        const results = await searchLocations(value)
        setSuggestions(results)
        setIsLoading(false)
      } else {
        setSuggestions([])
      }
    }, 300)
  }, [])

  const handleSelectLocation = (location: LocationSuggestion) => {
    setInputValue(location.fullAddress)
    setSuggestions([])
    onChange && onChange(location)
  }

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
