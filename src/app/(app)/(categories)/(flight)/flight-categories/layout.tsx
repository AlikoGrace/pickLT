import { ApplicationLayout } from '@/app/(app)/application-layout'
import BackgroundSection from '@/components/BackgroundSection'
import BgGlassmorphism from '@/components/BgGlassmorphism'
import SectionGridAuthorBox from '@/components/SectionGridAuthorBox'
import SectionSliderNewCategories from '@/components/SectionSliderNewCategories'
import SectionSubscribe2 from '@/components/SectionSubscribe2'
import { getAuthors } from '@/data/authors'
import { getStayCategories } from '@/data/categories'
import Heading from '@/shared/Heading'
import { ReactNode } from 'react'

const Layout = async ({ children }: { children: ReactNode }) => {
  const categories = (await getStayCategories()).slice(7, 15)
  const authors = await getAuthors()

  return (
    <ApplicationLayout>
      <BgGlassmorphism />

      {children}

      <div className="container">
        <div className="relative py-16 lg:py-20">
          <BackgroundSection />
          <Heading subheading="Explore houses based on 10 types of stays">Explore the world with us.</Heading>
          <SectionSliderNewCategories
            itemClassName="w-[17rem] lg:w-1/3 xl:w-1/4"
            categories={categories}
            categoryCardType="card5"
          />
        </div>
        <SectionSubscribe2 className="py-24 lg:py-32" />
        <div className="relative mb-24 py-16 lg:mb-28 lg:py-20">
          <BackgroundSection />
          <Heading subheading="Meet our top 10 authors of the month" isCenter>
            Top 10 author of the month.
          </Heading>
          <SectionGridAuthorBox authors={authors} />
        </div>
      </div>
    </ApplicationLayout>
  )
}

export default Layout
