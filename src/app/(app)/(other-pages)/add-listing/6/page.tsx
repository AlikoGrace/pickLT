'use client'

import Textarea from '@/shared/Textarea'
import T from '@/utils/getT'
import Form from 'next/form'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

const PageAddListing6 = () => {
  const router = useRouter()

  // Prefetch the next step to improve performance
  useEffect(() => {
    router.prefetch('/add-listing/7')
  }, [router])

  const handleSubmitForm = async (formData: FormData) => {
    const formObject = Object.fromEntries(formData.entries())
    // Handle form submission logic here
    console.log('Form submitted:', formObject)

    // Redirect to the next step
    router.push('/add-listing/7')
  }

  return (
    <>
      <div>
        <h2 className="text-2xl font-semibold">{T['addListings']['page6']['pageTitle']}</h2>
        <span className="mt-2 block text-neutral-500 dark:text-neutral-400">
          {T['addListings']['page6']['pageDescription']}
        </span>
      </div>

      <Form id="add-listing-form" action={handleSubmitForm}>
        <Textarea name="place-description" placeholder="..." rows={14} />
      </Form>
    </>
  )
}

export default PageAddListing6
