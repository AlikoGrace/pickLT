'use client'

import Input from '@/shared/Input'
import Select from '@/shared/Select'
import T from '@/utils/getT'
import Form from 'next/form'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import FormItem from '../FormItem'

const Page = () => {
  const router = useRouter()

  // Prefetch the next step to improve performance
  useEffect(() => {
    router.prefetch('/add-listing/2')
  }, [router])

  const handleSubmitForm = async (formData: FormData) => {
    const formObject = Object.fromEntries(formData.entries())
    // Handle form submission logic here
    console.log('Form submitted:', formObject)

    // Redirect to the next step
    router.push('/add-listing/2')
  }

  return (
    <>
      <h1 className="text-2xl font-semibold">{T['addListings']['page1']['pageTitle']}</h1>
      <div className="w-14 border-b border-neutral-200 dark:border-neutral-700"></div>
      {/* FORM */}
      <Form id="add-listing-form" action={handleSubmitForm} className="flex flex-col gap-y-8">
        {/* ITEM */}
        <FormItem
          label={T['addListings']['page1']['Choose a property type']}
          desccription={T['addListings']['page1']['propertyTypeDescription']}
        >
          <Select name="propertyType">
            <option value="Apartment">Apartment</option>
            <option value="Hotel">Hotel</option>
            <option value="Cottage">Cottage</option>
            <option value="Villa">Villa</option>
            <option value="Cabin">Cabin</option>
            <option value="Farm stay">Farm stay</option>
            <option value="Houseboat">Houseboat</option>
            <option value="Lighthouse">Lighthouse</option>
          </Select>
        </FormItem>
        <FormItem
          label={T['addListings']['page1']['Place name']}
          desccription={T['addListings']['page1']['placeNameDescription']}
        >
          <Input placeholder={T['addListings']['page1']['Place name']} name="place-name" />
        </FormItem>
        <FormItem
          label={T['addListings']['page1']['Rental form']}
          desccription={T['addListings']['page1']['rentalFormDescription']}
        >
          <Select name="rentalForm">
            <option value="Hotel">Entire place</option>
            <option value="Private room">Private room</option>
            <option value="Share room">Share room</option>
          </Select>
        </FormItem>
      </Form>
    </>
  )
}

export default Page
