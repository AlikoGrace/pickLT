'use client'

import { ArrowUpTrayIcon, CameraIcon } from '@heroicons/react/24/outline'
import { useRef, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

interface VehiclePhotoFieldProps {
  label: ReactNode
  helper?: string
  /** Alt text for the preview. */
  alt: string
  /** Object URL of a fresh capture, or the stored view URL when resubmitting. */
  preview: string | null
  /** Shown under the preview when `preview` is a stored URL rather than a new file. */
  keptNote?: string | null
  onTakePhoto: () => void
  onFile: (file: File) => void
}

/**
 * One of the three vehicle evidence captures (front plate, rear plate, full
 * vehicle — master §7). Same two paths as the licence field on the
 * registration wizard: the live-camera modal (which the parent opens, so one
 * modal serves all three fields) and a plain file input as the upload path
 * and the fallback when camera access is denied.
 */
export default function VehiclePhotoField({
  label,
  helper,
  alt,
  preview,
  keptNote,
  onTakePhoto,
  onFile,
}: VehiclePhotoFieldProps) {
  const { t } = useTranslation()
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div>
      {label}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) onFile(file)
          // Let the same file be picked twice in a row.
          e.target.value = ''
        }}
      />
      {preview ? (
        <div className="relative">
          <img
            src={preview}
            alt={alt}
            className="h-40 w-full rounded-xl border border-neutral-200 object-cover dark:border-neutral-700"
          />
          <div className="absolute bottom-2 right-2 flex gap-2">
            <button
              type="button"
              onClick={onTakePhoto}
              className="rounded-full bg-white/90 px-3 py-1.5 text-xs font-medium shadow transition hover:bg-white dark:bg-neutral-800/90"
            >
              {t('web:mover.upload.takePhoto.cta')}
            </button>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="rounded-full bg-white/90 px-3 py-1.5 text-xs font-medium shadow transition hover:bg-white dark:bg-neutral-800/90"
            >
              {t('web:mover.upload.fromDevice.cta')}
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={onTakePhoto}
            className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-neutral-300 py-6 text-sm text-neutral-500 transition hover:border-primary-400 hover:text-primary-600 dark:border-neutral-600 dark:hover:border-primary-500"
          >
            <CameraIcon className="h-5 w-5" />
            {t('web:mover.upload.takePhoto.cta')}
          </button>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-neutral-300 py-6 text-sm text-neutral-500 transition hover:border-primary-400 hover:text-primary-600 dark:border-neutral-600 dark:hover:border-primary-500"
          >
            <ArrowUpTrayIcon className="h-5 w-5" />
            {t('web:mover.upload.fromDevice.cta')}
          </button>
        </div>
      )}
      {keptNote && preview && (
        <p className="mt-1 text-xs text-green-600 dark:text-green-400">{keptNote}</p>
      )}
      {helper && <p className="mt-1 text-xs text-neutral-400">{helper}</p>}
    </div>
  )
}
