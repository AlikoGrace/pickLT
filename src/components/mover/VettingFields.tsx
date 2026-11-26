'use client'

import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import VehiclePhotoField from '@/components/mover/VehiclePhotoField'
import YesNoField from '@/components/mover/YesNoField'
import { RESIDENCE_DOC_TYPES, type ResidenceDocType } from '@/lib/vetting'

/**
 * The three driver-vetting sections (plan `legal/7.driver-vetting.md`), shared
 * by the registration wizard's "Residence status" step and the documents page
 * of a registered driver. Controlled: the parent owns the files, opens the one
 * camera modal, and validates through `lib/vetting-form.ts`.
 */

export type VettingPhotoKind = 'residenceFront' | 'residenceBack' | 'certificate'

/** Stored value → catalog segment. Never derive the value from a label. */
const DOC_TYPE_KEY: Record<ResidenceDocType, 'passport' | 'residencePermit'> = {
  passport: 'passport',
  residence_permit: 'residencePermit',
}

// i18n-keys: web:mover.vetting.residence.docType.passport.label, web:mover.vetting.residence.docType.residencePermit.label
export function residenceDocTypeLabel(t: (key: string) => string, docType: ResidenceDocType): string {
  return t(`web:mover.vetting.residence.docType.${DOC_TYPE_KEY[docType]}.label`)
}

function RequiredLabel({ children }: { children: ReactNode }) {
  return (
    <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
      {children}
      <span className="ml-0.5 text-red-500">*</span>
    </label>
  )
}

const inputClass =
  'w-full rounded-xl border border-neutral-200 bg-transparent px-4 py-2.5 outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 dark:border-neutral-700'

interface ResidenceFieldsProps {
  docType: ResidenceDocType | ''
  onDocType: (docType: ResidenceDocType) => void
  frontPreview: string | null
  backPreview: string | null
  expiresAt: string
  onExpiresAt: (value: string) => void
  /** Earliest accepted date, `YYYY-MM-DD`. */
  minExpiresAt: string
  onTakePhoto: (kind: VettingPhotoKind) => void
  onFile: (kind: VettingPhotoKind, file: File) => void
  /** Radio group name; unique on the page. */
  name?: string
  disabled?: boolean
}

/** Passport or residence permit, both photographs, and the valid-until date. */
export function ResidenceFields({
  docType,
  onDocType,
  frontPreview,
  backPreview,
  expiresAt,
  onExpiresAt,
  minExpiresAt,
  onTakePhoto,
  onFile,
  name = 'residenceDocType',
  disabled,
}: ResidenceFieldsProps) {
  const { t } = useTranslation()
  const permit = docType === 'residence_permit'
  const frontLabel = permit
    ? t('web:mover.vetting.residence.photo.permitFront.label')
    : t('web:mover.vetting.residence.photo.passportData.label')
  const backLabel = permit
    ? t('web:mover.vetting.residence.photo.permitBack.label')
    : t('web:mover.vetting.residence.photo.passportStamp.label')

  return (
    <div className="space-y-4">
      {/* Why it is asked and who sees it. */}
      <p className="rounded-xl bg-neutral-50 p-3 text-sm text-neutral-600 dark:bg-neutral-700/50 dark:text-neutral-300">
        {t('web:mover.vetting.residence.why')}
      </p>
      <fieldset className="min-w-0" disabled={disabled}>
        <legend className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
          {t('web:mover.vetting.residence.docType.label')}
          <span className="ml-0.5 text-red-500">*</span>
        </legend>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {RESIDENCE_DOC_TYPES.map((value) => (
            <label
              key={value}
              className={`flex min-h-11 cursor-pointer items-center rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors ${
                docType === value
                  ? 'border-primary-500 bg-primary-50 text-primary-700 dark:border-primary-400 dark:bg-primary-900/20 dark:text-primary-300'
                  : 'border-neutral-200 text-neutral-700 hover:border-neutral-300 dark:border-neutral-700 dark:text-neutral-200 dark:hover:border-neutral-600'
              }`}
            >
              <input
                type="radio"
                name={name}
                value={value}
                checked={docType === value}
                onChange={() => onDocType(value)}
                className="sr-only"
              />
              {residenceDocTypeLabel(t, value)}
            </label>
          ))}
        </div>
      </fieldset>

      {docType !== '' && (
        <>
          <VehiclePhotoField
            label={<RequiredLabel>{frontLabel}</RequiredLabel>}
            alt={frontLabel}
            preview={frontPreview}
            onTakePhoto={() => onTakePhoto('residenceFront')}
            onFile={(f) => onFile('residenceFront', f)}
          />
          <VehiclePhotoField
            label={<RequiredLabel>{backLabel}</RequiredLabel>}
            alt={backLabel}
            preview={backPreview}
            onTakePhoto={() => onTakePhoto('residenceBack')}
            onFile={(f) => onFile('residenceBack', f)}
          />
          <div>
            <label
              htmlFor={`${name}-expires`}
              className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300"
            >
              {t('web:mover.vetting.residence.expiry.label')}
              {permit && (
                <span aria-hidden className="ml-0.5 text-red-500">
                  *
                </span>
              )}
            </label>
            <input
              id={`${name}-expires`}
              type="date"
              value={expiresAt}
              min={minExpiresAt}
              aria-required={permit || undefined}
              disabled={disabled}
              onChange={(e) => onExpiresAt(e.target.value)}
              className={inputClass}
            />
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
              {permit
                ? t('web:mover.vetting.residence.expiry.permit.helper')
                : t('web:mover.vetting.residence.expiry.passport.helper')}
            </p>
          </div>
        </>
      )}
    </div>
  )
}

interface CertificateFieldsProps {
  answer: boolean | null
  onAnswer: (value: boolean) => void
  photoPreview: string | null
  /** The daily limit for a driver without a verified certificate. */
  cap: number
  onTakePhoto: (kind: VettingPhotoKind) => void
  onFile: (kind: VettingPhotoKind, file: File) => void
  name?: string
  disabled?: boolean
}

/** "Do you hold a moving certificate?" with the ranking and daily-limit notice directly under it. */
export function CertificateFields({
  answer,
  onAnswer,
  photoPreview,
  cap,
  onTakePhoto,
  onFile,
  name = 'hasMovingCertificate',
  disabled,
}: CertificateFieldsProps) {
  const { t } = useTranslation()
  const photoLabel = t('web:mover.vetting.certificate.photo.label')
  return (
    <div className="space-y-4">
      <YesNoField
        name={name}
        question={t('web:mover.vetting.certificate.question')}
        notice={t('web:mover.vetting.certificate.notice', { count: cap })}
        value={answer}
        onChange={onAnswer}
        disabled={disabled}
      />
      {answer === true && (
        <VehiclePhotoField
          label={<RequiredLabel>{photoLabel}</RequiredLabel>}
          helper={t('web:mover.vetting.certificate.photo.helper')}
          alt={photoLabel}
          preview={photoPreview}
          onTakePhoto={() => onTakePhoto('certificate')}
          onFile={(f) => onFile('certificate', f)}
        />
      )}
    </div>
  )
}

interface BusinessInsuranceFieldProps {
  answer: boolean | null
  onAnswer: (value: boolean) => void
  name?: string
  disabled?: boolean
}

/** The business-insurance declaration, with whose responsibility insurance is. */
export function BusinessInsuranceField({
  answer,
  onAnswer,
  name = 'hasBusinessInsurance',
  disabled,
}: BusinessInsuranceFieldProps) {
  const { t } = useTranslation()
  return (
    <YesNoField
      name={name}
      question={t('web:mover.vetting.insurance.question')}
      notice={t('web:mover.vetting.insurance.notice')}
      value={answer}
      onChange={onAnswer}
      disabled={disabled}
    />
  )
}
