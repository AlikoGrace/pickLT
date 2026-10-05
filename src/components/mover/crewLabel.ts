import type { TFunction } from 'i18next'

import { parseBreakdown } from '@/lib/pricingEngine'

/**
 * "Crew: driver only" / "Crew: driver + N helpers" for a move, as shown to the
 * driver deciding whether to take it (crew master §5 Movers). Port of
 * `pickltmover/lib/crew-display.ts` — keep the two in step.
 *
 * `moves.crewSize` is the TOTAL crew the client was charged for (driver +
 * helpers, client-requested extras included), so helpers = crewSize − 1 — no
 * `+1` anywhere. Without a usable `crewSize` the stored quote's
 * `profile.totalCrew` is used; with neither, nothing is shown.
 */

interface CrewSource {
  crewSize?: unknown
  extraHelpers?: unknown
  priceBreakdown?: unknown
}

export interface MoveCrew {
  total: number
  helpers: number
  extraHelpers: number
}

function toInt(value: unknown, min: number): number | null {
  const n = typeof value === 'string' && value.trim() !== '' ? Number(value) : value
  if (typeof n !== 'number' || !Number.isFinite(n)) return null
  const r = Math.round(n)
  return r >= min ? r : null
}

export function moveCrew(move: CrewSource): MoveCrew | null {
  const breakdown = parseBreakdown(move.priceBreakdown)
  const total = toInt(move.crewSize, 1) ?? toInt(breakdown?.profile.totalCrew, 1)
  if (total == null) return null
  const helpers = total - 1
  const extra = toInt(move.extraHelpers, 0) ?? toInt(breakdown?.profile.extraHelpers, 0) ?? 0
  return { total, helpers, extraHelpers: Math.min(extra, helpers) }
}

type Translate = TFunction | ((key: string, options?: Record<string, unknown>) => string)

export function crewLabel(t: Translate, move: CrewSource): string | null {
  const crew = moveCrew(move)
  if (!crew) return null
  const tr = t as (key: string, options?: Record<string, unknown>) => string
  const base =
    crew.helpers === 0
      ? tr('booking:pricing.assumptions.crewDriverOnly.label')
      : tr('booking:pricing.assumptions.crewHelpers.label', { count: crew.helpers })
  if (crew.extraHelpers === 0) return base
  return `${base} ${tr('web:mover.crew.requestedByClient.label', { count: crew.extraHelpers })}`
}
