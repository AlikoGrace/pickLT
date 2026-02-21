'use client'

import { useAuth } from '@/context/auth'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  TruckIcon,
  IdentificationIcon,
  ClipboardDocumentCheckIcon,
  CheckCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline'

const VEHICLE_TYPES = [
  { value: 'small_van', label: 'Small Van', description: 'Up to 10 m³ — small moves, single items' },
  { value: 'medium_truck', label: 'Medium Truck', description: '10–25 m³ — apartment moves' },
  { value: 'large_truck', label: 'Large Truck', description: '25+ m³ — house moves, large loads' },
]

const LANGUAGES_OPTIONS = [
  'English',
  'German',
  'French',
  'Spanish',
  'Turkish',
  'Arabic',
  'Polish',
  'Romanian',
  'Italian',
  'Portuguese',
]

type Step = 'personal' | 'vehicle' | 'experience' | 'review'

const STEPS: { key: Step; label: string; icon: typeof TruckIcon }[] = [
  { key: 'personal', label: 'Personal Info', icon: IdentificationIcon },
  { key: 'vehicle', label: 'Vehicle Details', icon: TruckIcon },
  { key: 'experience', label: 'Experience', icon: ClipboardDocumentCheckIcon },
  { key: 'review', label: 'Review & Submit', icon: CheckCircleIcon },
]

export default function CompleteProfilePage() {
  const { user, refreshProfile, updateUser } = useAuth()
  const router = useRouter()

  const [currentStep, setCurrentStep] = useState<Step>('personal')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  // Form state
  const [form, setForm] = useState({
    fullName: user?.fullName || '',
    phone: user?.phone || '',
    driversLicense: '',
    vehicleBrand: '',
    vehicleModel: '',
    vehicleYear: '',
    vehicleCapacity: '',
    vehicleRegistration: '',
    vehicleType: '' as string,
    yearsExperience: '',
    baseRate: '',
    languages: [] as string[],
  })

  const updateForm = (updates: Partial<typeof form>) => {
    setForm((prev) => ({ ...prev, ...updates }))
  }

  const stepIdx = STEPS.findIndex((s) => s.key === currentStep)

  const canGoNext = () => {
    switch (currentStep) {
      case 'personal':
        return form.fullName.trim() && form.phone.trim() && form.driversLicense.trim()
      case 'vehicle':
        return (
          form.vehicleBrand.trim() &&
          form.vehicleModel.trim() &&
          form.vehicleYear.trim() &&
          form.vehicleRegistration.trim() &&
          form.vehicleType
        )
      case 'experience':
        return form.yearsExperience && form.baseRate && form.languages.length > 0
      default:
        return true
    }
  }

  const goNext = () => {
    if (stepIdx < STEPS.length - 1) {
      setCurrentStep(STEPS[stepIdx + 1].key)
    }
  }

  const goBack = () => {
    if (stepIdx > 0) {
      setCurrentStep(STEPS[stepIdx - 1].key)
    }
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    setError('')
    try {
      // Submit mover profile (includes personal info)
      const res = await fetch('/api/mover/submit-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: form.fullName,
          phone: form.phone,
          driversLicense: form.driversLicense,
          vehicleBrand: form.vehicleBrand,
          vehicleModel: form.vehicleModel,
          vehicleYear: form.vehicleYear,
          vehicleCapacity: form.vehicleCapacity,
          vehicleRegistration: form.vehicleRegistration,
          vehicleType: form.vehicleType,
          languages: form.languages,
          yearsExperience: Number(form.yearsExperience),
          baseRate: Number(form.baseRate),
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to submit profile')
      }

      // Refresh auth context to pick up the new mover profile
      updateUser({ userType: 'mover' })
      await refreshProfile()

      setSuccess(true)
      // Redirect to dashboard after brief delay
      setTimeout(() => router.push('/dashboard'), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-4">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
            <CheckCircleIcon className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
            Profile Submitted!
          </h2>
          <p className="mt-2 text-neutral-500 dark:text-neutral-400">
            Your mover profile is under review. We&apos;ll notify you once it&apos;s verified.
            You&apos;re being redirected to your dashboard...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 pb-24 lg:p-6 lg:pb-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
          Complete Your Mover Profile
        </h1>
        <p className="mt-1 text-neutral-500 dark:text-neutral-400">
          Fill in your details to start accepting moves
        </p>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {STEPS.map((step, idx) => {
            const isActive = idx === stepIdx
            const isCompleted = idx < stepIdx
            return (
              <div key={step.key} className="flex flex-1 items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
                      isCompleted
                        ? 'bg-primary-600 text-white'
                        : isActive
                          ? 'bg-primary-100 text-primary-700 ring-2 ring-primary-600 dark:bg-primary-900/30 dark:text-primary-400'
                          : 'bg-neutral-100 text-neutral-400 dark:bg-neutral-700'
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircleIcon className="h-5 w-5" />
                    ) : (
                      <step.icon className="h-5 w-5" />
                    )}
                  </div>
                  <span
                    className={`mt-1.5 hidden text-xs font-medium sm:block ${
                      isActive
                        ? 'text-primary-700 dark:text-primary-400'
                        : isCompleted
                          ? 'text-primary-600'
                          : 'text-neutral-400'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
                {idx < STEPS.length - 1 && (
                  <div
                    className={`mx-2 h-0.5 flex-1 rounded ${
                      idx < stepIdx ? 'bg-primary-600' : 'bg-neutral-200 dark:bg-neutral-700'
                    }`}
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Form Card */}
      <div className="mx-auto max-w-2xl rounded-2xl bg-white p-6 shadow-sm dark:bg-neutral-800">
        {/* Step 1: Personal Info */}
        {currentStep === 'personal' && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              Personal Information
            </h2>
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Full Name *
              </label>
              <input
                type="text"
                value={form.fullName}
                onChange={(e) => updateForm({ fullName: e.target.value })}
                placeholder="Your full name"
                className="w-full rounded-xl border border-neutral-200 bg-transparent px-4 py-2.5 outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 dark:border-neutral-700"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Phone Number *
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => updateForm({ phone: e.target.value })}
                placeholder="+49 123 456 7890"
                className="w-full rounded-xl border border-neutral-200 bg-transparent px-4 py-2.5 outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 dark:border-neutral-700"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Driver&apos;s License Number *
              </label>
              <input
                type="text"
                value={form.driversLicense}
                onChange={(e) => updateForm({ driversLicense: e.target.value })}
                placeholder="Enter your driver's license number"
                className="w-full rounded-xl border border-neutral-200 bg-transparent px-4 py-2.5 outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 dark:border-neutral-700"
              />
            </div>
          </div>
        )}

        {/* Step 2: Vehicle Details */}
        {currentStep === 'vehicle' && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              Vehicle Information
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Vehicle Brand *
                </label>
                <input
                  type="text"
                  value={form.vehicleBrand}
                  onChange={(e) => updateForm({ vehicleBrand: e.target.value })}
                  placeholder="e.g. Mercedes-Benz"
                  className="w-full rounded-xl border border-neutral-200 bg-transparent px-4 py-2.5 outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 dark:border-neutral-700"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Vehicle Model *
                </label>
                <input
                  type="text"
                  value={form.vehicleModel}
                  onChange={(e) => updateForm({ vehicleModel: e.target.value })}
                  placeholder="e.g. Sprinter"
                  className="w-full rounded-xl border border-neutral-200 bg-transparent px-4 py-2.5 outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 dark:border-neutral-700"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Year *
                </label>
                <input
                  type="text"
                  value={form.vehicleYear}
                  onChange={(e) => updateForm({ vehicleYear: e.target.value })}
                  placeholder="e.g. 2022"
                  maxLength={4}
                  className="w-full rounded-xl border border-neutral-200 bg-transparent px-4 py-2.5 outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 dark:border-neutral-700"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Capacity (m³)
                </label>
                <input
                  type="text"
                  value={form.vehicleCapacity}
                  onChange={(e) => updateForm({ vehicleCapacity: e.target.value })}
                  placeholder="e.g. 15"
                  className="w-full rounded-xl border border-neutral-200 bg-transparent px-4 py-2.5 outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 dark:border-neutral-700"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Vehicle Registration *
              </label>
              <input
                type="text"
                value={form.vehicleRegistration}
                onChange={(e) => updateForm({ vehicleRegistration: e.target.value })}
                placeholder="e.g. B-AB 1234"
                className="w-full rounded-xl border border-neutral-200 bg-transparent px-4 py-2.5 outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 dark:border-neutral-700"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Vehicle Type *
              </label>
              <div className="space-y-3">
                {VEHICLE_TYPES.map((v) => (
                  <label
                    key={v.value}
                    className={`flex cursor-pointer items-center rounded-xl border p-4 transition-colors ${
                      form.vehicleType === v.value
                        ? 'border-primary-500 bg-primary-50 dark:border-primary-400 dark:bg-primary-900/20'
                        : 'border-neutral-200 hover:border-neutral-300 dark:border-neutral-700 dark:hover:border-neutral-600'
                    }`}
                  >
                    <input
                      type="radio"
                      name="vehicleType"
                      value={v.value}
                      checked={form.vehicleType === v.value}
                      onChange={() => updateForm({ vehicleType: v.value })}
                      className="sr-only"
                    />
                    <TruckIcon className="mr-3 h-6 w-6 flex-shrink-0 text-neutral-500" />
                    <div>
                      <p className="font-medium text-neutral-900 dark:text-neutral-100">{v.label}</p>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">{v.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Experience */}
        {currentStep === 'experience' && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              Experience & Rate
            </h2>
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Years of Experience *
              </label>
              <input
                type="number"
                min="0"
                max="50"
                value={form.yearsExperience}
                onChange={(e) => updateForm({ yearsExperience: e.target.value })}
                placeholder="e.g. 5"
                className="w-full rounded-xl border border-neutral-200 bg-transparent px-4 py-2.5 outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 dark:border-neutral-700"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Base Rate (€ per km) *
              </label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={form.baseRate}
                onChange={(e) => updateForm({ baseRate: e.target.value })}
                placeholder="e.g. 1.50"
                className="w-full rounded-xl border border-neutral-200 bg-transparent px-4 py-2.5 outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 dark:border-neutral-700"
              />
              <p className="mt-1 text-xs text-neutral-400">
                System base rate is €1.50/km. Your rate will be used for custom quotes.
              </p>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Languages Spoken *
              </label>
              <div className="flex flex-wrap gap-2">
                {LANGUAGES_OPTIONS.map((lang) => {
                  const isSelected = form.languages.includes(lang)
                  return (
                    <button
                      key={lang}
                      type="button"
                      onClick={() =>
                        updateForm({
                          languages: isSelected
                            ? form.languages.filter((l) => l !== lang)
                            : [...form.languages, lang],
                        })
                      }
                      className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                        isSelected
                          ? 'bg-primary-600 text-white'
                          : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-600'
                      }`}
                    >
                      {lang}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Review */}
        {currentStep === 'review' && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              Review Your Profile
            </h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Please review your information before submitting.
            </p>

            <div className="space-y-4 rounded-xl bg-neutral-50 p-4 dark:bg-neutral-700/50">
              <div>
                <p className="text-xs font-medium uppercase text-neutral-400">Personal Info</p>
                <p className="mt-1 text-sm text-neutral-900 dark:text-neutral-100">
                  {form.fullName} &middot; {form.phone}
                </p>
                <p className="text-sm text-neutral-500">License: {form.driversLicense}</p>
              </div>
              <hr className="border-neutral-200 dark:border-neutral-600" />
              <div>
                <p className="text-xs font-medium uppercase text-neutral-400">Vehicle</p>
                <p className="mt-1 text-sm text-neutral-900 dark:text-neutral-100">
                  {form.vehicleBrand} {form.vehicleModel} ({form.vehicleYear})
                </p>
                <p className="text-sm text-neutral-500">
                  {VEHICLE_TYPES.find((v) => v.value === form.vehicleType)?.label} &middot; Reg: {form.vehicleRegistration}
                  {form.vehicleCapacity && ` · ${form.vehicleCapacity} m³`}
                </p>
              </div>
              <hr className="border-neutral-200 dark:border-neutral-600" />
              <div>
                <p className="text-xs font-medium uppercase text-neutral-400">Experience</p>
                <p className="mt-1 text-sm text-neutral-900 dark:text-neutral-100">
                  {form.yearsExperience} years &middot; €{form.baseRate}/km
                </p>
                <p className="text-sm text-neutral-500">
                  Languages: {form.languages.join(', ')}
                </p>
              </div>
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
                {error}
              </div>
            )}
          </div>
        )}

        {/* Navigation buttons */}
        <div className="mt-8 flex items-center justify-between">
          <button
            onClick={goBack}
            disabled={stepIdx === 0}
            className="flex items-center gap-1 rounded-full px-5 py-2.5 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-100 disabled:invisible dark:text-neutral-300 dark:hover:bg-neutral-700"
          >
            <ChevronLeftIcon className="h-4 w-4" />
            Back
          </button>

          {currentStep === 'review' ? (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex items-center gap-2 rounded-full bg-primary-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Submitting...
                </>
              ) : (
                'Submit Profile'
              )}
            </button>
          ) : (
            <button
              onClick={goNext}
              disabled={!canGoNext()}
              className="flex items-center gap-1 rounded-full bg-primary-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-50"
            >
              Next
              <ChevronRightIcon className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
