'use client'

import NcInputNumber from '@/components/NcInputNumber'
import { useMoveSearch, type AdditionalService } from '@/context/moveSearch'
import { compressImage } from '@/utils/compressImage'
import { Checkbox, CheckboxField, CheckboxGroup } from '@/shared/Checkbox'
import { Divider } from '@/shared/divider'
import { Fieldset, Label } from '@/shared/fieldset'
import Textarea from '@/shared/Textarea'
import { ImageAdd02Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { XMarkIcon } from '@heroicons/react/24/solid'
import Form from 'next/form'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { formatFileSizeMb } from '@/lib/format'
import { UPLOAD_MAX_MB } from '@/lib/service-limits'

/**
 * `id` is the persisted value and never changes. `key` is the catalog segment —
 * the ids carry `_`, which i18next reserves for plural suffixes (§ 2), so the
 * two cannot be the same string.
 */
const ADDITIONAL_SERVICES: { id: AdditionalService; key: string }[] = [
  { id: 'furniture_disassembly', key: 'disassembly' },
  { id: 'furniture_assembly', key: 'assembly' },
  { id: 'tv_mount_remove', key: 'tvMount' },
  { id: 'appliance_disconnect', key: 'applianceDisconnect' },
  { id: 'appliance_connect', key: 'applianceConnect' },
  { id: 'disposal_entsorgung', key: 'disposal' },
  { id: 'moveout_cleaning', key: 'cleaning' },
  { id: 'temporary_storage', key: 'storage' },
]

const Page = () => {
  const { t } = useTranslation()
  const router = useRouter()
  const coverInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)

  const {
    additionalServices,
    storageWeeks,
    disposalItems,
    coverPhotoId,
    galleryPhotoIds,
    toggleAdditionalService,
    setStorageWeeks,
    setDisposalItems,
    setCoverPhotoId,
    addGalleryPhotoId,
    removeGalleryPhotoId,
  } = useMoveSearch()

  // Prefetch the next step to improve performance
  useEffect(() => {
    router.prefetch('/add-listing/7')
  }, [router])

  const handleSubmitForm = async (formData: FormData) => {
    const formObject = Object.fromEntries(formData.entries())
    console.log('Form submitted:', formObject)

    // Redirect to the next step
    router.push('/add-listing/7')
  }

  const handleCoverPhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const compressed = await compressImage(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setCoverPhotoId(reader.result as string)
      }
      reader.readAsDataURL(compressed)
    }
  }

  const handleGalleryPhotosChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files) {
      for (const file of Array.from(files)) {
        const compressed = await compressImage(file)
        const reader = new FileReader()
        reader.onloadend = () => {
          addGalleryPhotoId(reader.result as string)
        }
        reader.readAsDataURL(compressed)
      }
    }
  }

  const showStorageOptions = additionalServices.includes('temporary_storage')
  const showDisposalOptions = additionalServices.includes('disposal_entsorgung')

  return (
    <>
      <div>
        <h2 className="text-2xl font-semibold">{t('web:wizard.step6.title')}</h2>
        <span className="mt-2 block text-neutral-500 dark:text-neutral-400">
          {t('web:wizard.step6.subtitle')}
        </span>
      </div>

      <Divider />

      <Form id="add-listing-form" action={handleSubmitForm} className="flex flex-col gap-y-8">
        {/* Cover Photo Upload */}
        <div>
          <span className="text-lg font-semibold">{t('booking:photos.main.label')}</span>
          <span className="mt-1 block text-sm text-neutral-500 dark:text-neutral-400">
            {t('booking:photos.main.helper')}
          </span>
          <div className="mt-5">
            {coverPhotoId ? (
              <div className="relative rounded-2xl overflow-hidden">
                <Image
                  src={coverPhotoId}
                  alt={t('booking:photos.main.a11y')}
                  width={600}
                  height={400}
                  className="w-full h-64 object-cover"
                />
                <button
                  type="button"
                  onClick={() => setCoverPhotoId(null)}
                  className="absolute top-3 right-3 p-2 bg-black/50 rounded-full text-white hover:bg-black/70"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
            ) : (
              <div
                onClick={() => coverInputRef.current?.click()}
                className="mt-1 flex justify-center rounded-2xl border-2 border-dashed border-neutral-300 px-6 pt-5 pb-6 dark:border-neutral-600 cursor-pointer hover:border-primary-500 transition-colors"
              >
                <div className="space-y-1 text-center">
                  <HugeiconsIcon
                    className="mx-auto text-neutral-400"
                    icon={ImageAdd02Icon}
                    size={48}
                    strokeWidth={1}
                  />
                  <div className="flex text-sm text-neutral-600 dark:text-neutral-300">
                    <label
                      htmlFor="cover-upload"
                      className="relative cursor-pointer rounded-md font-medium text-primary-600 focus-within:ring-2 focus-within:ring-primary-500 focus-within:ring-offset-2 focus-within:outline-hidden hover:text-primary-500"
                    >
                      <span>{t('common:upload.file.cta')}</span>
                      <input
                        ref={coverInputRef}
                        id="cover-upload"
                        name="cover"
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={handleCoverPhotoChange}
                      />
                    </label>
                    <p className="ps-1">{t('common:upload.dragDrop.label')}</p>
                  </div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    {t('common:upload.constraints.helper', { limit: formatFileSizeMb(UPLOAD_MAX_MB) })}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Gallery Photos Upload */}
        <div>
          <span className="text-lg font-semibold">{t('booking:photos.gallery.label')}</span>
          <span className="mt-1 block text-sm text-neutral-500 dark:text-neutral-400">
            {t('booking:photos.gallery.helper')}
          </span>
          <div className="mt-5">
            {galleryPhotoIds.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
                {galleryPhotoIds.map((photo, index) => (
                  <div key={index} className="relative rounded-xl overflow-hidden">
                    <Image
                      src={photo}
                      alt={t('booking:photos.gallery.item.a11y', { index: index + 1 })}
                      width={200}
                      height={150}
                      className="w-full h-32 object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeGalleryPhotoId(index)}
                      className="absolute top-2 right-2 p-1.5 bg-black/50 rounded-full text-white hover:bg-black/70"
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div
              onClick={() => galleryInputRef.current?.click()}
              className="mt-1 flex justify-center rounded-2xl border-2 border-dashed border-neutral-300 px-6 pt-5 pb-6 dark:border-neutral-600 cursor-pointer hover:border-primary-500 transition-colors"
            >
              <div className="space-y-1 text-center">
                <HugeiconsIcon
                  className="mx-auto text-neutral-400"
                  icon={ImageAdd02Icon}
                  size={48}
                  strokeWidth={1}
                />
                <div className="flex text-sm text-neutral-600 dark:text-neutral-300">
                  <label
                    htmlFor="gallery-upload"
                    className="relative cursor-pointer rounded-md font-medium text-primary-600 focus-within:ring-2 focus-within:ring-primary-500 focus-within:ring-offset-2 focus-within:outline-hidden hover:text-primary-500"
                  >
                    <span>{t('common:upload.files.cta')}</span>
                    <input
                      ref={galleryInputRef}
                      id="gallery-upload"
                      name="gallery"
                      type="file"
                      accept="image/*"
                      multiple
                      className="sr-only"
                      onChange={handleGalleryPhotosChange}
                    />
                  </label>
                  <p className="ps-1">{t('common:upload.dragDrop.label')}</p>
                </div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  {t('common:upload.constraints.helper', { limit: formatFileSizeMb(UPLOAD_MAX_MB) })}
                </p>
              </div>
            </div>
          </div>
        </div>

        <Divider />

        {/* Additional Services Checkboxes */}
        <div>
          <span className="text-lg font-semibold">{t('booking:services.title')}</span>
          <span className="mt-1 block text-sm text-neutral-500 dark:text-neutral-400">
            {t('web:wizard.step6.services.helper')}
          </span>
          <Fieldset className="mt-4">
            <CheckboxGroup className="space-y-4">
              {ADDITIONAL_SERVICES.map((service) => (
                <CheckboxField key={service.id}>
                  <Checkbox
                    name={`service_${service.id}`}
                    checked={additionalServices.includes(service.id)}
                    onChange={() => toggleAdditionalService(service.id)}
                  />
                  {/* i18n-keys: booking.service.disassembly.label, booking.service.assembly.label,
                      booking.service.tvMount.label, booking.service.applianceDisconnect.label,
                      booking.service.applianceConnect.label, booking.service.disposal.label,
                      booking.service.cleaning.label, booking.service.storage.label (+ .helper each) */}
                  <Label className="flex flex-col">
                    <span className="font-medium">{t(`booking:service.${service.key}.label`)}</span>
                    <span className="text-sm text-neutral-500 dark:text-neutral-400">
                      {t(`booking:service.${service.key}.helper`)}
                    </span>
                  </Label>
                </CheckboxField>
              ))}
            </CheckboxGroup>
          </Fieldset>
        </div>

        {/* Conditional: Storage Duration */}
        {showStorageOptions && (
          <>
            <Divider />
            <div className="p-4 bg-neutral-50 dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700">
              <p className="text-lg font-semibold mb-4">{t('booking:storage.title')}</p>
              <NcInputNumber
                inputName="storageWeeks"
                inputId="storageWeeks"
                label={t('booking:storage.weeks.label')}
                defaultValue={storageWeeks}
                min={1}
                max={52}
                onChange={(value) => setStorageWeeks(value)}
              />
              <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
                {t('booking:storage.helper')}
              </p>
            </div>
          </>
        )}

        {/* Conditional: Disposal Items */}
        {showDisposalOptions && (
          <>
            <Divider />
            <div className="p-4 bg-neutral-50 dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700">
              <p className="text-lg font-semibold">{t('booking:disposal.title')}</p>
              <span className="mt-1 block text-sm text-neutral-500 dark:text-neutral-400">
                {t('booking:disposal.helper')}
              </span>
              <div className="mt-4">
                <Textarea
                  name="disposalItems"
                  placeholder={t('booking:disposal.placeholder')}
                  value={disposalItems}
                  onChange={(e) => setDisposalItems(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          </>
        )}

        {/* Hidden fields for form data */}
        <input type="hidden" name="additionalServices" value={JSON.stringify(additionalServices)} />
        <input type="hidden" name="storageWeeksValue" value={storageWeeks} />
        <input type="hidden" name="disposalItemsValue" value={disposalItems} />
        <input type="hidden" name="coverPhotoId" value={coverPhotoId || ''} />
        <input type="hidden" name="galleryPhotoIds" value={JSON.stringify(galleryPhotoIds)} />
      </Form>
    </>
  )
}

export default Page
