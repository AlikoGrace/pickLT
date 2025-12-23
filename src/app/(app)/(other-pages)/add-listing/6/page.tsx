'use client'

import { useMoveSearch, type CrewSize, type VehicleType, type TruckAccess, type HeavyItem } from '@/context/moveSearch'
import ButtonSecondary from '@/shared/ButtonSecondary'
import { Checkbox, CheckboxField, CheckboxGroup } from '@/shared/Checkbox'
import { Divider } from '@/shared/divider'
import { Fieldset, Label, Legend } from '@/shared/fieldset'
import Input from '@/shared/Input'
import { Radio, RadioField, RadioGroup } from '@/shared/radio'
import { ChevronDownIcon, ChevronUpIcon, PlusIcon, XMarkIcon } from '@heroicons/react/24/solid'
import Form from 'next/form'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

const Page = () => {
  const router = useRouter()
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [showAddCustom, setShowAddCustom] = useState(false)
  const [customItemForm, setCustomItemForm] = useState({
    name: '',
    lengthCm: '',
    widthCm: '',
    heightCm: '',
    weightKg: '',
  })

  const {
    crewSize,
    vehicleType,
    truckAccess,
    heavyItems,
    customHeavyItems,
    setCrewSize,
    setVehicleType,
    setTruckAccess,
    toggleHeavyItem,
    updateHeavyItemDimensions,
    addCustomHeavyItem,
    removeCustomHeavyItem,
  } = useMoveSearch()

  // Prefetch the next step to improve performance
  useEffect(() => {
    router.prefetch('/add-listing/7')
  }, [router])

  const handleSubmitForm = async (formData: FormData) => {
    const formObject = Object.fromEntries(formData.entries())
    console.log('Form submitted:', formObject)

    // Redirect to the next step
    router.push('/add-listing/8')
  }

  const toggleExpanded = (itemId: string) => {
    setExpandedItems((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(itemId)) {
        newSet.delete(itemId)
      } else {
        newSet.add(itemId)
      }
      return newSet
    })
  }

  const handleAddCustomHeavyItem = () => {
    if (!customItemForm.name.trim()) return
    const newItem: HeavyItem = {
      id: `custom_heavy_${Date.now()}`,
      name: customItemForm.name.trim(),
      selected: true,
      lengthCm: customItemForm.lengthCm ? parseInt(customItemForm.lengthCm) : undefined,
      widthCm: customItemForm.widthCm ? parseInt(customItemForm.widthCm) : undefined,
      heightCm: customItemForm.heightCm ? parseInt(customItemForm.heightCm) : undefined,
      weightKg: customItemForm.weightKg ? parseInt(customItemForm.weightKg) : undefined,
    }
    addCustomHeavyItem(newItem)
    setCustomItemForm({ name: '', lengthCm: '', widthCm: '', heightCm: '', weightKg: '' })
    setShowAddCustom(false)
  }

  const renderDimensionsInput = (item: HeavyItem, isCustom: boolean = false) => {
    const isExpanded = expandedItems.has(item.id)
    
    return (
      <div className="mt-2">
        <button
          type="button"
          onClick={() => toggleExpanded(item.id)}
          className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700"
        >
          {isExpanded ? (
            <>
              <ChevronUpIcon className="h-4 w-4" />
              <span>Hide dimensions</span>
            </>
          ) : (
            <>
              <ChevronDownIcon className="h-4 w-4" />
              <span>Add dimensions (optional)</span>
            </>
          )}
        </button>
        
        {isExpanded && (
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <label className="block text-xs text-neutral-500 mb-1">Length (cm)</label>
              <Input
                type="number"
                min={0}
                placeholder="0"
                value={item.lengthCm || ''}
                onChange={(e) => {
                  const value = e.target.value ? parseInt(e.target.value) : undefined
                  if (isCustom) {
                    // For custom items, we'd need a different update mechanism
                  } else {
                    updateHeavyItemDimensions(item.id, { lengthCm: value })
                  }
                }}
                sizeClass="h-9 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-xs text-neutral-500 mb-1">Width (cm)</label>
              <Input
                type="number"
                min={0}
                placeholder="0"
                value={item.widthCm || ''}
                onChange={(e) => {
                  const value = e.target.value ? parseInt(e.target.value) : undefined
                  if (!isCustom) {
                    updateHeavyItemDimensions(item.id, { widthCm: value })
                  }
                }}
                sizeClass="h-9 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-xs text-neutral-500 mb-1">Height (cm)</label>
              <Input
                type="number"
                min={0}
                placeholder="0"
                value={item.heightCm || ''}
                onChange={(e) => {
                  const value = e.target.value ? parseInt(e.target.value) : undefined
                  if (!isCustom) {
                    updateHeavyItemDimensions(item.id, { heightCm: value })
                  }
                }}
                sizeClass="h-9 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-xs text-neutral-500 mb-1">Weight (kg)</label>
              <Input
                type="number"
                min={0}
                placeholder="0"
                value={item.weightKg || ''}
                onChange={(e) => {
                  const value = e.target.value ? parseInt(e.target.value) : undefined
                  if (!isCustom) {
                    updateHeavyItemDimensions(item.id, { weightKg: value })
                  }
                }}
                sizeClass="h-9 px-3 py-2"
              />
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      <div>
        <h2 className="text-2xl font-semibold">Crew & vehicle</h2>
        <span className="mt-2 block text-neutral-500 dark:text-neutral-400">
          Choose the movers and truck size appropriate for your inventory.
        </span>
      </div>

      <Divider />

      <Form id="add-listing-form" action={handleSubmitForm} className="flex flex-col gap-y-8">
        {/* Crew Size */}
        <Fieldset>
          <Legend className="text-lg!">Crew size</Legend>
          <RadioGroup
            name="crewSize"
            value={crewSize || ''}
            onChange={(value: string) => setCrewSize(value as CrewSize)}
          >
            <RadioField>
              <Radio value="1" />
              <Label>1 mover (small load, help required)</Label>
            </RadioField>
            <RadioField>
              <Radio value="2" />
              <Label>2 movers (standard apartment move)</Label>
            </RadioField>
            <RadioField>
              <Radio value="3" />
              <Label>3 movers (large apartment / small house)</Label>
            </RadioField>
            <RadioField>
              <Radio value="4plus" />
              <Label>4+ movers (big homes or heavy items)</Label>
            </RadioField>
          </RadioGroup>
        </Fieldset>

        <Divider />

        {/* Vehicle Selection */}
        <Fieldset>
          <Legend className="text-lg!">Vehicle selection</Legend>
          <RadioGroup
            name="vehicleType"
            value={vehicleType || ''}
            onChange={(value: string) => setVehicleType(value as VehicleType)}
          >
            <RadioField>
              <Radio value="small_van" />
              <Label>Small van</Label>
            </RadioField>
            <RadioField>
              <Radio value="medium_truck" />
              <Label>Medium truck (3.5t — EU standard)</Label>
            </RadioField>
            <RadioField>
              <Radio value="large_truck" />
              <Label>Large truck (7.5t)</Label>
            </RadioField>
            <RadioField>
              <Radio value="multiple" />
              <Label>Multiple vehicles</Label>
            </RadioField>
          </RadioGroup>
        </Fieldset>

        <Divider />

        {/* Truck Access */}
        <Fieldset>
          <Legend className="text-lg!">Truck access</Legend>
          <RadioGroup
            name="truckAccess"
            value={truckAccess || ''}
            onChange={(value: string) => setTruckAccess(value as TruckAccess)}
          >
            <RadioField>
              <Radio value="full_access" />
              <Label>Truck can access the street</Label>
            </RadioField>
            <RadioField>
              <Radio value="small_only" />
              <Label>Only small vehicles allowed</Label>
            </RadioField>
            <RadioField>
              <Radio value="not_sure" />
              <Label>Not sure</Label>
            </RadioField>
          </RadioGroup>
        </Fieldset>

        <Divider />

        {/* Heavy / Special Items */}
        <div>
          <p className="text-lg font-semibold">Heavy / Special items</p>
          <span className="mt-1 block text-sm text-neutral-500 dark:text-neutral-400">
            Select items that require special handling. Add dimensions if known.
          </span>
          
          <Fieldset className="mt-4">
            <CheckboxGroup className="space-y-4">
              {heavyItems.map((item) => (
                <div key={item.id} className="border-b border-neutral-100 dark:border-neutral-800 pb-4 last:border-0">
                  <CheckboxField>
                    <Checkbox
                      name={`heavyItem_${item.id}`}
                      checked={item.selected}
                      onChange={() => toggleHeavyItem(item.id)}
                    />
                    <Label>{item.name}</Label>
                  </CheckboxField>
                  {item.selected && renderDimensionsInput(item)}
                </div>
              ))}
            </CheckboxGroup>
          </Fieldset>

          {/* Custom Heavy Items */}
          {customHeavyItems.length > 0 && (
            <div className="mt-4 space-y-4">
              <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Custom items</p>
              {customHeavyItems.map((item) => (
                <div
                  key={item.id}
                  className="p-4 bg-neutral-50 dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{item.name}</span>
                    <button
                      type="button"
                      onClick={() => removeCustomHeavyItem(item.id)}
                      className="p-1 text-neutral-500 hover:text-red-500 transition-colors"
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  </div>
                  {(item.lengthCm || item.widthCm || item.heightCm || item.weightKg) && (
                    <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
                      {item.lengthCm && `L: ${item.lengthCm}cm`}
                      {item.widthCm && ` W: ${item.widthCm}cm`}
                      {item.heightCm && ` H: ${item.heightCm}cm`}
                      {item.weightKg && ` Weight: ${item.weightKg}kg`}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Add Custom Item */}
          {!showAddCustom ? (
            <div className="mt-4">
              <ButtonSecondary type="button" onClick={() => setShowAddCustom(true)}>
                <PlusIcon className="h-5 w-5" />
                <span>Add custom item</span>
              </ButtonSecondary>
            </div>
          ) : (
            <div className="mt-4 p-4 bg-neutral-50 dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700">
              <p className="text-sm font-medium mb-3">Add custom heavy item</p>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-neutral-500 mb-1">Item name *</label>
                  <Input
                    placeholder="e.g., Grand piano"
                    value={customItemForm.name}
                    onChange={(e) => setCustomItemForm({ ...customItemForm, name: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div>
                    <label className="block text-xs text-neutral-500 mb-1">Length (cm)</label>
                    <Input
                      type="number"
                      min={0}
                      placeholder="0"
                      value={customItemForm.lengthCm}
                      onChange={(e) => setCustomItemForm({ ...customItemForm, lengthCm: e.target.value })}
                      sizeClass="h-9 px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-neutral-500 mb-1">Width (cm)</label>
                    <Input
                      type="number"
                      min={0}
                      placeholder="0"
                      value={customItemForm.widthCm}
                      onChange={(e) => setCustomItemForm({ ...customItemForm, widthCm: e.target.value })}
                      sizeClass="h-9 px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-neutral-500 mb-1">Height (cm)</label>
                    <Input
                      type="number"
                      min={0}
                      placeholder="0"
                      value={customItemForm.heightCm}
                      onChange={(e) => setCustomItemForm({ ...customItemForm, heightCm: e.target.value })}
                      sizeClass="h-9 px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-neutral-500 mb-1">Weight (kg)</label>
                    <Input
                      type="number"
                      min={0}
                      placeholder="0"
                      value={customItemForm.weightKg}
                      onChange={(e) => setCustomItemForm({ ...customItemForm, weightKg: e.target.value })}
                      sizeClass="h-9 px-3 py-2"
                    />
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <ButtonSecondary type="button" onClick={() => setShowAddCustom(false)}>
                    Cancel
                  </ButtonSecondary>
                  <button
                    type="button"
                    onClick={handleAddCustomHeavyItem}
                    disabled={!customItemForm.name.trim()}
                    className="px-4 py-2 bg-primary-600 text-white rounded-full font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary-700 transition-colors"
                  >
                    Add item
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Hidden fields for form data */}
        <input type="hidden" name="crewSizeValue" value={crewSize || ''} />
        <input type="hidden" name="vehicleTypeValue" value={vehicleType || ''} />
        <input type="hidden" name="truckAccessValue" value={truckAccess || ''} />
        <input type="hidden" name="heavyItemsData" value={JSON.stringify(heavyItems.filter(i => i.selected))} />
        <input type="hidden" name="customHeavyItemsData" value={JSON.stringify(customHeavyItems)} />
      </Form>
    </>
  )
}

export default Page
