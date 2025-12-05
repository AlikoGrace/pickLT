'use client'

import NcInputNumber from '@/components/NcInputNumber'
import { useMoveSearch, type CustomItem } from '@/context/moveSearch'
import ButtonSecondary from '@/shared/ButtonSecondary'
import { Divider } from '@/shared/divider'
import Input from '@/shared/Input'
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react'
import { PlusIcon, XMarkIcon } from '@heroicons/react/24/outline'
import Form from 'next/form'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

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
}

const INVENTORY_ITEMS: InventoryItemDef[] = [
  // Living Room
  { id: 'sofa_2seater', name: 'Sofa (2-seater)', category: 'living_room', meta: { widthCm: 160, heightCm: 85, depthCm: 90, weightKg: 45 } },
  { id: 'sofa_3seater', name: 'Sofa (3-seater)', category: 'living_room', meta: { widthCm: 220, heightCm: 85, depthCm: 90, weightKg: 65 } },
  { id: 'coffee_table', name: 'Coffee table', category: 'living_room', meta: { widthCm: 120, heightCm: 45, depthCm: 60, weightKg: 20 } },
  { id: 'tv', name: 'TV', category: 'living_room', meta: { widthCm: 120, heightCm: 70, depthCm: 10, weightKg: 15 } },
  { id: 'tv_stand', name: 'TV stand', category: 'living_room', meta: { widthCm: 150, heightCm: 50, depthCm: 45, weightKg: 30 } },
  { id: 'bookshelf_living', name: 'Bookshelf', category: 'living_room', meta: { widthCm: 80, heightCm: 180, depthCm: 30, weightKg: 40 } },
  { id: 'armchair', name: 'Armchair', category: 'living_room', meta: { widthCm: 80, heightCm: 90, depthCm: 85, weightKg: 25 } },

  // Bedroom
  { id: 'bed_90', name: 'Bed (90 cm)', category: 'bedroom', meta: { widthCm: 90, heightCm: 50, depthCm: 200, weightKg: 35 } },
  { id: 'bed_140', name: 'Bed (140 cm)', category: 'bedroom', meta: { widthCm: 140, heightCm: 50, depthCm: 200, weightKg: 50 } },
  { id: 'bed_160', name: 'Bed (160 cm)', category: 'bedroom', meta: { widthCm: 160, heightCm: 50, depthCm: 200, weightKg: 60 } },
  { id: 'mattress', name: 'Mattress', category: 'bedroom', meta: { widthCm: 160, heightCm: 25, depthCm: 200, weightKg: 30 } },
  { id: 'wardrobe_small', name: 'Wardrobe (small)', category: 'bedroom', sizeVariant: 'small', meta: { widthCm: 100, heightCm: 200, depthCm: 60, weightKg: 60 } },
  { id: 'wardrobe_medium', name: 'Wardrobe (medium)', category: 'bedroom', sizeVariant: 'medium', meta: { widthCm: 150, heightCm: 200, depthCm: 60, weightKg: 80 } },
  { id: 'wardrobe_large', name: 'Wardrobe (large)', category: 'bedroom', sizeVariant: 'large', meta: { widthCm: 250, heightCm: 220, depthCm: 60, weightKg: 120 } },
  { id: 'nightstand', name: 'Nightstand', category: 'bedroom', meta: { widthCm: 50, heightCm: 55, depthCm: 40, weightKg: 15 } },

  // Kitchen
  { id: 'dining_table_small', name: 'Dining table (small)', category: 'kitchen', sizeVariant: 'small', meta: { widthCm: 120, heightCm: 75, depthCm: 80, weightKg: 30 } },
  { id: 'dining_table_large', name: 'Dining table (large)', category: 'kitchen', sizeVariant: 'large', meta: { widthCm: 200, heightCm: 75, depthCm: 100, weightKg: 50 } },
  { id: 'chairs', name: 'Chairs', category: 'kitchen', meta: { widthCm: 45, heightCm: 90, depthCm: 45, weightKg: 5 } },
  { id: 'fridge_small', name: 'Fridge (small)', category: 'kitchen', sizeVariant: 'small', meta: { widthCm: 55, heightCm: 85, depthCm: 60, weightKg: 35 } },
  { id: 'fridge_medium', name: 'Fridge (medium)', category: 'kitchen', sizeVariant: 'medium', meta: { widthCm: 60, heightCm: 145, depthCm: 65, weightKg: 55 } },
  { id: 'fridge_large', name: 'Fridge (large)', category: 'kitchen', sizeVariant: 'large', meta: { widthCm: 90, heightCm: 180, depthCm: 70, weightKg: 90 } },
  { id: 'dishwasher', name: 'Dishwasher', category: 'kitchen', meta: { widthCm: 60, heightCm: 85, depthCm: 60, weightKg: 45 } },
  { id: 'microwave', name: 'Microwave', category: 'kitchen', meta: { widthCm: 50, heightCm: 30, depthCm: 40, weightKg: 15 } },

  // Office
  { id: 'office_desk', name: 'Office desk', category: 'office', meta: { widthCm: 140, heightCm: 75, depthCm: 70, weightKg: 35 } },
  { id: 'office_chair', name: 'Office chair', category: 'office', meta: { widthCm: 65, heightCm: 120, depthCm: 65, weightKg: 15 } },
  { id: 'bookshelf_office', name: 'Bookshelf', category: 'office', meta: { widthCm: 80, heightCm: 180, depthCm: 30, weightKg: 40 } },
  { id: 'filing_cabinet', name: 'Filing cabinet', category: 'office', meta: { widthCm: 45, heightCm: 130, depthCm: 60, weightKg: 35 } },

  // Boxes
  { id: 'cardboard_boxes', name: 'Cardboard boxes', category: 'boxes', meta: { widthCm: 60, heightCm: 40, depthCm: 40, weightKg: 20 } },
  { id: 'suitcases', name: 'Suitcases', category: 'boxes', meta: { widthCm: 75, heightCm: 50, depthCm: 30, weightKg: 25 } },

  // Miscellaneous
  { id: 'bicycle', name: 'Bicycle', category: 'miscellaneous', meta: { widthCm: 180, heightCm: 100, depthCm: 60, weightKg: 15 } },
  { id: 'lamp', name: 'Lamp', category: 'miscellaneous', meta: { widthCm: 40, heightCm: 160, depthCm: 40, weightKg: 8 } },
  { id: 'mirror', name: 'Mirror', category: 'miscellaneous', meta: { widthCm: 80, heightCm: 180, depthCm: 5, weightKg: 20 } },
  { id: 'rug', name: 'Rug', category: 'miscellaneous', meta: { widthCm: 200, heightCm: 5, depthCm: 300, weightKg: 15 } },
  { id: 'plants', name: 'Plants', category: 'miscellaneous', meta: { widthCm: 40, heightCm: 100, depthCm: 40, weightKg: 10 } },

  // Special Items
  { id: 'piano', name: 'Piano', category: 'special', meta: { widthCm: 150, heightCm: 100, depthCm: 60, weightKg: 250 } },
  { id: 'safe', name: 'Safe', category: 'special', meta: { widthCm: 50, heightCm: 60, depthCm: 50, weightKg: 150 } },
  { id: 'treadmill', name: 'Treadmill', category: 'special', meta: { widthCm: 180, heightCm: 140, depthCm: 80, weightKg: 100 } },
  { id: 'aquarium', name: 'Aquarium', category: 'special', meta: { widthCm: 120, heightCm: 60, depthCm: 50, weightKg: 80 } },
  { id: 'glass_cabinet', name: 'Glass cabinet', category: 'special', meta: { widthCm: 100, heightCm: 180, depthCm: 40, weightKg: 60 } },
  { id: 'artwork_fragile', name: 'Artwork / Fragile items', category: 'special', meta: { widthCm: 100, heightCm: 150, depthCm: 10, weightKg: 15 } },
]

const CATEGORIES = [
  { id: 'living_room', name: 'Living Room' },
  { id: 'bedroom', name: 'Bedroom' },
  { id: 'kitchen', name: 'Kitchen' },
  { id: 'office', name: 'Office' },
  { id: 'boxes', name: 'Boxes' },
  { id: 'miscellaneous', name: 'Miscellaneous' },
]

const Page = () => {
  const router = useRouter()
  const [activeCategory, setActiveCategory] = useState('living_room')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [customItemForm, setCustomItemForm] = useState({
    name: '',
    quantity: 1,
    approxSize: '',
    approxWeight: '',
  })

  const { inventory, customItems, setInventoryItem, addCustomItem, removeCustomItem } = useMoveSearch()

  // Prefetch the next step to improve performance
  useEffect(() => {
    router.prefetch('/add-listing/5')
  }, [router])

  const handleSubmitForm = async (formData: FormData) => {
    const formObject = Object.fromEntries(formData.entries())
    console.log('Form submitted:', formObject)
    console.log('Inventory:', inventory)
    console.log('Custom Items:', customItems)

    // Redirect to the next step
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

  const filteredItems = INVENTORY_ITEMS.filter((item) => item.category === activeCategory)
  const specialItems = INVENTORY_ITEMS.filter((item) => item.category === 'special')

  return (
    <>
      <h1 className="text-2xl font-semibold">Inventory</h1>
      <p className="mt-2 text-neutral-500 dark:text-neutral-400">
        Select the items you need to move. This helps us estimate the right truck size and crew.
      </p>
      <Divider className="w-14!" />

      {/* FORM */}
      <Form id="add-listing-form" action={handleSubmitForm} className="flex flex-col gap-y-8">
        {/* Category Tabs */}
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((category) => (
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
          <h2 className="text-lg font-semibold mb-4">Special Items</h2>
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
    </>
  )
}

export default Page
