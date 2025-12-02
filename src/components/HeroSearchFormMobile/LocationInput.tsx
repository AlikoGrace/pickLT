'use client'

import { Search01Icon } from '@/components/Icons'
import T from '@/utils/getT'
import { MapPinIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'
import { FC, useEffect, useRef, useState } from 'react'

interface Props {
  onClick?: () => void
  onChange?: (value: string) => void
  className?: string
  defaultValue?: string
  headingText?: string
  imputName?: string
}

const LocationInput: FC<Props> = ({
  onChange,
  className,
  defaultValue = 'United States',
  headingText = T['HeroSearchForm']['Where to?'],
  imputName = 'location',
}) => {
  const [value, setValue] = useState('')
  const containerRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    setValue(defaultValue)
  }, [defaultValue])

  const handleSelectLocation = (item: string) => {
    // DO NOT REMOVE SETTIMEOUT FUNC
    setTimeout(() => {
      setValue(item)
      onChange && onChange(item)
    }, 0)
  }

  const renderSearchValues = ({ heading, items }: { heading: string; items: string[] }) => {
    return (
      <>
        <p className="block text-base font-semibold">{heading || T['HeroSearchForm']['Destinations']}</p>
        <div className="mt-3">
          {items.map((item) => {
            return (
              <div
                className="mb-1 flex items-center gap-x-3 py-2 text-sm"
                onClick={() => handleSelectLocation(item)}
                key={item}
              >
                <MapPinIcon className="h-5 w-5 text-neutral-500 dark:text-neutral-400" />
                <span>{item}</span>
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
          placeholder={T['HeroSearchForm']['Search destinations']}
          value={value}
          onChange={(e) => setValue(e.currentTarget.value)}
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
        {value
          ? // if input value is not empty, show suggestions based on input
            renderSearchValues({
              heading: T['HeroSearchForm']['Locations'],
              items: ['Afghanistan', 'Albania', 'Algeria', 'American Samao', 'Andorra'],
            })
          : // if input value is empty, show popular destinations suggestions
            renderSearchValues({
              heading: T['HeroSearchForm']['Popular destinations'],
              items: ['Australia', 'Canada', 'Germany', 'United Kingdom', 'United Arab Emirates'],
            })}
      </div>
    </div>
  )
}

export default LocationInput
