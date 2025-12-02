import Heading from '@/shared/Heading'
import { FC } from 'react'

const facts = [
  {
    id: '1',
    heading: '10 million',
    subHeading: 'Articles have been public around the world (as of Sept. 30, 2021)',
  },
  {
    id: '2',
    heading: '100,000',
    subHeading: 'Registered users account (as of Sept. 30, 2021)',
  },
  {
    id: '3',
    heading: '220+',
    subHeading: 'Countries and regions have our presence (as of Sept. 30, 2021)',
  },
]

interface SectionStatisticProps {
  className?: string
}

const SectionStatistic: FC<SectionStatisticProps> = ({ className = '' }) => {
  return (
    <div className={`relative ${className}`}>
      <Heading
        subheading="We're impartial and independent, and every day we create distinctive,
          world-class programmes and content"
      >
        🚀 Fast Facts
      </Heading>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:gap-8">
        {facts.map((item) => (
          <div key={item.id} className="rounded-2xl bg-neutral-50 p-6 dark:border-neutral-800 dark:bg-neutral-800">
            <h3 className="text-2xl leading-none font-semibold text-neutral-900 md:text-3xl dark:text-neutral-200">
              {item.heading}
            </h3>
            <span className="mt-3 block text-sm text-neutral-500 sm:text-base dark:text-neutral-400">
              {item.subHeading}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default SectionStatistic
