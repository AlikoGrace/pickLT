'use client'

import { PriceRangeSlider } from '@/components/PriceRangeSlider'
import { FC } from 'react'

interface Props {
  onChange?: (e: number[]) => void
  defaultValue?: number[]
}

const PriceRangeInput: FC<Props> = ({ onChange, defaultValue }) => {
  return (
    <>
      <h3 className="block text-xl font-semibold sm:text-2xl">Range Price?</h3>
      <PriceRangeSlider
        min={0}
        max={1000000}
        defaultValue={defaultValue}
        onChange={onChange}
        showTitle={false}
        className="mt-7"
      />
    </>
  )
}

export default PriceRangeInput
