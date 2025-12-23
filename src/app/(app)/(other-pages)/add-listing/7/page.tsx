'use client'

import NcInputNumber from '@/components/NcInputNumber'
import { useMoveSearch, type AdditionalService } from '@/context/moveSearch'
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

const ADDITIONAL_SERVICES: { id: AdditionalService; label: string; description: string }[] = [
  {
    id: 'furniture_disassembly',
    label: 'Furniture disassembly',
    description: 'We disassemble beds, wardrobes, tables before loading',
  },
  {
    id: 'furniture_assembly',
    label: 'Furniture assembly',
    description: 'We reassemble furniture at the new location',
  },
  {
    id: 'tv_mount_remove',
    label: 'TV mount / remove',
    description: 'Mount or remove wall-mounted TVs',
  },
  {
    id: 'appliance_disconnect',
    label: 'Appliance disconnect',
    description: 'Disconnect washing machine, dishwasher, dryer',
  },
  {
    id: 'appliance_connect',
    label: 'Appliance connect',
    description: 'Reconnect appliances at the new address',
  },
  {
    id: 'disposal_entsorgung',
    label: 'Disposal (Entsorgung)',
    description: 'Dispose of unwanted furniture and items',
  },
  {
    id: 'moveout_cleaning',
    label: 'Move-out cleaning',
    description: 'Professional cleaning of your old apartment',
  },
  {
    id: 'temporary_storage',
    label: 'Temporary storage',
    description: 'Store items securely between moves',
  },
]

const Page = () => {
  const router = useRouter()
  const coverInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)

  const {
    additionalServices,
    storageWeeks,
    disposalItems,
    coverPhoto,
    galleryPhotos,
    toggleAdditionalService,
    setStorageWeeks,
    setDisposalItems,
    setCoverPhoto,
    addGalleryPhoto,
    removeGalleryPhoto,
  } = useMoveSearch()

  // Prefetch the next step to improve performance
  useEffect(() => {
    router.prefetch('/add-listing/8')
  }, [router])

  const handleSubmitForm = async (formData: FormData) => {
    const formObject = Object.fromEntries(formData.entries())
    console.log('Form submitted:', formObject)

    // Redirect to the next step
    router.push('/add-listing/8')
  }

  const handleCoverPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setCoverPhoto(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleGalleryPhotosChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files) {
      Array.from(files).forEach((file) => {
        const reader = new FileReader()
        reader.onloadend = () => {
          addGalleryPhoto(reader.result as string)
        }
        reader.readAsDataURL(file)
      })
    }
  }

  const showStorageOptions = additionalServices.includes('temporary_storage')
  const showDisposalOptions = additionalServices.includes('disposal_entsorgung')

  return (
    <>
      <div>
        <h2 className="text-2xl font-semibold">Additional services & photos</h2>
        <span className="mt-2 block text-neutral-500 dark:text-neutral-400">
          Select extra services and upload photos of items to be moved.
        </span>
      </div>

      <Divider />

      <Form id="add-listing-form" action={handleSubmitForm} className="flex flex-col gap-y-8">
        {/* Cover Photo Upload */}
        <div>
          <span className="text-lg font-semibold">Cover photo</span>
          <span className="mt-1 block text-sm text-neutral-500 dark:text-neutral-400">
            Upload a main photo showing your items or space
          </span>
          <div className="mt-5">
            {coverPhoto ? (
              <div className="relative rounded-2xl overflow-hidden">
                <Image
                  src={coverPhoto}
                  alt="Cover photo"
                  width={600}
                  height={400}
                  className="w-full h-64 object-cover"
                />
                <button
                  type="button"
                  onClick={() => setCoverPhoto(null)}
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
                      <span>Upload a file</span>
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
                    <p className="ps-1">or drag and drop</p>
                  </div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    PNG, JPG, GIF up to 10MB
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Gallery Photos Upload */}
        <div>
          <span className="text-lg font-semibold">Gallery photos</span>
          <span className="mt-1 block text-sm text-neutral-500 dark:text-neutral-400">
            Upload additional photos of furniture, rooms, or items
          </span>
          <div className="mt-5">
            {galleryPhotos.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
                {galleryPhotos.map((photo, index) => (
                  <div key={index} className="relative rounded-xl overflow-hidden">
                    <Image
                      src={photo}
                      alt={`Gallery photo ${index + 1}`}
                      width={200}
                      height={150}
                      className="w-full h-32 object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeGalleryPhoto(index)}
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
                    <span>Upload files</span>
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
                  <p className="ps-1">or drag and drop</p>
                </div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  PNG, JPG, GIF up to 10MB
                </p>
              </div>
            </div>
          </div>
        </div>

        <Divider />

        {/* Additional Services Checkboxes */}
        <div>
          <span className="text-lg font-semibold">Additional services</span>
          <span className="mt-1 block text-sm text-neutral-500 dark:text-neutral-400">
            These are standard offerings from German movers.
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
                  <Label className="flex flex-col">
                    <span className="font-medium">{service.label}</span>
                    <span className="text-sm text-neutral-500 dark:text-neutral-400">
                      {service.description}
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
              <p className="text-lg font-semibold mb-4">Storage details</p>
              <NcInputNumber
                inputName="storageWeeks"
                inputId="storageWeeks"
                label="How many weeks of storage?"
                defaultValue={storageWeeks}
                min={1}
                max={52}
                onChange={(value) => setStorageWeeks(value)}
              />
              <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
                Standard storage units are climate-controlled and insured.
              </p>
            </div>
          </>
        )}

        {/* Conditional: Disposal Items */}
        {showDisposalOptions && (
          <>
            <Divider />
            <div className="p-4 bg-neutral-50 dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700">
              <p className="text-lg font-semibold">Items for disposal</p>
              <span className="mt-1 block text-sm text-neutral-500 dark:text-neutral-400">
                List the furniture or items you want us to dispose of.
              </span>
              <div className="mt-4">
                <Textarea
                  name="disposalItems"
                  placeholder="e.g., Old sofa, broken bookshelf, mattress..."
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
        <input type="hidden" name="coverPhoto" value={coverPhoto || ''} />
        <input type="hidden" name="galleryPhotos" value={JSON.stringify(galleryPhotos)} />
      </Form>
    </>
  )
}

export default Page
