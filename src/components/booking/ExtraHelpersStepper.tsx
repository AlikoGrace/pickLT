'use client'

import ButtonCircle from '@/shared/ButtonCircle'
import { formatMoney } from '@/lib/format'
import type { PricingConfig } from '@/lib/pricing'
import type { MoveType } from '@/lib/types'
import { MinusIcon, PlusIcon } from '@heroicons/react/24/solid'
import { FC } from 'react'
import { useTranslation } from 'react-i18next'
import { clampExtraHelpers, helperRateEur, includedHelpers, maxExtraHelpers, stepExtraHelpers } from './extra-helpers'

interface Props {
  value: number
  onChange: (value: number) => void
  /** The tier being priced — sets the hourly rate and the helpers already included. */
  tier: MoveType
  config: PricingConfig | null | undefined
  className?: string
}

/**
 * "Extra helpers" control (crew master D2, §5): 0…`crew.maxExtraHelpers`,
 * each billed at the tier's hourly crew rate. Used by the instant mover
 * selection and the scheduled wizard (step 6).
 */
const ExtraHelpersStepper: FC<Props> = ({ value, onChange, tier, config, className = '' }) => {
  const { t } = useTranslation()
  const max = maxExtraHelpers(config)
  const current = clampExtraHelpers(value, max)
  const included = includedHelpers(config, tier)
  if (max === 0) return null

  return (
    <div className={`rounded-2xl border border-neutral-200 p-4 dark:border-neutral-700 ${className}`}>
      <div className="flex items-center justify-between gap-x-5">
        <div className="flex min-w-0 flex-col">
          <span className="font-semibold text-neutral-900 dark:text-white">{t('booking:extraHelpers.title')}</span>
          <span className="text-sm text-neutral-500 dark:text-neutral-400">
            {current > 0 ? t('booking:extraHelpers.count', { count: current }) : t('booking:extraHelpers.none')}
          </span>
        </div>
        <div className="flex min-w-28 items-center justify-between gap-2.5">
          <ButtonCircle
            outline
            type="button"
            disabled={current <= 0}
            onClick={() => onChange(stepExtraHelpers(current, -1, max))}
            aria-label={t('booking:extraHelpers.decrease')}
            className="size-8!"
          >
            <MinusIcon className="size-4!" />
          </ButtonCircle>
          <span aria-live="polite">{current}</span>
          <ButtonCircle
            outline
            type="button"
            disabled={current >= max}
            onClick={() => onChange(stepExtraHelpers(current, 1, max))}
            aria-label={t('booking:extraHelpers.increase')}
            className="size-8!"
          >
            <PlusIcon className="size-4!" />
          </ButtonCircle>
        </div>
      </div>
      <p className="mt-3 text-sm text-neutral-500 dark:text-neutral-400">
        {included > 0
          ? t('booking:extraHelpers.included', { count: included })
          : t('booking:extraHelpers.includedDriverOnly')}{' '}
        {t('booking:extraHelpers.helper', { rate: formatMoney(helperRateEur(config, tier)) })}{' '}
        {t('booking:extraHelpers.max', { count: max })}
      </p>
    </div>
  )
}

export default ExtraHelpersStepper
