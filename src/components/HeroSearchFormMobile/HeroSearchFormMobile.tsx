'use client'

import { ButtonCircle } from '@/shared/Button'
import ButtonPrimary from '@/shared/ButtonPrimary'
import ButtonThird from '@/shared/ButtonThird'
import { ListingType } from '@/type'
import T from '@/utils/getT'
import { CloseButton, Dialog, DialogPanel, Tab, TabGroup, TabList, TabPanel, TabPanels } from '@headlessui/react'
import { XMarkIcon } from '@heroicons/react/24/solid'
import {
  Airplane02Icon,
  Car05Icon,
  FilterVerticalIcon,
  HotAirBalloonFreeIcons,
  House03Icon,
  RealEstate02Icon,
  Search01Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon, IconSvgElement } from '@hugeicons/react'
import clsx from 'clsx'
import { useState } from 'react'
import { useTimeoutFn } from 'react-use'
import CarSearchFormMobile from './car-search-form/CarSearchFormMobile'
import ExperienceSearchFormMobile from './experience-search-form/ExperienceSearchFormMobile'
import FlightSearchFormMobile from './flight-search-form/FlightSearchFormMobile'
import RealestateSearchFormMobile from './real-estate-search-form/RealestateSearchFormMobile'
import StaySearchFormMobile from './stay-search-form/StaySearchFormMobile'

const formTabs: { name: ListingType; icon: IconSvgElement; formComponent: React.ComponentType<{}> }[] = [
  { name: 'Stays', icon: House03Icon, formComponent: StaySearchFormMobile },
  { name: 'Cars', icon: Car05Icon, formComponent: CarSearchFormMobile },
  { name: 'Experiences', icon: HotAirBalloonFreeIcons, formComponent: ExperienceSearchFormMobile },
  { name: 'RealEstates', icon: RealEstate02Icon, formComponent: RealestateSearchFormMobile },
  { name: 'Flights', icon: Airplane02Icon, formComponent: FlightSearchFormMobile },
]

const HeroSearchFormMobile = ({ className }: { className?: string }) => {
  const [showModal, setShowModal] = useState(false)

  // FOR RESET ALL DATA WHEN CLICK CLEAR BUTTON
  const [showDialog, setShowDialog] = useState(false)
  let [, , resetIsShowingDialog] = useTimeoutFn(() => setShowDialog(true), 1)
  //
  function closeModal() {
    setShowModal(false)
  }

  function openModal() {
    setShowModal(true)
  }

  const renderButtonOpenModal = () => {
    return (
      <button
        onClick={openModal}
        className="relative flex w-full items-center rounded-full border border-neutral-200 px-4 py-2 pe-11 shadow-lg dark:border-neutral-600"
      >
        <HugeiconsIcon icon={Search01Icon} size={20} color="currentColor" strokeWidth={1.5} />

        <div className="ms-3 flex-1 overflow-hidden text-start">
          <span className="block text-sm font-medium">{T['HeroSearchForm']['Where to?']}</span>
          <span className="mt-0.5 block text-xs font-light text-neutral-500 dark:text-neutral-400">
            <span className="line-clamp-1">{T['HeroSearchForm']['Anywhere • Any week • Add guests']}</span>
          </span>
        </div>

        <span className="absolute end-2 top-1/2 flex h-9 w-9 -translate-y-1/2 transform items-center justify-center rounded-full border border-neutral-200 dark:border-neutral-600 dark:text-neutral-300">
          <HugeiconsIcon icon={FilterVerticalIcon} size={20} color="currentColor" strokeWidth={1.5} />
        </span>
      </button>
    )
  }

  return (
    <div className={clsx(className, 'relative z-10 w-full max-w-lg')}>
      {renderButtonOpenModal()}
      <Dialog as="div" className="relative z-max" onClose={closeModal} open={showModal}>
        <div className="fixed inset-0 bg-neutral-100 dark:bg-neutral-900">
          <div className="flex h-full">
            <DialogPanel
              transition
              className="relative flex-1 transition data-closed:translate-y-28 data-closed:opacity-0"
            >
              {showDialog && (
                <TabGroup manual className="relative flex h-full flex-1 flex-col justify-between">
                  <div className="absolute end-3 top-2 z-10">
                    <CloseButton color="light" as={ButtonCircle} className="size-7!">
                      <XMarkIcon className="size-4!" />
                    </CloseButton>
                  </div>

                  <TabList className="flex justify-center gap-x-8 sm:gap-x-14">
                    {formTabs.map((tab) => {
                      return (
                        <Tab
                          key={tab.name}
                          className={clsx(
                            'group relative -mx-3 flex shrink-0 cursor-pointer items-center justify-center px-3 pt-10 pb-5 text-neutral-400 data-selected:text-neutral-950 dark:data-selected:text-neutral-100'
                          )}
                        >
                          <div className="relative">
                            <span className="sr-only">{tab.name}</span>
                            <HugeiconsIcon icon={tab.icon} size={26} />
                            <span className="absolute top-full mt-1 hidden h-0.5 w-full bg-neutral-800 group-data-selected:block dark:bg-neutral-100" />
                          </div>
                        </Tab>
                      )
                    })}
                  </TabList>

                  <TabPanels className="flex flex-1 overflow-hidden px-1.5 sm:px-4">
                    <div className="hidden-scrollbar flex-1 overflow-y-auto pt-2 pb-4">
                      {formTabs.map((tab) => (
                        <TabPanel
                          key={tab.name}
                          as="div"
                          className="animate-[myblur_0.4s_ease-in-out] transition-opacity"
                        >
                          <tab.formComponent />
                        </TabPanel>
                      ))}
                    </div>
                  </TabPanels>
                  <div className="flex justify-between border-t border-neutral-200 bg-white px-4 py-3 dark:border-neutral-700 dark:bg-neutral-900">
                    <ButtonThird
                      onClick={() => {
                        setShowDialog(false)
                        resetIsShowingDialog()
                      }}
                    >
                      {T['HeroSearchForm']['Clear all']}
                    </ButtonThird>
                    <ButtonPrimary type="submit" form="form-hero-search-form-mobile" onClick={closeModal}>
                      <HugeiconsIcon icon={Search01Icon} size={16} />
                      <span>{T['HeroSearchForm']['search']}</span>
                    </ButtonPrimary>
                  </div>
                </TabGroup>
              )}
            </DialogPanel>
          </div>
        </div>
      </Dialog>
    </div>
  )
}

export default HeroSearchFormMobile
