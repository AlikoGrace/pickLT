import FlightCard from '@/components/FlightCard'
import HeroSectionWithSearchForm1 from '@/components/hero-sections/HeroSectionWithSearchForm1'
import { FlightSearchForm } from '@/components/HeroSearchForm/FlightSearchForm'
import ListingFilterTabs from '@/components/ListingFilterTabs'
import { getFlightCategoryByHandle } from '@/data/categories'
import { getFlightFilterOptions, getFlightListings } from '@/data/listings'
import { Divider } from '@/shared/divider'
import Pagination from '@/shared/Pagination'
import convertNumbThousand from '@/utils/convertNumbThousand'
import { AirplaneTakeOff01Icon, MapPinpoint02Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Metadata } from 'next'
import { redirect } from 'next/navigation'

export async function generateMetadata({ params }: { params: Promise<{ handle?: string[] }> }): Promise<Metadata> {
  const { handle } = await params
  const category = await getFlightCategoryByHandle(handle?.[0])
  if (!category) {
    return {
      title: 'Collection not found',
      description: 'The collection you are looking for does not exist.',
    }
  }
  const { name, description } = category
  return { title: name, description }
}

const Page = async ({ params }: { params: Promise<{ handle?: string[] }> }) => {
  const { handle } = await params

  const category = await getFlightCategoryByHandle(handle?.[0])
  const listings = await getFlightListings()
  const filterOptions = await getFlightFilterOptions()

  if (!category?.id) {
    return redirect('/flight-categories/all')
  }

  return (
    <div className="pb-28">
      {/* Hero section */}
      <div className="container">
        <HeroSectionWithSearchForm1
          heading={category.name}
          image={category.coverImage}
          imageAlt={category.name}
          searchForm={<FlightSearchForm formStyle="default" />}
          description={
            <div className="flex items-center sm:text-lg">
              <HugeiconsIcon icon={MapPinpoint02Icon} size={20} color="currentColor" strokeWidth={1.5} />
              <span className="ms-2.5">{category.region} </span>
              <span className="mx-5"></span>
              <HugeiconsIcon icon={AirplaneTakeOff01Icon} size={20} color="currentColor" strokeWidth={1.5} />
              <span className="ms-2.5">{convertNumbThousand(category.count)} flights</span>
            </div>
          }
        />
      </div>

      {/* Content */}
      <div className="relative container mt-14 lg:mt-24">
        {/* start heading */}
        <h2 id="heading" className="scroll-mt-20 text-lg font-semibold sm:text-xl">
          Over {convertNumbThousand(category.count)} flights
          {category.handle !== 'all' ? ` in ${category.name}` : null}
        </h2>

        <Divider className="my-8 md:mb-12" />
        {/* end heading */}

        <ListingFilterTabs filterOptions={filterOptions} />
        <div className="mt-8 grid grid-cols-1 gap-y-8">
          {listings.map((listing) => (
            <FlightCard key={listing.id} data={listing} />
          ))}
        </div>
        <div className="mt-16 flex items-center justify-center">
          <Pagination />
        </div>
      </div>
    </div>
  )
}

export default Page
