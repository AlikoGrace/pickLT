import ExperiencesCard from '@/components/ExperiencesCard'
import HeroSectionWithSearchForm1 from '@/components/hero-sections/HeroSectionWithSearchForm1'
import { ExperiencesSearchForm } from '@/components/HeroSearchForm/ExperiencesSearchForm'
import ListingFilterTabs from '@/components/ListingFilterTabs'
import SectionSliderCards from '@/components/SectionSliderCards'
import { getExperienceCategoryByHandle } from '@/data/categories'
import { getExperienceListingFilterOptions, getExperienceListings } from '@/data/listings'
import { Button } from '@/shared/Button'
import { Divider } from '@/shared/divider'
import { Heading } from '@/shared/Heading'
import Pagination from '@/shared/Pagination'
import convertNumbThousand from '@/utils/convertNumbThousand'
import { HotAirBalloonIcon, MapPinpoint02Icon, MapsLocation01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Metadata } from 'next'
import { redirect } from 'next/navigation'

export async function generateMetadata({ params }: { params: Promise<{ handle?: string[] }> }): Promise<Metadata> {
  const { handle } = await params
  const category = await getExperienceCategoryByHandle(handle?.[0])
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

  const category = await getExperienceCategoryByHandle(handle?.[0])
  const listings = await getExperienceListings()
  const filterOptions = await getExperienceListingFilterOptions()

  if (!category?.id) {
    return redirect('/experience-categories/all')
  }

  return (
    <div className="pb-28">
      {/* Hero section */}
      <div className="container">
        <HeroSectionWithSearchForm1
          heading={category.name}
          image={category.coverImage}
          imageAlt={category.name}
          searchForm={<ExperiencesSearchForm formStyle="default" />}
          description={
            <div className="flex items-center sm:text-lg">
              <HugeiconsIcon icon={MapPinpoint02Icon} size={20} color="currentColor" strokeWidth={1.5} />
              <span className="ms-2.5">{category.region} </span>
              <span className="mx-5"></span>
              <HugeiconsIcon icon={HotAirBalloonIcon} size={20} color="currentColor" strokeWidth={1.5} />
              <span className="ms-2.5">{convertNumbThousand(category.count)} experiences</span>
            </div>
          }
        />
      </div>

      <div className="relative container mt-14 lg:mt-24">
        {/* start heading */}
        <div className="flex flex-wrap items-end justify-between gap-x-2.5 gap-y-5">
          <h2 id="heading" className="scroll-mt-20 text-lg font-semibold sm:text-xl">
            Over {convertNumbThousand(category.count)} experiences
            {category.handle !== 'all' ? ` in ${category.name}` : null}
          </h2>
          <Button color="white" className="ms-auto" href={'/experience-categories-map/' + category.handle}>
            <span className="me-1">Show map</span>
            <HugeiconsIcon icon={MapsLocation01Icon} size={20} color="currentColor" strokeWidth={1.5} />
          </Button>
        </div>
        <Divider className="my-8 md:mb-12" />
        {/* end heading */}
        <ListingFilterTabs filterOptions={filterOptions} />

        <div className="mt-8 grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 md:gap-x-8 md:gap-y-12 lg:mt-10 lg:grid-cols-3 xl:grid-cols-4">
          {listings.map((listing) => (
            <ExperiencesCard key={listing.id} data={listing} />
          ))}
        </div>
        <div className="mt-16 flex items-center justify-center">
          <Pagination />
        </div>

        <Divider className="my-14 lg:my-24" />
        <Heading className="mb-12">Just a few spots left.</Heading>
        <SectionSliderCards listings={listings.slice(0, 8)} cardType="experience" />
      </div>
    </div>
  )
}

export default Page
