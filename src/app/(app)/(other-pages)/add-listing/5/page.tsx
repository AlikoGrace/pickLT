'use client'

import NcInputNumber from '@/components/NcInputNumber'
import { useMoveSearch, type PackingServiceLevel, type PackingMaterial, type CustomMaterial } from '@/context/moveSearch'
import ButtonSecondary from '@/shared/ButtonSecondary'
import { Divider } from '@/shared/divider'
import { Fieldset, Label, Legend } from '@/shared/fieldset'
import Input from '@/shared/Input'
import { Radio, RadioField, RadioGroup } from '@/shared/radio'
import Textarea from '@/shared/Textarea'
import { PlusIcon, XMarkIcon } from '@heroicons/react/24/solid'
import Form from 'next/form'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

const PACKING_MATERIALS: { id: PackingMaterial; label: string }[] = [
  { id: 'moving_boxes', label: 'Moving boxes' },
  { id: 'wardrobe_boxes', label: 'Wardrobe boxes' },
  { id: 'bubble_wrap', label: 'Bubble wrap' },
  { id: 'packing_paper', label: 'Packing paper' },
  { id: 'packing_tape', label: 'Packing tape' },
  { id: 'mattress_covers', label: 'Mattress covers' },
  { id: 'tv_protection', label: 'TV protection box' },
  { id: 'dish_inserts', label: 'Dish/glass protection inserts' },
  { id: 'furniture_blankets', label: 'Furniture blankets' },
]

const BOX_TYPES = [
  { id: 'small_boxes', label: 'Small boxes' },
  { id: 'medium_boxes', label: 'Medium boxes' },
  { id: 'large_boxes', label: 'Large boxes' },
  { id: 'wardrobe_boxes', label: 'Wardrobe boxes' },
  { id: 'bubble_wrap_rolls', label: 'Bubble wrap rolls' },
  { id: 'tape_rolls', label: 'Tape rolls' },
]

const Page = () => {
  const router = useRouter()
  const [customMaterialInput, setCustomMaterialInput] = useState('')

  const {
    packingServiceLevel,
    packingMaterials,
    customMaterials,
    packingBoxQuantities,
    packingNotes,
    setPackingServiceLevel,
    togglePackingMaterial,
    addCustomMaterial,
    removeCustomMaterial,
    setPackingBoxQuantity,
    setPackingNotes,
  } = useMoveSearch()

  // Prefetch the next step to improve performance
  useEffect(() => {
    router.prefetch('/add-listing/6')
  }, [router])

  // Handle form submission
  const handleSubmitForm = async (formData: FormData) => {
    const formObject = Object.fromEntries(formData.entries())
    console.log('Form submitted:', formObject)

    // Redirect to the next step
    router.push('/add-listing/6')
  }

  const handleAddCustomMaterial = () => {
    if (!customMaterialInput.trim()) return
    const newMaterial: CustomMaterial = {
      id: `custom_${Date.now()}`,
      name: customMaterialInput.trim(),
    }
    addCustomMaterial(newMaterial)
    setCustomMaterialInput('')
  }

  return (
    <>
      <div>
        <h2 className="text-2xl font-semibold">Packing services</h2>
        <span className="mt-2 block text-neutral-500 dark:text-neutral-400">
          Choose the packing help you need. Movers bring materials only if requested.
        </span>
      </div>

      <Divider />

      <Form id="add-listing-form" action={handleSubmitForm} className="flex flex-col gap-y-8">
        {/* Packing Service Level */}
        <Fieldset>
          <Legend className="text-lg!">Packing service level</Legend>
          <RadioGroup
            name="packingServiceLevel"
            value={packingServiceLevel || ''}
            onChange={(value: string) => setPackingServiceLevel(value as PackingServiceLevel)}
          >
            <RadioField>
              <Radio value="none" />
              <Label>No packing needed</Label>
            </RadioField>
            <RadioField>
              <Radio value="partial" />
              <Label>Pack some items</Label>
            </RadioField>
            <RadioField>
              <Radio value="full" />
              <Label>Full packing service</Label>
            </RadioField>
            <RadioField>
              <Radio value="unpacking" />
              <Label>Unpacking service</Label>
            </RadioField>
          </RadioGroup>
        </Fieldset>

        <Divider />

        {/* Packing Materials */}
        <div>
          <p className="text-lg font-semibold">Packing materials</p>
          <span className="mt-1 block text-sm text-neutral-500 dark:text-neutral-400">
            Select the materials you need. We&apos;ll bring them on moving day.
          </span>
          <div className="mt-4 flex flex-wrap gap-2">
            {PACKING_MATERIALS.map((material) => (
              <button
                key={material.id}
                type="button"
                onClick={() => togglePackingMaterial(material.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border ${
                  packingMaterials.includes(material.id)
                    ? 'bg-primary-600 text-white border-primary-600'
                    : 'bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-300 dark:border-neutral-600 hover:border-neutral-400 dark:hover:border-neutral-500'
                }`}
              >
                {material.label}
              </button>
            ))}
            {customMaterials.map((material) => (
              <div
                key={material.id}
                className="flex items-center gap-1 px-4 py-2 rounded-full text-sm font-medium bg-primary-600 text-white border border-primary-600"
              >
                <span>{material.name}</span>
                <button
                  type="button"
                  onClick={() => removeCustomMaterial(material.id)}
                  className="ml-1 hover:text-primary-200"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Add custom material */}
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Input
              placeholder="Add custom material..."
              value={customMaterialInput}
              onChange={(e) => setCustomMaterialInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleAddCustomMaterial()
                }
              }}
              className="flex-1"
            />
            <ButtonSecondary type="button" onClick={handleAddCustomMaterial}>
              <PlusIcon className="h-5 w-5" />
              <span>Add material</span>
            </ButtonSecondary>
          </div>
        </div>

        <Divider />

        {/* Inventory sizes for packing */}
        <div>
          <p className="text-lg font-semibold">Box quantities</p>
          <span className="mt-1 block text-sm text-neutral-500 dark:text-neutral-400">
            Estimate how many boxes and materials you&apos;ll need.
          </span>
          <div className="mt-4 space-y-4">
            {BOX_TYPES.map((boxType) => (
              <NcInputNumber
                key={boxType.id}
                inputName={`box_${boxType.id}`}
                inputId={boxType.id}
                label={boxType.label}
                defaultValue={packingBoxQuantities[boxType.id] || 0}
                min={0}
                max={100}
                onChange={(value) => setPackingBoxQuantity(boxType.id, value)}
              />
            ))}
          </div>
        </div>

        <Divider />

        {/* Notes for packers */}
        <div>
          <p className="text-lg font-semibold">Notes for packers (optional)</p>
          <span className="mt-1 block text-sm text-neutral-500 dark:text-neutral-400">
            Any special instructions for the packing team.
          </span>
          <div className="mt-4">
            <Textarea
              name="packingNotes"
              placeholder="e.g., Fragile china in kitchen cabinet, artwork needs special wrapping..."
              value={packingNotes}
              onChange={(e) => setPackingNotes(e.target.value)}
              rows={4}
            />
          </div>
        </div>

        {/* Hidden fields for form data */}
        <input type="hidden" name="packingServiceLevel" value={packingServiceLevel || ''} />
        <input type="hidden" name="packingMaterials" value={JSON.stringify(packingMaterials)} />
        <input type="hidden" name="customMaterials" value={JSON.stringify(customMaterials)} />
        <input type="hidden" name="packingBoxQuantities" value={JSON.stringify(packingBoxQuantities)} />
      </Form>
    </>
  )
}

export default Page
