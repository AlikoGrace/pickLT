import BackgroundSection from '@/components/BackgroundSection'
import BgGlassmorphism from '@/components/BgGlassmorphism'
import CardCategory6 from '@/components/CardCategory6'
import SectionGridAuthorBox from '@/components/SectionGridAuthorBox'
import SectionGridCategoryBox from '@/components/SectionGridCategoryBox'
import SectionGridFeaturePlaces from '@/components/SectionGridFeaturePlaces'
import SectionSubscribe2 from '@/components/SectionSubscribe2'
import { getAuthors } from '@/data/authors'
import { getStayCategories } from '@/data/categories'
import { getStayListings } from '@/data/listings'
import ButtonPrimary from '@/shared/ButtonPrimary'
import HeadingWithSub from '@/shared/Heading'
import { Metadata } from 'next'
import Image from 'next/image'

export const metadata: Metadata = {
  title: 'Home 2',
  description: 'Booking online & rental online Next.js Template',
}

const SectionHero = () => {
  return (
    <div className={`relative`}>
      <div className="aspect-w-3 relative aspect-h-4 sm:aspect-w-4 sm:aspect-h-3 lg:aspect-w-16 lg:aspect-h-9 xl:aspect-h-8">
        <Image
          className="rounded-xl object-cover object-center"
          src={'https://images.pexels.com/photos/2303781/pexels-photo-2303781.jpeg'}
          alt="hero"
          priority
          fill
          sizes="100vw"
        />
      </div>
      <div className="absolute inset-x-0 top-[10%] mx-auto flex max-w-2xl flex-col items-center text-center sm:top-[15%]">
        <div className="flex flex-col gap-y-5 xl:gap-y-8">
          <span className="font-semibold text-neutral-900 sm:text-lg md:text-xl">
            Booking tax-free from Chisfis platform
          </span>
          <h2 className="text-4xl leading-[1.15]! font-bold text-black md:text-5xl lg:text-6xl xl:text-7xl">
            New generation <br /> of booking
          </h2>
        </div>
        <ButtonPrimary className="mt-10 sm:mt-20 sm:text-lg!">Keep calm & travel on</ButtonPrimary>
      </div>
    </div>
  )
}

async function Home() {
  const authors = await getAuthors()
  const categories = await getStayCategories()
  const categories_1 = categories.slice(0, 8)
  const categories_2 = categories.slice(7, 14)
  const stayListings = await getStayListings()

  return (
    <>
      <main className="relative overflow-hidden">
        {/* GLASSMOPHIN */}
        <BgGlassmorphism />

        {/* SECTION HERO */}
        <div className="container mb-24 md:px-0 2xl:px-10">
          <SectionHero />
        </div>

        <div className="relative container flex flex-col gap-y-24 lg:mb-28 lg:gap-y-32">
          {/* SECTION 1 */}
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-12 flex sm:col-span-6 lg:col-span-4">
              <CardCategory6 category={categories_2[0]} />
            </div>
            <div className="col-span-12 grid grid-rows-2 gap-6 sm:col-span-6 lg:col-span-4">
              <CardCategory6 category={categories_2[3]} />
              <CardCategory6 category={categories_2[1]} />
            </div>
            <div className="col-span-12 flex sm:col-span-6 lg:col-span-4">
              <CardCategory6 category={categories_2[4]} />
            </div>
          </div>

          {/* SECTION */}
          <div>
            <HeadingWithSub subheading={'Keep calm & travel on'}>Explore nearby</HeadingWithSub>
            <SectionGridCategoryBox categories={categories_1} />
          </div>

          {/* SECTION */}
          <div className="relative py-20">
            <BackgroundSection />
            <HeadingWithSub isCenter subheading={'Keep calm & travel on'}>
              Become a host
            </HeadingWithSub>
            <SectionGridAuthorBox authors={authors} boxCard="box2" />
          </div>

          <SectionGridFeaturePlaces stayListings={stayListings} />

          {/* SECTION */}
          <SectionSubscribe2 />
        </div>
      </main>
    </>
  )
}

export default Home
