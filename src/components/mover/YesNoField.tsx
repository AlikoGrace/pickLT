'use client'

import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

interface Props {
  /** Radio group name; unique on the page. */
  name: string
  question: ReactNode
  /** `null` until answered. */
  value: boolean | null
  onChange: (value: boolean) => void
  /** Shown directly under the question. */
  notice?: ReactNode
  disabled?: boolean
}

/**
 * A required yes/no question (plan legal/7: moving certificate, business
 * insurance, motor insurance). Neither answer is pre-selected: the driver has
 * to make the declaration, so `null` is a real state the forms refuse.
 */
export default function YesNoField({ name, question, value, onChange, notice, disabled }: Props) {
  const { t } = useTranslation()
  return (
    <fieldset className="min-w-0" disabled={disabled}>
      <legend className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
        {question}
        <span className="ml-0.5 text-red-500">*</span>
      </legend>
      {notice && <div className="mb-2 text-sm text-neutral-600 dark:text-neutral-300">{notice}</div>}
      <div className="grid grid-cols-2 gap-3">
        {([true, false] as const).map((option) => (
          <label
            key={String(option)}
            className={`flex min-h-11 cursor-pointer items-center justify-center rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors ${
              value === option
                ? 'border-primary-500 bg-primary-50 text-primary-700 dark:border-primary-400 dark:bg-primary-900/20 dark:text-primary-300'
                : 'border-neutral-200 text-neutral-700 hover:border-neutral-300 dark:border-neutral-700 dark:text-neutral-200 dark:hover:border-neutral-600'
            }`}
          >
            <input
              type="radio"
              name={name}
              checked={value === option}
              onChange={() => onChange(option)}
              className="sr-only"
            />
            {option ? t('common:answer.yes.option') : t('common:answer.no.option')}
          </label>
        ))}
      </div>
    </fieldset>
  )
}
