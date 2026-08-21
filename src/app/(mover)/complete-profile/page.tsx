'use client'

import { useAuth } from '@/context/auth'
import { languageName, regionName } from '@/lib/format'
import { compressImage } from '@/utils/compressImage'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  TruckIcon,
  IdentificationIcon,
  ClipboardDocumentCheckIcon,
  CheckCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ShieldCheckIcon,
  MapPinIcon,
  CameraIcon,
} from '@heroicons/react/24/outline'

/**
 * Option lists persist a stable value and look the label up at render time —
 * never the other way round (catalog conventions §5). Nothing below derives a
 * value FROM a label.
 */
const VEHICLE_TYPES: { value: string; key: 'smallVan' | 'mediumTruck' | 'largeTruck' }[] = [
  { value: 'small_van', key: 'smallVan' },
  { value: 'medium_truck', key: 'mediumTruck' },
  { value: 'large_truck', key: 'largeTruck' },
]

/**
 * `value` is the English language *name* because that is what
 * `mover_profiles.languages` already holds and what the client-facing move
 * pages render straight out of the document. It is a fixed literal, so the wire
 * format stays stable; `code` exists only to name the option in the reader's
 * language. Persisting BCP-47 codes instead (and backfilling the legacy rows)
 * is the proper fix and is tracked outside this change.
 */
const LANGUAGES_OPTIONS: { value: string; code: string }[] = [
  { value: 'English', code: 'en' },
  { value: 'German', code: 'de' },
  { value: 'French', code: 'fr' },
  { value: 'Spanish', code: 'es' },
  { value: 'Turkish', code: 'tr' },
  { value: 'Arabic', code: 'ar' },
  { value: 'Polish', code: 'pl' },
  { value: 'Romanian', code: 'ro' },
  { value: 'Italian', code: 'it' },
  { value: 'Portuguese', code: 'pt' },
]

/** Same contract as `LANGUAGES_OPTIONS`: `value` is the stored English name
 *  (`lib/sanctions.ts` maps those spellings to ISO2), `code` is display-only. */
const COUNTRIES: { value: string; code: string }[] = [
  { value: 'Germany', code: 'DE' },
  { value: 'Austria', code: 'AT' },
  { value: 'Switzerland', code: 'CH' },
  { value: 'Netherlands', code: 'NL' },
  { value: 'Belgium', code: 'BE' },
  { value: 'France', code: 'FR' },
  { value: 'Luxembourg', code: 'LU' },
  { value: 'Denmark', code: 'DK' },
  { value: 'Poland', code: 'PL' },
  { value: 'Czech Republic', code: 'CZ' },
  { value: 'United Kingdom', code: 'GB' },
  { value: 'Ireland', code: 'IE' },
  { value: 'Spain', code: 'ES' },
  { value: 'Italy', code: 'IT' },
  { value: 'Portugal', code: 'PT' },
  { value: 'Sweden', code: 'SE' },
  { value: 'Norway', code: 'NO' },
  { value: 'Finland', code: 'FI' },
  { value: 'United States', code: 'US' },
  { value: 'Canada', code: 'CA' },
]

/**
 * Stored value → display name. Value-to-label only; there is deliberately no
 * label-to-value lookup anywhere in this file.
 */
function countryLabel(value: string, locale: string): string {
  const option = COUNTRIES.find((c) => c.value === value)
  return option ? regionName(option.code, locale) : value
}

type Step = 'personal' | 'verification' | 'vehicle' | 'experience' | 'review'

/** Order + icon only. The label is resolved during render so a language switch
 *  is picked up (a module-scope label array would freeze the boot language). */
const STEPS: { key: Step; icon: typeof TruckIcon }[] = [
  { key: 'personal', icon: IdentificationIcon },
  { key: 'verification', icon: ShieldCheckIcon },
  { key: 'vehicle', icon: TruckIcon },
  { key: 'experience', icon: ClipboardDocumentCheckIcon },
  { key: 'review', icon: CheckCircleIcon },
]

export default function CompleteProfilePage() {
  const { user, refreshProfile, updateUser } = useAuth()
  const router = useRouter()
  const { t, i18n } = useTranslation()
  const locale = i18n.resolvedLanguage ?? i18n.language

  const [currentStep, setCurrentStep] = useState<Step>('personal')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const licensePhotoRef = useRef<HTMLInputElement>(null)
  const selfiePhotoRef = useRef<HTMLInputElement>(null)

  // Form state
  const [form, setForm] = useState({
    fullName: user?.fullName || '',
    phone: user?.phone || '',
    driversLicense: '',
    driversLicensePhoto: null as File | null,
    driversLicensePhotoPreview: '',
    selfiePhoto: null as File | null,
    selfiePhotoPreview: '',
    socialSecurityNumber: '',
    taxNumber: '',
    vatId: '',
    businessStreet: '',
    businessPostcode: '',
    primaryCity: '',
    primaryCountry: '',
    vehicleBrand: '',
    vehicleModel: '',
    vehicleYear: '',
    vehicleCapacity: '',
    vehicleRegistration: '',
    vehicleType: '' as string,
    yearsExperience: '',
    languages: [] as string[],
  })

  // Sync form with user data once auth finishes loading
  useEffect(() => {
    if (user) {
      setForm((prev) => ({
        ...prev,
        fullName: prev.fullName || user.fullName || '',
        phone: prev.phone || user.phone || '',
      }))
    }
  }, [user])

  // Revoke blob URLs when previews change or component unmounts
  useEffect(() => {
    return () => {
      if (form.driversLicensePhotoPreview) URL.revokeObjectURL(form.driversLicensePhotoPreview)
      if (form.selfiePhotoPreview) URL.revokeObjectURL(form.selfiePhotoPreview)
    }
  }, [form.driversLicensePhotoPreview, form.selfiePhotoPreview])

  const updateForm = (updates: Partial<typeof form>) => {
    setForm((prev) => ({ ...prev, ...updates }))
  }

  const stepIdx = STEPS.findIndex((s) => s.key === currentStep)

  const canGoNext = () => {
    switch (currentStep) {
      case 'personal':
        return form.fullName.trim() && form.phone.trim() && form.driversLicense.trim()
      case 'verification':
        return (
          form.primaryCity.trim() &&
          form.primaryCountry.trim() &&
          form.socialSecurityNumber.trim() &&
          form.taxNumber.trim() &&
          form.selfiePhoto !== null
        )
      case 'vehicle':
        return (
          form.vehicleBrand.trim() &&
          form.vehicleModel.trim() &&
          form.vehicleYear.trim() &&
          form.vehicleRegistration.trim() &&
          form.vehicleType
        )
      case 'experience':
        return form.yearsExperience && form.languages.length > 0
      default:
        return true
    }
  }

  const goNext = () => {
    if (stepIdx < STEPS.length - 1) {
      setError('')
      setCurrentStep(STEPS[stepIdx + 1].key)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const goBack = () => {
    if (stepIdx > 0) {
      setError('')
      setCurrentStep(STEPS[stepIdx - 1].key)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    setError('')
    try {
      // Upload driver's license photo if provided
      let driversLicensePhotoUrl = ''
      if (form.driversLicensePhoto) {
        const compressed = await compressImage(form.driversLicensePhoto)
        const photoFormData = new FormData()
        photoFormData.append('file', compressed)
        photoFormData.append('bucket', 'PROFILE_PHOTOS')
        photoFormData.append('purpose', 'license')
        const uploadRes = await fetch('/api/user/upload-photo', {
          method: 'POST',
          body: photoFormData,
        })
        if (!uploadRes.ok) {
          const uploadErr = await uploadRes.json().catch(() => ({}))
          throw new Error(uploadErr.error || t('errors:mover.licenseUploadFailed'))
        }
        const uploadData = await uploadRes.json()
        driversLicensePhotoUrl = uploadData.photoUrl
      }

      // Upload selfie photo (required)
      let selfiePhotoUrl = ''
      if (form.selfiePhoto) {
        const compressed = await compressImage(form.selfiePhoto)
        const selfieFormData = new FormData()
        selfieFormData.append('file', compressed)
        selfieFormData.append('bucket', 'PROFILE_PHOTOS')
        selfieFormData.append('purpose', 'selfie')
        const selfieRes = await fetch('/api/user/upload-photo', {
          method: 'POST',
          body: selfieFormData,
        })
        if (!selfieRes.ok) {
          const selfieErr = await selfieRes.json().catch(() => ({}))
          throw new Error(selfieErr.error || t('errors:mover.selfieUploadFailed'))
        }
        const selfieData = await selfieRes.json()
        selfiePhotoUrl = selfieData.photoUrl
      } else {
        throw new Error(t('errors:mover.selfieRequired'))
      }

      // Submit mover profile (includes personal info)
      const res = await fetch('/api/mover/submit-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: form.fullName,
          phone: form.phone,
          driversLicense: form.driversLicense,
          driversLicensePhoto: driversLicensePhotoUrl || undefined,
          selfiePhoto: selfiePhotoUrl || undefined,
          socialSecurityNumber: form.socialSecurityNumber,
          taxNumber: form.taxNumber,
          vatId: form.vatId,
          businessStreet: form.businessStreet,
          businessPostcode: form.businessPostcode,
          primaryCity: form.primaryCity,
          primaryCountry: form.primaryCountry,
          vehicleBrand: form.vehicleBrand,
          vehicleModel: form.vehicleModel,
          vehicleYear: form.vehicleYear,
          vehicleCapacity: form.vehicleCapacity,
          vehicleRegistration: form.vehicleRegistration,
          vehicleType: form.vehicleType,
          languages: form.languages,
          yearsExperience: Number(form.yearsExperience),
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || t('errors:mover.profileSubmitFailed'))
      }

      // Refresh auth context to pick up the new mover profile
      updateUser({ userType: 'mover' })
      await refreshProfile()

      setSuccess(true)
      // Redirect to dashboard after brief delay
      setTimeout(() => router.push('/dashboard'), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors:generic.title'))
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
            {t('web:mover.onboarding.done.title')}
          </h2>
          <p className="mt-2 text-neutral-500 dark:text-neutral-400">
            {t('web:mover.onboarding.done.subtitle')}{' '}
            {t('web:mover.onboarding.done.redirect')}
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
          {t('web:mover.onboarding.title')}
        </h1>
        <p className="mt-1 text-neutral-500 dark:text-neutral-400">
          {t('web:mover.onboarding.subtitle')}
        </p>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {STEPS.map((step, idx) => {
            const isActive = idx === stepIdx
            const isCompleted = idx < stepIdx
            // i18n-keys: web:mover.onboarding.step.personal.label, web:mover.onboarding.step.verification.label, web:mover.onboarding.step.vehicle.label, web:mover.onboarding.step.experience.label, web:mover.onboarding.step.review.label
            const stepLabel = t(`web:mover.onboarding.step.${step.key}.label`)
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
                    {stepLabel}
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
              {t('profile:section.personal.title')}
            </h2>
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                {t('common:field.fullName.required.label')}
              </label>
              <input
                type="text"
                value={form.fullName}
                onChange={(e) => updateForm({ fullName: e.target.value })}
                placeholder={t('common:field.fullName.placeholder')}
                className="w-full rounded-xl border border-neutral-200 bg-transparent px-4 py-2.5 outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 dark:border-neutral-700"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                {t('common:field.phone.required.label')}
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => updateForm({ phone: e.target.value })}
                placeholder={t('web:mover.field.phone.placeholder')}
                className="w-full rounded-xl border border-neutral-200 bg-transparent px-4 py-2.5 outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 dark:border-neutral-700"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                {t('web:mover.field.licenseNumber.label')}
              </label>
              <input
                type="text"
                value={form.driversLicense}
                onChange={(e) => updateForm({ driversLicense: e.target.value })}
                placeholder={t('web:mover.field.licenseNumber.placeholder')}
                className="w-full rounded-xl border border-neutral-200 bg-transparent px-4 py-2.5 outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 dark:border-neutral-700"
              />
            </div>
          </div>
        )}

        {/* Step 2: Verification & Location */}
        {currentStep === 'verification' && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              {t('web:mover.section.verification.title')}
            </h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              {t('web:mover.section.verification.helper')}
            </p>

            {/* Driver's License Photo */}
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                {t('web:mover.field.licensePhoto.label')}
              </label>
              <input
                ref={licensePhotoRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    updateForm({
                      driversLicensePhoto: file,
                      driversLicensePhotoPreview: URL.createObjectURL(file),
                    })
                  }
                }}
              />
              {form.driversLicensePhotoPreview ? (
                <div className="relative">
                  <img
                    src={form.driversLicensePhotoPreview}
                    alt={t('web:mover.field.licensePhoto.a11y')}
                    className="h-40 w-full rounded-xl object-cover border border-neutral-200 dark:border-neutral-700"
                  />
                  <button
                    type="button"
                    onClick={() => licensePhotoRef.current?.click()}
                    className="absolute bottom-2 right-2 rounded-full bg-white/90 dark:bg-neutral-800/90 px-3 py-1.5 text-xs font-medium shadow transition hover:bg-white"
                  >
                    {t('common:action.changePhoto.cta')}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => licensePhotoRef.current?.click()}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-neutral-300 py-8 text-sm text-neutral-500 transition hover:border-primary-400 hover:text-primary-600 dark:border-neutral-600 dark:hover:border-primary-500"
                >
                  <CameraIcon className="h-5 w-5" />
                  {t('web:mover.field.licensePhoto.cta')}
                </button>
              )}
              <p className="mt-1 text-xs text-neutral-400">
                {t('web:mover.field.licensePhoto.helper')}
              </p>
            </div>

            {/* SSN */}
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                {t('web:mover.field.ssn.label')}
              </label>
              <input
                type="password"
                value={form.socialSecurityNumber}
                onChange={(e) => updateForm({ socialSecurityNumber: e.target.value })}
                placeholder={t('web:mover.field.ssn.placeholder')}
                autoComplete="off"
                className="w-full rounded-xl border border-neutral-200 bg-transparent px-4 py-2.5 outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 dark:border-neutral-700"
              />
              <p className="mt-1 text-xs text-neutral-400">
                {t('web:mover.field.ssn.helper')}
              </p>
            </div>

            {/* Tax Number */}
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                {t('web:mover.field.taxId.label')}
              </label>
              <input
                type="text"
                value={form.taxNumber}
                onChange={(e) => updateForm({ taxNumber: e.target.value })}
                placeholder={t('web:mover.field.taxId.placeholder')}
                className="w-full rounded-xl border border-neutral-200 bg-transparent px-4 py-2.5 outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 dark:border-neutral-700"
              />
              <p className="mt-1 text-xs text-neutral-400">
                {t('web:mover.field.taxId.helper')}
              </p>
            </div>

            {/* VAT ID + business address — feed the monthly tax statement header (T8) */}
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                {t('web:mover.field.vatId.label')}
              </label>
              <input
                type="text"
                value={form.vatId}
                onChange={(e) => updateForm({ vatId: e.target.value })}
                placeholder={t('web:mover.field.vatId.placeholder')}
                className="w-full rounded-xl border border-neutral-200 bg-transparent px-4 py-2.5 outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 dark:border-neutral-700"
              />
              <p className="mt-1 text-xs text-neutral-400">
                {t('web:mover.field.vatId.helper')}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  {t('web:mover.field.businessStreet.label')}
                </label>
                <input
                  type="text"
                  value={form.businessStreet}
                  onChange={(e) => updateForm({ businessStreet: e.target.value })}
                  placeholder={t('web:mover.field.businessStreet.placeholder')}
                  className="w-full rounded-xl border border-neutral-200 bg-transparent px-4 py-2.5 outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 dark:border-neutral-700"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  {t('web:mover.field.postcode.label')}
                </label>
                <input
                  type="text"
                  value={form.businessPostcode}
                  onChange={(e) => updateForm({ businessPostcode: e.target.value })}
                  placeholder={t('web:mover.field.postcode.placeholder')}
                  className="w-full rounded-xl border border-neutral-200 bg-transparent px-4 py-2.5 outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 dark:border-neutral-700"
                />
              </div>
            </div>

            {/* Selfie Upload */}
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                {t('web:mover.field.selfie.label')}
              </label>
              <input
                ref={selfiePhotoRef}
                type="file"
                accept="image/*"
                capture="user"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    updateForm({
                      selfiePhoto: file,
                      selfiePhotoPreview: URL.createObjectURL(file),
                    })
                  }
                }}
              />
              {form.selfiePhotoPreview ? (
                <div className="relative">
                  <img
                    src={form.selfiePhotoPreview}
                    alt={t('web:mover.field.selfie.a11y')}
                    className="h-48 w-48 rounded-full object-cover border-4 border-primary-500 mx-auto"
                  />
                  <button
                    type="button"
                    onClick={() => selfiePhotoRef.current?.click()}
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 rounded-full bg-white/90 dark:bg-neutral-800/90 px-3 py-1.5 text-xs font-medium shadow transition hover:bg-white"
                  >
                    {t('web:mover.field.selfie.retake.cta')}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => selfiePhotoRef.current?.click()}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-neutral-300 py-8 text-sm text-neutral-500 transition hover:border-primary-400 hover:text-primary-600 dark:border-neutral-600 dark:hover:border-primary-500"
                >
                  <CameraIcon className="h-5 w-5" />
                  {t('web:mover.field.selfie.cta')}
                </button>
              )}
              <p className="mt-1 text-xs text-neutral-400">
                {t('web:mover.field.selfie.helper')}
              </p>
            </div>

            {/* Country */}
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                {t('common:field.country.label')}
              </label>
              <select
                value={form.primaryCountry}
                onChange={(e) => updateForm({ primaryCountry: e.target.value })}
                className="w-full rounded-xl border border-neutral-200 bg-transparent px-4 py-2.5 outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 dark:border-neutral-700"
              >
                <option value="">{t('common:field.country.placeholder')}</option>
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.value}>{regionName(c.code, locale)}</option>
                ))}
              </select>
            </div>

            {/* City */}
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                {t('common:field.city.label')}
              </label>
              <input
                type="text"
                value={form.primaryCity}
                onChange={(e) => updateForm({ primaryCity: e.target.value })}
                placeholder={t('common:field.city.placeholder')}
                className="w-full rounded-xl border border-neutral-200 bg-transparent px-4 py-2.5 outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 dark:border-neutral-700"
              />
              <p className="mt-1 text-xs text-neutral-400">
                {t('web:mover.field.city.helper')}
              </p>
            </div>
          </div>
        )}

        {/* Step 3: Vehicle Details */}

        {currentStep === 'vehicle' && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              {t('booking:vehicle.title')}
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  {t('booking:vehicle.brand.label')}
                </label>
                <input
                  type="text"
                  value={form.vehicleBrand}
                  onChange={(e) => updateForm({ vehicleBrand: e.target.value })}
                  placeholder={t('booking:vehicle.brand.placeholder')}
                  className="w-full rounded-xl border border-neutral-200 bg-transparent px-4 py-2.5 outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 dark:border-neutral-700"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  {t('booking:vehicle.model.label')}
                </label>
                <input
                  type="text"
                  value={form.vehicleModel}
                  onChange={(e) => updateForm({ vehicleModel: e.target.value })}
                  placeholder={t('booking:vehicle.model.placeholder')}
                  className="w-full rounded-xl border border-neutral-200 bg-transparent px-4 py-2.5 outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 dark:border-neutral-700"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  {t('booking:vehicle.year.label')}
                </label>
                <input
                  type="text"
                  value={form.vehicleYear}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 4)
                    updateForm({ vehicleYear: val })
                  }}
                  placeholder={t('booking:vehicle.year.placeholder')}
                  inputMode="numeric"
                  maxLength={4}
                  className="w-full rounded-xl border border-neutral-200 bg-transparent px-4 py-2.5 outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 dark:border-neutral-700"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  {t('booking:vehicle.capacity.label')}
                </label>
                <input
                  type="text"
                  value={form.vehicleCapacity}
                  onChange={(e) => updateForm({ vehicleCapacity: e.target.value })}
                  placeholder={t('booking:vehicle.capacity.placeholder')}
                  className="w-full rounded-xl border border-neutral-200 bg-transparent px-4 py-2.5 outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 dark:border-neutral-700"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                {t('booking:vehicle.registration.label')}
              </label>
              <input
                type="text"
                value={form.vehicleRegistration}
                onChange={(e) => updateForm({ vehicleRegistration: e.target.value })}
                placeholder={t('booking:vehicle.registration.placeholder')}
                className="w-full rounded-xl border border-neutral-200 bg-transparent px-4 py-2.5 outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 dark:border-neutral-700"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                {t('booking:vehicle.type.label')}
              </label>
              <div className="space-y-3">
                {VEHICLE_TYPES.map((v) => {
                  // i18n-keys: booking:vehicle.smallVan.label, booking:vehicle.mediumTruck.label, booking:vehicle.largeTruck.label
                  const typeLabel = t(`booking:vehicle.${v.key}.label`)
                  // i18n-keys: booking:vehicle.smallVan.helper, booking:vehicle.mediumTruck.helper, booking:vehicle.largeTruck.helper
                  const typeHelper = t(`booking:vehicle.${v.key}.helper`)
                  return (
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
                      <p className="font-medium text-neutral-900 dark:text-neutral-100">
                        {typeLabel}
                      </p>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">
                        {typeHelper}
                      </p>
                    </div>
                  </label>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Experience */}
        {currentStep === 'experience' && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              {t('web:mover.section.experience.title')}
            </h2>
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                {t('web:mover.field.experience.label')}
              </label>
              <input
                type="number"
                min="0"
                max="50"
                value={form.yearsExperience}
                onChange={(e) => updateForm({ yearsExperience: e.target.value })}
                placeholder={t('web:mover.field.experience.placeholder')}
                className="w-full rounded-xl border border-neutral-200 bg-transparent px-4 py-2.5 outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 dark:border-neutral-700"
              />
            </div>
            {/* The "Base Rate (€ per km)" input was here, with the note "Your
                rate will be used for custom quotes." That was not true: no
                quoting code in any app ever read mover_profiles.baseRate.
                Prices come from a platform rate card keyed on declared
                capability — vehicle class, crew size and load volume — so the
                field asked movers to set a number that changed nothing while
                telling them it set their earnings. See
                `.agent/plans/capability-pricing-design.md` §4.3. */}
            <div>
              <label className="mb-2 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                {t('web:mover.field.languages.label')}
              </label>
              <div className="flex flex-wrap gap-2">
                {LANGUAGES_OPTIONS.map((lang) => {
                  const isSelected = form.languages.includes(lang.value)
                  return (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() =>
                        updateForm({
                          languages: isSelected
                            ? form.languages.filter((l) => l !== lang.value)
                            : [...form.languages, lang.value],
                        })
                      }
                      className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                        isSelected
                          ? 'bg-primary-600 text-white'
                          : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-600'
                      }`}
                    >
                      {languageName(lang.code, locale)}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Review */}
        {currentStep === 'review' && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              {t('web:mover.onboarding.review.title')}
            </h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              {t('web:mover.onboarding.review.subtitle')}
            </p>

            <div className="space-y-4 rounded-xl bg-neutral-50 p-4 dark:bg-neutral-700/50">
              <div>
                <p className="text-xs font-medium uppercase text-neutral-400">
                  {t('web:mover.onboarding.step.personal.label')}
                </p>
                <p className="mt-1 text-sm text-neutral-900 dark:text-neutral-100">
                  {t('web:mover.onboarding.review.personal.value', {
                    name: form.fullName,
                    phone: form.phone,
                  })}
                </p>
                <p className="text-sm text-neutral-500">
                  {t('web:mover.onboarding.review.license.value', { number: form.driversLicense })}
                </p>
              </div>
              <hr className="border-neutral-200 dark:border-neutral-600" />
              <div>
                <p className="text-xs font-medium uppercase text-neutral-400">
                  {t('web:mover.onboarding.review.verification.title')}
                </p>
                <p className="mt-1 text-sm text-neutral-900 dark:text-neutral-100">
                  {t('web:mover.onboarding.review.location.value', {
                    city: form.primaryCity,
                    country: countryLabel(form.primaryCountry, locale),
                  })}
                </p>
                {form.driversLicensePhotoPreview && (
                  <p className="text-sm text-green-600 dark:text-green-400">
                    {t('web:mover.onboarding.review.licenseOk')}
                  </p>
                )}
                <p className="text-sm text-neutral-500">
                  {t('web:mover.onboarding.review.ssn.value', {
                    last4: form.socialSecurityNumber.slice(-4),
                  })}
                </p>
                <p className="text-sm text-neutral-500">
                  {t('web:mover.onboarding.review.taxId.value', { taxId: form.taxNumber })}
                </p>
                {form.selfiePhotoPreview && (
                  <p className="text-sm text-green-600 dark:text-green-400">
                    {t('web:mover.onboarding.review.selfieOk')}
                  </p>
                )}
              </div>
              <hr className="border-neutral-200 dark:border-neutral-600" />
              <div>
                <p className="text-xs font-medium uppercase text-neutral-400">
                  {t('booking:field.vehicle.label')}
                </p>
                <p className="mt-1 text-sm text-neutral-900 dark:text-neutral-100">
                  {t('web:mover.onboarding.review.vehicleName.value', {
                    brand: form.vehicleBrand,
                    model: form.vehicleModel,
                    year: form.vehicleYear,
                  })}
                </p>
                <p className="text-sm text-neutral-500">
                  {(() => {
                    const selected = VEHICLE_TYPES.find((v) => v.value === form.vehicleType)
                    // i18n-keys: booking:vehicle.smallVan.label, booking:vehicle.mediumTruck.label, booking:vehicle.largeTruck.label
                    const vehicleType = selected ? t(`booking:vehicle.${selected.key}.label`) : ''
                    return form.vehicleCapacity
                      ? t('web:mover.onboarding.review.vehicle.capacity.value', {
                          vehicleType,
                          registration: form.vehicleRegistration,
                          capacity: t('booking:vehicle.capacity.value', {
                            capacity: form.vehicleCapacity,
                          }),
                        })
                      : t('web:mover.onboarding.review.vehicle.value', {
                          vehicleType,
                          registration: form.vehicleRegistration,
                        })
                  })()}
                </p>
              </div>
              <hr className="border-neutral-200 dark:border-neutral-600" />
              <div>
                <p className="text-xs font-medium uppercase text-neutral-400">
                  {t('web:mover.onboarding.review.experience.title')}
                </p>
                <p className="mt-1 text-sm text-neutral-900 dark:text-neutral-100">
                  {t('web:mover.onboarding.review.experience.value', {
                    count: Number(form.yearsExperience) || 0,
                  })}
                </p>
                <p className="text-sm text-neutral-500">
                  {t('web:mover.onboarding.review.languages.value', {
                    languages: form.languages
                      .map((value) => {
                        const option = LANGUAGES_OPTIONS.find((o) => o.value === value)
                        return option ? languageName(option.code, locale) : value
                      })
                      .join(', '),
                  })}
                </p>
              </div>
            </div>

          </div>
        )}

        {/* Error message — shown on all steps */}
        {error && (
          <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
            {error}
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
            {t('common:action.back.cta')}
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
                  {t('common:action.submitting.cta')}
                </>
              ) : (
                t('web:mover.onboarding.submit.cta')
              )}
            </button>
          ) : (
            <button
              onClick={goNext}
              disabled={!canGoNext()}
              className="flex items-center gap-1 rounded-full bg-primary-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-50"
            >
              {t('common:action.next.cta')}
              <ChevronRightIcon className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
