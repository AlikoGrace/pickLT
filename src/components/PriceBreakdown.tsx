'use client'

import { Fragment, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import {
  formatDistanceKm,
  formatMoney,
  formatNumber,
  formatPercent,
  formatVolumeM3,
  formatWeightKg,
} from '@/lib/format'
import { formatInventoryLabel } from '@/lib/inventory-labels'
import { additionalServiceLabel } from '@/lib/enum-labels'
import { asVehicleType, vehicleLabel } from '@/lib/pricing'
import { TIER_DISPLAY_KEY, type QuoteBreakdown } from '@/lib/pricingEngine'

/**
 * The itemised estimate (pricing master D15), web port of the mobile
 * `PriceBreakdownCard`: tier + mode header, every component line, operational
 * subtotal, instant adjustment, platform fee, net, VAT, total, assumptions.
 *
 * Reads the shared `booking:pricing.*` keys from master §7.1. They are owned by
 * the mobile repo and arrive through `sync:locales`; until then `defaultValue`
 * keeps the card legible rather than printing raw keys. The web-only strings
 * (card title, item-line labels, unpriced warning) live in `web.json`.
 *
 * `compact` collapses the component lines behind a toggle — for the tracking
 * sheet and the sidebar of a persisted move, where the total is the headline.
 */

export interface PriceBreakdownProps {
  breakdown: QuoteBreakdown
  /** Collapse the lines behind a "Show details" toggle. */
  compact?: boolean
  /** Est. volume / weight / crew / hours + the "estimate" helper. Default on. */
  showAssumptions?: boolean
  /** Catalog id → localised name, for the per-item lines. */
  itemNames?: Map<string, string> | null
  className?: string
}

export interface BreakdownRow {
  key: string
  label: string
  amount: number
  emphasis?: 'subtotal' | 'total'
  /** Rendered even when the amount is zero (base, total, VAT). */
  always?: boolean
}

/**
 * The ordered rows of the card, as plain data. The page sections and a test
 * share this so the card and any summary line can never disagree about what
 * is in the price.
 */
export function breakdownRows(t: TFunction, b: QuoteBreakdown): BreakdownRow[] {
  const { lines, profile } = b
  const money = (n: number) => formatMoney(n)
  const rows: BreakdownRow[] = [
    {
      key: 'base',
      label: t('booking:pricing.line.base.label', { defaultValue: 'Base service' }),
      amount: lines.base,
      always: true,
    },
    {
      key: 'distance',
      label: t('booking:pricing.line.distance.label', {
        defaultValue: 'Distance ({{km}} × {{rate}})',
        km: formatDistanceKm(profile.distanceKm),
        rate: money(b.rates[`tier.${b.tier}.distanceRatePerKm`] ?? 0),
      }),
      amount: lines.distance,
    },
    {
      key: 'vehicle',
      label: t('booking:pricing.line.vehicle.label', {
        defaultValue: 'Vehicle ({{vehicle}})',
        vehicle: vehicleLabel(t, asVehicleType(profile.vehicleType)),
      }),
      amount: lines.vehicle,
    },
    {
      key: 'labor',
      label: t('booking:pricing.line.labor.label', {
        defaultValue: 'Crew labour ({{crew}} × {{rate}} × {{hours}})',
        crew: formatNumber(profile.crew),
        rate: money(b.rates[`tier.${b.tier}.laborRatePerHour`] ?? 0),
        hours: formatNumber(profile.billableHours, { maximumFractionDigits: 2 }) + ' h',
      }),
      amount: lines.labor,
    },
    {
      key: 'items',
      label: t('booking:pricing.line.items.label', {
        defaultValue: 'Items ({{count}})',
        count: profile.itemCount,
      }),
      amount: lines.items,
    },
    {
      key: 'packing',
      label: t('booking:pricing.line.packing.label', { defaultValue: 'Packing' }),
      amount: lines.packing,
    },
    {
      key: 'handling',
      label: t('booking:pricing.line.handling.label', { defaultValue: 'Handling & access' }),
      amount: lines.handling,
    },
    {
      key: 'services',
      label: t('booking:pricing.line.services.label', { defaultValue: 'Additional services' }),
      amount: lines.services,
    },
    {
      key: 'storage',
      label: t('booking:pricing.line.storage.label', {
        defaultValue: 'Storage ({{count}} weeks)',
        count: b.rates['storage.perWeek'] ? Math.round(lines.storage / b.rates['storage.perWeek']) : 0,
      }),
      amount: lines.storage,
    },
    {
      key: 'operationalSubtotal',
      label: t('booking:pricing.operationalSubtotal.label', { defaultValue: 'Operational subtotal' }),
      amount: b.operationalSubtotal,
      emphasis: 'subtotal',
      always: true,
    },
  ]
  if (b.mode === 'instant') {
    rows.push({
      key: 'instantAdjustment',
      label: t('booking:pricing.instantAdjustment.label', {
        defaultValue: 'Instant booking (×{{multiplier}})',
        multiplier: formatNumber(b.modeMultiplier, { maximumFractionDigits: 2 }),
      }),
      amount: b.modeAdjustment,
      always: true,
    })
  }
  rows.push({
    key: 'platformFee',
    label: t('booking:pricing.platformFee.label', {
      defaultValue: 'Platform fee ({{rate}})',
      rate: formatPercent(b.rates['platformFee.rate'] ?? 0),
    }),
    amount: b.platformFee,
    always: true,
  })
  if (b.discount > 0) {
    rows.push({
      key: 'discount',
      label: t('booking:pricing.discount.label', { defaultValue: 'Discount' }),
      amount: -b.discount,
      always: true,
    })
  }
  rows.push(
    {
      key: 'net',
      label: t('booking:pricing.net.label', { defaultValue: 'Subtotal before VAT' }),
      amount: b.net,
      emphasis: 'subtotal',
      always: true,
    },
    {
      key: 'vat',
      label: t('booking:pricing.vat.label', { defaultValue: 'VAT ({{rate}})', rate: formatPercent(b.vatRate) }),
      amount: b.vat,
      always: true,
    },
    {
      key: 'total',
      label: t('booking:pricing.total.label', { defaultValue: 'Total' }),
      amount: b.total,
      emphasis: 'total',
      always: true,
    },
  )
  return rows
}

/** "Medium · Instant move" — the card header. */
export function breakdownHeader(t: TFunction, b: QuoteBreakdown): string {
  const tier = t(TIER_DISPLAY_KEY[b.tier])
  return b.mode === 'instant'
    ? t('booking:pricing.header.instant.label', { defaultValue: '{{tier}} · Instant move', tier })
    : t('booking:pricing.header.scheduled.label', { defaultValue: '{{tier}} · Scheduled move', tier })
}

const Row = ({ row }: { row: BreakdownRow }) => {
  const emphasis =
    row.emphasis === 'total'
      ? 'text-base font-semibold text-neutral-900 dark:text-white'
      : row.emphasis === 'subtotal'
        ? 'font-medium text-neutral-800 dark:text-neutral-100'
        : 'text-neutral-600 dark:text-neutral-300'
  return (
    <div
      className={`flex items-baseline justify-between gap-4 text-sm ${emphasis} ${
        row.emphasis ? 'border-t border-neutral-100 pt-2 dark:border-neutral-700' : ''
      }`}
    >
      <span className="min-w-0 flex-1">{row.label}</span>
      <span className="shrink-0 tabular-nums">{formatMoney(row.amount)}</span>
    </div>
  )
}

export default function PriceBreakdown({
  breakdown: b,
  compact = false,
  showAssumptions = true,
  itemNames,
  className = '',
}: PriceBreakdownProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(!compact)

  const rows = breakdownRows(t, b)
  const visible = rows.filter((r) => r.always || r.amount !== 0)
  const headline = rows[rows.length - 1]

  const serviceLines = b.serviceLines.filter((l) => l.amountEur !== 0)
  const itemLines = b.itemLines.filter((l) => l.qty && l.qty > 0)

  return (
    <section
      className={`rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-800 ${className}`}
      aria-label={t('web:pricing.breakdown.title')}
    >
      <header className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            {t('web:pricing.breakdown.title')}
          </p>
          <p className="text-sm font-semibold text-neutral-900 dark:text-white">{breakdownHeader(t, b)}</p>
        </div>
        <div className="text-right">
          <p className="text-xl font-bold text-primary-600">{formatMoney(b.total)}</p>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
            {t('booking:pricing.vat.label', { defaultValue: 'VAT ({{rate}})', rate: formatPercent(b.vatRate) })}{' '}
            {t('web:pricing.breakdown.included.label')}
          </p>
        </div>
      </header>

      {compact && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="mb-2 text-sm font-medium text-primary-600 hover:underline"
        >
          {open ? t('web:pricing.breakdown.hide.cta') : t('web:pricing.breakdown.show.cta')}
        </button>
      )}

      {open && (
        <div className="space-y-1.5">
          {visible.map((row) => (
            <Fragment key={row.key}>
              <Row row={row} />
              {row.key === 'items' && itemLines.length > 0 && (
                <ul className="mb-1 space-y-0.5 pl-3 text-xs text-neutral-500 dark:text-neutral-400">
                  {itemLines.map((line) => (
                    <li key={line.key} className="flex justify-between gap-4">
                      <span className="min-w-0 flex-1 truncate">
                        {line.key.startsWith('custom:')
                          ? t('web:pricing.breakdown.customItems.label', { count: line.qty ?? 0 })
                          : `${formatInventoryLabel(line.key, itemNames)} × ${line.qty}`}
                      </span>
                      <span className="shrink-0 tabular-nums">{formatMoney(line.amountEur)}</span>
                    </li>
                  ))}
                </ul>
              )}
              {row.key === 'services' && serviceLines.length > 0 && (
                <ul className="mb-1 space-y-0.5 pl-3 text-xs text-neutral-500 dark:text-neutral-400">
                  {serviceLines.map((line) => (
                    <li key={line.key} className="flex justify-between gap-4">
                      <span className="min-w-0 flex-1 truncate">{additionalServiceLabel(t, line.key)}</span>
                      <span className="shrink-0 tabular-nums">{formatMoney(line.amountEur)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Fragment>
          ))}
          {b.minimumApplied && (
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {t('booking:pricing.minimumApplied.helper', {
                defaultValue: 'Minimum charge of {{amount}} applied',
                amount: formatMoney(b.rates['pricing.minimumCharge'] ?? b.net),
              })}
            </p>
          )}
        </div>
      )}

      {!open && <Row row={headline} />}

      {showAssumptions && (
        <footer className="mt-3 border-t border-neutral-100 pt-3 text-xs text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
          <ul className="flex flex-wrap gap-x-4 gap-y-1">
            <li>
              {t('booking:pricing.assumptions.volume.label', {
                defaultValue: 'Est. volume {{value}}',
                value: formatVolumeM3(b.profile.loadedVolumeM3),
              })}
            </li>
            <li>
              {t('booking:pricing.assumptions.weight.label', {
                defaultValue: 'Est. weight {{value}}',
                value: formatWeightKg(b.profile.weightKg),
              })}
            </li>
            <li>
              {t('booking:pricing.assumptions.crew.label', {
                defaultValue: 'Crew {{value}}',
                value: formatNumber(b.profile.crew),
              })}
            </li>
            <li>
              {t('booking:pricing.assumptions.hours.label', {
                defaultValue: 'Billable hours {{value}}',
                value: formatNumber(b.profile.billableHours, { maximumFractionDigits: 2 }),
              })}
            </li>
          </ul>
          <p className="mt-2">
            {t('booking:pricing.estimate.helper', {
              defaultValue: 'Estimate — confirmed when your mover accepts',
            })}
          </p>
          {b.assumptions.unpricedItemIds.length > 0 && (
            <p className="mt-1 text-amber-600 dark:text-amber-400">
              {t('web:pricing.breakdown.unpriced.helper', { count: b.assumptions.unpricedItemIds.length })}
            </p>
          )}
          {b.flags.exceedsLargestVehicle && (
            <p className="mt-1 text-red-600 dark:text-red-400" role="alert">
              {t('errors:pricing.exceedsLargestVehicle', {
                defaultValue: 'This load is too large for a single vehicle. Please contact support.',
              })}
            </p>
          )}
        </footer>
      )}
    </section>
  )
}
