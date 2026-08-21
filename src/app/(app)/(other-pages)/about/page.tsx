import BgGlassmorphism from '@/components/BgGlassmorphism'
import SectionSubscribe2 from '@/components/SectionSubscribe2'
import rightImg from '@/images/about-hero-right.png'
import { getTranslations } from '@/lib/i18n-server'
import { Metadata } from 'next'
import SectionHero from './SectionHero'

// § 7.8 — module-scope `metadata` cannot read the request locale.
export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslations()
  return {
    title: t('web:seo.about.title'),
    description: t('web:seo.about.description'),
  }
}

const PageAbout = async () => {
  const { t } = await getTranslations()

  return (
    <div className="relative overflow-hidden">
      {/* ======== BG GLASS ======== */}
      <BgGlassmorphism />

      <div className="container flex flex-col gap-y-16 py-16 lg:gap-y-28 lg:py-28">
        <SectionHero
          rightImg={rightImg}
          heading={t('web:about.hero.title')}
          subHeading={t('web:about.hero.subtitle')}
        />

        <SectionSubscribe2 />
      </div>
    </div>
  )
}

export default PageAbout
