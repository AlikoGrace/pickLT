'use client'

import T from '@/utils/getT'
import * as Headless from '@headlessui/react'
import clsx from 'clsx'
import Form from 'next/form'
import { useRouter } from 'next/navigation'
import { FC, useEffect, useState } from 'react'
import {
  ButtonSubmit,
  LocationInputField,
  PriceRangeInputField,
  PropertyTypeSelectField,
  VerticalDividerLine,
} from './ui'

type Tab = 'buy' | 'rent' | 'sell'

interface Props {
  className?: string
  formStyle: 'default' | 'small'
}

const tabs = [
  { value: 'buy', label: T['HeroSearchForm']['Buy'] },
  { value: 'rent', label: T['HeroSearchForm']['Rent'] },
  { value: 'sell', label: T['HeroSearchForm']['Sell'] },
] as const

export const RealEstateHeroSearchForm: FC<Props> = ({ className, formStyle = 'default' }) => {
  const [tabType, setTabType] = useState<Tab>(tabs[0].value)
  const router = useRouter()

  // Prefetch the stay categories page to improve performance
  useEffect(() => {
    router.prefetch('/real-estate-categories/all')
  }, [router])

  const handleFormSubmit = (formData: FormData) => {
    const formDataEntries = Object.fromEntries(formData.entries())
    console.log('Form submitted', formDataEntries)
    // You can also redirect or perform other actions based on the form data

    // example: add location to the URL
    const location = formDataEntries['location'] as string
    let url = '/real-estate-categories/all'
    if (location) {
      url = url + `?location=${encodeURIComponent(location)}`
    }
    router.push(url)
  }

  return (
    <Form
      action={handleFormSubmit}
      className={clsx(
        'relative z-10 w-full bg-white [--form-bg:var(--color-white)] dark:bg-neutral-800 dark:[--form-bg:var(--color-neutral-800)]',
        className,
        formStyle === 'small' && 'rounded-t-2xl rounded-b-4xl custom-shadow-1',
        formStyle === 'default' &&
          'rounded-t-2xl rounded-b-[40px] shadow-xl xl:rounded-t-3xl xl:rounded-b-[48px] dark:shadow-2xl'
      )}
    >
      {/* RADIO */}
      <Headless.RadioGroup
        value={tabType}
        onChange={setTabType}
        aria-label="Real Estate Tab Type"
        name="real_estate_tab_type"
        className={clsx(
          'flex flex-wrap items-center gap-2.5 border-b border-neutral-100 dark:border-neutral-700',
          formStyle === 'small' && 'px-7 py-4 xl:px-8',
          formStyle === 'default' && 'px-7 py-4 xl:px-8 xl:py-6'
        )}
      >
        {tabs.map((tab) => (
          <Headless.Field key={tab.value}>
            <Headless.Radio
              value={tab.value}
              className={`flex cursor-pointer items-center rounded-full border border-neutral-300 px-4 py-1.5 text-xs font-medium data-checked:bg-black data-checked:text-white data-checked:shadow-lg data-checked:shadow-black/10 dark:border-neutral-700 dark:data-checked:bg-neutral-200 dark:data-checked:text-neutral-900`}
            >
              {tab.label}
            </Headless.Radio>
          </Headless.Field>
        ))}
      </Headless.RadioGroup>

      {/*  */}
      <div className="relative flex">
        <LocationInputField
          className="hero-search-form__field-after flex-1"
          description="Location, city, or property name"
          fieldStyle={formStyle}
        />
        <VerticalDividerLine />
        <PropertyTypeSelectField
          fieldStyle={formStyle}
          className="hero-search-form__field-before hero-search-form__field-after flex-1"
        />
        <VerticalDividerLine />
        <PriceRangeInputField
          fieldStyle={formStyle}
          className="hero-search-form__field-before flex-1"
          clearDataButtonClassName={clsx(formStyle === 'small' && 'sm:end-18', formStyle === 'default' && 'sm:end-22')}
        />

        <ButtonSubmit fieldStyle={formStyle} />
      </div>
    </Form>
  )
}
