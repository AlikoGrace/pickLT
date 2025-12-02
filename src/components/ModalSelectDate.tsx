'use client'

import { Button } from '@/shared/Button'
import ButtonClose from '@/shared/ButtonClose'
import ButtonPrimary from '@/shared/ButtonPrimary'
import T from '@/utils/getT'
import { CloseButton, Dialog, DialogPanel } from '@headlessui/react'
import React, { FC, useState } from 'react'
import DatePicker from 'react-datepicker'
import DatePickerCustomDay from './DatePickerCustomDay'
import DatePickerCustomHeaderTwoMonth from './DatePickerCustomHeaderTwoMonth'

interface Props {
  triggerButton?: (p: { openModal: () => void }) => React.ReactNode
  onChange?: (dates: [Date | null, Date | null]) => void
}

const ModalSelectDate: FC<Props> = ({ triggerButton, onChange }) => {
  const [showModal, setShowModal] = useState(false)

  const [startDate, setStartDate] = useState<Date | null>(new Date('2025/02/02'))
  const [endDate, setEndDate] = useState<Date | null>(new Date('2025/02/06'))

  const onChangeDate = (dates: [Date | null, Date | null]) => {
    const [start, end] = dates
    setStartDate(start)
    setEndDate(end)
  }

  function closeModal() {
    setShowModal(false)
  }
  function openModal() {
    setShowModal(true)
  }

  const renderButtonOpenModal = () => {
    return triggerButton ? (
      triggerButton({ openModal })
    ) : (
      <button onClick={openModal}>{T['common']['Select Date']}</button>
    )
  }

  return (
    <>
      {renderButtonOpenModal()}
      <Dialog className="relative z-50" onClose={closeModal} open={showModal}>
        <div className="fixed inset-0 bg-neutral-300 dark:bg-neutral-900">
          <DialogPanel
            transition
            className="relative flex size-full flex-col transition data-closed:translate-y-40 data-closed:opacity-0"
          >
            <div className="absolute start-4 top-4">
              <CloseButton color="light" as={ButtonClose}></CloseButton>
            </div>

            <div className="flex flex-1 overflow-hidden bg-white p-1 pt-16 dark:bg-neutral-800">
              <div className="flex flex-1 flex-col overflow-auto">
                <div className="p-5 text-xl font-semibold sm:text-2xl">{`When's your trip?`}</div>
                <div className="relative z-10 flex flex-1 px-2 py-5 sm:p-5">
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
            </div>

            <div className="mt-auto flex justify-between border-t border-neutral-200 bg-white px-4 py-3 dark:border-neutral-700 dark:bg-neutral-900">
              <Button
                type="button"
                className="shrink-0 font-semibold underline"
                plain
                onClick={() => {
                  onChangeDate([null, null])
                }}
              >
                {T['common']['Clear dates']}
              </Button>
              <ButtonPrimary
                onClick={() => {
                  onChange?.([startDate, endDate])
                  closeModal()
                }}
              >
                {T['common']['Save']}
              </ButtonPrimary>
            </div>
          </DialogPanel>
        </div>
      </Dialog>
    </>
  )
}

export default ModalSelectDate
