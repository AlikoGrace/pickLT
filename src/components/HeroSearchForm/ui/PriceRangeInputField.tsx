'use client'

import { PriceRangeSlider } from '@/components/PriceRangeSlider'
import convertNumbThousand from '@/utils/convertNumbThousand'
import T from '@/utils/getT'
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react'
import { CurrencyDollarIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'
import { FC, useState } from 'react'
import { ClearDataButton } from './ClearDataButton'

const styles = {
  button: {
    base: 'relative z-10 shrink-0 w-full cursor-pointer flex items-center gap-x-3 focus:outline-hidden text-start',
    focused: 'rounded-full bg-transparent focus-visible:outline-hidden dark:bg-white/5 custom-shadow-1',
    default: 'px-7 py-4 xl:px-8 xl:py-6',
    small: 'py-3 px-7 xl:px-8',
  },
  mainText: {
    default: 'text-base xl:text-lg',
    small: 'text-base',
  },
  panel: {
    base: 'absolute top-full z-10 mt-3 w-96 transition duration-150 data-closed:translate-y-1 data-closed:opacity-0 end-0 overflow-hidden rounded-3xl bg-white p-7 shadow-lg ring-1 ring-black/5 dark:bg-neutral-800',
    default: '',
    small: '',
  },
}

interface Props {
  className?: string
  fieldStyle: 'default' | 'small'
  panelClassName?: string
  clearDataButtonClassName?: string
  min?: number
  max?: number
}

export const PriceRangeInputField: FC<Props> = ({
  className = 'flex-1',
  fieldStyle = 'default',
  panelClassName,
  clearDataButtonClassName,
  min = 0,
  max = 1000000,
}) => {
  const [rangePrices, setRangePrices] = useState([90000, 800000])

  return (
    <>
      <Popover className={`group relative z-10 flex ${className}`}>
        {({ open: showPopover }) => (
          <>
            <PopoverButton
              className={clsx(styles.button.base, styles.button[fieldStyle], showPopover && styles.button.focused)}
            >
              {fieldStyle === 'default' && (
                <CurrencyDollarIcon className="size-5 text-neutral-300 lg:size-7 dark:text-neutral-400" />
              )}

              <div className="flex-1 text-start">
                <span className={clsx('block font-semibold', styles.mainText[fieldStyle])}>
                  {`$${convertNumbThousand(rangePrices[0] / 1000)}k ~ $${convertNumbThousand(rangePrices[1] / 1000)}k`}
                </span>
                <span className="mt-1 block text-sm leading-none font-light text-neutral-400">
                  {T['HeroSearchForm']['Choose price range']}
                </span>
              </div>
            </PopoverButton>

            <ClearDataButton
              className={clsx(rangePrices[0] === min && rangePrices[1] === max && 'sr-only', clearDataButtonClassName)}
              onClick={() => setRangePrices([min, max])}
            />

            <PopoverPanel transition className={clsx(panelClassName, styles.panel.base, styles.panel[fieldStyle])}>
              <PriceRangeSlider
                name={T['HeroSearchForm']['Price range']}
                min={min}
                max={max}
                defaultValue={rangePrices}
                onChange={(value) => {
                  setRangePrices(value)
                }}
              />
            </PopoverPanel>
          </>
        )}
      </Popover>

      <input type="hidden" name="price_min" value={rangePrices[0]} />
      <input type="hidden" name="price_max" value={rangePrices[1]} />
    </>
  )
}
