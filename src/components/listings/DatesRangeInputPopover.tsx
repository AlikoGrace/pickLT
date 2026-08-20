'use client'

import DatePickerCustomDay from '@/components/DatePickerCustomDay'
import DatePickerCustomHeaderTwoMonth from '@/components/DatePickerCustomHeaderTwoMonth'
import T from '@/utils/getT'
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react'
import { CalendarIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { FC, useState } from 'react'
import DatePicker from 'react-datepicker'
import { formatDateWith } from '@/lib/format'

interface Props {
  className?: string
  isSingleDate?: boolean
  label?: string
  description?: string
  inputName?: string
}

const DatesRangeInputPopover: FC<Props> = ({
  className = 'flex-1',
  isSingleDate = false,
  label,
  description,
  inputName = 'moveDate',
}) => {
  const [startDate, setStartDate] = useState<Date | null>(null)
  const [endDate, setEndDate] = useState<Date | null>(null)

  const onChangeDate = (dates: [Date | null, Date | null] | Date | null) => {
    if (isSingleDate) {
      setStartDate(dates as Date | null)
      setEndDate(null)
    } else {
      const [start, end] = dates as [Date | null, Date | null]
      setStartDate(start)
      setEndDate(end)
    }
  }

  const renderInput = () => {
    return (
      <>
        <div className="text-neutral-300 dark:text-neutral-400">
          <CalendarIcon className="h-5 w-5 lg:h-7 lg:w-7" />
        </div>
        <div className="grow text-start">
          <span className="block font-semibold xl:text-lg">
            {formatDateWith(startDate, { month: 'short', day: '2-digit', fallback: '' }) || label || 'Add date'}
            {endDate && !isSingleDate
              ? ' - ' +
                formatDateWith(endDate, { month: 'short', day: '2-digit', fallback: '' })
              : ''}
          </span>
          <span className="mt-1 block text-sm leading-none font-light text-neutral-400">
            {description || (isSingleDate ? 'Select date' : `${T['HeroSearchForm']['CheckIn']} - ${T['HeroSearchForm']['CheckOut']}`)}
          </span>
        </div>
      </>
    )
  }

  return (
    <>
      <Popover className={`group relative z-10 flex ${className}`}>
        {({ open }) => (
          <>
            <PopoverButton className="relative flex flex-1 cursor-pointer items-center gap-x-3 p-3 group-data-open:shadow-lg focus:outline-hidden">
              {renderInput()}
              {startDate && open && (
                <span
                  className={
                    'absolute end-1 top-1/2 z-10 flex h-5 w-5 -translate-y-1/2 transform items-center justify-center rounded-full bg-neutral-100 text-sm lg:end-3 lg:h-6 lg:w-6 dark:bg-neutral-800'
                  }
                >
                  <XMarkIcon className="size-4" />
                </span>
              )}
            </PopoverButton>

            <PopoverPanel
              transition
              className="absolute start-auto -end-2 top-full z-10 mt-3 w-[calc(100%+1rem)] transition duration-150 data-closed:translate-y-1 data-closed:opacity-0 lg:w-3xl xl:-end-10"
            >
              <div className="overflow-hidden rounded-3xl bg-white py-5 shadow-lg ring-1 ring-black/5 sm:p-8 dark:bg-neutral-800">
                {isSingleDate ? (
                  <DatePicker
                    selected={startDate}
                    onChange={(date) => onChangeDate(date)}
                    monthsShown={2}
                    showPopperArrow={false}
                    inline
                    minDate={new Date()}
                    renderCustomHeader={(p) => <DatePickerCustomHeaderTwoMonth {...p} />}
                    renderDayContents={(day, date) => <DatePickerCustomDay dayOfMonth={day} date={date} />}
                  />
                ) : (
                  <DatePicker
                    selected={startDate}
                    onChange={(dates) => onChangeDate(dates as [Date | null, Date | null])}
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
              </div>
            </PopoverPanel>
          </>
        )}
      </Popover>

      {/* inputs */}
      <input type="hidden" name={inputName} value={startDate ? startDate.toISOString().split('T')[0] : ''} />
      {!isSingleDate && (
        <input type="hidden" name="endDate" value={endDate ? endDate.toISOString().split('T')[0] : ''} />
      )}
    </>
  )
}

export default DatesRangeInputPopover
