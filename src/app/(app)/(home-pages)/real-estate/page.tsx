import BackgroundSection from '@/components/BackgroundSection'
import { RealEstateHeroSearchForm } from '@/components/HeroSearchForm/RealEstateHeroSearchForm'
import SectionDowloadApp from '@/components/SectionDowloadApp'
import SectionGridAuthorBox from '@/components/SectionGridAuthorBox'
import SectionGridFeatureProperty from '@/components/SectionGridFeatureProperty'
import SectionOurFeatures from '@/components/SectionOurFeatures'
import SectionSliderNewCategories from '@/components/SectionSliderNewCategories'
import SectionSubscribe2 from '@/components/SectionSubscribe2'
import { getAuthors } from '@/data/authors'
import { getRealEstateCategories } from '@/data/categories'
import { getRealEstateListings } from '@/data/listings'
import heroImage from '@/images/hero-right-3.png'
import logo1Dark from '@/images/logos/dark/1.png'
import logo2Dark from '@/images/logos/dark/2.png'
import logo3Dark from '@/images/logos/dark/3.png'
import logo4Dark from '@/images/logos/dark/4.png'
import logo5Dark from '@/images/logos/dark/5.png'
import logo1 from '@/images/logos/nomal/1.png'
import logo2 from '@/images/logos/nomal/2.png'
import logo3 from '@/images/logos/nomal/3.png'
import logo4 from '@/images/logos/nomal/4.png'
import logo5 from '@/images/logos/nomal/5.png'
import ourFeatureImage from '@/images/our-features-2.png'
import HeadingWithSub from '@/shared/Heading'
import { Metadata } from 'next'
import Image from 'next/image'

export const metadata: Metadata = {
  title: 'Home Real Estate',
  description: 'Booking online & rental online Next.js Template',
}

const SectionHero = () => {
  return (
    <div className="relative">
      <div className="absolute inset-y-0 end-0 w-full grow lg:w-3/4">
        <Image
          fill
          className="object-cover"
          src={heroImage}
          alt="hero"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          priority
        />
      </div>
      <div className="relative py-24 lg:py-20">
        <div className="relative inline-flex">
          <div className="absolute inset-y-0 end-20 w-screen bg-primary-500 md:end-40"></div>
          <div className="relative max-w-2xl py-10 text-white sm:py-20 xl:py-24">
            <h2 className="text-4xl/[1.1] font-semibold text-pretty md:text-6xl/[1.1] xl:text-7xl/[1.1]">
              Discover Your <br />
              Perfect Property
            </h2>
          </div>
        </div>
        <div className="hidden w-full lg:mt-20 lg:block">
          <RealEstateHeroSearchForm formStyle="default" />
        </div>
      </div>
    </div>
  )
}

const SectionLogoCloud = () => {
  const data = [
    {
      id: 1,
      src: logo1,
      srcDark: logo1Dark,
    },
    {
      id: 2,
      src: logo2,
      srcDark: logo2Dark,
    },
    {
      id: 3,
      src: logo3,
      srcDark: logo3Dark,
    },
    {
      id: 4,
      src: logo4,
      srcDark: logo4Dark,
    },
    {
      id: 5,
      src: logo5,
      srcDark: logo5Dark,
    },
  ]

  return (
    <div className="grid grid-cols-3 gap-5 sm:gap-16 lg:grid-cols-5">
      {data.map((item) => (
        <div key={item.id} className="flex items-end justify-center">
          <Image className="block dark:hidden" src={item.src} alt={`logo-${item.id}`} />
          <Image className="hidden dark:block" src={item.srcDark} alt={`logo-${item.id}`} />
        </div>
      ))}
    </div>
  )
}

async function Home() {
  const authors = await getAuthors()
  const categories = await getRealEstateCategories()
  const listings = await getRealEstateListings()

  return (
    <main className="relative overflow-hidden">
      <div className="relative container mb-24 flex flex-col gap-y-24 lg:mb-28 lg:gap-y-32">
        <SectionHero />
        <SectionOurFeatures type="type2" rightImg={ourFeatureImage} />
        <SectionGridFeatureProperty listing={listings} />
        <div className="relative py-20">
          <BackgroundSection className="bg-neutral-100 dark:bg-black/20" />
          <HeadingWithSub isCenter subheading="Discover the stories behind our listings.">
            Meet our authors
          </HeadingWithSub>
          <SectionGridAuthorBox boxCard="box2" authors={authors} />
        </div>
        <SectionLogoCloud />
        <SectionDowloadApp />
        <div>
          <HeadingWithSub subheading="Explore the best places to stay in the world.">
            Let&apos;s go on an adventure
          </HeadingWithSub>
          <SectionSliderNewCategories categoryCardType="card4" categories={categories.slice(0, 7)} />
        </div>

        <SectionSubscribe2 />
      </div>
    </main>
  )
}

export default Home
