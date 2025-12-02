import { getListingReviews } from '@/data/data'
import { getCarListingByHandle } from '@/data/listings'

import StartRating from '@/components/StartRating'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { DescriptionDetails, DescriptionList, DescriptionTerm } from '@/shared/description-list'
import { Divider } from '@/shared/divider'
import T from '@/utils/getT'
import { CheckCircleIcon } from '@heroicons/react/24/outline'
import { Backpack02Icon, HumidityIcon, SeatSelectorIcon, Settings03Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Metadata } from 'next'
import Form from 'next/form'
import { redirect } from 'next/navigation'
import { Fragment } from 'react'
import DatesRangeInputPopover from '../../components/DatesRangeInputPopover'
import HeaderGallery from '../../components/HeaderGallery'
import SectionDateRange from '../../components/SectionDateRange'
import SectionHeader from '../../components/SectionHeader'
import { SectionHeading } from '../../components/SectionHeading'
import SectionHost from '../../components/SectionHost'
import SectionListingReviews from '../../components/SectionListingReviews'
import SectionMap from '../../components/SectionMap'

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }): Promise<Metadata> {
  const { handle } = await params
  const listing = await getCarListingByHandle(handle)

  if (!listing) {
    return {
      title: 'Listing not found',
      description: 'The listing you are looking for does not exist.',
    }
  }

  return {
    title: listing?.title,
    description: listing?.description,
  }
}

const Page = async ({ params }: { params: Promise<{ handle: string }> }) => {
  const { handle } = await params

  const listing = await getCarListingByHandle(handle)

  if (!listing?.id) {
    return redirect('/car-categories/all')
  }
  const {
    address,
    description,
    featuredImage,
    galleryImgs,
    isAds,
    like,
    listingCategory,
    map,
    price,
    reviewCount,
    reviewStart,
    saleOff,
    title,
    host,
    seats,
    airbags,
    gearshift,
    bags,
    pickUpAddress,
    dropOffAddress,
    dropOffTime,
    pickUpTime,
  } = listing
  const reviews = (await getListingReviews(handle)).slice(0, 3) // Fetching only the first 3 reviews for display

  // Server action to handle form submission
  const handleSubmitForm = async (formData: FormData) => {
    'use server'

    // Handle form submission logic here
    console.log('Form submitted with data:', Object.fromEntries(formData.entries()))
    // For example, you can redirect to a checkout page or process the booking
    redirect('/checkout')
  }
  //

  const renderSectionHeader = () => {
    return (
      <SectionHeader
        address={address}
        host={host}
        listingCategory={listingCategory}
        reviewCount={reviewCount}
        reviewStart={reviewStart}
        title={title}
      >
        <div className="flex items-center gap-x-3">
          <HugeiconsIcon icon={SeatSelectorIcon} size={20} color="currentColor" strokeWidth={1.5} />
          <span>{seats} seats</span>
        </div>
        <div className="flex items-center gap-x-3">
          <HugeiconsIcon icon={Settings03Icon} size={20} color="currentColor" strokeWidth={1.5} />
          <span> {gearshift}</span>
        </div>
        <div className="flex items-center gap-x-3">
          <HugeiconsIcon icon={HumidityIcon} size={20} color="currentColor" strokeWidth={1.5} />
          <span> {airbags} airbags</span>
        </div>
        <div className="flex items-center gap-x-3">
          <HugeiconsIcon icon={Backpack02Icon} size={20} color="currentColor" strokeWidth={1.5} />
          <span> {bags} Large bags</span>
        </div>
      </SectionHeader>
    )
  }

  const renderSectionInfo = () => {
    const checklists = [
      { title: 'Pick-up time', description: 'Your pick-up time is 10:00 AM' },
      { title: 'Insurance coverage', description: 'Collision Damage Waiver included' },
      { title: 'Driver requirements', description: 'Valid driver’s license and ID' },
      { title: 'Payment method', description: "A credit card in the main driver's name, to hold the security deposit" },
      { title: 'Return instructions', description: 'Return the car to the same location by 10:00 AM' },
      { title: 'Additional services', description: 'GPS and child seat available upon request' },
      { title: 'Cancellation policy', description: 'Free cancellation up to 48 hours before pick-up' },
    ]

    return (
      <div className="listingSection__wrap">
        <SectionHeading>Your pick-up checklist</SectionHeading>
        <Divider className="w-14!" />

        <DescriptionList>
          {checklists.map((item) => (
            <Fragment key={item.title}>
              <DescriptionTerm>{item.title}</DescriptionTerm>
              <DescriptionDetails>{item.description}</DescriptionDetails>
            </Fragment>
          ))}
        </DescriptionList>
      </div>
    )
  }

  const renderSectionIncludes = () => {
    const includes_demo = [
      { name: 'Free cancellation up to 48 hours' },
      { name: 'Collision Damage Waiver with $214 deductible' },
      { name: 'Theft Protection with $19,999 excess' },
      { name: 'Unlimited mileage' },
      { name: 'Car interiors and exteriors cleaned with disinfectant before pick-up' },
      { name: 'Masks are required at the pick-up location' },
      { name: '24/7 roadside assistance' },
      { name: 'Free Wi-Fi in the car' },
      { name: 'GPS navigation system included' },
      { name: 'Child safety seat available upon request' },
    ]
    return (
      <div className="listingSection__wrap">
        <SectionHeading>Included in the price </SectionHeading>
        <Divider className="w-14!" />

        {/* 6 */}
        <div className="grid grid-cols-1 gap-6 text-sm text-neutral-700 lg:grid-cols-2 dark:text-neutral-300">
          {includes_demo.map((item) => (
            <div key={item.name} className="flex items-center gap-x-3">
              <CheckCircleIcon className="mt-px h-6 w-6 shrink-0" />
              <span>{item.name}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const renderSidebarPriceAndForm = () => {
    return (
      <>
        <div className="listingSection__wrap sm:shadow-xl">
          <SectionHeading>Pick up and drop off</SectionHeading>
          <div className="flex gap-x-4">
            <div className="flex shrink-0 flex-col items-center py-2">
              <span className="block size-6 rounded-full border border-neutral-400"></span>
              <span className="my-1 block grow border-l border-dashed border-neutral-400"></span>
              <span className="block size-6 rounded-full border border-neutral-400"></span>
            </div>
            <div className="flex flex-col gap-y-14 text-sm">
              <div className="flex flex-col gap-y-2">
                <span className="text-neutral-500 dark:text-neutral-400">{pickUpTime}</span>
                <span className="font-semibold">{pickUpAddress}</span>
              </div>
              <div className="flex flex-col gap-y-2">
                <span className="text-neutral-500 dark:text-neutral-400">{dropOffTime}</span>
                <span className="font-semibold">{dropOffAddress}</span>
              </div>
            </div>
          </div>
        </div>

        <Form
          action={handleSubmitForm}
          className="sticky top-5 mt-10 listingSection__wrap sm:shadow-xl"
          id="booking-form"
        >
          {/* PRICE */}
          <div className="flex justify-between">
            <span className="text-3xl font-semibold">
              {price}
              <span className="ml-1 text-base font-normal text-neutral-500 dark:text-neutral-400">/day</span>
            </span>
            <StartRating size="lg" point={reviewStart} reviewCount={reviewCount} />
          </div>

          <div className="rounded-2xl border border-neutral-200 dark:border-neutral-700">
            <DatesRangeInputPopover />
          </div>

          <DescriptionList>
            <DescriptionTerm>$19.00 x 3 day</DescriptionTerm>
            <DescriptionDetails className="sm:text-right">$57.00</DescriptionDetails>
            <DescriptionTerm className="font-semibold text-neutral-900">Total</DescriptionTerm>
            <DescriptionDetails className="font-semibold sm:text-right">$57.00</DescriptionDetails>
          </DescriptionList>

          {/* SUBMIT */}
          <ButtonPrimary form="booking-form" type="submit" className="w-full">
            {T['common']['Reserve']}
          </ButtonPrimary>
        </Form>
      </>
    )
  }

  return (
    <div>
      {/*  HEADER */}
      <HeaderGallery gridType="grid3" images={galleryImgs} />

      {/* MAIN */}
      <main className="relative z-[1] mt-10 flex flex-col gap-8 lg:flex-row xl:gap-10">
        {/* CONTENT */}
        <div className="flex w-full flex-col gap-y-8 lg:w-3/5 xl:w-[64%] xl:gap-y-10">
          {renderSectionHeader()}
          {renderSectionIncludes()}
          {renderSectionInfo()}
          <SectionDateRange />
        </div>

        {/* SIDEBAR */}
        <div className="grow">{renderSidebarPriceAndForm()}</div>
      </main>

      <Divider className="my-16" />

      <div className="flex flex-col gap-y-10">
        <div className="flex flex-col gap-8 lg:flex-row lg:gap-10">
          <div className="w-full lg:w-4/9 xl:w-1/3">
            <SectionHost {...host} />
          </div>
          <div className="w-full lg:w-2/3">
            <SectionListingReviews reviewCount={reviewCount} reviewStart={reviewStart} reviews={reviews} />
          </div>
        </div>

        <SectionMap />
      </div>
    </div>
  )
}

export default Page
