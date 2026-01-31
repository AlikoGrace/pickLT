'use client'

import { useMoveSearch } from '@/context/moveSearch'
import ButtonPrimary from '@/shared/ButtonPrimary'
import ButtonSecondary from '@/shared/ButtonSecondary'
import { Divider } from '@/shared/divider'
import {
  ArrowLeft02Icon,
  Camera01Icon,
  ImageAdd02Icon,
  Cancel01Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

const InstantMovePhotosPage = () => {
  const router = useRouter()
  const coverInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const [showError, setShowError] = useState(false)

  const {
    coverPhoto,
    galleryPhotos,
    setCoverPhoto,
    addGalleryPhoto,
    removeGalleryPhoto,
    inventory,
    customItems,
    pickupLocation,
    dropoffLocation,
  } = useMoveSearch()

  const inventoryCount = Object.values(inventory).reduce((sum, qty) => sum + qty, 0) + customItems.length
  const hasAtLeastOnePhoto = coverPhoto !== null || galleryPhotos.length > 0

  // Prefetch the next step
  useEffect(() => {
    router.prefetch('/instant-move/select-mover')
  }, [router])

  const handleCoverPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setCoverPhoto(reader.result as string)
        setShowError(false)
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
          setShowError(false)
        }
        reader.readAsDataURL(file)
      })
    }
  }

  const handleContinue = () => {
    if (!hasAtLeastOnePhoto) {
      setShowError(true)
      return
    }
    router.push('/instant-move/select-mover')
  }

  return (
    <div className="min-h-screen bg-white  dark:bg-neutral-900">
      {/* Header */}
      <div className="sticky top-0 z-20  bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
        <div className="container">
          <div className="flex items-center justify-between h-16">
            <Link
              href="/instant-move/inventory"
              className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
            >
              <HugeiconsIcon icon={ArrowLeft02Icon} size={20} strokeWidth={1.5} />
              <span className="text-sm font-medium">Back</span>
            </Link>
            <div className="text-center">
              <p className="text-sm font-medium text-neutral-900 dark:text-white">
                Add Photos
              </p>
              <p className="text-xs text-neutral-500">Step 3 of 4</p>
            </div>
            <div className="w-16" /> {/* Spacer for centering */}
          </div>
        </div>
      </div>

      <div className="container max-w-4xl py-8 pb-32">
        {/* Move Summary */}
        <div className="rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 p-4 mb-8">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400">
              <span className="font-medium">{pickupLocation?.split(',')[0] || 'Pickup'}</span>
              <span>→</span>
              <span className="font-medium">{dropoffLocation?.split(',')[0] || 'Drop-off'}</span>
            </div>
            <span className="text-neutral-500">{inventoryCount} items</span>
          </div>
        </div>

        {/* Info Banner */}
        <div className="rounded-2xl max-w-4xl bg-primary-50 dark:bg-primary-900/20 border border-primary-100 dark:border-primary-800 p-4 mb-8">
          <div className="flex items-start gap-3">
            <HugeiconsIcon
              icon={Camera01Icon}
              size={20}
              strokeWidth={1.5}
              className="text-primary-600 dark:text-primary-400 shrink-0 mt-0.5"
            />
            <div>
              <p className="text-sm font-medium text-primary-900 dark:text-primary-100">
                Help your mover prepare
              </p>
              <p className="text-sm text-primary-700 dark:text-primary-300 mt-1">
                Upload photos of the items you want to move. This helps the mover come prepared with the right equipment and gives them a clear idea of the job.
              </p>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {showError && (
          <div className="rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 mb-6">
            <p className="text-sm text-red-700 dark:text-red-300">
              Please add at least one photo of your items before continuing.
            </p>
          </div>
        )}

        {/* Cover Photo Upload */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
            Main photo
          </h2>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Upload a main photo showing your items or the space
          </p>
          <div className="mt-4">
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
                  className="absolute top-3 right-3 p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
                >
                  <HugeiconsIcon icon={Cancel01Icon} size={20} strokeWidth={1.5} />
                </button>
              </div>
            ) : (
              <div
                onClick={() => coverInputRef.current?.click()}
                className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-neutral-300 dark:border-neutral-600 p-8 cursor-pointer hover:border-primary-500 dark:hover:border-primary-500 transition-colors bg-neutral-50 dark:bg-neutral-800/50"
              >
                <HugeiconsIcon
                  icon={ImageAdd02Icon}
                  size={48}
                  strokeWidth={1}
                  className="text-neutral-400 mb-4"
                />
                <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Tap to upload main photo
                </p>
                <p className="text-xs text-neutral-500 mt-1">
                  PNG, JPG up to 10MB
                </p>
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={handleCoverPhotoChange}
                />
              </div>
            )}
          </div>
        </div>

        <Divider />

        {/* Gallery Photos Upload */}
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
            Additional photos
          </h2>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Upload more photos of furniture, rooms, or specific items
          </p>
          <div className="mt-4">
            {galleryPhotos.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
                {galleryPhotos.map((photo, index) => (
                  <div key={index} className="relative rounded-xl overflow-hidden aspect-square">
                    <Image
                      src={photo}
                      alt={`Photo ${index + 1}`}
                      fill
                      className="object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeGalleryPhoto(index)}
                      className="absolute top-2 right-2 p-1.5 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
                    >
                      <HugeiconsIcon icon={Cancel01Icon} size={16} strokeWidth={1.5} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div
              onClick={() => galleryInputRef.current?.click()}
              className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-neutral-300 dark:border-neutral-600 p-6 cursor-pointer hover:border-primary-500 dark:hover:border-primary-500 transition-colors bg-neutral-50 dark:bg-neutral-800/50"
            >
              <HugeiconsIcon
                icon={ImageAdd02Icon}
                size={36}
                strokeWidth={1}
                className="text-neutral-400 mb-3"
              />
              <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Add more photos
              </p>
              <p className="text-xs text-neutral-500 mt-1">
                You can select multiple files
              </p>
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/*"
                multiple
                className="sr-only"
                onChange={handleGalleryPhotosChange}
              />
            </div>
          </div>
        </div>

        {/* Photo Count */}
        <div className="mt-6 text-center">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            {coverPhoto ? 1 : 0} main photo • {galleryPhotos.length} additional photo{galleryPhotos.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Fixed Bottom Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 p-4">
        <div className="container flex gap-3">
          <ButtonSecondary
            href="/instant-move/inventory"
            className="flex-1"
          >
            Back
          </ButtonSecondary>
          <ButtonPrimary
            onClick={handleContinue}
            className="flex-1"
            disabled={!hasAtLeastOnePhoto}
          >
            Find Movers
          </ButtonPrimary>
        </div>
      </div>
    </div>
  )
}

export default InstantMovePhotosPage
