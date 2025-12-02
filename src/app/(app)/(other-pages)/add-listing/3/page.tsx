'use client'

import NcInputNumber from '@/components/NcInputNumber'
import { Divider } from '@/shared/divider'
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
    router.prefetch('/add-listing/4')
  }, [router])

  const handleSubmitForm = async (formData: FormData) => {
    const formObject = Object.fromEntries(formData.entries())
    // Handle form submission logic here
    console.log('Form submitted:', formObject)

    // Redirect to the next step
    router.push('/add-listing/4')
  }

  return (
    <>
      <h1 className="text-2xl font-semibold">{T['addListings']['page3']['pageTitle']}</h1>
      <Divider className="w-14!" />

      {/* FORM */}
      <Form id="add-listing-form" action={handleSubmitForm} className="space-y-5">
        {/* ITEM */}
        <FormItem label={T['addListings']['page3']['Acreage (m2)']}>
          <Select name="acreage">
            <option value="100">100</option>
            <option value="200">200</option>
            <option value="300">300</option>
            <option value="400">400</option>
            <option value="500">500</option>
          </Select>
        </FormItem>
        <Divider />
        <NcInputNumber inputName="Guests" label={T['addListings']['page3']['Guests']} defaultValue={4} />
        <Divider />
        <NcInputNumber inputName="Bedroom" label={T['addListings']['page3']['Bedroom']} defaultValue={4} />
        <Divider />
        <NcInputNumber inputName="Beds" label={T['addListings']['page3']['Beds']} defaultValue={4} />
        <Divider />
        <NcInputNumber inputName="Bathroom" label={T['addListings']['page3']['Bathroom']} defaultValue={2} />
        <Divider />
        <NcInputNumber inputName="Kitchen" label={T['addListings']['page3']['Kitchen']} defaultValue={2} />
      </Form>
    </>
  )
}

export default Page
