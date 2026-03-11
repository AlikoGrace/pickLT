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
    pickupLoadingZoneRequired,
    pickupArrangeHaltverbot,
    dropoffArrangeHaltverbot,
    inventory,
    customItems,
    additionalServices,
    storageWeeks,
    disposalItems,
    heavyItems,
    customHeavyItems,
    packingServiceLevel,
    packingMaterials,
    packingNotes,
    arrivalWindow,
    flexibility,
    crewSize,
    vehicleType,
    routeDistanceMeters,
    routeDurationSeconds,
    paymentMethod,
    setPaymentMethod,
    coverPhotoId,
    galleryPhotoIds,
    reset,
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

      // ── 2. Calculate estimated price ─────────────────────
      const BASE_RATE_PER_KM = 1.50
      const MOVE_TYPE_MULTIPLIER: Record<string, number> = { light: 1.0, regular: 1.3, premium: 1.8 }
      const FLOOR_SURCHARGE_NO_ELEVATOR = 15
      const PACKING_RATES: Record<string, number> = { none: 0, partial: 50, full: 120, unpacking: 180 }
      const CREW_RATES: Record<string, number> = { '1': 0, '2': 30, '3': 60, '4plus': 100 }
      const MINIMUM_PRICE = 49

      const distanceKm = (routeDistanceMeters || 0) / 1000
      let basePrice = distanceKm * BASE_RATE_PER_KM
      basePrice *= MOVE_TYPE_MULTIPLIER[moveType || 'regular'] || 1.0

      let floorSurcharge = 0
      const pFloor = parseInt(floorLevel || '0', 10)
      const dFloor = parseInt(dropoffFloorLevel || '0', 10)
      if (!elevatorAvailable && pFloor > 0) floorSurcharge += pFloor * FLOOR_SURCHARGE_NO_ELEVATOR
      if (!dropoffElevatorAvailable && dFloor > 0) floorSurcharge += dFloor * FLOOR_SURCHARGE_NO_ELEVATOR

      const packingSurcharge = PACKING_RATES[packingServiceLevel || 'none'] || 0
      const crewSurcharge = CREW_RATES[crewSize || '1'] || 0
      const storageSurcharge = (storageWeeks || 0) * 25

      let calculatedPrice = basePrice + floorSurcharge + packingSurcharge + crewSurcharge + storageSurcharge
      calculatedPrice = Math.max(calculatedPrice, MINIMUM_PRICE)
      calculatedPrice = Math.round(calculatedPrice * 100) / 100

      // ── 3. Create the scheduled move in the database ──────
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
          pickupHaltverbot: pickupArrangeHaltverbot,
          dropoffFloorLevel,
          dropoffElevatorAvailable,
          dropoffParkingSituation,
          dropoffHaltverbot: dropoffArrangeHaltverbot,
          inventoryItems: JSON.stringify(inventory),
          customItems: customItems.map((c) => JSON.stringify(c)),
          totalItemCount: inventoryCount,
          packingServiceLevel,
          packingMaterials: packingMaterials ? JSON.stringify(packingMaterials) : null,
          packingNotes,
          arrivalWindow,
          flexibility,
          crewSize,
          vehicleType,
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
          routeDistanceMeters,
          routeDurationSeconds,
          estimatedPrice: calculatedPrice,
          finalPrice: calculatedPrice,
          paymentMethod,
        }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errData.error || 'Failed to create move')
      }

      const data = await res.json()

      // ── 4. Clear the draft and redirect ───────────────────
      reset()
      router.push(`/move-details/${data.handle}`)
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

        {/* Payment Method */}
        <FormItem label="Preferred payment method" desccription="How would you like to pay for the move?">
          <div className="flex flex-col gap-3">
            {([
              { value: 'cash', label: 'Cash' },
              { value: 'bank_transfer', label: 'Bank transfer' },
              { value: 'card', label: 'Card' },
            ] as const).map((option) => (
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
                <span className="text-sm font-medium">{option.label}</span>
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
