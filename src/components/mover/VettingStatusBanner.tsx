'use client'

import { ChevronDownIcon, ClockIcon, ExclamationTriangleIcon, XCircleIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'
import Link from 'next/link'
import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { formatDate } from '@/lib/format'
import { BANNER_CARD, BANNER_STRIP } from '@/lib/photo-banner'
import type { VettingPrompt } from '@/lib/vetting'
import { DOCUMENTS_HREF, residenceBanner } from '@/lib/vetting-form'

interface Props {
  /** `residence.prompt` from `GET /api/mover/vetting`. */
  prompt: VettingPrompt
  /** Whether a driver without an approved document is being refused work right now. */
  gateActive: boolean
  /** ISO time from which that applies; `null` while no date is set. */
  gateFrom: string | null
  rejectionReason?: string | null
  className?: string
}

/**
 * The residence-document banner (plan `legal/7.driver-vetting.md` V1), in the
 * shape of `FeeStatusBanner` and `VehicleStatusBanner`: collapsed by default
 * (icon, title, one line, chevron), the header toggles the body, and the
 * action stays visible either way. Renders nothing when nothing is
 * outstanding. Which sentence it shows is decided in `residenceBanner`.
 */
export default function VettingStatusBanner({ prompt, gateActive, gateFrom, rejectionReason, className }: Props) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  const bodyId = useId()
  const banner = residenceBanner(prompt, { active: gateActive, from: gateFrom })
  if (!banner) return null

  const { kind, tone } = banner
  const Icon = tone === 'red' ? XCircleIcon : tone === 'orange' ? ExclamationTriangleIcon : ClockIcon
  // i18n-keys: web:mover.vetting.banner.missing.title, web:mover.vetting.banner.pending.title,
  // web:mover.vetting.banner.rejected.title, web:mover.vetting.banner.expired.title
  const title = t(`web:mover.vetting.banner.${kind}.title`)
  // i18n-keys: web:mover.vetting.banner.missing.body.open, web:mover.vetting.banner.missing.body.deadline,
  // web:mover.vetting.banner.missing.body.blocked, web:mover.vetting.banner.pending.body.open,
  // web:mover.vetting.banner.pending.body.deadline, web:mover.vetting.banner.pending.body.blocked,
  // web:mover.vetting.banner.rejected.body.open, web:mover.vetting.banner.rejected.body.deadline,
  // web:mover.vetting.banner.rejected.body.blocked, web:mover.vetting.banner.expired.body.blocked
  const body = t(`web:mover.vetting.banner.${kind}.body.${banner.body}`, { date: gateFrom ? formatDate(gateFrom) : '' })
  // i18n-keys: web:mover.vetting.banner.cta.add, web:mover.vetting.banner.cta.view, web:mover.vetting.banner.cta.replace
  const cta = t(`web:mover.vetting.banner.cta.${banner.cta}`)

  return (
    <div className={clsx(BANNER_STRIP, className)}>
      <div
        className={clsx(
          BANNER_CARD,
          'bg-[#0A0F19]',
          tone === 'red' && 'border-red-500',
          tone === 'orange' && 'border-orange-400',
          tone === 'amber' && 'border-amber-400',
        )}
      >
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={bodyId}
          onClick={() => setExpanded((v) => !v)}
          className="flex min-w-0 flex-1 items-start gap-3 rounded-lg text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 max-sm:basis-full"
        >
          <Icon
            className={clsx(
              'mt-0.5 h-5 w-5 flex-shrink-0',
              tone === 'red' && 'text-red-300',
              tone === 'orange' && 'text-orange-300',
              tone === 'amber' && 'text-amber-300',
            )}
          />
          <span id={bodyId} className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-white">{title}</span>
            <span
              className={clsx(
                'block text-sm',
                !expanded && 'truncate',
                tone === 'red' && 'text-red-200',
                tone === 'orange' && 'text-orange-200',
                tone === 'amber' && 'text-amber-200',
              )}
            >
              {body}
              {expanded && kind === 'rejected' && rejectionReason && (
                <span className="mt-0.5 block font-medium">
                  {t('web:mover.vetting.rejectionReason.value', { reason: rejectionReason })}
                </span>
              )}
            </span>
          </span>
          <ChevronDownIcon
            aria-hidden="true"
            className={clsx('mt-0.5 h-5 w-5 flex-shrink-0 text-white/70 transition-transform', expanded && 'rotate-180')}
          />
        </button>
        {/* The button stays visible collapsed or not; only the text folds away. */}
        <Link
          href={DOCUMENTS_HREF}
          className="flex-shrink-0 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-neutral-800 shadow-sm ring-1 ring-neutral-200 transition hover:bg-neutral-50 max-sm:ml-8 max-sm:inline-flex max-sm:min-h-10 max-sm:items-center dark:bg-neutral-800 dark:text-neutral-100 dark:ring-neutral-700 dark:hover:bg-neutral-700"
        >
          {cta}
        </Link>
      </div>
    </div>
  )
}
