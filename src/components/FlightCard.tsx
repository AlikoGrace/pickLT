'use client'

import { TFlightListing } from '@/data/listings'
import { ButtonCircle } from '@/shared/Button'
import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/react'
import { ArrowRightIcon } from '@heroicons/react/24/outline'
import { ArrowUpRight01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import Image from 'next/image'
import { FC } from 'react'

interface FlightCardProps {
  className?: string
  data: TFlightListing
}

const FlightCard: FC<FlightCardProps> = ({ className = '', data }) => {
  const {
    departure,
    arrival,
    airlines,
    duration,
    href,
    id,
    layover,
    name,
    price,
    stopAirport,
    stopNumber,
    arrivalTime,
    departureTime,
  } = data

  const renderFlightItem = () => {
    return (
      <div>
        <div className="flex flex-col md:flex-row">
          <div className="w-24 shrink-0 md:w-20 md:pt-7 lg:w-24">
            <Image src={airlines.logo} className="w-10" alt="" sizes="40px" width={40} height={40} />
          </div>
          <div className="my-5 flex md:my-0">
            <div className="flex shrink-0 flex-col items-center py-2">
              <span className="block h-6 w-6 rounded-full border border-neutral-400"></span>
              <span className="my-1 block grow border-l border-dashed border-neutral-400"></span>
              <span className="block h-6 w-6 rounded-full border border-neutral-400"></span>
            </div>
            <div className="ms-4 space-y-10 text-sm">
              <div className="flex flex-col space-y-1">
                <span className="text-neutral-500 dark:text-neutral-400">Monday, August 12 · 10:00</span>
                <span className="font-semibold">Tokyo International Airport (HND)</span>
              </div>
              <div className="flex flex-col space-y-1">
                <span className="text-neutral-500 dark:text-neutral-400">Monday, August 16 · 10:00</span>
                <span className="font-semibold">Singapore International Airport (SIN)</span>
              </div>
            </div>
          </div>
          <div className="border-l border-neutral-200 md:mx-6 lg:mx-10 dark:border-neutral-700"></div>
          <ul className="space-y-1 text-sm text-neutral-500 md:space-y-2 dark:text-neutral-400">
            <li>Trip time: 7 hours 45 minutes</li>
            <li>ANA · Business class · Boeing 787 · NH 847</li>
          </ul>
        </div>
      </div>
    )
  }

  const departureTimeFormatted = new Date(departureTime).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })

  const arrivalTimeFormatted = new Date(arrivalTime).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <Disclosure
      as={'div'}
      className={`relative space-y-6 overflow-hidden rounded-2xl border border-neutral-100 bg-white p-4 transition-shadow hover:shadow-lg sm:p-6 dark:border-neutral-800 dark:bg-neutral-900 ${className}`}
    >
      <DisclosureButton as="div" tabIndex={0} className="relative sm:pe-20">
        <div className="absolute end-0 bottom-0 md:top-1/2 md:bottom-auto md:-translate-y-1/2">
          <ButtonCircle color="white" href={href} aria-label="View flight details">
            <HugeiconsIcon
              icon={ArrowUpRight01Icon}
              size={20}
              color="currentColor"
              className="rtl:rotate-270"
              strokeWidth={1.5}
            />
          </ButtonCircle>
        </div>

        <div className="flex flex-col gap-y-6 sm:gap-y-0 md:flex-row md:items-center">
          {/* LOGO IMG */}
          <div className="w-24 shrink-0 lg:w-32">
            <Image src={airlines.logo} width={40} height={40} className="w-10" alt={airlines.name} sizes="40px" />
          </div>

          {/* FOR MOBILE RESPONSIVE */}
          <div className="block space-y-1 lg:hidden">
            <div className="flex font-semibold">
              <div>
                <span>{departureTimeFormatted}</span>
                <span className="mt-0.5 flex items-center text-sm font-normal text-neutral-500">{departure}</span>
              </div>
              <span className="flex w-12 justify-center">
                <ArrowRightIcon className="mt-0.5 size-4" />
              </span>
              <div>
                <span>{arrivalTimeFormatted}</span>
                <span className="mt-0.5 flex items-center text-sm font-normal text-neutral-500">{arrival}</span>
              </div>
            </div>

            <div className="mt-0.5 text-sm font-normal text-neutral-500">
              <span className="VG3hNb">
                {!stopNumber ? 'Non-stop' : `${stopNumber} stop${stopNumber > 1 ? 's' : ''}`}
              </span>
              <span className="mx-2">·</span>
              <span>{duration}</span>
              <span className="mx-2">·</span>
              <span>{arrival}</span>
            </div>
          </div>

          {/* TIME - NAME */}
          <div className="hidden min-w-[150px] flex-4 lg:block">
            <div className="text-lg font-medium">
              {departureTimeFormatted} - {arrivalTimeFormatted}
            </div>
            <div className="mt-0.5 text-sm font-normal text-neutral-500">{airlines.name}</div>
          </div>

          {/* TIMME */}
          <div className="hidden flex-4 whitespace-nowrap lg:block">
            <div className="text-lg font-medium">{name}</div>
            <div className="mt-0.5 text-sm font-normal text-neutral-500">{duration}</div>
          </div>

          {/* stop */}
          <div className="hidden flex-4 whitespace-nowrap lg:block">
            <div className="text-lg font-medium">
              {!stopNumber ? 'Non-stop' : `${stopNumber} stop${stopNumber > 1 ? 's' : ''}`}
            </div>
            <div className="mt-0.5 text-sm font-normal text-neutral-500">
              {duration} · {arrival}
            </div>
          </div>

          {/* PRICE */}
          <div className="flex-4 whitespace-nowrap sm:text-right">
            <p className="text-lg font-semibold text-secondary-600">{price}</p>
            <div className="mt-0.5 text-xs font-normal text-neutral-500 lg:text-sm">Includes taxes and fees</div>
          </div>
        </div>
      </DisclosureButton>

      {/* DETAIL */}

      <DisclosurePanel className="rounded-2xl border border-neutral-200 p-4 md:p-8 dark:border-neutral-700">
        {renderFlightItem()}
        <div className="my-7 space-y-5 md:my-10 md:ps-24">
          <div className="border-t border-neutral-200 dark:border-neutral-700" />
          <div className="text-sm text-neutral-700 md:text-base dark:text-neutral-300">
            Transit time: {layover} - {stopAirport}
          </div>
          <div className="border-t border-neutral-200 dark:border-neutral-700" />
        </div>
        {renderFlightItem()}
      </DisclosurePanel>
    </Disclosure>
  )
}

export default FlightCard
