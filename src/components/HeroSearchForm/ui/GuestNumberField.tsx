'use client'

import T from '@/utils/getT'
import { UserPlusIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'
import { FC, useState, useRef, useEffect } from 'react'
import { ClearDataButton } from './ClearDataButton'
import { useInteractOutside } from '@/hooks/useInteractOutside'

const styles = {
  button: {
    base: 'relative z-10 shrink-0 w-full cursor-pointer flex items-center gap-x-3 focus:outline-hidden text-start',
    focused: 'rounded-full bg-transparent focus-visible:outline-hidden dark:bg-white/5 custom-shadow-1 ',
    default: 'px-7 py-4 xl:px-8 xl:py-6',
    small: 'py-3 px-7 xl:px-8',
  },
  mainText: {
    default: 'text-base xl:text-lg',
    small: 'text-base',
  },
  panel: {
    base: 'absolute end-0 top-full z-50 mt-3 flex w-sm flex-col gap-y-6 rounded-3xl bg-white px-8 py-7 shadow-xl transition duration-150 data-closed:translate-y-1 data-closed:opacity-0 dark:bg-neutral-800',
    default: '',
    small: '',
  },
}

interface Props {
  fieldStyle: 'default' | 'small'
  className?: string
  clearDataButtonClassName?: string
  onChange?: (moveType: MoveTypeKey | null) => void
  value?: MoveTypeKey | null
}

type MoveTypeKey = 'light' | 'regular' | 'premium'

const MOVE_TYPES: { key: MoveTypeKey; label: string; description: string }[] = [
  { key: 'light', label: 'Light Move', description: 'Small load — few items' },
  { key: 'regular', label: 'Regular Move', description: 'Standard household move' },
  { key: 'premium', label: 'Premium Move', description: 'Full-service move' },
]

export const GuestNumberField: FC<Props> = ({
  fieldStyle = 'default',
  className = 'flex-1',
  clearDataButtonClassName,
  onChange,
  value,
}) => {
  const [internalMoveType, setInternalMoveType] = useState<MoveTypeKey | null>(null)
  const [open, setOpen] = useState(false)
  const isControlled = typeof value !== 'undefined'
  const moveType = isControlled ? value ?? null : internalMoveType
  const containerRef = useRef<HTMLDivElement | null>(null)

  useInteractOutside(containerRef, () => setOpen(false))

  const selected = MOVE_TYPES.find((m) => m.key === moveType)

  const handleSelect = (key: MoveTypeKey | null) => {
    if (!isControlled) setInternalMoveType(key)
    if (onChange) onChange(key)
    if (key !== null) setOpen(false)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div ref={containerRef} className={`group relative z-10 flex ${className}`}>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={clsx(styles.button.base, styles.button[fieldStyle], open && styles.button.focused)}
      >
        {fieldStyle === 'default' && <UserPlusIcon className="size-5 text-neutral-300 lg:size-7 dark:text-neutral-400" />}

        <div className="grow">
          <span className={clsx('block font-semibold', styles.mainText[fieldStyle])}>{selected?.label || 'Type of move'}</span>
          <span className="mt-1 block text-sm leading-none font-light text-neutral-400">{selected?.description || 'Choose a move type'}</span>
        </div>
      </button>

      <ClearDataButton className={clsx(!moveType && 'sr-only', clearDataButtonClassName)} onClick={() => handleSelect(null)} />

      {open && (
        <div className={clsx(styles.panel.base, styles.panel[fieldStyle])} role="dialog" aria-label="Select move type">
          <div className="flex flex-col gap-3">
            {MOVE_TYPES.map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => handleSelect(opt.key)}
                className={clsx(
                  'w-full text-left rounded-lg p-3 transition',
                  moveType === opt.key ? 'bg-neutral-100 dark:bg-neutral-700' : 'hover:bg-neutral-50 dark:hover:bg-neutral-700'
                )}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{opt.label}</div>
                    <div className="text-sm text-neutral-500">{opt.description}</div>
                  </div>
                  {moveType === opt.key && <span className="text-sm font-semibold text-neutral-700">Selected</span>}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
