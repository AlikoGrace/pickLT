import { ApplicationLayout } from '@/app/(app)/application-layout'
import BackgroundSection from '@/components/BackgroundSection'
import BgGlassmorphism from '@/components/BgGlassmorphism'
import SectionSliderNewCategories from '@/components/SectionSliderNewCategories'
import SectionSubscribe2 from '@/components/SectionSubscribe2'
import { getAuthors } from '@/data/authors'
import { getCarCategories } from '@/data/categories'
import Heading from '@/shared/Heading'
import { ReactNode } from 'react'

const Layout = async ({ children }: { children: ReactNode }) => {
  const categories = (await getCarCategories()).slice(0, 7)
  const authors = await getAuthors()

  return (
    <ApplicationLayout>
      <BgGlassmorphism />

      {children}

      <div className="container">
        <div className="relative py-16 lg:py-20">
          <BackgroundSection />
          <Heading subheading="Explore type of car">Explore the world with us.</Heading>
          <SectionSliderNewCategories
            itemClassName="w-[17rem] lg:w-1/3 xl:w-1/4"
            categories={categories}
            categoryCardType="card5"
          />
        </div>
        <SectionSubscribe2 className="py-24 lg:py-32" />
      </div>
    </ApplicationLayout>
  )
}

export default Layout
