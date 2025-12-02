'use client'

import DatePickerCustomDay from '@/components/DatePickerCustomDay'
import DatePickerCustomHeaderTwoMonth from '@/components/DatePickerCustomHeaderTwoMonth'
import T from '@/utils/getT'
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react'
import { CalendarIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'
import { FC, useState } from 'react'
import DatePicker from 'react-datepicker'
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
    base: 'absolute top-full z-10 mt-3 w-3xl transition duration-150 data-closed:translate-y-1 data-closed:opacity-0 start-1/2 -translate-x-1/2 overflow-hidden rounded-3xl bg-white p-8 shadow-lg ring-1 ring-black/5 dark:bg-neutral-800',
    default: '',
    small: '',
  },
}

interface Props {
  className?: string
  fieldStyle: 'default' | 'small'
  clearDataButtonClassName?: string
  description?: string
  panelClassName?: string
  isOnlySingleDate?: boolean
}

export const DateRangeField: FC<Props> = ({
  className = 'flex-1',
  fieldStyle = 'default',
  clearDataButtonClassName,
  description = `${T['HeroSearchForm']['CheckIn']} - ${T['HeroSearchForm']['CheckOut']}`,
  panelClassName,
  isOnlySingleDate = false,
}) => {
  const [startDate, setStartDate] = useState<Date | null>(new Date('2025/09/08'))
  const [endDate, setEndDate] = useState<Date | null>(new Date('2025/09/19'))

  return (
    <>
      <Popover className={`group relative z-10 flex ${className}`}>
        {({ open: showPopover }) => (
          <>
            <PopoverButton
              className={clsx(styles.button.base, styles.button[fieldStyle], showPopover && styles.button.focused)}
            >
              {fieldStyle === 'default' && (
                <CalendarIcon className="size-5 text-neutral-300 lg:size-7 dark:text-neutral-400" />
              )}

              <div className="flex-1 text-start">
                <span className={clsx('block font-semibold', styles.mainText[fieldStyle])}>
                  {startDate?.toLocaleDateString('en-US', {
                    month: 'short',
                    day: '2-digit',
                  }) || T['HeroSearchForm']['Add dates']}
                  {endDate && !isOnlySingleDate
                    ? ' - ' +
                      endDate?.toLocaleDateString('en-US', {
                        month: 'short',
                        day: '2-digit',
                      })
                    : ''}
                </span>
                <span className="mt-1 block text-sm leading-none font-light text-neutral-400">
                  {description || T['HeroSearchForm']['Add dates']}
                </span>
              </div>
            </PopoverButton>

            <ClearDataButton
              className={clsx(!startDate && !endDate && 'sr-only', clearDataButtonClassName)}
              onClick={() => {
                setStartDate(null)
                setEndDate(null)
              }}
            />

            <PopoverPanel
              unmount={false}
              transition
              className={clsx(panelClassName, styles.panel.base, styles.panel[fieldStyle])}
            >
              {isOnlySingleDate ? (
                <DatePicker
                  selected={startDate}
                  onChange={(date) => {
                    setStartDate(date)
                    // set end-date = start-date + 2 day
                    setEndDate(new Date((date?.getTime() || 0) + 2 * 24 * 60 * 60 * 1000))
                  }}
                  startDate={startDate}
                  monthsShown={2}
                  showPopperArrow={false}
                  inline
                  renderCustomHeader={(p) => <DatePickerCustomHeaderTwoMonth {...p} />}
                  renderDayContents={(day, date) => <DatePickerCustomDay dayOfMonth={day} date={date} />}
                />
              ) : (
                <DatePicker
                  selected={startDate}
                  onChange={(dates) => {
                    const [start, end] = dates
                    setStartDate(start)
                    setEndDate(end)
                  }}
                  startDate={startDate}
                  endDate={endDate}
                  selectsRange
                  monthsShown={2}
                  showPopperArrow={false}
                  inline
                  renderCustomHeader={(p) => <DatePickerCustomHeaderTwoMonth {...p} />}
                  renderDayContents={(day, date) => <DatePickerCustomDay dayOfMonth={day} date={date} />}
                />
              )}
            </PopoverPanel>
          </>
        )}
      </Popover>

      {/* input:hidde */}
      <input type="hidden" name="checkin" value={startDate ? startDate.toISOString().split('T')[0] : ''} />
      {!isOnlySingleDate && (
        <input type="hidden" name="checkout" value={endDate ? endDate.toISOString().split('T')[0] : ''} />
      )}
    </>
  )
}
