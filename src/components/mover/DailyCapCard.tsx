'use client'

import { ClipboardDocumentCheckIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'

import type { VettingView } from '@/lib/mover-vetting-view'
import { DOCUMENTS_HREF, dailyCapLine } from '@/lib/vetting-form'

interface Props {
  /** From `GET /api/mover/vetting`; nothing renders until it loads. */
  vetting: VettingView | null
}

/**
 * "x of y moves today" for a driver without a verified moving certificate
 * (plan `legal/7.driver-vetting.md` V2), with the way to lift the limit. A
 * certified driver has no limit and sees nothing.
 */
export default function DailyCapCard({ vetting }: Props) {
  const { t } = useTranslation()
  const line = dailyCapLine(vetting?.today)
  if (!vetting || !line) return null
  const inReview = vetting.certificate.status === 'pending_review'

  return (
    <div
      className={`mb-8 rounded-2xl p-4 shadow-sm ${
        line.reached ? 'bg-amber-50 dark:bg-amber-900/20' : 'bg-white dark:bg-neutral-800'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-neutral-500">
          <ClipboardDocumentCheckIcon className="h-5 w-5 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
            {t('web:mover.vetting.dailyCap.progress', { accepted: line.acceptedToday, count: line.cap })}
          </p>
          {line.reached && (
            <p role="status" className="text-sm font-medium text-amber-800 dark:text-amber-200">
              {t('web:mover.vetting.dailyCap.reached')}
            </p>
          )}
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            {inReview ? t('web:mover.vetting.dailyCap.inReview') : t('web:mover.vetting.dailyCap.helper')}
          </p>
          <Link
            href={DOCUMENTS_HREF}
            className="mt-1 inline-flex min-h-10 items-center text-sm font-semibold text-primary-600 hover:underline dark:text-primary-400"
          >
            {inReview ? t('web:mover.vetting.documents.open.cta') : t('web:mover.vetting.dailyCap.addCertificate.cta')}
          </Link>
        </div>
      </div>
    </div>
  )
}
