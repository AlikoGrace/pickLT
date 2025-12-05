'use client'

import { useMoveSearch } from '@/context/moveSearch'
import { Checkbox, CheckboxField, CheckboxGroup } from '@/shared/Checkbox'
import { Divider } from '@/shared/divider'
import { Fieldset, Label } from '@/shared/fieldset'
import Input from '@/shared/Input'
import Textarea from '@/shared/Textarea'
import Form from 'next/form'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import FormItem from '../FormItem'

const Page = () => {
  const router = useRouter()
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  const { contactInfo, updateContactInfo } = useMoveSearch()

  // Prefetch the next step to improve performance
  useEffect(() => {
    router.prefetch('/add-listing/10')
  }, [router])

  const handleSubmitForm = async (formData: FormData) => {
    const formObject = Object.fromEntries(formData.entries())
    console.log('Form submitted:', formObject)

    // Basic validation
    const errors: Record<string, string> = {}
    if (!contactInfo.fullName.trim()) {
      errors.fullName = 'Please enter your full name'
    }
    if (!contactInfo.phoneNumber.trim()) {
      errors.phoneNumber = 'Please enter your phone number'
    }
    if (!contactInfo.email.trim()) {
      errors.email = 'Please enter your email address'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactInfo.email)) {
      errors.email = 'Please enter a valid email address'
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      return
    }

    // Redirect to the next step
    router.push('/add-listing/10')
  }

  return (
    <>
      <div>
        <h2 className="text-2xl font-semibold">Contact information</h2>
        <span className="mt-2 block text-neutral-500 dark:text-neutral-400">
          We&apos;ll use this information to confirm your booking and coordinate the move.
        </span>
      </div>

      <Divider />

      <Form id="add-listing-form" action={handleSubmitForm} className="flex flex-col gap-y-8">
        {/* Full Name */}
        <FormItem label="Full name" desccription="Your first and last name">
          <Input
            name="fullName"
            placeholder="e.g., Max Mustermann"
            value={contactInfo.fullName}
            onChange={(e) => updateContactInfo({ fullName: e.target.value })}
          />
          {formErrors.fullName && (
            <div className="text-sm text-red-600 mt-2">{formErrors.fullName}</div>
          )}
        </FormItem>

        {/* Phone Number */}
        <FormItem label="Phone number" desccription="We may call to confirm details">
          <Input
            name="phoneNumber"
            type="tel"
            placeholder="e.g., +49 170 1234567"
            value={contactInfo.phoneNumber}
            onChange={(e) => updateContactInfo({ phoneNumber: e.target.value })}
          />
          {formErrors.phoneNumber && (
            <div className="text-sm text-red-600 mt-2">{formErrors.phoneNumber}</div>
          )}
        </FormItem>

        {/* Email */}
        <FormItem label="Email address" desccription="For booking confirmation and updates">
          <Input
            name="email"
            type="email"
            placeholder="e.g., max@example.com"
            value={contactInfo.email}
            onChange={(e) => updateContactInfo({ email: e.target.value })}
          />
          {formErrors.email && (
            <div className="text-sm text-red-600 mt-2">{formErrors.email}</div>
          )}
        </FormItem>

        {/* Notes for Movers */}
        <FormItem label="Notes for movers (optional)" desccription="Any special instructions or requests">
          <Textarea
            name="notesForMovers"
            placeholder="e.g., Please call 30 minutes before arrival, fragile items in bedroom..."
            value={contactInfo.notesForMovers}
            onChange={(e) => updateContactInfo({ notesForMovers: e.target.value })}
            rows={3}
          />
        </FormItem>

        <Divider />

        {/* Business Move Checkbox */}
        <Fieldset>
          <CheckboxGroup>
            <CheckboxField>
              <Checkbox
                name="isBusinessMove"
                checked={contactInfo.isBusinessMove}
                onChange={(checked) => updateContactInfo({ isBusinessMove: checked })}
              />
              <Label>This is a business move (I need an invoice with VAT)</Label>
            </CheckboxField>
          </CheckboxGroup>
        </Fieldset>

        {/* Conditional: Business Details */}
        {contactInfo.isBusinessMove && (
          <div className="p-4 bg-neutral-50 dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700 space-y-6">
            <p className="text-lg font-semibold">Business details</p>
            
            <FormItem label="Company name">
              <Input
                name="companyName"
                placeholder="e.g., Mustermann GmbH"
                value={contactInfo.companyName || ''}
                onChange={(e) => updateContactInfo({ companyName: e.target.value })}
              />
            </FormItem>

            <FormItem label="VAT ID (USt-IdNr.)" desccription="For EU business invoices">
              <Input
                name="vatId"
                placeholder="e.g., DE123456789"
                value={contactInfo.vatId || ''}
                onChange={(e) => updateContactInfo({ vatId: e.target.value })}
              />
            </FormItem>
          </div>
        )}

        {/* Hidden fields for form data */}
        <input type="hidden" name="contactInfoData" value={JSON.stringify(contactInfo)} />
      </Form>
    </>
  )
}

export default Page
