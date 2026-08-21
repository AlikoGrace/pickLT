import BgGlassmorphism from '@/components/BgGlassmorphism'
import SectionSubscribe2 from '@/components/SectionSubscribe2'
import rightImg from '@/images/about-hero-right.png'
import { Metadata } from 'next'
import SectionHero from './SectionHero'

export const metadata: Metadata = {
  title: 'About Us',
  description: 'PickLT is a moving-services platform for apartments, offices, and belongings across Europe.',
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
          subHeading="PickLT is a moving-services platform. You describe your move, compare movers, and book the one you want — for apartments, offices, and individual belongings across Europe."
        />

        <SectionSubscribe2 />
      </div>
    </div>
  )
}

export default PageAbout
