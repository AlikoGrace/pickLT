import { getCarCategoryByHandle } from '@/data/categories'
import { getCarListingFilterOptions, getCarListings } from '@/data/listings'
import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import SectionGridHasMap from './SectionGridHasMap'

export async function generateMetadata({ params }: { params: Promise<{ handle?: string[] }> }): Promise<Metadata> {
  const { handle } = await params
  const category = await getCarCategoryByHandle(handle?.[0])
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
  const category = await getCarCategoryByHandle(handle?.[0])
  const listings = await getCarListings()
  const filterOptions = await getCarListingFilterOptions()

  if (!category?.id) {
    return redirect('/car-categories/all')
  }

  return (
    <div className="container xl:max-w-none xl:pe-0 2xl:ps-10">
      <SectionGridHasMap listings={listings} category={category} filterOptions={filterOptions} />
    </div>
  )
}

export default Page
