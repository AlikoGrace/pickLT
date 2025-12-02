'use client'

import T from '@/utils/getT'
import clsx from 'clsx'
import Form from 'next/form'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { ButtonSubmit, DateRangeField, GuestNumberField, LocationInputField, VerticalDividerLine } from './ui'

interface Props {
  className?: string
  formStyle: 'default' | 'small'
}

export const ExperiencesSearchForm = ({ className, formStyle = 'default' }: Props) => {
  const router = useRouter()

  // Prefetch the stay categories page to improve performance
  useEffect(() => {
    router.prefetch('/experience-categories/all')
  }, [router])

  const handleFormSubmit = (formData: FormData) => {
    const formDataEntries = Object.fromEntries(formData.entries())
    console.log('Form submitted', formDataEntries)
    // You can also redirect or perform other actions based on the form data

    // example: add location to the URL
    const location = formDataEntries['location'] as string
    let url = '/experience-categories/all'
    if (location) {
      url = url + `?location=${encodeURIComponent(location)}`
    }
    router.push(url)
  }

  return (
    <Form
      className={clsx(
        'relative z-10 flex w-full rounded-full bg-white shadow-xl [--form-bg:var(--color-white)] dark:bg-neutral-800 dark:shadow-2xl dark:[--form-bg:var(--color-neutral-800)]',
        className,
        formStyle === 'small' && 'custom-shadow-1',
        formStyle === 'default' && 'shadow-xl dark:shadow-2xl'
      )}
      action={handleFormSubmit}
    >
      <LocationInputField className="hero-search-form__field-after flex-5/12" fieldStyle={formStyle} />
      <VerticalDividerLine />
      <DateRangeField
        className="hero-search-form__field-before hero-search-form__field-after flex-4/12"
        fieldStyle={formStyle}
        description={T['HeroSearchForm']['Date range']}
      />
      <VerticalDividerLine />
      <GuestNumberField
        className="hero-search-form__field-before flex-4/12"
        clearDataButtonClassName={clsx(formStyle === 'small' && 'sm:end-18', formStyle === 'default' && 'sm:end-22')}
        fieldStyle={formStyle}
      />

      <ButtonSubmit fieldStyle={formStyle} className="z-10" />
    </Form>
  )
}
