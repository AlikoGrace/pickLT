'use client'

import DatePickerCustomDay from '@/components/DatePickerCustomDay'
import DatePickerCustomHeaderTwoMonth from '@/components/DatePickerCustomHeaderTwoMonth'
import { Divider } from '@/shared/divider'
import { useState } from 'react'
import DatePicker from 'react-datepicker'
import { SectionHeading, SectionSubheading } from './SectionHeading'

const SectionDateRange = () => {
  const [startDate, setStartDate] = useState<Date | null>(new Date('2025/02/02'))
  const [endDate, setEndDate] = useState<Date | null>(new Date('2025/02/06'))
  const onChangeDate = (dates: [Date | null, Date | null]) => {
    const [start, end] = dates
    setStartDate(start)
    setEndDate(end)
  }

  return (
    <div className="listingSection__wrap">
      <div>
        <SectionHeading>Availability</SectionHeading>
        <SectionSubheading> Prices may increase on weekends or holidays</SectionSubheading>
      </div>
      <Divider className="w-14!" />

      <DatePicker
        selected={startDate}
        onChange={onChangeDate}
        startDate={startDate}
        endDate={endDate}
        selectsRange
        monthsShown={2}
        showPopperArrow={false}
        inline
        renderCustomHeader={(props) => <DatePickerCustomHeaderTwoMonth {...props} />}
        renderDayContents={(day, date) => <DatePickerCustomDay dayOfMonth={day} date={date} />}
      />

      {/* inputs */}
      <input type="hidden" name="startDate" value={startDate ? startDate.toISOString() : ''} />
      <input type="hidden" name="endDate" value={endDate ? endDate.toISOString() : ''} />
    </div>
  )
}

export default SectionDateRange
