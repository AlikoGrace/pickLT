'use client'

import StartRating from '@/components/StartRating'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { DescriptionDetails, DescriptionList, DescriptionTerm } from '@/shared/description-list'
import { Divider } from '@/shared/divider'
import T from '@/utils/getT'
import { HomeIcon } from '@heroicons/react/24/outline'
import { Calendar04Icon, UserIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import Image from 'next/image'
import React from 'react'

const Page = () => {
  React.useEffect(() => {
    document.documentElement.scrollTo({
      top: 0,
      behavior: 'instant',
    })
  }, [])

  return (
    <main className="container mt-10 mb-24 sm:mt-16 lg:mb-32">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-y-12 px-0 sm:rounded-2xl sm:p-6 xl:p-8">
        <h1 className="text-4xl font-semibold sm:text-5xl">{T['common']['Congratulation']} 🎉</h1>
        <Divider />

        <div>
          <h3 className="text-2xl font-semibold">{T['common']['Your booking']}</h3>
          <div className="mt-5 flex flex-col sm:flex-row sm:items-center">
            <div className="w-full shrink-0 sm:w-40">
              <div className="aspect-w-4 overflow-hidden rounded-2xl aspect-h-3 sm:aspect-h-4">
                <Image
                  fill
                  alt=""
                  className="object-cover"
                  src="https://images.pexels.com/photos/6373478/pexels-photo-6373478.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"
                  sizes="200px"
                  priority
                />
              </div>
            </div>
            <div className="flex flex-col gap-y-3 pt-5 sm:px-5 sm:pb-5">
              <div>
                <span className="line-clamp-1 text-sm text-neutral-500 dark:text-neutral-400">
                  Hotel room in Tokyo, Jappan
                </span>
                <span className="mt-1 block text-base font-medium sm:text-lg">The Lounge & Bar</span>
              </div>
              <span className="block text-sm text-neutral-500 dark:text-neutral-400">2 beds · 2 baths</span>
              <Divider className="w-10!" />

              <StartRating />
            </div>
          </div>
        </div>

        <div className="flex flex-col divide-y divide-neutral-200 rounded-3xl border border-neutral-200 text-neutral-500 sm:flex-row sm:divide-x sm:divide-y-0 dark:divide-neutral-700 dark:border-neutral-700 dark:text-neutral-400">
          <div className="flex flex-1 gap-x-4 p-5">
            <HugeiconsIcon icon={Calendar04Icon} size={32} strokeWidth={1.5} />
            <div className="flex flex-col">
              <span className="text-sm text-neutral-400">Date</span>
              <span className="mt-1.5 text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                Aug 12 - 16, 2025
              </span>
            </div>
          </div>
          <div className="flex flex-1 gap-x-4 p-5">
            <HugeiconsIcon icon={UserIcon} size={32} strokeWidth={1.5} />
            <div className="flex flex-col">
              <span className="text-sm text-neutral-400">Guests</span>
              <span className="mt-1.5 text-lg font-semibold text-neutral-900 dark:text-neutral-100">3 Guests</span>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-2xl font-semibold">Booking detail</h3>
          <DescriptionList className="mt-5">
            <DescriptionTerm>Booking code</DescriptionTerm>
            <DescriptionDetails>#222-333-111</DescriptionDetails>
            <DescriptionTerm>Date</DescriptionTerm>
            <DescriptionDetails>12 Aug, 2021</DescriptionDetails>
            <DescriptionTerm>Total</DescriptionTerm>
            <DescriptionDetails>$199</DescriptionDetails>
            <DescriptionTerm>Payment method</DescriptionTerm>
            <DescriptionDetails>Credit card</DescriptionDetails>
          </DescriptionList>
        </div>

        <div>
          <ButtonPrimary href="/">
            <HomeIcon className="size-5" />
            Explore more stays
          </ButtonPrimary>
        </div>
      </div>
    </main>
  )
}

export default Page
