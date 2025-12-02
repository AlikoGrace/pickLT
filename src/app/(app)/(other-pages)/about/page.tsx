import BackgroundSection from '@/components/BackgroundSection'
import BgGlassmorphism from '@/components/BgGlassmorphism'
import SectionClientSay from '@/components/SectionClientSay'
import SectionSubscribe2 from '@/components/SectionSubscribe2'
import rightImg from '@/images/about-hero-right.png'
import { Metadata } from 'next'
import SectionFounder from './SectionFounder'
import SectionHero from './SectionHero'
import SectionStatistic from './SectionStatistic'

export const metadata: Metadata = {
  title: 'About Us',
  description:
    'The about us page provides an overview of our mission, values, and the team behind our company. It highlights our commitment to excellence and innovation in our industry.',
}

const PageAbout = () => {
  return (
    <div className="relative overflow-hidden">
      {/* ======== BG GLASS ======== */}
      <BgGlassmorphism />

      <div className="container flex flex-col gap-y-16 py-16 lg:gap-y-28 lg:py-28">
        <SectionHero
          rightImg={rightImg}
          heading="👋 About Us."
          subHeading="We're impartial and independent, and every day we create distinctive, world-class programmes and content which inform, educate and entertain millions of people in the around the world."
        />

        <SectionFounder />
        <div className="relative py-20">
          <BackgroundSection />
          <SectionClientSay />
        </div>

        <SectionStatistic />

        <SectionSubscribe2 />
      </div>
    </div>
  )
}

export default PageAbout
