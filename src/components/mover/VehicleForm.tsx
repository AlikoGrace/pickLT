'use client'

import { TruckIcon } from '@heroicons/react/24/outline'
import { useEffect, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import CameraCaptureModal from '@/components/CameraCaptureModal'
import VehiclePhotoField from '@/components/mover/VehiclePhotoField'
import type { VehicleDoc } from '@/lib/types'
import { submitVehicle, uploadVehiclePhoto, VehicleApiError, type SubmitVehiclePayload } from '@/lib/vehicle-client'
import { vehicleCapacityLabel } from '@/lib/vehicle-capacity'
import { validateVehicleInput, type VehicleOwnership } from '@/lib/vehicle-service'

/** Stored slug → catalog segment. Never derive the slug from a label. */
export const VEHICLE_TYPE_OPTIONS: { value: string; key: 'smallVan' | 'mediumTruck' | 'largeTruck' }[] = [
  { value: 'small_van', key: 'smallVan' },
  { value: 'medium_truck', key: 'mediumTruck' },
  { value: 'large_truck', key: 'largeTruck' },
]

type PhotoKind = 'front' | 'rear' | 'full'

interface PhotoSlot {
  file: File | null
  /** Object URL of `file`, or the stored view URL when prefilled. */
  preview: string | null
  /** The stored URL to keep when no new file is chosen (resubmission only). */
  existingUrl: string | null
}

const emptySlot = (): PhotoSlot => ({ file: null, preview: null, existingUrl: null })

interface Props {
  mode: 'add' | 'change' | 'resubmit'
  source: SubmitVehiclePayload['source']
  /** Ownership the profile currently declares; editable on the form. */
  initialOwnership: VehicleOwnership
  /** The rejected/pending vehicle to prefill and resubmit in place. */
  prefill?: VehicleDoc | null
  onSuccess: () => Promise<void> | void
  /** Extra content rendered above the submit button (a note about the change). */
  note?: ReactNode
}

function RequiredLabel({ children }: { children: ReactNode }) {
  return (
    <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
      {children}
      <span aria-hidden className="ml-0.5 text-red-500">
        *
      </span>
    </label>
  )
}

const inputClass =
  'w-full rounded-xl border border-neutral-200 bg-transparent px-4 py-2.5 outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 dark:border-neutral-700'

/**
 * The vehicle submission form (master §6.1 evidence standard, D5): plate,
 * make/model/year/type, optional capacity, and the three photos. Uploads the
 * photos (`purpose='vehicle'`) and calls `POST /api/mover/vehicle`. Used by
 * `/vehicle/setup` for add / change / resubmit; the registration wizard
 * carries the same fields inline because they are part of a bigger form.
 */
export default function VehicleForm({ mode, source, initialOwnership, prefill, onSuccess, note }: Props) {
  const { t } = useTranslation()
  const [ownership, setOwnership] = useState<VehicleOwnership>(initialOwnership)
  const [fields, setFields] = useState({
    registrationNumber: prefill?.registrationNumber ?? '',
    brand: prefill?.brand ?? '',
    model: prefill?.model ?? '',
    year: prefill?.year ?? '',
    capacityM3: prefill?.capacityM3 != null ? String(prefill.capacityM3) : '',
    vehicleType: prefill?.vehicleType ?? '',
  })
  const [photos, setPhotos] = useState<Record<PhotoKind, PhotoSlot>>(() => ({
    front: prefill ? { file: null, preview: prefill.frontPlatePhoto, existingUrl: prefill.frontPlatePhoto } : emptySlot(),
    rear: prefill ? { file: null, preview: prefill.rearPlatePhoto, existingUrl: prefill.rearPlatePhoto } : emptySlot(),
    full: prefill ? { file: null, preview: prefill.fullVehiclePhoto, existingUrl: prefill.fullVehiclePhoto } : emptySlot(),
  }))
  const [cameraFor, setCameraFor] = useState<PhotoKind | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setOwnership(initialOwnership)
  }, [initialOwnership])

  // Object URLs are revoked when replaced or on unmount.
  useEffect(() => {
    return () => {
      for (const slot of Object.values(photos)) {
        if (slot.file && slot.preview) URL.revokeObjectURL(slot.preview)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const setPhoto = (kind: PhotoKind, file: File) => {
    setPhotos((prev) => {
      const old = prev[kind]
      if (old.file && old.preview) URL.revokeObjectURL(old.preview)
      return { ...prev, [kind]: { file, preview: URL.createObjectURL(file), existingUrl: old.existingUrl } }
    })
  }

  const update = (patch: Partial<typeof fields>) => setFields((prev) => ({ ...prev, ...patch }))

  const hasPhoto = (kind: PhotoKind) => !!(photos[kind].file || photos[kind].existingUrl)

  const codes = validateVehicleInput({
    ownership,
    ...fields,
    frontPlatePhoto: hasPhoto('front') ? 'pending' : '',
    rearPlatePhoto: hasPhoto('rear') ? 'pending' : '',
    fullVehiclePhoto: hasPhoto('full') ? 'pending' : '',
  })
  const valid = codes.length === 0

  const handleSubmit = async () => {
    if (!valid) {
      // i18n-keys: errors:vehicle.photosRequired, errors:vehicle.plateInvalid, errors:vehicle.fieldsRequired,
      // errors:vehicle.typeInvalid, errors:vehicle.capacityOutOfRange, errors:vehicle.yearInvalid
      setError(t(`errors:${codes[0]}`))
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const resolve = async (kind: PhotoKind): Promise<string> => {
        const slot = photos[kind]
        if (slot.file) return uploadVehiclePhoto(slot.file)
        return slot.existingUrl ?? ''
      }
      const [frontPlatePhoto, rearPlatePhoto, fullVehiclePhoto] = await Promise.all([
        resolve('front'),
        resolve('rear'),
        resolve('full'),
      ])
      await submitVehicle({
        ownership,
        registrationNumber: fields.registrationNumber.trim(),
        brand: fields.brand.trim(),
        model: fields.model.trim(),
        year: fields.year.trim() || undefined,
        vehicleType: fields.vehicleType,
        capacityM3: fields.capacityM3.trim() || null,
        frontPlatePhoto,
        rearPlatePhoto,
        fullVehiclePhoto,
        source,
        vehicleId: mode === 'resubmit' ? (prefill?.$id ?? null) : null,
      })
      await onSuccess()
    } catch (err) {
      if (err instanceof VehicleApiError && err.fnCode) {
        // i18n-keys: errors:vehicle.plateInUse, errors:vehicle.notFound, errors:vehicle.notPending
        setError(t(`errors:${err.fnCode}`, { defaultValue: err.message }))
      } else {
        setError(err instanceof Error ? err.message : t('web:mover.vehicle.submitFailed.error'))
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* Ownership */}
      <div>
        <RequiredLabel>{t('booking:vehicle.ownership.label')}</RequiredLabel>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {(['owned', 'rented'] as const).map((value) => (
            <label
              key={value}
              className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors ${
                ownership === value
                  ? 'border-primary-500 bg-primary-50 dark:border-primary-400 dark:bg-primary-900/20'
                  : 'border-neutral-200 hover:border-neutral-300 dark:border-neutral-700'
              }`}
            >
              <input
                type="radio"
                name="vehicleOwnership"
                value={value}
                checked={ownership === value}
                onChange={() => setOwnership(value)}
                className="sr-only"
              />
              <div>
                {/* i18n-keys: common:vehicleOwnership.owned.label, common:vehicleOwnership.rented.label */}
                <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                  {t(`common:vehicleOwnership.${value}.label`)}
                </p>
                {/* i18n-keys: booking:vehicle.ownership.owned.helper, booking:vehicle.ownership.rented.helper */}
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  {t(`booking:vehicle.ownership.${value}.helper`)}
                </p>
              </div>
            </label>
          ))}
        </div>
        {/* Rented → owned is the admin's call (master D16): say so before they submit. */}
        {initialOwnership === 'rented' && ownership === 'owned' && (
          <p className="mt-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
            {t('booking:vehicle.ownership.switchNeedsApproval.body')}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
            {t('booking:vehicle.brand.label')}
          </label>
          <input
            type="text"
            value={fields.brand}
            onChange={(e) => update({ brand: e.target.value })}
            placeholder={t('booking:vehicle.brand.placeholder')}
            className={inputClass}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
            {t('booking:vehicle.model.label')}
          </label>
          <input
            type="text"
            value={fields.model}
            onChange={(e) => update({ model: e.target.value })}
            placeholder={t('booking:vehicle.model.placeholder')}
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
            {t('booking:vehicle.yearShort.label')}
          </label>
          <input
            type="text"
            value={fields.year}
            onChange={(e) => update({ year: e.target.value.replace(/\D/g, '').slice(0, 4) })}
            placeholder={t('booking:vehicle.year.placeholder')}
            inputMode="numeric"
            maxLength={4}
            className={inputClass}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
            {t('booking:vehicle.capacity.label')}
          </label>
          <input
            type="text"
            value={fields.capacityM3}
            onChange={(e) => update({ capacityM3: e.target.value })}
            placeholder={t('booking:vehicle.capacity.placeholder')}
            inputMode="decimal"
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
          {t('booking:vehicle.registration.label')}
        </label>
        <input
          type="text"
          value={fields.registrationNumber}
          onChange={(e) => update({ registrationNumber: e.target.value })}
          placeholder={t('booking:vehicle.registration.placeholder')}
          className={`${inputClass} font-mono uppercase`}
        />
        <p className="mt-1 text-xs text-neutral-400">{t('booking:vehicle.registration.helper')}</p>
      </div>

      <div>
        <RequiredLabel>{t('booking:vehicle.type.label')}</RequiredLabel>
        <div className="space-y-2">
          {VEHICLE_TYPE_OPTIONS.map((v) => (
            <label
              key={v.value}
              className={`flex cursor-pointer items-center rounded-xl border p-3 transition-colors ${
                fields.vehicleType === v.value
                  ? 'border-primary-500 bg-primary-50 dark:border-primary-400 dark:bg-primary-900/20'
                  : 'border-neutral-200 hover:border-neutral-300 dark:border-neutral-700'
              }`}
            >
              <input
                type="radio"
                name="vehicleTypeForm"
                value={v.value}
                checked={fields.vehicleType === v.value}
                onChange={() => update({ vehicleType: v.value })}
                className="sr-only"
              />
              <TruckIcon className="mr-3 h-5 w-5 flex-shrink-0 text-neutral-500" />
              <div>
                {/* i18n-keys: booking:vehicle.smallVan.label, booking:vehicle.mediumTruck.label, booking:vehicle.largeTruck.label */}
                <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                  {t(`booking:vehicle.${v.key}.label`)}
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">{vehicleCapacityLabel(t, v.key)}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Evidence */}
      <div className="space-y-4 rounded-xl border border-neutral-200 p-4 dark:border-neutral-700">
        <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
          {t('booking:vehicle.evidence.title')}
        </h3>
        <VehiclePhotoField
          label={<RequiredLabel>{t('booking:vehicle.plateFront.label')}</RequiredLabel>}
          helper={t('booking:vehicle.plateFront.helper')}
          alt={t('web:mover.vehicle.photo.front.a11y')}
          preview={photos.front.preview}
          keptNote={photos.front.file ? null : t('web:mover.vehicle.setup.keepPhoto.label')}
          onTakePhoto={() => setCameraFor('front')}
          onFile={(f) => setPhoto('front', f)}
        />
        <VehiclePhotoField
          label={<RequiredLabel>{t('booking:vehicle.plateRear.label')}</RequiredLabel>}
          helper={t('booking:vehicle.plateRear.helper')}
          alt={t('web:mover.vehicle.photo.rear.a11y')}
          preview={photos.rear.preview}
          keptNote={photos.rear.file ? null : t('web:mover.vehicle.setup.keepPhoto.label')}
          onTakePhoto={() => setCameraFor('rear')}
          onFile={(f) => setPhoto('rear', f)}
        />
        <VehiclePhotoField
          label={<RequiredLabel>{t('booking:vehicle.fullPhoto.label')}</RequiredLabel>}
          helper={t('booking:vehicle.fullPhoto.helper')}
          alt={t('web:mover.vehicle.photo.full.a11y')}
          preview={photos.full.preview}
          keptNote={photos.full.file ? null : t('web:mover.vehicle.setup.keepPhoto.label')}
          onTakePhoto={() => setCameraFor('full')}
          onFile={(f) => setPhoto('full', f)}
        />
      </div>

      {note}

      {error && (
        <div className="rounded-xl bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">{error}</div>
      )}

      {/* Client spec §14: state the driver's obligation at the point of submission. */}
      <p className="text-xs text-neutral-500 dark:text-neutral-400">{t('booking:vehicle.declaration.body')}</p>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full rounded-full bg-primary-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:opacity-50"
      >
        {submitting ? t('common:action.submitting.cta') : t('booking:vehicle.submitForVerification.cta')}
      </button>

      <CameraCaptureModal
        open={cameraFor !== null}
        facingMode="environment"
        onCapture={(file) => {
          if (cameraFor) setPhoto(cameraFor, file)
          setCameraFor(null)
        }}
        onClose={() => setCameraFor(null)}
      />
    </div>
  )
}
