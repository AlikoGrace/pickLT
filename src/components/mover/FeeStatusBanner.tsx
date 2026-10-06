'use client'

import { BanknotesIcon, ChevronDownIcon, ExclamationTriangleIcon, NoSymbolIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'
import Link from 'next/link'
import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { formatDate, formatMoney } from '@/lib/format'
import { photoBannerStyle } from '@/lib/photo-banner'

interface Props {
  /** `mover_profiles.feeStanding`; legacy rows read as ok. */
  standing?: 'ok' | 'due' | 'overdue' | 'restricted' | null
  owedCents?: number | null
  oldestDueAt?: string | null
  className?: string
}

/**
 * The platform-fee banner (plan `fees/0.master.md` §6) for `due`, `overdue`
 * and `restricted`, in the `VehicleStatusBanner` shape: collapsed by default
 * (icon, title, one summary line, chevron), the header toggles the body, and
 * Pay now stays visible either way. Renders nothing when nothing is owed.
 * A photo banner (card payment) since 2026-10-06.
 */
export default function FeeStatusBanner({ standing, owedCents, oldestDueAt, className }: Props) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  const bodyId = useId()
  const owed = typeof owedCents === 'number' ? owedCents : 0
  if (!standing || standing === 'ok' || owed <= 0) return null

  const amount = formatMoney(owed / 100)
  const date = oldestDueAt ? formatDate(oldestDueAt) : ''
  const tone = standing === 'restricted' ? 'red' : standing === 'overdue' ? 'amber' : 'blue'
  const Icon = standing === 'restricted' ? NoSymbolIcon : standing === 'overdue' ? ExclamationTriangleIcon : BanknotesIcon

  // i18n-keys: web:mover.fees.banner.due.title, web:mover.fees.banner.overdue.title, web:mover.fees.banner.restricted.title
  const title = t(`web:mover.fees.banner.${standing}.title`)
  // i18n-keys: web:mover.fees.banner.due.body, web:mover.fees.banner.overdue.body, web:mover.fees.banner.restricted.body
  const body = t(`web:mover.fees.banner.${standing}.body`, { amount, date })
  const summary = t('web:mover.fees.banner.summary.label', { amount })

  return (
    <div
      className={clsx(
        'border-b-4 px-4 py-4',
        tone === 'red' && 'border-red-500',
        tone === 'amber' && 'border-amber-400',
        tone === 'blue' && 'border-primary-500',
        className,
      )}
      style={photoBannerStyle('feePayment')}
    >
      <div className="mx-auto flex max-w-3xl flex-wrap items-start gap-x-3 gap-y-2 sm:flex-nowrap">
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
              tone === 'amber' && 'text-amber-300',
              tone === 'blue' && 'text-primary-300',
            )}
          />
          <span id={bodyId} className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-white">
              {title}
            </span>
            <span
              className={clsx(
                'block text-sm',
                !expanded && 'truncate',
                tone === 'red' && 'text-red-200',
                tone === 'amber' && 'text-amber-200',
                tone === 'blue' && 'text-primary-200',
              )}
            >
              {expanded ? body : summary}
            </span>
          </span>
          <ChevronDownIcon
            aria-hidden="true"
            className={clsx('mt-0.5 h-5 w-5 flex-shrink-0 text-white/70 transition-transform', expanded && 'rotate-180')}
          />
        </button>
        {/* The button stays visible collapsed or not; only the text folds away. */}
        <Link
          href="/earnings"
          className="flex-shrink-0 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-neutral-800 shadow-sm ring-1 ring-neutral-200 transition hover:bg-neutral-50 max-sm:ml-8 max-sm:inline-flex max-sm:min-h-10 max-sm:items-center dark:bg-neutral-800 dark:text-neutral-100 dark:ring-neutral-700 dark:hover:bg-neutral-700"
        >
          {t('web:mover.fees.pay.cta')}
        </Link>
      </div>
    </div>
  )
}
