'use client'

import { useTranslation } from 'react-i18next'

import YesNoField from '@/components/mover/YesNoField'
import { showsUninsuredNotice } from '@/lib/vehicle-form'

interface Props {
  value: boolean | null
  onChange: (value: boolean) => void
  /** A renewal cannot be sent with "no": the notice says so instead of "can be submitted". */
  renew?: boolean
  name?: string
  disabled?: boolean
}

/**
 * "Does this vehicle have motor liability insurance?" (plan legal/7 V3), on
 * every vehicle form. A new vehicle answered "no" may be submitted but cannot
 * be approved or used, and the form says so before submitting.
 */
export default function MotorInsuranceField({ value, onChange, renew, name = 'hasMotorInsurance', disabled }: Props) {
  const { t } = useTranslation()
  return (
    <div className="space-y-2">
      <YesNoField
        name={name}
        question={t('web:mover.vehicle.insurance.question')}
        value={value}
        onChange={onChange}
        disabled={disabled}
      />
      {showsUninsuredNotice(value) && (
        <p role="status" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
          {renew ? t('web:mover.vehicle.insurance.renewBlocked.error') : t('web:mover.vehicle.insurance.uninsured.notice')}
        </p>
      )}
    </div>
  )
}
