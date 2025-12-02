import { Divider } from '@/shared/divider'
import { SectionHeading, SectionSubheading } from './SectionHeading'

interface Props {
  className?: string
  heading?: string
  subheading?: string
}

const SectionMap = ({ className, heading, subheading }: Props) => {
  return (
    <div className="listingSection__wrap">
      {/* HEADING */}
      <div>
        <SectionHeading>Location </SectionHeading>
        <SectionSubheading> San Diego, CA, United States of America (SAN-San Diego Intl.) </SectionSubheading>
      </div>
      <Divider className="w-14!" />

      {/* MAP */}
      <div className="aspect-w-5 rounded-xl ring-1 ring-black/10 aspect-h-6 sm:aspect-h-3 lg:aspect-h-2">
        <div className="z-0 overflow-hidden rounded-xl">
          <iframe
            width="100%"
            height="100%"
            loading="lazy"
            allowFullScreen
            referrerPolicy="no-referrer-when-downgrade"
            src="https://www.google.com/maps/embed/v1/place?key=AIzaSyAGVJfZMAKYfZ71nzL_v5i3LjTTWnCYwTY&q=Eiffel+Tower,Paris+France"
          ></iframe>
        </div>
      </div>
    </div>
  )
}

export default SectionMap
