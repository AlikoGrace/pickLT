import rightImgDemo from '@/images/BecomeAnAuthorImg.png'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Heading, Subheading } from '@/shared/Heading'
import Logo from '@/shared/Logo'
import T from '@/utils/getT'
import Image from 'next/image'
import { FC } from 'react'

interface SectionBecomeAnAuthorProps {
  className?: string
  rightImg?: string
  heading?: string
  subHeading?: string
}

const SectionBecomeAnAuthor: FC<SectionBecomeAnAuthorProps> = ({
  className = '',
  rightImg = rightImgDemo,
  heading = 'Why did you choose us?',
  subHeading = 'Join us for a journey full of experiences. With Chisfis, booking resorts, villas, hotels, private homes, and apartments becomes quick, convenient, and easy.',
}) => {
  return (
    <div className={`relative flex flex-col items-center lg:flex-row ${className}`}>
      <div className="mb-16 shrink-0 lg:me-10 lg:mb-0 lg:w-2/5">
        <Logo />

        <Heading className="mt-6 sm:mt-11">{heading}</Heading>
        <Subheading className="mt-6">{subHeading}</Subheading>

        <ButtonPrimary className="mt-6 sm:mt-11">{T['common']['Become an author']}</ButtonPrimary>
      </div>
      <div className="grow">
        <Image alt="choose us" src={rightImg} />
      </div>
    </div>
  )
}

export default SectionBecomeAnAuthor
