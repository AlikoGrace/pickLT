import {
  Bathtub02Icon,
  BedSingle01Icon,
  BodySoapIcon,
  CableCarIcon,
  CctvCameraIcon,
  HairDryerIcon,
  MeetingRoomIcon,
  ShampooIcon,
  Speaker01Icon,
  TvSmartIcon,
  VirtualRealityVr01Icon,
  WaterEnergyIcon,
  WaterPoloIcon,
  Wifi01Icon,
} from '@/components/Icons'
import { getListingReviews } from '@/data/data'
import { getStayListingByHandle } from '@/data/listings'
import ButtonPrimary from '@/shared/ButtonPrimary'
import ButtonSecondary from '@/shared/ButtonSecondary'
import { DescriptionDetails, DescriptionList, DescriptionTerm } from '@/shared/description-list'
import { Divider } from '@/shared/divider'
import T from '@/utils/getT'
import { UsersIcon } from '@heroicons/react/24/outline'
import { Metadata } from 'next'
import Form from 'next/form'
import { redirect } from 'next/navigation'
import { Fragment } from 'react'
import DatesRangeInputPopover from '../../components/DatesRangeInputPopover'
import GuestsInputPopover from '../../components/GuestsInputPopover'
import HeaderGallery from '../../components/HeaderGallery'
import SectionDateRange from '../../components/SectionDateRange'
import SectionHeader from '../../components/SectionHeader'
import { SectionHeading, SectionSubheading } from '../../components/SectionHeading'
import SectionHost from '../../components/SectionHost'
import SectionListingReviews from '../../components/SectionListingReviews'
import SectionMap from '../../components/SectionMap'

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }): Promise<Metadata> {
  const { handle } = await params
  const listing = await getStayListingByHandle(handle)

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

  const listing = await getStayListingByHandle(handle)

  if (!listing?.id) {
    return redirect('/stay-categories/all')
  }
  const {
    address,
    bathrooms,
    bedrooms,
    date,
    description,
    featuredImage,
    galleryImgs,
    isAds,
    like,
    listingCategory,
    map,
    maxGuests,
    price,
    reviewCount,
    reviewStart,
    saleOff,
    title,
    host,
    beds,
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
          <UsersIcon className="mb-0.5 size-6" />
          <span>{maxGuests} guests</span>
        </div>
        <div className="flex items-center gap-x-3">
          <BedSingle01Icon className="mb-0.5 size-6" />
          <span>{beds} beds</span>
        </div>
        <div className="flex items-center gap-x-3">
          <Bathtub02Icon className="mb-0.5 size-6" />
          <span>{bathrooms} baths</span>
        </div>
        <div className="flex items-center gap-x-3">
          <MeetingRoomIcon className="mb-0.5 size-6" />
          <span>{bedrooms} bedrooms</span>
        </div>
      </SectionHeader>
    )
  }

  const renderSectionInfo = () => {
    const roomRates = [
      {
        name: 'monday-thursday',
        title: 'Monday - Thursday',
        price: '$199',
      },
      {
        name: 'friday-sunday',
        title: 'Friday - Sunday',
        price: '$219',
      },
      {
        name: 'rent-by-month',
        title: 'Rent by month',
        price: '-8.34 %',
      },
      {
        name: 'minimum-nights',
        title: 'Minimum number of nights',
        price: '1 night',
      },
      {
        name: 'maximum-nights',
        title: 'Max number of nights',
        price: '90 nights',
      },
    ]
    return (
      <div className="listingSection__wrap">
        <SectionHeading>Stay information</SectionHeading>
        <div className="leading-relaxed text-neutral-700 dark:text-neutral-300">
          <span>
            Providing lake views, The Symphony 9 Tam Coc in Ninh Binh provides accommodation, an outdoor swimming pool,
            a bar, a shared lounge, a garden and barbecue facilities. Complimentary WiFi is provided.
          </span>
          <br />
          <br />
          <span>There is a private bathroom with bidet in all units, along with a hairdryer and free toiletries.</span>
          <br /> <br />
          <span>
            The Symphony 9 Tam Coc offers a terrace. Both a bicycle rental service and a car rental service are
            available at the accommodation, while cycling can be enjoyed nearby.
          </span>
        </div>

        <Divider className="w-14!" />

        <div>
          <SectionHeading>Room Rates </SectionHeading>
          <SectionSubheading>Prices may increase on weekends or holidays</SectionSubheading>
        </div>
        <DescriptionList>
          {roomRates.map((item) => (
            <Fragment key={item.name}>
              <DescriptionTerm>{item.title}</DescriptionTerm>
              <DescriptionDetails>{item.price}</DescriptionDetails>
            </Fragment>
          ))}
        </DescriptionList>
      </div>
    )
  }

  const renderSectionAmenities = () => {
    const Amenities_demos = [
      { name: 'Fast wifi', icon: Wifi01Icon },
      { name: 'Bathtub', icon: Bathtub02Icon },
      { name: 'Hair dryer', icon: HairDryerIcon },
      { name: 'Sound system', icon: Speaker01Icon },
      { name: 'Shampoo', icon: ShampooIcon },
      { name: 'Body soap', icon: BodySoapIcon },
      { name: 'Water Energy ', icon: WaterEnergyIcon },
      { name: 'Water Polo', icon: WaterPoloIcon },
      { name: 'Cable Car', icon: CableCarIcon },
      { name: 'Tv Smart', icon: TvSmartIcon },
      { name: 'Cctv Camera', icon: CctvCameraIcon },
      { name: 'Virtual Reality Vr', icon: VirtualRealityVr01Icon },
    ]

    return (
      <div className="listingSection__wrap">
        <div>
          <SectionHeading>Amenities</SectionHeading>
          <SectionSubheading>About the property&apos;s amenities and services</SectionSubheading>
        </div>
        <Divider className="w-14!" />

        <div className="grid grid-cols-1 gap-6 text-sm text-neutral-700 xl:grid-cols-3 dark:text-neutral-300">
          {Amenities_demos.filter((_, i) => i < 12).map((item) => (
            <div key={item.name} className="flex items-center gap-x-3">
              <item.icon className="h-6 w-6" />
              <span>{item.name}</span>
            </div>
          ))}
        </div>

        {/* ----- */}
        <div className="w-14 border-b border-neutral-200"></div>
        <div>
          <ButtonSecondary>View more 20 amenities</ButtonSecondary>
        </div>
      </div>
    )
  }

  const renderSidebarPriceAndForm = () => {
    return (
      <div className="listingSection__wrap sm:shadow-xl">
        {/* PRICE */}
        <div className="flex items-end text-2xl font-semibold sm:text-3xl">
          <span className="text-neutral-300 line-through">$350</span>
          <span className="mx-2">{price}</span>
          <div className="pb-1">
            <span className="text-base font-normal text-neutral-500 dark:text-neutral-400">/night</span>
          </div>
        </div>

        {/* FORM */}
        <Form
          action={handleSubmitForm}
          className="flex flex-col rounded-3xl border border-neutral-200 dark:border-neutral-700"
          id="booking-form"
        >
          <DatesRangeInputPopover className="z-11 flex-1" />
          <div className="w-full border-b border-neutral-200 dark:border-neutral-700"></div>
          <GuestsInputPopover className="flex-1" />
        </Form>

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
      </div>
    )
  }

  return (
    <div>
      {/*  HEADER */}
      <HeaderGallery images={galleryImgs} />

      {/* MAIN */}
      <main className="relative z-[1] mt-10 flex flex-col gap-8 lg:flex-row xl:gap-10">
        {/* CONTENT */}
        <div className="flex w-full flex-col gap-y-8 lg:w-3/5 xl:w-[64%] xl:gap-y-10">
          {renderSectionHeader()}
          {renderSectionInfo()}
          {renderSectionAmenities()}
          <SectionDateRange />
        </div>

        {/* SIDEBAR */}
        <div className="grow">
          <div className="sticky top-5">{renderSidebarPriceAndForm()}</div>
        </div>
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
