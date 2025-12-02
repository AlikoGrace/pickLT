'use client'

import { Divider } from '@/shared/divider'
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
    router.prefetch('/add-listing/9')
  }, [router])

  const handleSubmitForm = async (formData: FormData) => {
    const formObject = Object.fromEntries(formData.entries())
    // Handle form submission logic here
    console.log('Form submitted:', formObject)

    // Redirect to the next step
    router.push('/add-listing/9')
  }

  return (
    <>
      <div>
        <h2 className="text-2xl font-semibold">{T['addListings']['page8']['pageTitle']}</h2>
        <span className="mt-2 block text-neutral-500 dark:text-neutral-400">
          {T['addListings']['page8']['pageDescription']}
        </span>
      </div>

      <Divider className="w-14!" />
      {/* FORM */}
      <Form id="add-listing-form" action={handleSubmitForm} className="space-y-8">
        {/* ITEM */}
        <FormItem label={T['addListings']['page8']['Currency']}>
          <Select name="currency">
            <option value="USD">USD</option>
            <option value="VND">VND</option>
            <option value="EURRO">EURRO</option>
          </Select>
        </FormItem>
        <FormItem label={T['addListings']['page8']['Base price (Monday -Thuday)']}>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3">
              <span className="text-gray-500">$</span>
            </div>
            <Input name="base-price1" className="ps-8! pe-10!" placeholder="0.00" />
            <div className="pointer-events-none absolute inset-y-0 end-0 flex items-center pe-3">
              <span className="text-gray-500">USD</span>
            </div>
          </div>
        </FormItem>
        {/* ----- */}
        <FormItem label={T['addListings']['page8']['Base price (Friday-Sunday)']}>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3">
              <span className="text-gray-500">$</span>
            </div>
            <Input name="base-price2" className="ps-8! pe-10!" placeholder="0.00" />
            <div className="pointer-events-none absolute inset-y-0 end-0 flex items-center pe-3">
              <span className="text-gray-500">USD</span>
            </div>
          </div>
        </FormItem>
        {/* ----- */}
        <FormItem label={T['addListings']['page8']['Long term price (Monthly discount)']}>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3">
              <span className="text-gray-500">%</span>
            </div>
            <Input name="long-price3" className="ps-8! pe-10!" placeholder="0.00" />
            <div className="pointer-events-none absolute inset-y-0 end-0 flex items-center pe-3">
              <span className="text-gray-500">every month</span>
            </div>
          </div>
        </FormItem>
      </Form>
    </>
  )
}

export default Page
