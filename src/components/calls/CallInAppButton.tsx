'use client'

import { canCallOnMove } from '@/lib/call-state'
import { PhoneIcon } from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next'
import { useCall } from './CallProvider'

interface Props {
  moveId: string | null | undefined
  /** Raw `moves.status`; closed moves hide the button. */
  moveStatus: string | null | undefined
  /** Client side: a mover is assigned. Mover side: this mover is the assigned one. */
  hasCounterpart: boolean
  /** Shown on the call bar while it rings. */
  counterpartName: string
  className?: string
  /** `solid` for a lone primary action, `light` beside other secondary buttons. */
  variant?: 'solid' | 'light'
}

/**
 * "Call in app" — places an audio call to the other party of a move through
 * `CallProvider`. Renders nothing when calling isn't possible (signed out,
 * no counterpart, move closed); disabled while another call is up.
 */
export default function CallInAppButton({
  moveId,
  moveStatus,
  hasCounterpart,
  counterpartName,
  className = '',
  variant = 'solid',
}: Props) {
  const { t } = useTranslation()
  const { available, busy, startCall } = useCall()
  if (!available || !moveId || !canCallOnMove(moveStatus, hasCounterpart)) return null

  const look =
    variant === 'solid'
      ? 'bg-green-600 text-white hover:bg-green-700'
      : 'border border-neutral-200 bg-white text-neutral-900 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white dark:hover:bg-neutral-700'

  return (
    <button
      type="button"
      onClick={() => startCall(moveId, counterpartName)}
      disabled={busy}
      className={`inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${look} ${className}`}
    >
      <PhoneIcon className="h-4 w-4" />
      {t('web:call.inApp.cta')}
    </button>
  )
}
