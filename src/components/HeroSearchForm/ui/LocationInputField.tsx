'use client'

import { useInteractOutside } from '@/hooks/useInteractOutside'
import { Divider } from '@/shared/divider'
import T from '@/utils/getT'
import * as Headless from '@headlessui/react'
import { MapPinIcon } from '@heroicons/react/24/outline'
import { Location01Icon } from '@hugeicons/core-free-icons'
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

// Mapbox Geocoding API function
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
        const results = await searchLocations(value)
        setSuggestions(results)
        setIsLoading(false)
      } else {
        setSuggestions([])
      }
    }, 300)
  }, [])

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
