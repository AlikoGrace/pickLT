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

const Page = () => {
  const router = useRouter()
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { user } = useAuth()

  const {
    contactInfo,
    updateContactInfo,
    // All move data for DB creation
    pickupLocation,
    dropoffLocation,
    pickupCoordinates,
    dropoffCoordinates,
    moveDate,
    moveType,
    homeType,
    floorLevel,
    elevatorAvailable,
    parkingSituation,
    pickupStreetAddress,
    pickupApartmentUnit,
    pickupAccessNotes,
    dropoffStreetAddress,
    dropoffApartmentUnit,
    dropoffFloorLevel,
    dropoffElevatorAvailable,
    dropoffParkingSituation,
    inventory,
    customItems,
    additionalServices,
    storageWeeks,
    disposalItems,
    coverPhotoId,
    galleryPhotoIds,
    reset,
  } = useMoveSearch()

  // Auto-populate contact info from auth context on mount
  useEffect(() => {
    if (!user) return
    const updates: Record<string, string> = {}
    if (!contactInfo.fullName && user.name) updates.fullName = user.name
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

    setIsSubmitting(true)

    try {
      // ── 1. Upload photos ──────────────────────────────────
      let uploadedCoverPhotoId: string | null = null
      let uploadedGalleryPhotoIds: string[] = []

      if (coverPhotoId || galleryPhotoIds.length > 0) {
        try {
          const photoRes = await fetch('/api/moves/upload-photos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              coverPhotoId: coverPhotoId || null,
              galleryPhotoIds: galleryPhotoIds.length > 0 ? galleryPhotoIds : [],
            }),
          })

          if (photoRes.ok) {
            const photoData = await photoRes.json()
            uploadedCoverPhotoId = photoData.coverPhotoId ?? null
            uploadedGalleryPhotoIds = photoData.galleryPhotoIds ?? []
          }
        } catch (err) {
          console.error('Failed to upload photos:', err)
        }
      }

      // ── 2. Create the scheduled move in the database ──────
      const inventoryCount =
        Object.values(inventory).reduce((sum, qty) => sum + qty, 0) +
        customItems.reduce((sum, item) => sum + item.quantity, 0)

      const res = await fetch('/api/moves/create-scheduled', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pickupLocation: pickupLocation || null,
          pickupLatitude: pickupCoordinates?.latitude ?? null,
          pickupLongitude: pickupCoordinates?.longitude ?? null,
          pickupStreetAddress,
          pickupApartmentUnit,
          pickupAccessNotes,
          dropoffLocation: dropoffLocation || null,
          dropoffLatitude: dropoffCoordinates?.latitude ?? null,
          dropoffLongitude: dropoffCoordinates?.longitude ?? null,
          dropoffStreetAddress,
          dropoffApartmentUnit,
          moveDate,
          moveType: moveType || 'regular',
          homeType,
          floorLevel,
          elevatorAvailable,
          parkingSituation,
          dropoffFloorLevel,
          dropoffElevatorAvailable,
          dropoffParkingSituation,
          inventoryItems: JSON.stringify(inventory),
          customItems: customItems.map((c) => JSON.stringify(c)),
          totalItemCount: inventoryCount,
          additionalServices: JSON.stringify(additionalServices),
          storageWeeks,
          disposalItems,
          coverPhotoId: uploadedCoverPhotoId,
          galleryPhotoIds: uploadedGalleryPhotoIds,
          contactName: contactInfo.fullName,
          contactEmail: contactInfo.email,
          contactPhone: contactInfo.phoneNumber,
          contactNotes: contactInfo.notesForMovers,
          isBusinessMove: contactInfo.isBusinessMove,
          companyName: contactInfo.companyName,
          vatId: contactInfo.vatId,
        }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errData.error || 'Failed to create move')
      }

      const data = await res.json()

      // ── 3. Clear the draft and redirect ───────────────────
      reset()
      router.push('/move-preview')
    } catch (err) {
      console.error('Failed to create scheduled move:', err)
      setFormErrors({ submit: err instanceof Error ? err.message : 'Something went wrong. Please try again.' })
    } finally {
      setIsSubmitting(false)
    }
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

        {/* Submit error */}
        {formErrors.submit && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
            {formErrors.submit}
          </div>
        )}

        {/* Loading overlay */}
        {isSubmitting && (
          <div className="rounded-2xl border border-primary-200 bg-primary-50 p-4 text-sm text-primary-700 dark:border-primary-800 dark:bg-primary-900/20 dark:text-primary-300 text-center">
            Creating your move... Please wait.
          </div>
        )}
      </Form>
    </>
  )
}

export default Page
