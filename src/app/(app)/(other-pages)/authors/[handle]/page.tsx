import { Calendar01Icon, Comment01Icon } from '@/components/Icons'
import ListingReview from '@/components/ListingReview'
import StartRating from '@/components/StartRating'
import { getAuthorByHandle } from '@/data/authors'
import { getListingReviews } from '@/data/data'
import Avatar from '@/shared/Avatar'
import ButtonSecondary from '@/shared/ButtonSecondary'
import { Divider } from '@/shared/divider'
import { Link } from '@/shared/link'
import SocialsList from '@/shared/SocialsList'
import { HomeIcon } from '@heroicons/react/24/outline'
import { Award04Icon, Flag03Icon, Medal01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import ListingTabs from './ListingTabs'

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }): Promise<Metadata> {
  const { handle } = await params
  const author = await getAuthorByHandle(handle)

  if (!author?.id) {
    return {
      title: 'Author not found',
      description: 'The author you are looking for does not exist.',
    }
  }

  return {
    title: `${author.displayName} - Author Profile`,
    description: `Explore the profile of ${author.displayName}, a top-rated host with ${author.reviewsCount} reviews and a star rating of ${author.starRating}. Discover their listings and read reviews from guests.`,
  }
}

const Page = async ({ params }: { params: Promise<{ handle: string }> }) => {
  const { handle } = await params

  const reviews = await getListingReviews(handle)
  const author = await getAuthorByHandle(handle)

  if (!author?.id) {
    return notFound()
  }

  const { displayName, avatarUrl, count, description, starRating, address, languages, joinedDate, reviewsCount } =
    author

  const renderSidebar = () => {
    return (
      <div>
        <div className="flex w-full flex-col items-start gap-y-6 border-neutral-200 px-0 sm:gap-y-7 sm:rounded-2xl sm:border sm:p-6 xl:p-8 dark:border-neutral-700">
          <div className="flex items-center gap-x-5">
            <Avatar src={avatarUrl} className="size-24" />
            <div className="flex flex-col gap-y-3">
              <h2 className="text-3xl font-semibold">{displayName}</h2>
              <div className="mt-1.5 flex items-center text-sm text-neutral-500 dark:text-neutral-400">
                <StartRating point={starRating} reviewCount={reviewsCount} />
                <span className="mx-2">·</span>
                <span>{count} listings</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-x-1.5">
              <HugeiconsIcon icon={Medal01Icon} size={20} color="currentColor" strokeWidth={1.5} />
              Supperhost
            </div>
            <div className="w-px bg-neutral-200 dark:bg-neutral-700"></div>
            <div className="flex items-center gap-x-1.5">
              <HugeiconsIcon icon={Award04Icon} size={20} color="currentColor" strokeWidth={1.5} />
              2+ years
            </div>
          </div>

          {/* ---- */}
          <p className="block leading-relaxed text-neutral-700 dark:text-neutral-300">{description}</p>

          {/* ---- */}
          <SocialsList itemClass="flex items-center justify-center w-9 h-9 rounded-full bg-neutral-100 dark:bg-neutral-800 text-xl" />

          {/* ---- */}
          <div className="flex flex-col gap-y-3.5 text-neutral-700 dark:text-neutral-300">
            <div className="flex items-center gap-x-4">
              <HomeIcon className="size-6" />
              <span>{address}</span>
            </div>

            <div className="flex items-center gap-x-4">
              <Comment01Icon className="size-6" />
              <span>{languages}</span>
            </div>

            <div className="flex items-center gap-x-4">
              <Calendar01Icon className="size-6" />
              <span>{`Joined on ${joinedDate}`}</span>
            </div>
          </div>

          <Divider />
          <Link href={'#'} className="flex items-center gap-x-2 text-sm text-neutral-700 dark:text-neutral-300">
            <HugeiconsIcon icon={Flag03Icon} size={16} color="currentColor" strokeWidth={1.5} />
            <span>Report this host</span>
          </Link>
        </div>
      </div>
    )
  }

  const renderSectionListings = () => {
    return (
      <div className="listingSection__wrap">
        <div>
          <h2 className="text-2xl font-semibold">{displayName}&apos;s listings</h2>
          <span className="mt-2 block text-neutral-500 dark:text-neutral-400">
            {displayName}&apos;s listings is very rich, 5 star reviews help him to be more branded.
          </span>
        </div>
        <Divider className="w-14!" />
        <ListingTabs />
      </div>
    )
  }

  const renderSectionReviews = () => {
    return (
      <div className="listingSection__wrap">
        {/* HEADING */}
        <h2 className="text-2xl font-semibold">What guests are saying about {displayName}</h2>
        <div className="w-14 border-b border-neutral-200 dark:border-neutral-700"></div>

        {/* comment */}
        <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
          {reviews.map((review) => (
            <ListingReview key={review.id} className="py-8 first:pt-0 last:pb-0" reivew={review} />
          ))}

          <div className="pt-8">
            <ButtonSecondary>View more 20 reviews</ButtonSecondary>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <main className="container mt-12 mb-24 flex flex-col lg:mb-32 lg:flex-row">
        <div className="mb-24 block grow lg:mb-0">
          <div className="lg:sticky lg:top-5">{renderSidebar()}</div>
        </div>
        <div className="w-full shrink-0 space-y-8 lg:w-3/5 lg:space-y-10 lg:ps-10 xl:w-2/3">
          {renderSectionListings()}
          {renderSectionReviews()}
        </div>
      </main>
    </div>
  )
}

export default Page
