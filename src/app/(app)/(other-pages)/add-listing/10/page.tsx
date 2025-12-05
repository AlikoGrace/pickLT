'use client'

import { useMoveSearch } from '@/context/moveSearch'
import ButtonPrimary from '@/shared/ButtonPrimary'
import ButtonSecondary from '@/shared/ButtonSecondary'
import { Checkbox, CheckboxField, CheckboxGroup } from '@/shared/Checkbox'
import { Divider } from '@/shared/divider'
import { Fieldset, Label } from '@/shared/fieldset'
import { CheckCircleIcon, PencilSquareIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

// Helper to format labels
const formatLabel = (value: string | null | undefined): string => {
  if (!value) return 'Not specified'
  return value
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return 'Not selected'
  try {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-GB', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  } catch {
    return dateStr
  }
}

const SummarySection = ({
  title,
  editStep,
  children,
}: {
  title: string
  editStep: number
  children: React.ReactNode
}) => (
  <div className="p-4 bg-neutral-50 dark:bg-neutral-800 rounded-2xl">
    <div className="flex items-center justify-between mb-3">
      <h3 className="text-lg font-semibold">{title}</h3>
      <Link
        href={`/add-listing/${editStep}`}
        className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
      >
        <PencilSquareIcon className="h-4 w-4" />
        Edit
      </Link>
    </div>
    <div className="space-y-2 text-sm">{children}</div>
  </div>
)

const SummaryRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex justify-between">
    <span className="text-neutral-500 dark:text-neutral-400">{label}</span>
    <span className="font-medium text-neutral-900 dark:text-neutral-100">{value}</span>
  </div>
)

const Page = () => {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    // Basic info
    pickupLocation,
    moveDate,
    moveType,
    // Step 1
    homeType,
    floorLevel,
    elevatorAvailable,
    parkingSituation,
    // Step 2
    pickupStreetAddress,
    pickupApartmentUnit,
    pickupLoadingZoneRequired,
    pickupArrangeHaltverbot,
    // Step 3
    dropoffStreetAddress,
    dropoffApartmentUnit,
    dropoffFloorLevel,
    dropoffElevatorAvailable,
    dropoffParkingSituation,
    // Step 4
    inventory,
    customItems,
    // Step 5
    packingServiceLevel,
    packingMaterials,
    // Step 6
    arrivalWindow,
    flexibility,
    // Step 7
    crewSize,
    vehicleType,
    // Step 8
    additionalServices,
    storageWeeks,
    // Step 9
    contactInfo,
    // Step 10
    legalConsent,
    setTermsAccepted,
    setPrivacyAccepted,
  } = useMoveSearch()

  const inventoryCount = Object.values(inventory).reduce((sum, qty) => sum + qty, 0) + customItems.length

  const handleSubmit = async () => {
    if (!legalConsent.termsAccepted || !legalConsent.privacyAccepted) {
      setSubmitError('Please accept the terms and privacy policy to continue.')
      return
    }

    setIsSubmitting(true)
    setSubmitError(null)

    try {
      // TODO: Submit to API
      console.log('Submitting move booking...')
      
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 2000))
      
      // Redirect to success page
      router.push('/add-listing/success')
    } catch (error) {
      setSubmitError('Something went wrong. Please try again.')
      console.error('Submission error:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <div>
        <h2 className="text-2xl font-semibold">Review & confirm</h2>
        <span className="mt-2 block text-neutral-500 dark:text-neutral-400">
          Please review your move details before confirming your booking.
        </span>
      </div>

      <Divider />

      <div className="space-y-6">
        {/* Move Overview */}
        <SummarySection title="Move overview" editStep={1}>
          <SummaryRow label="Move date" value={formatDate(moveDate)} />
          <SummaryRow label="Move type" value={formatLabel(moveType)} />
          <SummaryRow label="Home type" value={formatLabel(homeType)} />
        </SummarySection>

        {/* Pickup Address */}
        <SummarySection title="Pickup address" editStep={2}>
          <SummaryRow label="Address" value={pickupStreetAddress || 'Not specified'} />
          {pickupApartmentUnit && <SummaryRow label="Unit" value={pickupApartmentUnit} />}
          <SummaryRow label="Floor" value={formatLabel(floorLevel)} />
          <SummaryRow label="Elevator" value={elevatorAvailable ? 'Yes' : 'No'} />
          <SummaryRow label="Parking" value={formatLabel(parkingSituation)} />
          {pickupLoadingZoneRequired && (
            <SummaryRow
              label="Haltverbot"
              value={pickupArrangeHaltverbot ? 'We arrange' : 'Customer arranges'}
            />
          )}
        </SummarySection>

        {/* Drop-off Address */}
        <SummarySection title="Drop-off address" editStep={3}>
          <SummaryRow label="Address" value={dropoffStreetAddress || 'Not specified'} />
          {dropoffApartmentUnit && <SummaryRow label="Unit" value={dropoffApartmentUnit} />}
          <SummaryRow label="Floor" value={formatLabel(dropoffFloorLevel)} />
          <SummaryRow label="Elevator" value={dropoffElevatorAvailable ? 'Yes' : 'No'} />
          <SummaryRow label="Parking" value={formatLabel(dropoffParkingSituation)} />
        </SummarySection>

        {/* Inventory */}
        <SummarySection title="Inventory" editStep={4}>
          <SummaryRow label="Total items" value={`${inventoryCount} items`} />
        </SummarySection>

        {/* Packing Services */}
        <SummarySection title="Packing services" editStep={5}>
          <SummaryRow label="Service level" value={formatLabel(packingServiceLevel)} />
          {packingMaterials.length > 0 && (
            <SummaryRow label="Materials" value={`${packingMaterials.length} selected`} />
          )}
        </SummarySection>

        {/* Timing */}
        <SummarySection title="Move timing" editStep={6}>
          <SummaryRow label="Arrival window" value={formatLabel(arrivalWindow)} />
          {flexibility && <SummaryRow label="Flexibility" value={formatLabel(flexibility)} />}
        </SummarySection>

        {/* Crew & Vehicle */}
        <SummarySection title="Crew & vehicle" editStep={7}>
          <SummaryRow label="Crew size" value={crewSize ? `${crewSize} movers` : 'Not specified'} />
          <SummaryRow label="Vehicle" value={formatLabel(vehicleType)} />
        </SummarySection>

        {/* Additional Services */}
        {additionalServices.length > 0 && (
          <SummarySection title="Additional services" editStep={8}>
            {additionalServices.map((service) => (
              <div key={service} className="flex items-center gap-2">
                <CheckCircleIcon className="h-4 w-4 text-green-500" />
                <span>{formatLabel(service)}</span>
              </div>
            ))}
            {additionalServices.includes('temporary_storage') && storageWeeks > 0 && (
              <SummaryRow label="Storage duration" value={`${storageWeeks} weeks`} />
            )}
          </SummarySection>
        )}

        {/* Contact Information */}
        <SummarySection title="Contact information" editStep={9}>
          <SummaryRow label="Name" value={contactInfo.fullName || 'Not specified'} />
          <SummaryRow label="Phone" value={contactInfo.phoneNumber || 'Not specified'} />
          <SummaryRow label="Email" value={contactInfo.email || 'Not specified'} />
          {contactInfo.isBusinessMove && (
            <>
              <SummaryRow label="Company" value={contactInfo.companyName || 'Not specified'} />
              <SummaryRow label="VAT ID" value={contactInfo.vatId || 'Not specified'} />
            </>
          )}
        </SummarySection>
      </div>

      <Divider />

      {/* Price Estimate */}
      <div className="p-6 bg-primary-50 dark:bg-primary-900/20 rounded-2xl border border-primary-200 dark:border-primary-800">
        <h3 className="text-lg font-semibold mb-2">Estimated price</h3>
        <p className="text-3xl font-bold text-primary-600">€ TBD</p>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2">
          Final price will be confirmed after reviewing your inventory details.
        </p>
      </div>

      <Divider />

      {/* Legal Checkboxes */}
      <Fieldset>
        <CheckboxGroup className="space-y-4">
          <CheckboxField>
            <Checkbox
              name="termsAccepted"
              checked={legalConsent.termsAccepted}
              onChange={(checked) => setTermsAccepted(checked)}
            />
            <Label>
              I confirm the details above and agree to the{' '}
              <Link href="/terms" className="text-primary-600 hover:underline">
                terms &amp; conditions
              </Link>
              .
            </Label>
          </CheckboxField>
          <CheckboxField>
            <Checkbox
              name="privacyAccepted"
              checked={legalConsent.privacyAccepted}
              onChange={(checked) => setPrivacyAccepted(checked)}
            />
            <Label>
              I acknowledge the{' '}
              <Link href="/privacy" className="text-primary-600 hover:underline">
                privacy policy
              </Link>{' '}
              (GDPR compliant).
            </Label>
          </CheckboxField>
        </CheckboxGroup>
      </Fieldset>

      {submitError && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl text-red-600 dark:text-red-400 text-sm">
          {submitError}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <ButtonSecondary href="/add-listing/9" className="w-full sm:w-auto">
          <PencilSquareIcon className="h-5 w-5" />
          <span>Go back</span>
        </ButtonSecondary>

        <ButtonPrimary
          onClick={handleSubmit}
          disabled={isSubmitting || !legalConsent.termsAccepted || !legalConsent.privacyAccepted}
          className="w-full sm:w-auto sm:flex-1"
        >
          {isSubmitting ? (
            <>
              <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Processing...
            </>
          ) : (
            <>
              <CheckCircleIcon className="h-5 w-5" />
              <span>Confirm &amp; Book Movers</span>
            </>
          )}
        </ButtonPrimary>
      </div>
    </>
  )
}

export default Page
