'use client'

import DatePickerCustomDay from '@/components/DatePickerCustomDay'
import DatePickerCustomHeaderTwoMonth from '@/components/DatePickerCustomHeaderTwoMonth'
import T from '@/utils/getT'
import clsx from 'clsx'
import { FC, useState } from 'react'
import DatePicker from 'react-datepicker'

interface Props {
  className?: string
  onChange?: (value: [Date | null, Date | null]) => void
  defaultStartDate?: Date | null
  defaultEndDate?: Date | null
}

const StayDatesRangeInput: FC<Props> = ({ className, defaultEndDate, defaultStartDate, onChange }) => {
  const [startDate, setStartDate] = useState<Date | null>(defaultStartDate || new Date('2025/02/06'))
  const [endDate, setEndDate] = useState<Date | null>(defaultEndDate || new Date('2025/02/23'))

  const onChangeDate = (dates: [Date | null, Date | null]) => {
    const [start, end] = dates
    setStartDate(start)
    setEndDate(end)
    if (onChange) {
      onChange([start, end])
    }
  }

  return (
    <>
      <div className={clsx(className)}>
        <h3 className="block text-center text-xl font-semibold sm:text-2xl">
          {T['HeroSearchForm']["When's your trip?"]}
        </h3>
        <div className="relative z-10 flex shrink-0 justify-center py-5">
          <DatePicker
            selected={startDate}
            onChange={onChangeDate}
            startDate={startDate}
            endDate={endDate}
            selectsRange
            monthsShown={2}
            showPopperArrow={false}
            inline
            renderCustomHeader={(p) => <DatePickerCustomHeaderTwoMonth {...p} />}
            renderDayContents={(day, date) => <DatePickerCustomDay dayOfMonth={day} date={date} />}
          />
        </div>
      </div>

      {/* input:hidde */}
      <input type="hidden" name="checkin" value={startDate ? startDate.toISOString().split('T')[0] : ''} />
      <input type="hidden" name="checkout" value={endDate ? endDate.toISOString().split('T')[0] : ''} />
    </>
  )
}

export default StayDatesRangeInput
