'use client'

import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { formatDistanceKm, formatDistanceM, formatDurationHm, formatTime } from '@/lib/format'
import { googleMapsUrl, wazeUrl, type NavTarget } from '@/lib/nav-handoff'
import type { NavProgress, PreparedRoute } from '@/lib/nav-progress'

/**
 * The mover's navigation mode on the web (plan pickltmobile
 * maps/mover-navigation-mode): turn banner on top, trip footer at the bottom.
 * Twins of the mover app's NavBanner / NavFooter.
 */

/** Distance to a maneuver: 10 m steps under a kilometre, one decimal above. */
export function navDistance(m: number): string {
  if (m < 1000) return formatDistanceM(Math.max(10, Math.round(m / 10) * 10))
  return formatDistanceKm(m / 1000, { maximumFractionDigits: 1 })
}

/** Mapbox writes some languages' instructions lower-case first (Turkish). */
function sentence(text: string, locale: string): string {
  return text ? text.charAt(0).toLocaleUpperCase(locale) + text.slice(1) : text
}

export function ManeuverIcon({ type, modifier, size = 40 }: { type: string; modifier?: string; size?: number }) {
  const mod = modifier ?? ''
  const flip = mod.includes('left') ? 'scale(-1,1) translate(-32,0)' : undefined
  const stroke = { stroke: 'currentColor', strokeWidth: 3.2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' }
  let body: ReactNode
  if (type === 'arrive') {
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
        <path d="M16 29s9-8.2 9-15A9 9 0 0 0 7 14c0 6.8 9 15 9 15z" fill="currentColor" />
        <circle cx={16} cy={14} r={3.4} fill="#0E2A63" />
      </svg>
    )
  } else if (type === 'roundabout' || type === 'rotary' || type === 'roundabout turn') {
    body = (
      <>
        <circle cx={16} cy={13} r={6} {...stroke} />
        <path d="M16 29v-10M21 8.5l4-4M25 4.5h-4.5M25 4.5V9" {...stroke} />
      </>
    )
  } else if (mod === 'uturn' || type === 'uturn') {
    body = <path d="M10 29V12a6 6 0 0 1 12 0v9M17.5 17l4.5 4.5 4.5-4.5" {...stroke} />
  } else if (mod.includes('sharp')) {
    body = <path d="M12 29V9l12 14M24 17v6h-6" {...stroke} />
  } else if (mod.includes('slight')) {
    body = <path d="M13 29V17l9-11M16 5.5h6.5V12" {...stroke} />
  } else if (mod === 'right' || mod === 'left') {
    body = <path d="M11 29V16a5 5 0 0 1 5-5h11M22 6l5 5-5 5" {...stroke} />
  } else {
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
        <path d="M16 29V5M10 11l6-6 6 6" {...stroke} />
      </svg>
    )
  }
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <g transform={flip}>{body}</g>
    </svg>
  )
}

export function NavBanner({
  route,
  progress,
  rerouting,
}: {
  route: PreparedRoute | null
  progress: NavProgress | null
  rerouting: boolean
}) {
  const { t, i18n } = useTranslation()
  const step = route && progress ? route.steps[progress.stepIndex] : null
  const then = route && progress && progress.thenIndex >= 0 ? route.steps[progress.thenIndex] : null
  return (
    <div className="rounded-2xl bg-[#0E2A63] p-4 text-white shadow-lg">
      {step && progress ? (
        <div className="space-y-2">
          <div className="flex items-center gap-4">
            <ManeuverIcon type={step.type} modifier={step.modifier} size={44} />
            <div className="min-w-0">
              <p className="text-2xl font-bold">{navDistance(progress.toNextM)}</p>
              <p className="text-base font-medium leading-snug">{sentence(step.instruction, i18n.language)}</p>
            </div>
          </div>
          {then && progress.toNextM < 400 && (
            <div className="inline-flex items-center gap-2 rounded-lg bg-white/15 px-2.5 py-1 text-sm">
              {t('web:mover.navigation.then.label')}
              <ManeuverIcon type={then.type} modifier={then.modifier} size={18} />
            </div>
          )}
        </div>
      ) : (
        <p className="text-base font-medium">
          {rerouting ? t('web:mover.navigation.rerouting.label') : t('web:mover.navigation.loading.label')}
        </p>
      )}
    </div>
  )
}

export function NavFooter({
  progress,
  target,
  onOverview,
  action,
}: {
  progress: NavProgress | null
  target: NavTarget | null
  onOverview: () => void
  action?: ReactNode
}) {
  const { t } = useTranslation()
  return (
    <div className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-4 shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
      {progress && (
        <div className="flex items-baseline gap-3">
          <p className="text-2xl font-bold text-neutral-900 dark:text-white">
            {progress.arrived
              ? t('web:mover.navigation.arrived.title')
              : formatDurationHm(Math.max(60, progress.remainingS))}
          </p>
          {!progress.arrived && (
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              {t('web:mover.navigation.remaining.label', {
                distance: navDistance(progress.remainingM),
                time: formatTime(new Date(Date.now() + progress.remainingS * 1000)),
              })}
            </p>
          )}
        </div>
      )}
      {action}
      <div className="grid grid-cols-3 gap-2 text-sm font-semibold">
        <button
          type="button"
          onClick={onOverview}
          className="rounded-full border border-neutral-300 py-2.5 text-neutral-900 dark:border-neutral-600 dark:text-white"
        >
          {t('web:mover.navigation.overview.cta')}
        </button>
        <a
          href={target ? googleMapsUrl(target) : undefined}
          target="_blank"
          rel="noreferrer"
          className="rounded-full border border-neutral-300 py-2.5 text-center text-primary-600 dark:border-neutral-600"
        >
          Google Maps
        </a>
        <a
          href={target ? wazeUrl(target) : undefined}
          target="_blank"
          rel="noreferrer"
          className="rounded-full border border-neutral-300 py-2.5 text-center text-primary-600 dark:border-neutral-600"
        >
          Waze
        </a>
      </div>
    </div>
  )
}
