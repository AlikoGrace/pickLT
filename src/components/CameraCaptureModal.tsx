'use client'

import { XMarkIcon } from '@heroicons/react/24/outline'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

interface CameraCaptureModalProps {
  open: boolean
  /** 'user' opens the front camera with a mirrored preview (selfies);
   *  'environment' opens the back camera (documents on a table). */
  facingMode: 'user' | 'environment'
  onCapture: (file: File) => void
  onClose: () => void
}

/**
 * Live in-browser camera capture over `getUserMedia`. The `capture` attribute
 * on a file input only reaches a camera on some mobile browsers and never on
 * desktop — this modal is the path that works everywhere, and the plain file
 * input stays next to it as the upload path (and the fallback when camera
 * access is denied, which is what the inline error tells the user to use).
 */
export default function CameraCaptureModal({
  open,
  facingMode,
  onCapture,
  onClose,
}: CameraCaptureModalProps) {
  const { t } = useTranslation()
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [error, setError] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setError(false)
    setReady(false)
    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          // `ideal`, not `exact`: a desktop with a single webcam must still
          // open it when the back camera is requested.
          video: { facingMode: { ideal: facingMode } },
          audio: false,
        })
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }
        if (!cancelled) setReady(true)
      } catch {
        if (!cancelled) setError(true)
      }
    }
    start()
    return () => {
      cancelled = true
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
  }, [open, facingMode])

  if (!open) return null

  function capture() {
    const video = videoRef.current
    if (!video || !video.videoWidth) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    // Raw frame, not the mirrored preview: a mirrored selfie would flip any
    // text in frame and does not match what a native camera app saves.
    canvas.getContext('2d')?.drawImage(video, 0, 0)
    canvas.toBlob(
      (blob) => {
        if (blob) onCapture(new File([blob], 'camera-photo.jpg', { type: 'image/jpeg' }))
      },
      'image/jpeg',
      0.9,
    )
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={t('web:camera.title')}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-white p-4 shadow-xl dark:bg-neutral-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
            {t('web:camera.title')}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common:action.cancel.cta')}
            className="rounded-full p-1.5 text-neutral-500 transition hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {error ? (
          <p className="rounded-xl bg-neutral-50 p-6 text-center text-sm text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
            {t('web:camera.unavailable.error')}
          </p>
        ) : (
          <video
            ref={videoRef}
            playsInline
            muted
            aria-label={t('web:camera.preview.a11y')}
            className={`aspect-[4/3] w-full rounded-xl bg-black object-cover ${
              facingMode === 'user' ? '-scale-x-100' : ''
            }`}
          />
        )}

        <div className="mt-4 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2.5 text-sm font-medium text-neutral-600 transition hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            {t('common:action.cancel.cta')}
          </button>
          {!error && (
            <button
              type="button"
              onClick={capture}
              disabled={!ready}
              className="rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-primary-700 disabled:opacity-50"
            >
              {t('web:camera.capture.cta')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
