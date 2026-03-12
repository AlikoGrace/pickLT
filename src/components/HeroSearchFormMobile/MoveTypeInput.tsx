'use client'

import { TruckIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'
import { FC, useEffect, useState } from 'react'

type MoveTypeKey = 'light' | 'regular' | 'premium'

const MOVE_TYPES: { key: MoveTypeKey; label: string; description: string }[] = [
  { key: 'light', label: 'Light Move', description: 'Small load — few items' },
  { key: 'regular', label: 'Regular Move', description: 'Standard household move' },
  { key: 'premium', label: 'Premium Move', description: 'Full-service move' },
]

interface Props {
  defaultValue?: MoveTypeKey | null
  onChange?: (value: MoveTypeKey | null) => void
  className?: string
}

const MoveTypeInput: FC<Props> = ({ defaultValue = null, onChange, className }) => {
  const [selected, setSelected] = useState<MoveTypeKey | null>(defaultValue)

  useEffect(() => {
    setSelected(defaultValue)
  }, [defaultValue])

  const handleSelect = (key: MoveTypeKey) => {
    setSelected(key)
    onChange && onChange(key)
  }

  return (
    <div className={clsx('relative flex flex-col', className)}>
      <h3 className="mb-5 block text-xl font-semibold sm:text-2xl">Type of Move</h3>
      <div className="flex flex-col gap-3">
        {MOVE_TYPES.map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => handleSelect(opt.key)}
            className={clsx(
              'w-full text-left rounded-xl p-4 transition border-2',
              selected === opt.key
                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 dark:border-primary-400'
                : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600'
            )}
          >
            <div className="flex items-center gap-3">
              <div
                className={clsx(
                  'flex h-10 w-10 items-center justify-center rounded-full',
                  selected === opt.key
                    ? 'bg-primary-500 text-white'
                    : 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400'
                )}
              >
                <TruckIcon className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <div className="font-medium text-neutral-900 dark:text-neutral-100">{opt.label}</div>
                <div className="text-sm text-neutral-500 dark:text-neutral-400">{opt.description}</div>
              </div>
              {selected === opt.key && (
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-500 text-white">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Hidden input for form submission */}
      <input type="hidden" name="moveType" value={selected || ''} />
    </div>
  )
}

export default MoveTypeInput
