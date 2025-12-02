import Image, { StaticImageData } from 'next/image'
import { FC, ReactNode } from 'react'

interface Props {
  className?: string
  rightImg: StaticImageData
  heading: ReactNode
  subHeading: string
}

const SectionHero: FC<Props> = ({ className = '', rightImg, heading, subHeading }) => {
  return (
    <div className={`relative ${className}`}>
      <div className="relative flex flex-col items-center gap-10 text-center sm:gap-20 lg:flex-row lg:text-left">
        <div className="w-screen max-w-full xl:max-w-lg">
          <h1 className="text-4xl font-semibold sm:text-5xl">{heading}</h1>
          <p className="mt-7 text-base text-neutral-600 xl:text-lg dark:text-neutral-400">{subHeading}</p>
        </div>
        <div className="grow">
          <Image className="w-full" src={rightImg} alt="" />
        </div>
      </div>
    </div>
  )
}

export default SectionHero
