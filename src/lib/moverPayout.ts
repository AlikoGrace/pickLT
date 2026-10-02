/**
 * What a driver earns on a move — the owner's rule (plan 7, 2026-10-02):
 *
 *   payout = net − platformFee  (= customer total − VAT − platform fee)
 *
 * The customer-facing engine prices gross (master D11); the driver sees the
 * number left after the platform's fee and the tax, which is `adjustedSubtotal`
 * on a quote with no discount and no minimum-charge top-up. Amounts the driver
 * must COLLECT (active-move payment amount, cash confirmation) stay gross —
 * this helper is for what they are told they earn and for earnings sums.
 *
 * `commissionRate` / `writetaxledger` are a separate, driver-side ledger
 * (master D12) and are deliberately not involved here.
 *
 * Web port of `pickltmobile/lib/mover-payout.ts` (same arithmetic, this repo's
 * module names). Edit the mobile file first and keep the two in step.
 */

import { rate, type PricingConfig } from '@/lib/pricing'
import { parseBreakdown, type QuoteBreakdown } from '@/lib/pricingEngine'

export interface PayoutRates {
  vatRate: number
  feeRate: number
  feeFixed: number
}

export interface PayoutMoveLike {
  estimatedPrice?: number | null
  finalPrice?: number | null
  /** `moves.priceBreakdown` — JSON string, a parsed breakdown, or null on pre-v3 rows. */
  priceBreakdown?: string | QuoteBreakdown | null
}

const round2 = (n: number): number => Math.round(n * 100) / 100

function finiteOr(n: unknown, fallback: number): number {
  return typeof n === 'number' && Number.isFinite(n) ? n : fallback
}

/**
 * The three rates the payout depends on. A quote records the exact rules it
 * was priced with (`breakdown.rates`, Framework §7.2), so those win; a row
 * without a breakdown uses the live config, then the compiled defaults.
 */
export function payoutRatesFrom(
  breakdown: QuoteBreakdown | null | undefined,
  config?: PricingConfig | null,
): PayoutRates {
  const r = breakdown?.rates ?? {}
  return {
    vatRate: finiteOr(r['tax.vatRate'], rate(config, 'tax.vatRate')),
    feeRate: finiteOr(r['platformFee.rate'], rate(config, 'platformFee.rate')),
    feeFixed: finiteOr(r['platformFee.fixed'], rate(config, 'platformFee.fixed')),
  }
}

/**
 * Payout for an arbitrary gross amount (a settled payment, a final price the
 * mover adjusted on site): strip VAT, then the fee that the engine would have
 * charged on top of the remaining subtotal. Never negative.
 */
export function moverPayoutFromGross(grossEur: number, rates: PayoutRates): number {
  if (!Number.isFinite(grossEur) || grossEur <= 0) return 0
  const exVat = round2(grossEur / (1 + rates.vatRate))
  const adjusted = round2((exVat - rates.feeFixed) / (1 + rates.feeRate))
  return Math.max(0, adjusted)
}

/**
 * Payout for a move row. `finalPrice` (set at completion) wins over the
 * estimate. When the row still carries the quote it was priced with and the
 * gross is that quote's total, the answer is exact: `net − platformFee`.
 */
export function moverPayoutEur(move: PayoutMoveLike, config?: PricingConfig | null): number {
  const gross = finiteOr(move.finalPrice, NaN)
  const grossEur = Number.isFinite(gross) && gross > 0 ? gross : finiteOr(move.estimatedPrice, 0)
  if (!(grossEur > 0)) return 0

  const breakdown =
    typeof move.priceBreakdown === 'string' || move.priceBreakdown == null
      ? parseBreakdown(move.priceBreakdown)
      : move.priceBreakdown

  if (breakdown && Math.abs(breakdown.total - grossEur) < 0.005) {
    return Math.max(0, round2(breakdown.net - breakdown.platformFee))
  }
  return moverPayoutFromGross(grossEur, payoutRatesFrom(breakdown, config))
}
