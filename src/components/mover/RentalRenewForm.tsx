'use client'

import { TruckIcon } from '@heroicons/react/24/outline'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import CameraCaptureModal from '@/components/CameraCaptureModal'
import RentalWindowPicker from '@/components/mover/RentalWindowPicker'
import VehiclePhotoField from '@/components/mover/VehiclePhotoField'
import { formatDateTime } from '@/lib/format'
import type { VehicleDoc } from '@/lib/types'
import { renewRental, uploadVehiclePhoto, VehicleApiError } from '@/lib/vehicle-client'
import { canAutoRenew, resolveRentalWindow, type RentalWindowInput } from '@/lib/vehicle-service'

type PhotoKind = 'front' | 'rear' | 'full'

interface Props {
  /** The rental row being renewed — same plates, same photos, new window (R5). */
  vehicle: VehicleDoc
  onSuccess: (result: { autoVerified: boolean; endAt: string }) => Promise<void> | void
}

/**
 * "Rent again" / "Extend" (plan wave-2026-10/1 R5). Asks only for the new
 * window; when the last window ended more than 30 days ago (or the row was
 * rejected) the server will send it back to review, so the form also collects
 * fresh plate photos in that case and says so up front.
 */
export default function RentalRenewForm({ vehicle, onSuccess }: Props) {
  const { t } = useTranslation()
  const nowMs = Date.now()
  // Same rule as the server (`canAutoRenew` also accepts a cron-closed rental within the grace period).
  const autoVerified = canAutoRenew(vehicle, nowMs)
  const [rental, setRental] = useState<RentalWindowInput>({ hours: 24, endAt: null, provider: vehicle.rentalProvider ?? '' })
  const [photos, setPhotos] = useState<Record<PhotoKind, File | null>>({ front: null, rear: null, full: null })
  const [previews, setPreviews] = useState<Record<PhotoKind, string | null>>({ front: null, rear: null, full: null })
  const [cameraFor, setCameraFor] = useState<PhotoKind | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const setPhoto = (kind: PhotoKind, file: File) => {
    setPhotos((p) => ({ ...p, [kind]: file }))
    setPreviews((p) => {
      if (p[kind]) URL.revokeObjectURL(p[kind] as string)
      return { ...p, [kind]: URL.createObjectURL(file) }
    })
  }

  const resolved = resolveRentalWindow(rental, nowMs)
  const photosComplete = autoVerified || (photos.front && photos.rear && photos.full)
  const valid = resolved.ok && !!photosComplete

  const submit = async () => {
    if (!resolved.ok) {
      // i18n-keys: errors:vehicle.rentalWindowRequired, errors:vehicle.rentalWindowInvalid, errors:vehicle.rentalWindowTooLong
      setError(t(`errors:${resolved.codes[0]}`))
      return
    }
    if (!photosComplete) {
      setError(t('errors:vehicle.photosRequired'))
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const uploaded = autoVerified
        ? {}
        : {
            frontPlatePhoto: await uploadVehiclePhoto(photos.front as File),
            rearPlatePhoto: await uploadVehiclePhoto(photos.rear as File),
            fullVehiclePhoto: await uploadVehiclePhoto(photos.full as File),
          }
      const res = await renewRental({ vehicleId: vehicle.$id, rental, ...uploaded })
      await onSuccess({ autoVerified: res.autoVerified, endAt: res.vehicle.rentalEndAt ?? resolved.window.endAt })
    } catch (err) {
      if (err instanceof VehicleApiError && err.fnCode) {
        // i18n-keys: errors:vehicle.notFound, errors:vehicle.notOwnVehicle, errors:vehicle.notRental, errors:vehicle.photosRequired
        setError(t(`errors:${err.fnCode}`, { defaultValue: err.message }))
      } else {
        setError(err instanceof Error ? err.message : t('web:mover.vehicle.renew.failed.error'))
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 rounded-xl bg-neutral-50 p-4 dark:bg-neutral-700/50">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-white dark:bg-neutral-800">
          <TruckIcon className="h-5 w-5 text-neutral-600 dark:text-neutral-300" />
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-neutral-900 dark:text-neutral-100">
            {[vehicle.brand, vehicle.model, vehicle.year].filter(Boolean).join(' ')}
          </p>
          <p className="font-mono text-sm tracking-wider text-neutral-700 dark:text-neutral-200">{vehicle.registrationNumber}</p>
          {vehicle.rentalEndAt && (
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
              {t('web:mover.vehicle.window.ended.label', { time: formatDateTime(vehicle.rentalEndAt) })}
            </p>
          )}
        </div>
      </div>

      <p
        className={`rounded-xl p-3 text-sm ${
          autoVerified
            ? 'bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-200'
            : 'bg-amber-50 text-amber-800 dark:bg-amber-900/20 dark:text-amber-200'
        }`}
      >
        {autoVerified ? t('booking:vehicle.rental.renewAutoVerified.helper') : t('booking:vehicle.rental.renewNeedsReview.helper')}
      </p>

      <RentalWindowPicker value={rental} onChange={setRental} nowMs={nowMs} disabled={submitting} />

      {!autoVerified && (
        <div className="space-y-4 rounded-xl border border-neutral-200 p-4 dark:border-neutral-700">
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{t('web:mover.vehicle.renew.photos.title')}</h3>
          <VehiclePhotoField
            label={<span className="text-sm font-medium">{t('booking:vehicle.plateFront.label')}</span>}
            helper={t('booking:vehicle.plateFront.helper')}
            alt={t('web:mover.vehicle.photo.front.a11y')}
            preview={previews.front}
            onTakePhoto={() => setCameraFor('front')}
            onFile={(f) => setPhoto('front', f)}
          />
          <VehiclePhotoField
            label={<span className="text-sm font-medium">{t('booking:vehicle.plateRear.label')}</span>}
            helper={t('booking:vehicle.plateRear.helper')}
            alt={t('web:mover.vehicle.photo.rear.a11y')}
            preview={previews.rear}
            onTakePhoto={() => setCameraFor('rear')}
            onFile={(f) => setPhoto('rear', f)}
          />
          <VehiclePhotoField
            label={<span className="text-sm font-medium">{t('booking:vehicle.fullPhoto.label')}</span>}
            helper={t('booking:vehicle.fullPhoto.helper')}
            alt={t('web:mover.vehicle.photo.full.a11y')}
            preview={previews.full}
            onTakePhoto={() => setCameraFor('full')}
            onFile={(f) => setPhoto('full', f)}
          />
        </div>
      )}

      {error && (
        <div className="rounded-xl bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">{error}</div>
      )}

      <p className="text-xs text-neutral-500 dark:text-neutral-400">{t('booking:vehicle.declaration.confirmBody')}</p>

      <button
        type="button"
        onClick={submit}
        disabled={submitting || !valid}
        className="w-full rounded-full bg-primary-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:opacity-50"
      >
        {submitting ? t('common:action.submitting.cta') : t('web:mover.vehicle.renew.submit.cta')}
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
