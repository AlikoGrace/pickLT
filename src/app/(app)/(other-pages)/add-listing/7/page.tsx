'use client'

import { useAuth } from '@/context/auth'
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
import { useTranslation } from 'react-i18next'

/** Persisted payment values; `key` is the catalog segment (ids carry `_`). */
const PAYMENT_METHODS = [
  { value: 'cash', key: 'cash' },
  { value: 'bank_transfer', key: 'bankTransfer' },
  { value: 'card', key: 'card' },
] as const

const Page = () => {
  const { t } = useTranslation()
  const router = useRouter()
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const { user } = useAuth()

  const {
    contactInfo,
    updateContactInfo,
    paymentMethod,
    setPaymentMethod,
  } = useMoveSearch()

  // Auto-populate contact info from auth context on mount
  useEffect(() => {
    if (!user) return
    const updates: Record<string, string> = {}
    if (!contactInfo.fullName && user.fullName) updates.fullName = user.fullName
    if (!contactInfo.email && user.email) updates.email = user.email
    if (!contactInfo.phoneNumber && user.phone) updates.phoneNumber = user.phone
    if (Object.keys(updates).length > 0) {
      updateContactInfo(updates)
    }
    // Only run on mount / when user changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const handleSubmitForm = async () => {
    // Basic validation
    const errors: Record<string, string> = {}
    if (!contactInfo.fullName.trim()) {
      errors.fullName = t('booking:contact.name.required.error')
    }
    if (!contactInfo.phoneNumber.trim()) {
      errors.phoneNumber = t('booking:contact.phone.required.error')
    }
    if (!contactInfo.email.trim()) {
      errors.email = t('booking:contact.email.required.error')
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactInfo.email)) {
      errors.email = t('booking:contact.email.invalid.error')
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      return
    }

    // Navigate to the move preview page — actual move creation happens there
    router.push('/move-preview')
  }

  return (
    <>
      <div>
        <h2 className="text-2xl font-semibold">{t('booking:contact.title')}</h2>
        <span className="mt-2 block text-neutral-500 dark:text-neutral-400">
          {t('booking:contact.subtitle')}
        </span>
      </div>

      <Divider />

      <Form id="add-listing-form" action={handleSubmitForm} className="flex flex-col gap-y-8">
        {/* Full Name */}
        <FormItem label={t('common:field.fullName.label')} desccription={t('booking:contact.name.helper')}>
          <Input
            name="fullName"
            placeholder={t('booking:contact.name.placeholder')}
            value={contactInfo.fullName}
            onChange={(e) => updateContactInfo({ fullName: e.target.value })}
          />
          {formErrors.fullName && (
            <div className="text-sm text-red-600 mt-2">{formErrors.fullName}</div>
          )}
        </FormItem>

        {/* Phone Number */}
        <FormItem label={t('common:field.phone.label')} desccription={t('booking:contact.phone.helper')}>
          <Input
            name="phoneNumber"
            type="tel"
            placeholder={t('booking:contact.phone.placeholder')}
            value={contactInfo.phoneNumber}
            onChange={(e) => updateContactInfo({ phoneNumber: e.target.value })}
          />
          {formErrors.phoneNumber && (
            <div className="text-sm text-red-600 mt-2">{formErrors.phoneNumber}</div>
          )}
        </FormItem>

        {/* Email */}
        <FormItem label={t('auth:field.email.label')} desccription={t('booking:contact.email.helper')}>
          <Input
            name="email"
            type="email"
            placeholder={t('booking:contact.email.placeholder')}
            value={contactInfo.email}
            onChange={(e) => updateContactInfo({ email: e.target.value })}
          />
          {formErrors.email && (
            <div className="text-sm text-red-600 mt-2">{formErrors.email}</div>
          )}
        </FormItem>

        {/* Notes for Movers */}
        <FormItem label={t('booking:contact.notes.label')} desccription={t('booking:contact.notes.helper')}>
          <Textarea
            name="notesForMovers"
            placeholder={t('booking:contact.notes.placeholder')}
            value={contactInfo.notesForMovers}
            onChange={(e) => updateContactInfo({ notesForMovers: e.target.value })}
            rows={3}
          />
        </FormItem>

        <Divider />

        {/* Payment Method */}
        <FormItem
          label={t('booking:payment.method.label')}
          desccription={t('booking:payment.method.helper')}
        >
          <div className="flex flex-col gap-3">
            {/* i18n-keys: booking.payment.cash.label, booking.payment.bankTransfer.label, booking.payment.card.label */}
            {PAYMENT_METHODS.map((option) => (
              <label
                key={option.value}
                className={`flex items-center gap-3 cursor-pointer rounded-xl border p-4 transition-colors ${
                  paymentMethod === option.value
                    ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600'
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value={option.value}
                  checked={paymentMethod === option.value}
                  onChange={() => setPaymentMethod(option.value)}
                  className="accent-primary-600"
                />
                <span className="text-sm font-medium">{t(`booking:payment.${option.key}.label`)}</span>
              </label>
            ))}
          </div>
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
              <Label>{t('booking:business.isBusiness.label')}</Label>
            </CheckboxField>
          </CheckboxGroup>
        </Fieldset>

        {/* Conditional: Business Details */}
        {contactInfo.isBusinessMove && (
          <div className="p-4 bg-neutral-50 dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700 space-y-6">
            <p className="text-lg font-semibold">{t('booking:business.title')}</p>
            
            <FormItem label={t('booking:business.company.label')}>
              <Input
                name="companyName"
                placeholder={t('booking:business.company.placeholder')}
                value={contactInfo.companyName || ''}
                onChange={(e) => updateContactInfo({ companyName: e.target.value })}
              />
            </FormItem>

            <FormItem label={t('booking:business.vatId.label')} desccription={t('booking:business.vatId.helper')}>
              <Input
                name="vatId"
                placeholder={t('booking:business.vatId.placeholder')}
                value={contactInfo.vatId || ''}
                onChange={(e) => updateContactInfo({ vatId: e.target.value })}
              />
            </FormItem>
          </div>
        )}

        {/* Hidden fields for form data */}
        <input type="hidden" name="contactInfoData" value={JSON.stringify(contactInfo)} />

        {/* Submit error */}
        {formErrors.submit && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
            {formErrors.submit}
          </div>
        )}
      </Form>
    </>
  )
}

export default Page
