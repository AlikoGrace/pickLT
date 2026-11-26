'use client'

import {
  CheckCircleIcon,
  ChevronLeftIcon,
  ClockIcon,
  DocumentCheckIcon,
  ExclamationTriangleIcon,
  IdentificationIcon,
  ShieldCheckIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import CameraCaptureModal from '@/components/CameraCaptureModal'
import {
  BusinessInsuranceField,
  CertificateFields,
  ResidenceFields,
  residenceDocTypeLabel,
  type VettingPhotoKind,
} from '@/components/mover/VettingFields'
import { formatDate } from '@/lib/format'
import type { VettingView } from '@/lib/mover-vetting-view'
import type { ResidenceDocType } from '@/lib/vetting'
import { fetchVettingView, submitVetting, uploadVettingPhoto } from '@/lib/vetting-client'
import {
  certificateDisplayStatus,
  certificateSectionError,
  insuranceSectionError,
  minExpiryDate,
  residenceDisplayStatus,
  residenceSectionError,
  vettingErrorKey,
  type DocumentDisplayStatus,
} from '@/lib/vetting-form'

type Section = 'residence' | 'certificate' | 'insurance'

const STATUS_STYLE: Record<DocumentDisplayStatus, { icon: typeof ClockIcon; className: string }> = {
  missing: { icon: ExclamationTriangleIcon, className: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200' },
  review: { icon: ClockIcon, className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200' },
  approved: { icon: CheckCircleIcon, className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200' },
  rejected: { icon: XCircleIcon, className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200' },
  expired: { icon: XCircleIcon, className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200' },
}

/** `optional`: nothing on file is not a problem (the moving certificate), so it reads neutral, not as a warning. */
function StatusBadge({ status, optional }: { status: DocumentDisplayStatus; optional?: boolean }) {
  const { t } = useTranslation()
  const { icon: Icon } = STATUS_STYLE[status]
  const className =
    optional && status === 'missing'
      ? 'bg-neutral-100 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-200'
      : STATUS_STYLE[status].className
  return (
    <span className={`inline-flex flex-shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${className}`}>
      <Icon className="h-4 w-4" />
      {/* i18n-keys: web:mover.vetting.status.missing.label, web:mover.vetting.status.review.label,
          web:mover.vetting.status.approved.label, web:mover.vetting.status.rejected.label,
          web:mover.vetting.status.expired.label */}
      {t(`web:mover.vetting.status.${status}.label`)}
    </span>
  )
}

function SectionCard({
  icon: Icon,
  title,
  badge,
  children,
}: {
  icon: typeof ClockIcon
  title: string
  badge?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm sm:p-6 dark:bg-neutral-800">
      <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-700">
          <Icon className="h-5 w-5 text-neutral-600 dark:text-neutral-300" />
        </div>
        <h2 className="min-w-0 flex-1 text-lg font-semibold text-neutral-900 dark:text-neutral-100">{title}</h2>
        {badge}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  )
}

const primaryBtn =
  'inline-flex min-h-11 items-center justify-center rounded-full bg-primary-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:opacity-50'
const secondaryBtn =
  'inline-flex min-h-11 items-center justify-center rounded-full bg-neutral-100 px-5 py-2.5 text-sm font-medium text-neutral-900 transition hover:bg-neutral-200 disabled:opacity-50 dark:bg-neutral-700 dark:text-neutral-100 dark:hover:bg-neutral-600'

interface PhotoSlot {
  file: File | null
  preview: string | null
}
const emptyPhotos = (): Record<VettingPhotoKind, PhotoSlot> => ({
  residenceFront: { file: null, preview: null },
  residenceBack: { file: null, preview: null },
  certificate: { file: null, preview: null },
})

/**
 * `/settings/documents` (plan `legal/7.driver-vetting.md`): a registered
 * driver's residence document, moving certificate and business-insurance
 * declaration, each with its review status and a form to submit or replace
 * it. Every form posts `action: 'vetting'` with its own section only, which
 * leaves the driver's verification status alone.
 *
 * The stored photographs are never sent back to the browser: the page shows
 * whether one is on file, not the image.
 */
export default function MoverDocumentsPage() {
  const { t } = useTranslation()
  const [view, setView] = useState<VettingView | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [editing, setEditing] = useState<Section | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState<{ section: Section; reviewed: boolean } | null>(null)
  const [nowMs] = useState(() => Date.now())

  // Form state. One set of files and one camera modal serve all three photos.
  const [docType, setDocType] = useState<ResidenceDocType | ''>('')
  const [expiresAt, setExpiresAt] = useState('')
  const [hasCertificate, setHasCertificate] = useState<boolean | null>(null)
  const [hasInsurance, setHasInsurance] = useState<boolean | null>(null)
  const [photos, setPhotos] = useState<Record<VettingPhotoKind, PhotoSlot>>(emptyPhotos)
  const [cameraFor, setCameraFor] = useState<VettingPhotoKind | null>(null)

  const photosRef = useRef(photos)
  photosRef.current = photos
  // Object URLs are revoked when replaced, when a form is reset, and on unmount.
  useEffect(() => {
    return () => {
      for (const slot of Object.values(photosRef.current)) if (slot.preview) URL.revokeObjectURL(slot.preview)
    }
  }, [])

  const setPhoto = (kind: VettingPhotoKind, file: File) => {
    setPhotos((prev) => {
      if (prev[kind].preview) URL.revokeObjectURL(prev[kind].preview as string)
      return { ...prev, [kind]: { file, preview: URL.createObjectURL(file) } }
    })
  }
  const clearPhotos = (kinds: VettingPhotoKind[]) => {
    setPhotos((prev) => {
      const next = { ...prev }
      for (const kind of kinds) {
        if (prev[kind].preview) URL.revokeObjectURL(prev[kind].preview as string)
        next[kind] = { file: null, preview: null }
      }
      return next
    })
  }

  const load = useCallback(async () => {
    try {
      setView(await fetchVettingView())
      setLoadError('')
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : t('web:mover.vetting.loadFailed.error'))
    } finally {
      setLoading(false)
    }
  }, [t])
  useEffect(() => {
    void load()
  }, [load])

  const openSection = (section: Section) => {
    setError('')
    setSaved(null)
    if (section === 'residence') {
      setDocType(view?.residence.docType ?? '')
      setExpiresAt('')
      clearPhotos(['residenceFront', 'residenceBack'])
    } else if (section === 'certificate') {
      setHasCertificate(null)
      clearPhotos(['certificate'])
    } else {
      setHasInsurance(view?.insurance.hasBusinessInsurance ?? null)
    }
    setEditing(section)
  }

  const finish = async (section: Section, reviewed: boolean) => {
    setEditing(null)
    setSaved({ section, reviewed })
    await load()
  }

  const fail = (err: unknown) => setError(err instanceof Error ? err.message : t('web:mover.vetting.submitFailed.error'))

  const submitResidence = async () => {
    const code = residenceSectionError(
      {
        residenceDocType: docType,
        hasResidenceDocFront: photos.residenceFront.file !== null,
        hasResidenceDocBack: photos.residenceBack.file !== null,
        residenceDocExpiresAt: expiresAt,
        hasMovingCertificate: null,
        hasMovingCertificatePhoto: false,
        hasBusinessInsurance: null,
      },
      nowMs,
    )
    if (code || docType === '' || !photos.residenceFront.file || !photos.residenceBack.file) {
      setError(t(vettingErrorKey(code ?? 'vetting.residencePhotosRequired')))
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const [residenceDocFront, residenceDocBack] = await Promise.all([
        uploadVettingPhoto(photos.residenceFront.file, 'residence'),
        uploadVettingPhoto(photos.residenceBack.file, 'residence'),
      ])
      await submitVetting({
        residenceDocType: docType,
        residenceDocFront,
        residenceDocBack,
        residenceDocExpiresAt: expiresAt || undefined,
      })
      await finish('residence', true)
    } catch (err) {
      fail(err)
    } finally {
      setSubmitting(false)
    }
  }

  const submitCertificate = async () => {
    const code = certificateSectionError({
      hasMovingCertificate: hasCertificate,
      hasMovingCertificatePhoto: photos.certificate.file !== null,
    })
    if (code || hasCertificate === null) {
      setError(t(vettingErrorKey(code ?? 'certificateAnswerRequired')))
      return
    }
    setSubmitting(true)
    setError('')
    try {
      if (hasCertificate && photos.certificate.file) {
        const movingCertificatePhoto = await uploadVettingPhoto(photos.certificate.file, 'certificate')
        await submitVetting({ hasMovingCertificate: true, movingCertificatePhoto })
      } else {
        await submitVetting({ hasMovingCertificate: false })
      }
      await finish('certificate', hasCertificate)
    } catch (err) {
      fail(err)
    } finally {
      setSubmitting(false)
    }
  }

  const submitInsurance = async () => {
    const code = insuranceSectionError({ hasBusinessInsurance: hasInsurance })
    if (code || hasInsurance === null) {
      setError(t(vettingErrorKey('insuranceAnswerRequired')))
      return
    }
    setSubmitting(true)
    setError('')
    try {
      await submitVetting({ hasBusinessInsurance: hasInsurance })
      await finish('insurance', false)
    } catch (err) {
      fail(err)
    } finally {
      setSubmitting(false)
    }
  }

  const formFooter = (onSubmit: () => void, submitLabel: string) => (
    <>
      {error && (
        <div role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={onSubmit} disabled={submitting} className={primaryBtn}>
          {submitting ? t('common:action.submitting.cta') : submitLabel}
        </button>
        <button type="button" onClick={() => setEditing(null)} disabled={submitting} className={secondaryBtn}>
          {t('common:action.cancel.cta')}
        </button>
      </div>
    </>
  )

  const savedNote = (section: Section) =>
    saved?.section === section ? (
      <p role="status" className="rounded-xl bg-green-50 p-3 text-sm text-green-700 dark:bg-green-900/20 dark:text-green-300">
        {saved.reviewed ? t('web:mover.vetting.documents.submitted.success') : t('web:mover.vetting.documents.saved.success')}
      </p>
    ) : null

  const reason = (text: string | null) =>
    text ? (
      <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">
        {t('web:mover.vetting.rejectionReason.value', { reason: text })}
      </p>
    ) : null

  const residenceStatus = view ? residenceDisplayStatus(view.residence) : 'missing'
  const certificateStatus = view ? certificateDisplayStatus(view.certificate) : 'missing'

  return (
    <div className="mx-auto max-w-2xl p-4 pb-24 lg:p-6 lg:pb-6">
      <Link
        href="/settings"
        className="mb-4 inline-flex min-h-10 items-center gap-1 text-sm text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
      >
        <ChevronLeftIcon className="h-4 w-4" />
        {t('common:action.back.cta')}
      </Link>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{t('web:mover.vetting.documents.title')}</h1>
        <p className="text-neutral-500 dark:text-neutral-400">{t('web:mover.vetting.documents.subtitle')}</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
        </div>
      ) : !view ? (
        <div className="rounded-2xl bg-white p-6 text-center shadow-sm dark:bg-neutral-800">
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {loadError || t('web:mover.vetting.loadFailed.error')}
          </p>
          <button
            type="button"
            onClick={() => {
              setLoading(true)
              void load()
            }}
            className={`${secondaryBtn} mt-4`}
          >
            {t('common:action.retry.cta')}
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* ── Residence document ─────────────────────────────── */}
          <SectionCard
            icon={IdentificationIcon}
            title={t('web:mover.vetting.residence.title')}
            badge={<StatusBadge status={residenceStatus} />}
          >
            {savedNote('residence')}
            {editing === 'residence' ? (
              <>
                {view.residence.onFile && (
                  <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
                    {t('web:mover.vetting.documents.residence.replaceNote')}
                  </p>
                )}
                <ResidenceFields
                  name="documentsResidenceDocType"
                  docType={docType}
                  onDocType={setDocType}
                  frontPreview={photos.residenceFront.preview}
                  backPreview={photos.residenceBack.preview}
                  expiresAt={expiresAt}
                  onExpiresAt={setExpiresAt}
                  minExpiresAt={minExpiryDate(nowMs)}
                  onTakePhoto={setCameraFor}
                  onFile={setPhoto}
                  disabled={submitting}
                />
                {formFooter(submitResidence, t('web:mover.vetting.documents.action.submit.cta'))}
              </>
            ) : (
              <>
                {/* i18n-keys: web:mover.vetting.documents.residence.missing.body,
                    web:mover.vetting.documents.residence.review.body, web:mover.vetting.documents.residence.approved.body,
                    web:mover.vetting.documents.residence.rejected.body, web:mover.vetting.documents.residence.expired.body */}
                <p className="text-sm text-neutral-600 dark:text-neutral-300">
                  {t(`web:mover.vetting.documents.residence.${residenceStatus}.body`)}
                </p>
                {view.residence.onFile && view.residence.docType && (
                  <p className="text-sm text-neutral-900 dark:text-neutral-100">
                    {residenceDocTypeLabel(t, view.residence.docType)}
                    {view.residence.expiresAt && (
                      <span className="text-neutral-500 dark:text-neutral-400">
                        {' · '}
                        {t('web:mover.vetting.residence.validUntil.value', { date: formatDate(view.residence.expiresAt) })}
                      </span>
                    )}
                  </p>
                )}
                {residenceStatus === 'rejected' && reason(view.residence.rejectionReason)}
                {residenceStatus === 'missing' && (
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">{t('web:mover.vetting.residence.why')}</p>
                )}
                <button
                  type="button"
                  onClick={() => openSection('residence')}
                  className={residenceStatus === 'approved' || residenceStatus === 'review' ? secondaryBtn : primaryBtn}
                >
                  {view.residence.onFile
                    ? t('web:mover.vetting.documents.action.replace.cta')
                    : t('web:mover.vetting.banner.cta.add')}
                </button>
              </>
            )}
          </SectionCard>

          {/* ── Moving certificate ─────────────────────────────── */}
          <SectionCard
            icon={DocumentCheckIcon}
            title={t('web:mover.vetting.documents.certificate.title')}
            badge={<StatusBadge status={certificateStatus} optional />}
          >
            {savedNote('certificate')}
            {editing === 'certificate' ? (
              <>
                <CertificateFields
                  name="documentsHasMovingCertificate"
                  answer={hasCertificate}
                  onAnswer={setHasCertificate}
                  photoPreview={photos.certificate.preview}
                  cap={view.cap}
                  onTakePhoto={setCameraFor}
                  onFile={setPhoto}
                  disabled={submitting}
                />
                {hasCertificate === false && view.certificate.onFile && (
                  <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
                    {t('web:mover.vetting.documents.certificate.removeNote')}
                  </p>
                )}
                {formFooter(
                  submitCertificate,
                  hasCertificate === false
                    ? t('common:action.save.cta')
                    : t('web:mover.vetting.documents.action.submit.cta'),
                )}
              </>
            ) : (
              <>
                {/* i18n-keys: web:mover.vetting.documents.certificate.missing.body,
                    web:mover.vetting.documents.certificate.review.body, web:mover.vetting.documents.certificate.approved.body,
                    web:mover.vetting.documents.certificate.rejected.body */}
                <p className="text-sm text-neutral-600 dark:text-neutral-300">
                  {t(`web:mover.vetting.documents.certificate.${certificateStatus}.body`)}
                </p>
                {certificateStatus === 'rejected' && reason(view.certificate.rejectionReason)}
                {certificateStatus !== 'approved' && (
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    {t('web:mover.vetting.certificate.notice', { count: view.cap })}
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => openSection('certificate')}
                  className={certificateStatus === 'missing' || certificateStatus === 'rejected' ? primaryBtn : secondaryBtn}
                >
                  {view.certificate.onFile
                    ? t('web:mover.vetting.documents.action.change.cta')
                    : t('web:mover.vetting.dailyCap.addCertificate.cta')}
                </button>
              </>
            )}
          </SectionCard>

          {/* ── Business insurance declaration ─────────────────── */}
          <SectionCard icon={ShieldCheckIcon} title={t('web:mover.vetting.documents.insurance.title')}>
            {savedNote('insurance')}
            {editing === 'insurance' ? (
              <>
                <BusinessInsuranceField
                  name="documentsHasBusinessInsurance"
                  answer={hasInsurance}
                  onAnswer={setHasInsurance}
                  disabled={submitting}
                />
                {formFooter(submitInsurance, t('common:action.save.cta'))}
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  {t('web:mover.vetting.insurance.question')}
                </p>
                {view.insurance.hasBusinessInsurance === null ? (
                  <p className="text-sm text-neutral-600 dark:text-neutral-300">
                    {t('web:mover.vetting.documents.insurance.missing.body')}
                  </p>
                ) : (
                  <p className="text-sm text-neutral-900 dark:text-neutral-100">
                    {t('web:mover.vetting.documents.insurance.answer.value', {
                      answer: view.insurance.hasBusinessInsurance ? t('common:answer.yes.label') : t('common:answer.no.label'),
                    })}
                    {view.insurance.declaredAt && (
                      <span className="text-neutral-500 dark:text-neutral-400">
                        {' · '}
                        {t('web:mover.vetting.documents.insurance.declaredAt.value', {
                          date: formatDate(view.insurance.declaredAt),
                        })}
                      </span>
                    )}
                  </p>
                )}
                <p className="text-sm text-neutral-500 dark:text-neutral-400">{t('web:mover.vetting.insurance.notice')}</p>
                <button
                  type="button"
                  onClick={() => openSection('insurance')}
                  className={view.insurance.hasBusinessInsurance === null ? primaryBtn : secondaryBtn}
                >
                  {view.insurance.hasBusinessInsurance === null
                    ? t('web:mover.vetting.documents.action.answer.cta')
                    : t('web:mover.vetting.documents.action.change.cta')}
                </button>
              </>
            )}
          </SectionCard>
        </div>
      )}

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
