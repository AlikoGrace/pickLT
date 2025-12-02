import StartRating from '@/components/StartRating'
import { getListingReviews } from '@/data/data'
import { getExperienceListingByHandle } from '@/data/listings'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { DescriptionDetails, DescriptionList, DescriptionTerm } from '@/shared/description-list'
import { Divider } from '@/shared/divider'
import { Table, TableBody, TableCell, TableRow } from '@/shared/table'
import T from '@/utils/getT'
import { CheckCircleIcon, ClockIcon, LanguageIcon, UsersIcon } from '@heroicons/react/24/outline'
import { Metadata } from 'next'
import Form from 'next/form'
import { redirect } from 'next/navigation'
import DatesRangeInputPopover from '../../components/DatesRangeInputPopover'
import GuestsInputPopover from '../../components/GuestsInputPopover'
import HeaderGallery from '../../components/HeaderGallery'
import SectionDateRange from '../../components/SectionDateRange'
import SectionHeader from '../../components/SectionHeader'
import { SectionHeading } from '../../components/SectionHeading'
import SectionHost from '../../components/SectionHost'
import SectionListingReviews from '../../components/SectionListingReviews'
import SectionMap from '../../components/SectionMap'

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }): Promise<Metadata> {
  const { handle } = await params
  const listing = await getExperienceListingByHandle(handle)

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
  const listing = await getExperienceListingByHandle(handle)
  if (!listing?.id) {
    return redirect('/experience-categories/all')
  }
  const {
    address,
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
    durationTime,
    languages,
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
        <div className="flex flex-col items-center space-y-3 text-center sm:flex-row sm:space-y-0 sm:gap-x-3 sm:text-start">
          <ClockIcon className="h-6 w-6" />
          <span>{durationTime}</span>
        </div>
        <div className="flex flex-col items-center space-y-3 text-center sm:flex-row sm:space-y-0 sm:gap-x-3 sm:text-start">
          <UsersIcon className="h-6 w-6" />
          <span>Up to {maxGuests} people</span>
        </div>
        <div className="flex flex-col items-center space-y-3 text-center sm:flex-row sm:space-y-0 sm:gap-x-3 sm:text-start">
          <LanguageIcon className="h-6 w-6" />
          <span>{languages.length > 0 ? languages.join(', ') : 'Languages not specified'}</span>
        </div>
      </SectionHeader>
    )
  }

  const renderSectionInfo = () => {
    const thingsToDo = [
      {
        name: 'Explore the beautiful landscapes of Trang An',
        time: '7:30 AM - 8:00 AM',
        description:
          'Experience the breathtaking scenery of Trang An, a UNESCO World Heritage site, with its stunning limestone karsts and lush greenery.',
      },
      {
        name: 'Visit the ancient temples and pagodas',
        time: '10:30 AM - 12:15 PM',
        description:
          'Discover the rich history and culture of Vietnam by visiting ancient temples and pagodas in the area, including the famous Bai Dinh Pagoda.',
      },
      {
        name: 'Enjoy a traditional Vietnamese meal',
        time: '12:15 PM - 1:30 PM',
        description:
          'Savor the flavors of Vietnam with a delicious traditional meal, featuring local ingredients and authentic recipes.',
      },
      {
        name: 'Take a boat ride through the scenic waterways',
        time: '1:30 PM - 3:30 PM',
        description:
          'Experience the tranquility of the waterways by taking a boat ride through the picturesque landscapes of Trang An, surrounded by towering limestone cliffs and lush vegetation.',
      },
      {
        name: 'Hike to the top of Mua Cave for panoramic views',
        time: '3:45 PM - 5:30 PM',
        description:
          'Challenge yourself with a hike to the top of Mua Cave, where you will be rewarded with breathtaking panoramic views of the surrounding countryside and rice paddies.',
      },
      {
        name: 'Relax and unwind in nature',
        time: '5:30 PM - 6:30 PM',
        description:
          'Take a moment to relax and unwind in the serene natural surroundings of Trang An, enjoying the peaceful atmosphere and fresh air.',
      },
      {
        name: 'Return to Hanoi',
        time: '6:30 PM - 8:00 PM',
        description:
          'After a day filled with exploration and adventure, return to Hanoi, reflecting on the unforgettable experiences and memories made during the tour.',
      },
    ]

    return (
      <div className="listingSection__wrap">
        <SectionHeading>Experiences descriptions</SectionHeading>
        <Divider className="w-14!" />

        <Table>
          <TableBody>
            {thingsToDo.map((item, index) => (
              <TableRow key={index}>
                <TableCell className="font-medium">{item.time}</TableCell>
                <TableCell>
                  <div className="max-w-lg leading-relaxed sm:text-pretty">
                    <p className="font-medium">{item.name}</p>
                    <p className="mt-2.5 text-sm text-neutral-500 dark:text-neutral-400">{item.description}</p>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )
  }

  const renderSectionIncludes = () => {
    const includes_demo = [
      { name: 'Set Menu Lunch on boat' },
      { name: 'Express Bus From Hanoi To Halong' },
      { name: 'Mineral Water On Express Bus' },
      { name: 'Kayak or Bamboo Boat. Life Jacket.' },
      { name: 'Halong Bay Entrance Ticket' },
      { name: 'English Speaking Tour Guide' },
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
      <div className="listingSection__wrap sm:shadow-xl">
        {/* PRICE */}
        <div className="flex justify-between">
          <span className="text-3xl font-semibold">
            {price}
            <span className="ml-1 text-base font-normal text-neutral-500 dark:text-neutral-400">/person</span>
          </span>
          <StartRating size="lg" point={reviewStart} reviewCount={reviewCount} />
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

        {/* SUM */}
        <DescriptionList>
          <DescriptionTerm>$19.00 x 3 adults</DescriptionTerm>
          <DescriptionDetails className="sm:text-right">$57.00</DescriptionDetails>
          <DescriptionTerm>Service charge</DescriptionTerm>
          <DescriptionDetails className="sm:text-right">$0.00</DescriptionDetails>
          <DescriptionTerm className="font-semibold text-neutral-900">Total</DescriptionTerm>
          <DescriptionDetails className="font-semibold sm:text-right">$57.00</DescriptionDetails>
        </DescriptionList>

        {/* SUBMIT */}
        <ButtonPrimary form="booking-form" type="submit">
          {T['common']['Reserve']}
        </ButtonPrimary>
      </div>
    )
  }

  return (
    <div>
      {/*  HEADER */}
      <HeaderGallery gridType="grid4" images={galleryImgs} />

      {/* MAIN */}
      <main className="relative z-[1] mt-10 flex flex-col gap-8 lg:flex-row xl:gap-10">
        {/* CONTENT */}
        <div className="flex w-full flex-col gap-y-8 lg:w-3/5 xl:w-[64%] xl:gap-y-10">
          {renderSectionHeader()}
          {renderSectionInfo()}
          {renderSectionIncludes()}
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
