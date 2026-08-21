'use client'

import MapboxMap, { RouteInfo } from '@/components/MapboxMap'
import MapLocationPicker, { PickedLocation } from '@/components/MapLocationPicker'
import NcInputNumber from '@/components/NcInputNumber'
import { useMoveSearch, type CustomItem, type MoveTypeKey } from '@/context/moveSearch'
import { classifyMove, DEFAULT_CLASSIFICATION_POINTS, type InventoryItemDef as ClassifyItemDef, type CustomItemInput } from '@/lib/classifyMove'
import ButtonPrimary from '@/shared/ButtonPrimary'
import ButtonSecondary from '@/shared/ButtonSecondary'
import { Divider } from '@/shared/divider'
import Input from '@/shared/Input'
import Logo from '@/shared/Logo'
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react'
import {
  Add01Icon,
  ArrowLeft02Icon,
  ArrowUp01Icon,
  Cancel01Icon,
  AlertCircleIcon,
  DeliveryTruck01Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { categoryLabel, categoryTranslator } from '@/lib/inventory-i18n'

// Inventory item definitions with internal metadata for move estimation
type InventoryItemDef = {
  id: string
  name: string
  category: string
  meta: {
    widthCm: number
    heightCm: number
    depthCm: number
    weightKg: number
  }
  /** Classification points from the DB (moveClassificationWeight). Falls back to DEFAULT_CLASSIFICATION_POINTS. */
  classificationPoints?: number
  /** Minimum move type from the DB (moveTypeMinimum). Falls back to category-based guess. */
  moveTypeMinimum?: string
}



const InstantMoveInventoryPage = () => {
  const router = useRouter()
  // Item names arrive already localized from /api/inventory/catalog; category
  // labels are resolved here by slug (master plan D7).
  const { t, i18n } = useTranslation('inventory')
  const locale = i18n.language
  const catLabel = useMemo(() => {
    const translate = categoryTranslator(t)
    return (slug: string) => categoryLabel(slug, translate)
  }, [t])

  const [activeCategory, setActiveCategory] = useState('living_room')
  const [isModalOpen, setIsModalOpen] = useState(false)
  // The catalog is owned by the admin platform and is the only source: there is
  // deliberately no bundled copy, because a silent fallback made admin edits look
  // like they never took effect.
  const [inventoryItems, setInventoryItems] = useState<InventoryItemDef[]>([])
  const [catalogState, setCatalogState] = useState<'loading' | 'ready' | 'empty' | 'error'>(
    'loading',
  )
  const [catalogAttempt, setCatalogAttempt] = useState(0)
  const [customItemForm, setCustomItemForm] = useState({
    name: '',
    quantity: 1,
    approxSize: '',
    approxWeight: '',
  })

  const {
    pickupLocation,
    dropoffLocation,
    pickupCoordinates,
    dropoffCoordinates,
    setPickupLocation,
    setDropoffLocation,
    setPickupCoordinates,
    setDropoffCoordinates,
    moveType,
    inventory,
    customItems,
    setInventoryItem,
    setMoveType,
    addCustomItem,
    removeCustomItem,
  } = useMoveSearch()

  const [showUpgradeModal, setShowUpgradeModal] = useState(false)

  // ─── Map & location picker state ──────────────────────────
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null)
  const [locationPickerOpen, setLocationPickerOpen] = useState(false)
  const [editingLocationType, setEditingLocationType] = useState<'pickup' | 'dropoff'>('pickup')

  const handleEditLocation = useCallback((type: 'pickup' | 'dropoff') => {
    setEditingLocationType(type)
    setLocationPickerOpen(true)
  }, [])

  const handleLocationPicked = useCallback((location: PickedLocation) => {
    if (editingLocationType === 'pickup') {
      setPickupLocation(location.fullAddress)
      setPickupCoordinates(location.coordinates)
    } else {
      setDropoffLocation(location.fullAddress)
      setDropoffCoordinates(location.coordinates)
    }
    setLocationPickerOpen(false)
  }, [editingLocationType, setPickupLocation, setDropoffLocation, setPickupCoordinates, setDropoffCoordinates])

  const handleRouteCalculated = useCallback((info: RouteInfo) => {
    setRouteInfo(info)
  }, [])

  // ─── Fetch inventory catalog from database ───────────────
  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        const res = await fetch('/api/inventory/catalog')
        if (res.ok) {
          const data = await res.json()
          if (data.items && data.items.length > 0) {
            setInventoryItems(data.items)
            setCatalogState('ready')
            return
          }
          console.warn(
            '[inventory] catalog is empty. Add items in the admin panel — there is ' +
              'no bundled list to fall back on.',
          )
          setInventoryItems([])
          setCatalogState('empty')
          return
        }
        console.warn(`[inventory] catalog fetch failed (${res.status})`)
        setCatalogState('error')
      } catch (err) {
        console.error('[inventory] catalog fetch threw', err)
        setCatalogState('error')
      }
    }
    fetchCatalog()
    // `locale` is a dependency because the route localizes `name` server-side
    // from the request's cookie — a language switch needs a refetch, and that
    // refetch is what re-labels the whole wizard.
  }, [catalogAttempt, locale])

  // Prefetch the next step
  useEffect(() => {
    router.prefetch('/instant-move')
  }, [router])

  // ─── Derive categories from the (possibly fetched) items ─
  const categories = useMemo(() => {
    const seen = new Set<string>()
    const cats: { id: string; name: string }[] = []
    for (const item of inventoryItems) {
      if (item.category !== 'special' && !seen.has(item.category)) {
        seen.add(item.category)
        // Translated BY SLUG through `inventory:category.<slug>`, never by
        // matching label text. An admin-invented slug has no key and falls
        // back to a title-cased slug, which stays English — the admin console
        // warns about exactly that (master plan D7).
        cats.push({ id: item.category, name: catLabel(item.category) })
      }
    }
    return cats
  }, [inventoryItems, catLabel])

  // ─── Build classification catalog from inventory items ───
  // If items come from the DB they already have classificationPoints & moveTypeMinimum.
  // For fallback items we also embed them now, but keep DEFAULT_CLASSIFICATION_POINTS as last resort.
  const itemCatalog: ClassifyItemDef[] = useMemo(() => {
    return inventoryItems.map((item) => ({
      id: item.id,
      name: item.name,
      category: item.category,
      meta: item.meta,
      classificationPoints: item.classificationPoints ?? DEFAULT_CLASSIFICATION_POINTS[item.id] ?? 3,
      moveTypeMinimum: (item.moveTypeMinimum ?? (item.category === 'special' ? 'premium' : 'light')) as 'light' | 'regular' | 'premium',
    }))
  }, [inventoryItems])

  // ─── Real-time move classification ───
  const classification = useMemo(() => {
    const customItemInputs: CustomItemInput[] = customItems.map((ci) => ({
      id: ci.id,
      name: ci.name,
      quantity: ci.quantity,
      estimatedWeightKg: ci.approxWeight ? parseFloat(ci.approxWeight) || 20 : 20,
    }))
    return classifyMove(
      inventory,
      customItemInputs,
      (moveType as 'light' | 'regular' | 'premium') || 'light',
      itemCatalog
    )
  }, [inventory, customItems, moveType, itemCatalog])

  // ─── Show upgrade modal when classification requires upgrade ───
  useEffect(() => {
    if (classification.requiresUpgrade && classification.upgradeTo) {
      setShowUpgradeModal(true)
    }
  }, [classification.requiresUpgrade, classification.upgradeTo])

  const handleAcceptUpgrade = () => {
    if (classification.upgradeTo) {
      setMoveType(classification.upgradeTo as MoveTypeKey)
    }
    setShowUpgradeModal(false)
  }

  const handleDismissUpgrade = () => {
    setShowUpgradeModal(false)
  }

  const handleAddCustomItem = () => {
    if (!customItemForm.name.trim()) return

    const newItem: CustomItem = {
      id: `custom_${Date.now()}`,
      name: customItemForm.name,
      quantity: customItemForm.quantity,
      approxSize: customItemForm.approxSize,
      approxWeight: customItemForm.approxWeight,
    }
    addCustomItem(newItem)
    setCustomItemForm({ name: '', quantity: 1, approxSize: '', approxWeight: '' })
    setIsModalOpen(false)
  }

  const handleFindMover = () => {
    // Go to photos page first, then mover selection
    router.push('/instant-move/photos')
  }

  const handleBack = () => {
    router.push('/move-choice')
  }

  // Count total items selected
  const totalItems = Object.values(inventory).reduce((sum, qty) => sum + qty, 0) + 
    customItems.reduce((sum, item) => sum + item.quantity, 0)

  const filteredItems = inventoryItems.filter((item) => item.category === activeCategory)
  const specialItems = inventoryItems.filter((item) => item.category === 'special')

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-900">
      <div className="mx-auto max-w-3xl px-4 pt-8 pb-32 sm:pt-12">
        {/* Logo */}
        <div className="mb-10 flex justify-center">
          <Logo className="w-28 sm:w-32" />
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white sm:text-3xl">
            {t('web:instant.inventory.title')}
          </h1>
          <p className="mt-2 text-neutral-500 dark:text-neutral-400">
            {t('web:instant.inventory.subtitle')}
          </p>
        </div>

        {/* Location Summary with Map */}
        {(pickupLocation || dropoffLocation) && (
          <div className="overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-700 mb-8">
            {/* Route map */}
            {pickupCoordinates && dropoffCoordinates && (
              <div className="relative h-44 sm:h-56">
                <MapboxMap
                  pickupCoordinates={pickupCoordinates}
                  dropoffCoordinates={dropoffCoordinates}
                  showRoute={true}
                  onRouteCalculated={handleRouteCalculated}
                  onPickupMarkerClick={() => handleEditLocation('pickup')}
                  onDropoffMarkerClick={() => handleEditLocation('dropoff')}
                  className="w-full h-full !rounded-none"
                />
              </div>
            )}
            <div className="bg-neutral-50 dark:bg-neutral-800 p-4">
              <div className="flex items-center gap-3">
                <div className="flex flex-col items-center">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <div className="w-0.5 h-6 bg-neutral-300 dark:bg-neutral-600" />
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                </div>
                <div className="flex-1 min-w-0 space-y-2">
                  <button
                    type="button"
                    onClick={() => handleEditLocation('pickup')}
                    className="block w-full text-left rounded-lg px-2 py-1 -mx-2 hover:bg-neutral-100 dark:hover:bg-neutral-700/60 transition"
                  >
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">{t('booking:route.from.label')}</p>
                    <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">
                      {pickupLocation || t('booking:pickup.tapToSelect.placeholder')}
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleEditLocation('dropoff')}
                    className="block w-full text-left rounded-lg px-2 py-1 -mx-2 hover:bg-neutral-100 dark:hover:bg-neutral-700/60 transition"
                  >
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">{t('booking:route.to.label')}</p>
                    <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">
                      {dropoffLocation || t('booking:dropoff.tapToSelect.placeholder')}
                    </p>
                  </button>
                </div>
                {routeInfo && (
                  <div className="shrink-0 text-right">
                    <p className="text-base font-semibold text-neutral-900 dark:text-white">
                      {routeInfo.distance >= 1000
                        ? `${(routeInfo.distance / 1000).toFixed(1)} km`
                        : `${Math.round(routeInfo.distance)} m`}
                    </p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      {routeInfo.duration >= 3600
                        ? `${Math.floor(routeInfo.duration / 3600)}h ${Math.ceil((routeInfo.duration % 3600) / 60)}min`
                        : `${Math.ceil(routeInfo.duration / 60)} min`}
                    </p>
                  </div>
                )}
              </div>
              {totalItems > 0 && (
                <div className="mt-3 pt-3 border-t border-neutral-200 dark:border-neutral-700 flex items-center gap-2">
                  <HugeiconsIcon
                    icon={DeliveryTruck01Icon}
                    size={18}
                    strokeWidth={1.5}
                    className="shrink-0 text-neutral-400 dark:text-neutral-500"
                  />
                  <span className="text-sm text-neutral-600 dark:text-neutral-300">
                    {t('booking:inventory.selectedCount', { count: totalItems })}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── Classification Bar ─── */}
        {totalItems > 0 && (
          <div className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-800 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                {t('booking:classification.title')}
              </span>
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                classification.recommendedType === 'premium'
                  ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                  : classification.recommendedType === 'regular'
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                  : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
              }`}>
                {/* i18n-keys: booking.moveType.light.label, booking.moveType.regular.label, booking.moveType.premium.label */}
                {t(`booking:moveType.${classification.recommendedType}.label`)}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-lg font-bold text-neutral-900 dark:text-white">{classification.totalItems}</p>
                <p className="text-xs text-neutral-500">{t('booking:inventory.itemsCount.label')}</p>
              </div>
              <div>
                <p className="text-lg font-bold text-neutral-900 dark:text-white">{classification.totalWeightKg.toFixed(0)} kg</p>
                <p className="text-xs text-neutral-500">{t('booking:classification.weight.label')}</p>
              </div>
              <div>
                <p className="text-lg font-bold text-neutral-900 dark:text-white">{classification.totalPoints}</p>
                <p className="text-xs text-neutral-500">{t('booking:classification.points.label')}</p>
              </div>
            </div>
            {/* Progress bar */}
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs text-neutral-500 mb-1">
                <span>{t('booking:moveType.light.short')}</span>
                <span>{t('booking:moveType.regular.short')}</span>
                <span>{t('booking:moveType.premium.short')}</span>
              </div>
              <div className="h-2 w-full rounded-full bg-neutral-100 dark:bg-neutral-700 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    classification.recommendedType === 'premium'
                      ? 'bg-purple-500'
                      : classification.recommendedType === 'regular'
                      ? 'bg-blue-500'
                      : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(100, (classification.totalPoints / 80) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* ─── Classification Warnings ─── */}
        {classification.warningKeys.length > 0 && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20 mb-4">
            <div className="flex items-start gap-3">
              <HugeiconsIcon
                icon={AlertCircleIcon}
                size={20}
                strokeWidth={1.5}
                className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5"
              />
              <div>
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-1">
                  {t('booking:classification.notice.title')}
                </p>
                <ul className="space-y-1">
                  {/* i18n-keys: booking:classification.nearLimit.light, booking:classification.nearLimit.regular, booking:classification.itemMinimum.premium, booking:classification.itemMinimum.regular */}
                  {classification.warningKeys.map((warning) => (
                    <li key={warning.key} className="text-sm text-amber-700 dark:text-amber-300">
                      • {t(warning.key, warning.params)}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {catalogState === 'loading' && (
          <div className="mb-4 h-24 animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-800" />
        )}

        {(catalogState === 'empty' || catalogState === 'error') && (
          <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-700/60 dark:bg-amber-900/20 dark:text-amber-200">
            <p className="font-medium">
              {catalogState === 'empty'
                ? t('booking:inventory.emptyCatalog.title')
                : t('booking:inventory.loadFailed.title')}
            </p>
            <p className="mt-1">
              {catalogState === 'empty'
                ? t('booking:inventory.emptyCatalog.subtitle')
                : t('common:error.checkConnection')}
            </p>
            <button
              type="button"
              onClick={() => setCatalogAttempt((n) => n + 1)}
              className="mt-2 rounded-md bg-amber-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-800 dark:bg-amber-200 dark:text-amber-950 dark:hover:bg-amber-100"
            >
              {t('common:action.tryAgain.cta')}
            </button>
          </div>
        )}

        {/* Category Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {categories.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => setActiveCategory(category.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                activeCategory === category.id
                  ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>

        {/* Items Grid */}
        <div className="space-y-4 mb-8">
          {filteredItems.map((item) => (
            <NcInputNumber
              key={item.id}
              inputName={`inventory_${item.id}`}
              inputId={item.id}
              label={item.name}
              defaultValue={inventory[item.id] || 0}
              min={0}
              max={99}
              onChange={(value) => setInventoryItem(item.id, value)}
            />
          ))}
        </div>

        <Divider className="my-8" />

        {/* Special Items Section */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">{t('booking:inventory.specialItems.title')}</h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6">
            {t('booking:inventory.specialItems.helper')}
          </p>
          <div className="space-y-4">
            {specialItems.map((item) => (
              <NcInputNumber
                key={item.id}
                inputName={`inventory_${item.id}`}
                inputId={item.id}
                label={item.name}
                defaultValue={inventory[item.id] || 0}
                min={0}
                max={10}
                onChange={(value) => setInventoryItem(item.id, value)}
              />
            ))}
          </div>
        </div>

        <Divider className="my-8" />

        {/* Custom Items Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">{t('booking:inventory.customItems.title')}</h2>
            <ButtonSecondary 
              type="button" 
              onClick={() => setIsModalOpen(true)}
              className="!px-4 !py-2"
            >
              <HugeiconsIcon icon={Add01Icon} size={18} strokeWidth={1.5} />
              <span>{t('booking:inventory.addCustom.cta')}</span>
            </ButtonSecondary>
          </div>

          {customItems.length > 0 ? (
            <div className="space-y-3">
              {customItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-800 rounded-2xl"
                >
                  <div>
                    <p className="font-medium text-neutral-900 dark:text-white">{item.name}</p>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      {t('booking:inventory.custom.qty.label', { count: item.quantity })}
                      {item.approxSize &&
                        ` ${t('booking:inventory.custom.size.label', { size: item.approxSize })}`}
                      {item.approxWeight &&
                        ` ${t('booking:inventory.custom.weight.label', { weight: item.approxWeight })}`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeCustomItem(item.id)}
                    className="p-2 text-neutral-500 hover:text-red-500 transition-colors"
                  >
                    <HugeiconsIcon icon={Cancel01Icon} size={20} strokeWidth={1.5} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              {t('booking:inventory.customItems.empty')}
            </p>
          )}
        </div>
      </div>

      {/* Fixed Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-700 p-4">
        <div className="mx-auto max-w-3xl flex items-center justify-between gap-4">
          <ButtonSecondary onClick={handleBack} className="flex items-center gap-2">
            <HugeiconsIcon icon={ArrowLeft02Icon} size={18} strokeWidth={1.5} />
            {t('common:action.back.cta')}
          </ButtonSecondary>
          <div className="flex items-center gap-4">
            {totalItems > 0 && (
              <span className="text-sm text-neutral-500 dark:text-neutral-400">
                {t('booking:inventory.selectedCount', { count: totalItems })}
              </span>
            )}
            <ButtonPrimary 
              onClick={handleFindMover}
              disabled={totalItems === 0}
              className="disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('web:instant.inventory.next.cta')}
            </ButtonPrimary>
          </div>
        </div>
      </div>

      {/* Add Custom Item Modal */}
      <Dialog open={isModalOpen} onClose={() => setIsModalOpen(false)} className="relative z-50">
        <DialogBackdrop className="fixed inset-0 bg-black/30" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-2xl p-6 shadow-xl">
            <DialogTitle className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
              {t('booking:inventory.customModal.title')}
            </DialogTitle>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-1">
                  {t('booking:inventory.custom.name.label')}
                </label>
                <Input
                  placeholder={t('booking:inventory.custom.name.placeholder')}
                  value={customItemForm.name}
                  onChange={(e) => setCustomItemForm({ ...customItemForm, name: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-1">
                  {t('common:field.quantity.label')}
                </label>
                <Input
                  type="number"
                  min={1}
                  value={customItemForm.quantity}
                  onChange={(e) =>
                    setCustomItemForm({ ...customItemForm, quantity: parseInt(e.target.value) || 1 })
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-1">
                  {t('booking:inventory.custom.sizeField.label')}
                </label>
                <Input
                  placeholder={t('booking:inventory.custom.sizeField.placeholder')}
                  value={customItemForm.approxSize}
                  onChange={(e) => setCustomItemForm({ ...customItemForm, approxSize: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-1">
                  {t('booking:inventory.custom.weightField.label')}
                </label>
                <Input
                  placeholder={t('booking:inventory.custom.weightField.placeholder')}
                  value={customItemForm.approxWeight}
                  onChange={(e) => setCustomItemForm({ ...customItemForm, approxWeight: e.target.value })}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <ButtonSecondary type="button" onClick={() => setIsModalOpen(false)}>
                {t('common:action.cancel.cta')}
              </ButtonSecondary>
              <button
                type="button"
                onClick={handleAddCustomItem}
                disabled={!customItemForm.name.trim()}
                className="px-4 py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-full font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors"
              >
                {t('booking:inventory.addItem.cta')}
              </button>
            </div>
          </DialogPanel>
        </div>
      </Dialog>

      {/* ─── Move Type Upgrade Modal ─── */}
      <Dialog open={showUpgradeModal} onClose={handleDismissUpgrade} className="relative z-50">
        <DialogBackdrop className="fixed inset-0 bg-black/30" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel className="w-full max-w-sm bg-white dark:bg-neutral-900 rounded-2xl p-6 shadow-xl">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900/30">
                <HugeiconsIcon
                  icon={ArrowUp01Icon}
                  size={28}
                  strokeWidth={1.5}
                  className="text-primary-600 dark:text-primary-400"
                />
              </div>
              <DialogTitle className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
                {t('booking:classification.upgrade.title')}
              </DialogTitle>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">
                {/* i18n-keys: booking.moveType.light.label, booking.moveType.regular.label, booking.moveType.premium.label */}
                <Trans
                  i18nKey="booking:classification.upgrade.subtitle"
                  values={{
                    from: classification.upgradeFrom
                      ? t(`booking:moveType.${classification.upgradeFrom}.label`)
                      : '',
                    to: classification.upgradeTo
                      ? t(`booking:moveType.${classification.upgradeTo}.label`)
                      : '',
                  }}
                  components={[
                    <span key="from" className="font-semibold" />,
                    <span key="to" className="font-semibold" />,
                  ]}
                />
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-500 mb-6">
                {t('booking:classification.summary.label', {
                  items: t('moves:itemCount', { count: classification.totalItems }),
                  weight: classification.totalWeightKg.toFixed(0),
                  points: t('booking:classification.pointCount', {
                    count: classification.totalPoints,
                  }),
                })}
              </p>
            </div>

            <div className="flex gap-3">
              <ButtonSecondary
                type="button"
                onClick={handleDismissUpgrade}
                className="flex-1"
              >
                {t('booking:classification.keepCurrent.cta')}
              </ButtonSecondary>
              <ButtonPrimary
                type="button"
                onClick={handleAcceptUpgrade}
                className="flex-1"
              >
                {t('booking:classification.upgrade.cta', {
                  tier: classification.upgradeTo
                    ? t(`booking:moveType.${classification.upgradeTo}.label`)
                    : '',
                })}
              </ButtonPrimary>
            </div>
          </DialogPanel>
        </div>
      </Dialog>

      {/* Location Picker Overlay */}
      <MapLocationPicker
        open={locationPickerOpen}
        onClose={() => setLocationPickerOpen(false)}
        onSelect={handleLocationPicked}
        initialCoordinates={
          editingLocationType === 'pickup' ? pickupCoordinates : dropoffCoordinates
        }
        label={
          editingLocationType === 'pickup'
            ? t('booking:pickup.edit.a11y')
            : t('booking:dropoff.edit.a11y')
        }
      />
    </div>
  )
}

export default InstantMoveInventoryPage
