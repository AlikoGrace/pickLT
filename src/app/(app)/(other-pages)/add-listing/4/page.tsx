'use client'

import NcInputNumber from '@/components/NcInputNumber'
import { useMoveSearch, type CustomItem, type MoveTypeKey } from '@/context/moveSearch'
import { classifyMove, DEFAULT_CLASSIFICATION_POINTS, type InventoryItemDef as ClassifyItemDef, type CustomItemInput } from '@/lib/classifyMove'
import ButtonSecondary from '@/shared/ButtonSecondary'
import { Divider } from '@/shared/divider'
import Input from '@/shared/Input'
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react'
import { PlusIcon, XMarkIcon } from '@heroicons/react/24/outline'
import Form from 'next/form'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

// Inventory item definitions with internal metadata for move estimation
type InventoryItemDef = {
  id: string
  name: string
  category: string
  sizeVariant?: string
  meta: {
    widthCm: number
    heightCm: number
    depthCm: number
    weightKg: number
  }
  classificationPoints?: number
  moveTypeMinimum?: string
}



const Page = () => {
  const router = useRouter()
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

  const { moveType, inventory, customItems, setInventoryItem, setMoveType, addCustomItem, removeCustomItem } = useMoveSearch()
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)

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
  }, [catalogAttempt])

  // Prefetch the next step to improve performance
  useEffect(() => {
    router.prefetch('/add-listing/5')
  }, [router])

  // ─── Derive categories from the (possibly fetched) items ─
  const categories = useMemo(() => {
    const seen = new Set<string>()
    const cats: { id: string; name: string }[] = []
    for (const item of inventoryItems) {
      if (item.category !== 'special' && !seen.has(item.category)) {
        seen.add(item.category)
        const name = item.category
          .split('_')
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ')
        cats.push({ id: item.category, name })
      }
    }
    return cats
  }, [inventoryItems])

  // ─── Build classification catalog from inventory items ───
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

  const [inventoryError, setInventoryError] = useState<string | null>(null)

  const handleSubmitForm = async () => {
    const totalItems =
      Object.values(inventory).reduce((a, n) => a + (n || 0), 0) +
      customItems.reduce((a, c) => a + (c.quantity || 0), 0)
    if (totalItems === 0) {
      setInventoryError('Please add at least one item to your inventory before continuing.')
      return
    }
    setInventoryError(null)
    router.push('/add-listing/5')
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

  const totalItems = Object.values(inventory).reduce((sum, qty) => sum + qty, 0) +
    customItems.reduce((sum, item) => sum + item.quantity, 0)

  const filteredItems = inventoryItems.filter((item) => item.category === activeCategory)
  const specialItems = inventoryItems.filter((item) => item.category === 'special')

  return (
    <>
      <h1 className="text-2xl font-semibold">Inventory</h1>
      <p className="mt-2 text-neutral-500 dark:text-neutral-400">
        Select the items you need to move. This helps us estimate the right truck size and crew.
      </p>
      <Divider className="w-14!" />

      {/* ─── Classification Bar ─── */}
      {totalItems > 0 && (
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Move classification
            </span>
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              classification.recommendedType === 'premium'
                ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                : classification.recommendedType === 'regular'
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
            }`}>
              {classification.recommendedType === 'premium' ? 'Premium' : classification.recommendedType === 'regular' ? 'Regular' : 'Light'} Move
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-lg font-bold text-neutral-900 dark:text-white">{classification.totalItems}</p>
              <p className="text-xs text-neutral-500">Items</p>
            </div>
            <div>
              <p className="text-lg font-bold text-neutral-900 dark:text-white">{classification.totalWeightKg.toFixed(0)} kg</p>
              <p className="text-xs text-neutral-500">Est. weight</p>
            </div>
            <div>
              <p className="text-lg font-bold text-neutral-900 dark:text-white">{classification.totalPoints}</p>
              <p className="text-xs text-neutral-500">Points</p>
            </div>
          </div>
          {/* Progress bar */}
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-neutral-500 mb-1">
              <span>Light</span>
              <span>Regular</span>
              <span>Premium</span>
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
      {classification.warnings.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
          <div className="flex items-start gap-3">
            <div className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">⚠️</div>
            <div>
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-1">
                Move classification notice
              </p>
              <ul className="space-y-1">
                {classification.warnings.map((warning, i) => (
                  <li key={i} className="text-sm text-amber-700 dark:text-amber-300">
                    • {warning}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* FORM */}
      <Form id="add-listing-form" action={handleSubmitForm} className="flex flex-col gap-y-8">
        {inventoryError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
            {inventoryError}
          </div>
        )}
        {catalogState === 'loading' && (
          <div className="mb-4 h-24 animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-800" />
        )}

        {(catalogState === 'empty' || catalogState === 'error') && (
          <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-700/60 dark:bg-amber-900/20 dark:text-amber-200">
            <p className="font-medium">
              {catalogState === 'empty'
                ? 'No items available yet'
                : "Couldn't load the item list"}
            </p>
            <p className="mt-1">
              {catalogState === 'empty'
                ? 'Our movable-items list is being set up. Please try again shortly.'
                : 'Check your connection and try again.'}
            </p>
            <button
              type="button"
              onClick={() => setCatalogAttempt((n) => n + 1)}
              className="mt-2 rounded-md bg-amber-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-800 dark:bg-amber-200 dark:text-amber-950 dark:hover:bg-amber-100"
            >
              Try again
            </button>
          </div>
        )}

        {/* Category Tabs */}
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => setActiveCategory(category.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                activeCategory === category.id
                  ? 'bg-primary-600 text-white'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>

        {/* Items Grid */}
        <div className="space-y-4">
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

        <Divider />

        {/* Special Items Section */}
        <div>
          <h2 className="text-lg font-semibold mb-2">Special Items</h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6">
            These items require special handling and may affect pricing.
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

        <Divider />

        {/* Custom Items Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Custom Items</h2>
            <ButtonSecondary type="button" onClick={() => setIsModalOpen(true)}>
              <PlusIcon className="w-5 h-5" />
              <span>Add custom item</span>
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
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      Qty: {item.quantity}
                      {item.approxSize && ` • Size: ${item.approxSize}`}
                      {item.approxWeight && ` • Weight: ${item.approxWeight}`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeCustomItem(item.id)}
                    className="p-2 text-neutral-500 hover:text-red-500 transition-colors"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              No custom items added yet. Click the button above to add items not listed.
            </p>
          )}
        </div>

        {/* Hidden fields for inventory data */}
        <input type="hidden" name="inventoryData" value={JSON.stringify(inventory)} />
        <input type="hidden" name="customItemsData" value={JSON.stringify(customItems)} />
      </Form>

      {/* Add Custom Item Modal */}
      <Dialog open={isModalOpen} onClose={() => setIsModalOpen(false)} className="relative z-50">
        <DialogBackdrop className="fixed inset-0 bg-black/30" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-2xl p-6 shadow-xl">
            <DialogTitle className="text-lg font-semibold mb-4">Add Custom Item</DialogTitle>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Item name *</label>
                <Input
                  placeholder="e.g., Grandfather clock"
                  value={customItemForm.name}
                  onChange={(e) => setCustomItemForm({ ...customItemForm, name: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Quantity</label>
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
                <label className="block text-sm font-medium mb-1">Approximate size</label>
                <Input
                  placeholder="e.g., 100x50x200 cm"
                  value={customItemForm.approxSize}
                  onChange={(e) => setCustomItemForm({ ...customItemForm, approxSize: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Approximate weight</label>
                <Input
                  placeholder="e.g., 50 kg"
                  value={customItemForm.approxWeight}
                  onChange={(e) => setCustomItemForm({ ...customItemForm, approxWeight: e.target.value })}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <ButtonSecondary type="button" onClick={() => setIsModalOpen(false)}>
                Cancel
              </ButtonSecondary>
              <button
                type="button"
                onClick={handleAddCustomItem}
                disabled={!customItemForm.name.trim()}
                className="px-4 py-2 bg-primary-600 text-white rounded-full font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary-700 transition-colors"
              >
                Add Item
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
              <DialogTitle className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
                Move type upgrade recommended
              </DialogTitle>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">
                Based on your selected items, we recommend upgrading from{' '}
                <span className="font-semibold">{classification.upgradeFrom}</span> to{' '}
                <span className="font-semibold">{classification.upgradeTo}</span>.
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-500 mb-6">
                {classification.totalItems} items · ~{classification.totalWeightKg.toFixed(0)} kg · {classification.totalPoints} points
              </p>
            </div>

            <div className="flex gap-3">
              <ButtonSecondary
                type="button"
                onClick={handleDismissUpgrade}
                className="flex-1"
              >
                Keep current
              </ButtonSecondary>
              <button
                type="button"
                onClick={handleAcceptUpgrade}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-full font-medium hover:bg-primary-700 transition-colors"
              >
                Upgrade to {classification.upgradeTo}
              </button>
            </div>
          </DialogPanel>
        </div>
      </Dialog>
    </>
  )
}

export default Page
