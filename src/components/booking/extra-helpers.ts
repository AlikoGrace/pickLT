/**
 * Extra helpers the client adds on top of the tier crew (crew master D2):
 * 0…`crew.maxExtraHelpers` (default 3), each billed at the tier's hourly
 * labour rate. The server clamps again; this keeps the stepper honest. Pure.
 */

import { rate, type PricingConfig } from '@/lib/pricing'
import type { MoveType } from '@/lib/types'

export function maxExtraHelpers(config: PricingConfig | null | undefined): number {
  const max = Math.floor(rate(config, 'crew.maxExtraHelpers'))
  return Number.isFinite(max) && max > 0 ? max : 0
}

export function clampExtraHelpers(value: unknown, max: number): number {
  const n = Math.floor(Number(value))
  if (!Number.isFinite(n) || n < 0) return 0
  return Math.min(n, Math.max(0, max))
}

export function stepExtraHelpers(current: number, delta: 1 | -1, max: number): number {
  return clampExtraHelpers(clampExtraHelpers(current, max) + delta, max)
}

/** EUR per helper-hour for `tier`. */
export function helperRateEur(config: PricingConfig | null | undefined, tier: MoveType): number {
  return rate(config, `tier.${tier}.laborRatePerHour`)
}

/** Helpers the tier already includes (tier crew minus the driver). */
export function includedHelpers(config: PricingConfig | null | undefined, tier: MoveType): number {
  return Math.max(0, Math.floor(rate(config, `tier.${tier}.crew`)) - 1)
}
