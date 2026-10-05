'use client'

import { useMoveSearch } from '@/context/moveSearch'
import { useInventoryCatalog } from '@/hooks/useInventoryCatalog'
import { usePricingConfig } from '@/hooks/usePricingConfig'
import { classifyMove, enforcedTier, thresholdsFromConfig } from '@/lib/classifyMove'
import { formatWeightKg } from '@/lib/format'
import { categoryLabel, categoryTranslator } from '@/lib/inventory-i18n'
import type { MoveType } from '@/lib/types'
import ButtonCircle from '@/shared/ButtonCircle'
import ButtonPrimary from '@/shared/ButtonPrimary'
import ButtonSecondary from '@/shared/ButtonSecondary'
import Input from '@/shared/Input'
import Select from '@/shared/Select'
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react'
import { MinusIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline'
import { FC, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  capFor,
  compareNames,
  CUSTOM_SIZE_OPTIONS,
  customItemFromDraft,
  MAX_ITEM_QTY,
  proposeChange,
  resolveUpgrade,
  searchCatalog,
  selectableItems,
  setCount,
  setCustomQuantity,
  tabCategories,
  toClassifyCustom,
  type Basket,
  type CatalogItem,
  type CustomItem,
  type CustomItemDraft,
  type PendingUpgrade,
  type SelectorState,
} from './selector-logic'

const TIER_ORDER: Record<MoveType, number> = { light: 0, regular: 1, premium: 2 }

const TIER_STYLE: Record<MoveType, string> = {
  light: 'bg-blue-50 text-primary-700 dark:bg-blue-900/20 dark:text-blue-200',
  regular: 'bg-amber-50 text-amber-800 dark:bg-amber-900/20 dark:text-amber-200',
  premium: 'bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-200',
}

// ── Quantity row ─────────────────────────────────────────────────────────────

const QtyRow: FC<{
  label: string
  sublabel?: string
  count: number
  max: number
  onDecrement: () => void
  onIncrement: () => void
  onDelete?: () => void
}> = ({ label, sublabel, count, max, onDecrement, onIncrement, onDelete }) => {
  const { t } = useTranslation()
  return (
    <div className="flex items-center justify-between gap-x-5">
      <div className="flex min-w-0 flex-col text-sm sm:text-base">
        <span className="font-medium break-words text-neutral-800 dark:text-neutral-200">{label}</span>
        {sublabel && <span className="text-xs text-neutral-500 dark:text-neutral-400">{sublabel}</span>}
      </div>
      <div className="flex shrink-0 items-center gap-2.5">
        <ButtonCircle
          outline
          type="button"
          disabled={count <= 0}
          onClick={onDecrement}
          aria-label={t('common:action.decrement.a11y')}
          className="size-8!"
        >
          <MinusIcon className="size-4!" />
        </ButtonCircle>
        <span className="w-6 text-center">{count}</span>
        <ButtonCircle
          outline
          type="button"
          disabled={count >= max}
          onClick={onIncrement}
          aria-label={t('common:action.increment.a11y')}
          className="size-8!"
        >
          <PlusIcon className="size-4!" />
        </ButtonCircle>
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            aria-label={t('common:action.remove.cta')}
            className="p-1.5 text-neutral-500 transition-colors hover:text-red-500"
          >
            <TrashIcon className="size-5" />
          </button>
        )}
      </div>
    </div>
  )
}

// ── Custom item modal ────────────────────────────────────────────────────────

const EMPTY_DRAFT: CustomItemDraft = { name: '', quantity: 1, approxSize: 'medium', weight: '' }

function newCustomId(): string {
  try {
    return `custom_${crypto.randomUUID()}`
  } catch {
    return `custom_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  }
}

const CustomItemModal: FC<{ open: boolean; onClose: () => void; onSubmit: (item: CustomItem) => void }> = ({
  open,
  onClose,
  onSubmit,
}) => {
  const { t } = useTranslation('inventory')
  const [draft, setDraft] = useState<CustomItemDraft>(EMPTY_DRAFT)
  const valid = customItemFromDraft(draft, 'preview') !== null

  const close = () => {
    setDraft(EMPTY_DRAFT)
    onClose()
  }
  const submit = () => {
    const item = customItemFromDraft(draft, newCustomId())
    if (!item) return
    setDraft(EMPTY_DRAFT)
    onSubmit(item)
  }

  return (
    <Dialog open={open} onClose={close} className="relative z-50">
      <DialogBackdrop className="fixed inset-0 bg-black/30" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-neutral-900">
          <DialogTitle className="mb-4 text-lg font-semibold text-neutral-900 dark:text-white">
            {t('customItem.add.cta')}
          </DialogTitle>
          <div className="space-y-4">
            <div>
              <label htmlFor="custom-item-name" className="mb-1 block text-sm font-medium">
                {t('customItem.name.label')}
              </label>
              <Input
                id="custom-item-name"
                placeholder={t('customItem.name.placeholder')}
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              />
            </div>
            <QtyRow
              label={t('customItem.quantity.label')}
              count={draft.quantity}
              max={MAX_ITEM_QTY}
              onDecrement={() => setDraft({ ...draft, quantity: Math.max(1, draft.quantity - 1) })}
              onIncrement={() => setDraft({ ...draft, quantity: Math.min(MAX_ITEM_QTY, draft.quantity + 1) })}
            />
            <div>
              <label htmlFor="custom-item-size" className="mb-1 block text-sm font-medium">
                {t('customItem.size.label')}
              </label>
              <Select
                id="custom-item-size"
                value={draft.approxSize}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setDraft({ ...draft, approxSize: e.target.value })}
              >
                {/* i18n-keys: inventory.customItem.size.small.option, inventory.customItem.size.medium.option,
                    inventory.customItem.size.large.option, inventory.customItem.size.extraLarge.option */}
                {CUSTOM_SIZE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {t(`customItem.size.${o.keySegment}.option`)}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label htmlFor="custom-item-weight" className="mb-1 block text-sm font-medium">
                {t('customItem.weight.label')}
              </label>
              <Input
                id="custom-item-weight"
                inputMode="decimal"
                required
                placeholder={t('customItem.weight.placeholder')}
                value={draft.weight}
                onChange={(e) => setDraft({ ...draft, weight: e.target.value })}
              />
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <ButtonSecondary type="button" onClick={close}>
              {t('common:action.cancel.cta')}
            </ButtonSecondary>
            <ButtonPrimary type="button" onClick={submit} disabled={!valid}>
              {t('customItem.submit.cta')}
            </ButtonPrimary>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  )
}

// ── Main component ───────────────────────────────────────────────────────────

/**
 * The one inventory selector of the web client (crew plan 1 #10), used by the
 * instant flow (`/instant-move/inventory`) and the scheduled wizard (step 4).
 * Port of the mobile `InventorySelector`: search, known category order,
 * Special section, capped steppers, custom items with a size band and a
 * required weight, and an upgrade dialog whose Cancel undoes the change.
 * Reads and writes the booking basket in `moveSearch`.
 */
const InventorySelector: FC = () => {
  const { t, i18n } = useTranslation('inventory')
  const locale = i18n.language
  const {
    moveType,
    setMoveType,
    inventory,
    customItems,
    setInventoryCounts,
    setCustomItems,
    pickupCountryCode,
  } = useMoveSearch()
  const { catalog, status, retry } = useInventoryCatalog()
  const config = usePricingConfig(pickupCountryCode)
  const thresholds = useMemo(() => thresholdsFromConfig(config), [config])

  const catLabel = useMemo(() => {
    const translate = categoryTranslator(t)
    return (slug: string) => categoryLabel(slug, translate)
  }, [t])

  const visible = useMemo(() => selectableItems(catalog), [catalog])
  const tabs = useMemo(() => tabCategories(visible), [visible])
  const [selectedTab, setSelectedTab] = useState<string | null>(null)
  const activeTab = selectedTab && tabs.includes(selectedTab) ? selectedTab : (tabs[0] ?? null)
  const byName = (a: CatalogItem, b: CatalogItem) => compareNames(a.name, b.name, locale)
  const tabItems = useMemo(
    () => (activeTab ? visible.filter((i) => i.category === activeTab).sort(byName) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [visible, activeTab, locale],
  )
  const specialItems = useMemo(
    () => visible.filter((i) => i.category === 'special').sort(byName),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [visible, locale],
  )

  const [search, setSearch] = useState('')
  const query = search.trim()
  const matches = useMemo(() => (query ? searchCatalog(visible, query, locale) : []), [visible, query, locale])

  // ── Tier & classification ─────────────────────────────────────────────────
  const tier: MoveType = moveType ?? 'light'
  const classification = useMemo(
    () => classifyMove(inventory, toClassifyCustom(customItems), tier, catalog, thresholds),
    [inventory, customItems, tier, catalog, thresholds],
  )
  // Never below the client's tier; the server prices the higher of the two.
  const effectiveTier = enforcedTier(tier, classification.recommendedType)

  // ── Upgrade with undo ─────────────────────────────────────────────────────
  const [pending, setPending] = useState<PendingUpgrade | null>(null)
  const state: SelectorState = { counts: inventory, customItems, tier, pending }

  const commit = (next: SelectorState) => {
    setInventoryCounts(next.counts)
    setCustomItems(next.customItems)
    if (next.tier !== tier) setMoveType(next.tier)
    setPending(next.pending)
  }
  const propose = (next: Basket, triggerName: string) =>
    commit(proposeChange(state, next, triggerName, catalog, thresholds))

  const increment = (item: CatalogItem) => {
    const cap = capFor(item)
    const current = inventory[item.id] ?? 0
    if (current >= cap) return
    propose({ counts: setCount(inventory, item.id, current + 1, cap), customItems }, item.name)
  }
  const decrement = (item: CatalogItem) => {
    const current = inventory[item.id] ?? 0
    if (current <= 0) return
    setInventoryCounts(setCount(inventory, item.id, current - 1, capFor(item)))
  }

  const [customOpen, setCustomOpen] = useState(false)
  const addCustom = (item: CustomItem) => {
    setCustomOpen(false)
    propose({ counts: inventory, customItems: [...customItems, item] }, item.name)
  }
  const customStep = (c: CustomItem, delta: 1 | -1) => {
    const next = setCustomQuantity(customItems, c.id, c.quantity + delta)
    if (delta > 0) propose({ counts: inventory, customItems: next }, c.name)
    else setCustomItems(next)
  }

  const renderItem = (item: CatalogItem, withCategory = false) => (
    <QtyRow
      key={item.id}
      label={withCategory ? `${item.name} · ${catLabel(item.category)}` : item.name}
      count={inventory[item.id] ?? 0}
      max={capFor(item)}
      onDecrement={() => decrement(item)}
      onIncrement={() => increment(item)}
    />
  )

  const showBanner = classification.totalItems > 0 || classification.warningKeys.length > 0
  const pendingItems = pending
    ? Array.from(new Set(pending.warnings.map((w) => w.params?.item).filter((n): n is string => !!n)))
    : []

  return (
    <div className="flex flex-col gap-y-6">
      {showBanner && (
        <div className={`rounded-2xl px-4 py-3 ${TIER_STYLE[effectiveTier]}`}>
          {/* i18n-keys: booking.moveType.light.title, booking.moveType.regular.title, booking.moveType.premium.title */}
          <p className="font-semibold">
            {t('recommendation.headline.title', {
              prefix:
                TIER_ORDER[classification.recommendedType] <= TIER_ORDER[tier]
                  ? t('recommendation.chosen.label')
                  : t('recommendation.suggested.label'),
              tier: t(`booking:moveType.${effectiveTier}.title`),
            })}
          </p>
          <p className="text-xs opacity-85">
            {t('recommendation.itemCount.label', { count: classification.totalItems })} ·{' '}
            {formatWeightKg(classification.totalWeightKg)}
          </p>
        </div>
      )}

      {status === 'loading' && <div className="h-24 animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-800" />}

      {(status === 'empty' || status === 'error') && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-700/60 dark:bg-amber-900/20 dark:text-amber-200">
          <p className="font-medium">
            {status === 'empty' ? t('unavailable.empty.title') : t('unavailable.error.title')}
          </p>
          <p className="mt-1">{status === 'empty' ? t('unavailable.empty.body') : t('unavailable.error.body')}</p>
          <button
            type="button"
            onClick={retry}
            className="mt-2 rounded-md bg-amber-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-800 dark:bg-amber-200 dark:text-amber-950 dark:hover:bg-amber-100"
          >
            {t('common:action.tryAgain.cta')}
          </button>
        </div>
      )}

      {status === 'ready' && (
        <>
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            // The wizard renders the selector inside its step <Form>; Enter must not submit it.
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.preventDefault()
            }}
            placeholder={t('search.placeholder')}
            aria-label={t('search.placeholder')}
            autoComplete="off"
          />

          {query ? (
            matches.length === 0 ? (
              <p className="text-sm text-neutral-500 dark:text-neutral-400">{t('search.noMatch.empty', { query })}</p>
            ) : (
              <div className="space-y-4">{matches.map((item) => renderItem(item, true))}</div>
            )
          ) : (
            <>
              {tabs.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {tabs.map((slug) => (
                    <button
                      key={slug}
                      type="button"
                      onClick={() => setSelectedTab(slug)}
                      aria-pressed={activeTab === slug}
                      className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                        activeTab === slug
                          ? 'bg-primary-600 text-white'
                          : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700'
                      }`}
                    >
                      {catLabel(slug)}
                    </button>
                  ))}
                </div>
              )}
              {tabItems.length > 0 && <div className="space-y-4">{tabItems.map((item) => renderItem(item))}</div>}

              {specialItems.length > 0 && (
                <div className="border-t border-neutral-200 pt-6 dark:border-neutral-700">
                  <h2 className="mb-2 text-lg font-semibold text-neutral-900 dark:text-white">
                    {t('category.special')}
                  </h2>
                  <p className="mb-6 text-sm text-neutral-500 dark:text-neutral-400">
                    {t('section.special.subtitle')}
                  </p>
                  <div className="space-y-4">{specialItems.map((item) => renderItem(item))}</div>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Custom items work even without a catalog. */}
      <div className="border-t border-neutral-200 pt-6 dark:border-neutral-700">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">{t('section.custom.title')}</h2>
          <ButtonSecondary type="button" onClick={() => setCustomOpen(true)} className="!px-4 !py-2">
            <PlusIcon className="size-5" />
            <span>{t('customItem.add.cta')}</span>
          </ButtonSecondary>
        </div>
        {customItems.length === 0 ? (
          <p className="text-sm text-neutral-500 dark:text-neutral-400">{t('section.custom.empty')}</p>
        ) : (
          <div className="space-y-4">
            {/* i18n-keys: inventory.customItem.size.small.option, inventory.customItem.size.medium.option,
                inventory.customItem.size.large.option, inventory.customItem.size.extraLarge.option */}
            {customItems.map((c) => (
              <QtyRow
                key={c.id}
                label={t('item.customName.label', { name: c.name })}
                sublabel={`${t(`customItem.size.${CUSTOM_SIZE_OPTIONS.find((o) => o.value === c.approxSize)?.keySegment ?? 'medium'}.option`)} · ${formatWeightKg(c.approxWeight, { maximumFractionDigits: 1 })}`}
                count={c.quantity}
                max={MAX_ITEM_QTY}
                onDecrement={() => customStep(c, -1)}
                onIncrement={() => customStep(c, 1)}
                onDelete={() => setCustomItems(customItems.filter((x) => x.id !== c.id))}
              />
            ))}
          </div>
        )}
      </div>

      <CustomItemModal open={customOpen} onClose={() => setCustomOpen(false)} onSubmit={addCustom} />

      {/* Upgrade: Continue lifts the tier, Cancel (or dismiss) undoes the change. */}
      <Dialog open={pending !== null} onClose={() => commit(resolveUpgrade(state, false))} className="relative z-50">
        <DialogBackdrop className="fixed inset-0 bg-black/30" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-neutral-900">
            {pending && (
              <>
                {/* i18n-keys: booking.moveType.light.short, booking.moveType.regular.short, booking.moveType.premium.short,
                    booking.moveType.light.body, booking.moveType.regular.body, booking.moveType.premium.body */}
                <p className="text-sm text-neutral-500 dark:text-neutral-400">{t('upgrade.headline.title')}</p>
                <DialogTitle className="mb-3 text-xl font-semibold text-neutral-900 dark:text-white">
                  {t(`booking:moveType.${pending.upgradeTo}.title`)}
                </DialogTitle>
                <p className="text-sm text-neutral-600 dark:text-neutral-300">
                  {t('upgrade.reason.body', {
                    item: pending.triggerName,
                    tier: t(`booking:moveType.${pending.upgradeTo}.short`),
                    explanation: t(`booking:moveType.${pending.upgradeTo}.body`),
                  })}
                </p>
                {pendingItems.length > 0 && (
                  <div className="mt-3 text-sm">
                    <p className="font-medium text-neutral-800 dark:text-neutral-200">{t('upgrade.warnings.title')}</p>
                    <ul className="mt-1 list-inside list-disc text-neutral-600 dark:text-neutral-300">
                      {pendingItems.map((name) => (
                        <li key={name}>{name}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="mt-6 flex gap-3">
                  <ButtonSecondary type="button" className="flex-1" onClick={() => commit(resolveUpgrade(state, false))}>
                    {t('common:action.cancel.cta')}
                  </ButtonSecondary>
                  <ButtonPrimary type="button" className="flex-1" onClick={() => commit(resolveUpgrade(state, true))}>
                    {t('common:action.continue.cta')}
                  </ButtonPrimary>
                </div>
              </>
            )}
          </DialogPanel>
        </div>
      </Dialog>
    </div>
  )
}

export default InventorySelector
