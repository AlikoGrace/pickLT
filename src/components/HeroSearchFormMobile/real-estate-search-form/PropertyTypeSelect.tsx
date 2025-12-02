'use client'

import { Checkbox, CheckboxField, CheckboxGroup } from '@/shared/Checkbox'
import { Description, Label } from '@/shared/fieldset'
import { PropertyType } from '@/type'
import { FC, useState } from 'react'

const defaultPropertyTypes: PropertyType[] = [
  {
    name: 'Duplex House',
    value: 'duplex_house',
    description: 'Have a place to yourself',
  },
  {
    name: 'Ferme House',
    value: 'ferme_house',
    description: 'Have your own room and share some common spaces',
  },
  {
    name: 'Chalet House',
    value: 'chalet_house',
    description: 'Have a private or shared room in a boutique hotel, hostel.',
  },
  {
    name: 'Maison House',
    value: 'maison_house',
    description: 'Stay in a shared space, like a common room',
  },
]

interface Props {
  onChange?: (data: string[]) => void
  propertyTypes?: PropertyType[]
}

const PropertyTypeSelect: FC<Props> = ({ onChange, propertyTypes = defaultPropertyTypes }) => {
  const [selectedTypes, setSelectedTypes] = useState<string[]>([propertyTypes[0].name])

  return (
    <>
      <h3 className="block text-xl font-semibold sm:text-2xl">Property types</h3>
      <CheckboxGroup className="mt-7">
        {propertyTypes.map((item) => (
          <CheckboxField key={item.value}>
            <Checkbox
              name="property_type"
              value={item.value}
              checked={selectedTypes.includes(item.name)}
              onChange={(e) => {
                const newState = e ? [...selectedTypes, item.name] : selectedTypes.filter((type) => type !== item.name)
                setSelectedTypes(newState)
                if (onChange) {
                  onChange(newState)
                }
              }}
            />
            <Label>{item.name}</Label>
            <Description>{item.description}</Description>
          </CheckboxField>
        ))}
      </CheckboxGroup>
    </>
  )
}

export default PropertyTypeSelect
