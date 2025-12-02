'use client'

import { Description, Field, Label } from '@/shared/fieldset'
import Input from '@/shared/Input'
import Textarea from '@/shared/Textarea'
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from '@headlessui/react'
import { MasterCardIcon, PaypalIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import React from 'react'

const PayWith = () => {
  const [paymentMethod, setPaymentMethod] = React.useState('paypal')

  return (
    <div className="pt-5">
      <h3 className="text-2xl font-semibold">Pay with</h3>
      <div className="my-5 w-14 border-b border-neutral-200 dark:border-neutral-700"></div>

      <TabGroup
        className="mt-6"
        onChange={(index) => {
          setPaymentMethod(index === 0 ? 'paypal' : 'creditCard')
        }}
      >
        <TabList className="my-5 flex gap-1 text-sm">
          <Tab className="flex items-center gap-x-2 rounded-full px-4 py-2.5 leading-none font-medium data-hover:bg-black/5 data-selected:bg-neutral-900 data-selected:text-white sm:px-6 dark:data-selected:bg-neutral-100 dark:data-selected:text-neutral-900">
            Paypal
            <HugeiconsIcon icon={PaypalIcon} size={20} strokeWidth={1.5} />
          </Tab>
          <Tab className="flex items-center gap-x-2 rounded-full px-4 py-2.5 leading-none font-medium data-hover:bg-black/5 data-selected:bg-neutral-900 data-selected:text-white sm:px-6 dark:data-selected:bg-neutral-100 dark:data-selected:text-neutral-900">
            <div className="flex items-center gap-x-2">
              Credit card
              <HugeiconsIcon icon={MasterCardIcon} size={20} strokeWidth={1.5} />
            </div>
          </Tab>
        </TabList>

        <TabPanels>
          <TabPanel className="flex flex-col gap-y-5">
            <Field>
              <Label>Card number </Label>
              <Input name="card-number" className="mt-1.5" defaultValue="111 112 222 999" />
            </Field>
            <Field>
              <Label>Card holder </Label>
              <Input name="card-holder" defaultValue="JOHN DOE" />
            </Field>
            <div className="flex gap-x-5">
              <Field>
                <Label>Expiration date </Label>
                <Input name="expiration-date" className="mt-1.5" type="date" defaultValue="MM/YY" />
              </Field>
              <Field>
                <Label>CVC </Label>
                <Input name="CVC" className="mt-1.5" />
              </Field>
            </div>
            <Field>
              <Label>Messager for author </Label>
              <Textarea name="message" className="mt-1.5" placeholder="..." />
              <Description>Write a few sentences about yourself.</Description>
            </Field>
          </TabPanel>
          <TabPanel className="flex flex-col gap-y-5">
            <Field>
              <Label>Email </Label>
              <Input name="email" className="mt-1.5" type="email" defaultValue="example@gmail.com" />
            </Field>
            <Field>
              <Label>Password </Label>
              <Input name="password" className="mt-1.5" type="password" defaultValue="***" />
            </Field>
            <Field>
              <Label>Messager for author </Label>
              <Textarea name="message" className="mt-1.5" placeholder="..." />
              <Description className="block text-sm text-neutral-500">
                Write a few sentences about yourself.
              </Description>
            </Field>
          </TabPanel>
        </TabPanels>
      </TabGroup>

      <input type="hidden" name="paymentMethod" value={paymentMethod} />
    </div>
  )
}

export default PayWith
