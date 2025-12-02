'use client'

import { ThemeContext } from '@/app/theme-provider'
import { useCarouselDotButton } from '@/hooks/use-carousel-dot-buttons'
import userImage1 from '@/images/avatars/1.png'
import userImage2 from '@/images/avatars/2.png'
import userImage3 from '@/images/avatars/3.png'
import userImage4 from '@/images/avatars/4.png'
import userImage5 from '@/images/avatars/5.png'
import userImage6 from '@/images/avatars/6.png'
import userImage7 from '@/images/avatars/7.png'
import qlImage from '@/images/avatars/ql.png'
import qrImage from '@/images/avatars/qr.png'
import HeadingWithSub from '@/shared/Heading'
import { StarIcon } from '@heroicons/react/24/solid'
import clsx from 'clsx'
import type { EmblaOptionsType } from 'embla-carousel'
import Autoplay from 'embla-carousel-autoplay'
import useEmblaCarousel from 'embla-carousel-react'
import Image from 'next/image'
import { FC, useContext } from 'react'

const DEMO_DATA = [
  {
    id: 1,
    clientName: 'Tiana Abie',
    content: 'Great quality products, affordable prices, fast and friendly delivery. I very recommend.',
  },
  {
    id: 2,
    clientName: 'Lennie Swiffan',
    content: 'Great quality products, affordable prices, fast and friendly delivery. I very recommend.',
  },
  {
    id: 3,
    clientName: 'Berta Emili',
    content: 'Great quality products, affordable prices, fast and friendly delivery. I very recommend.',
  },
]

interface SectionClientSayProps {
  className?: string
  emblaOptions?: EmblaOptionsType
  heading?: string
  subHeading?: string
}

const SectionClientSay: FC<SectionClientSayProps> = ({
  className,
  emblaOptions = {
    slidesToScroll: 1,
    loop: true,
  },
  heading = 'Good news from far away 🥇',
  subHeading = "Let's see what people think of Chisfis",
}) => {
  const theme = useContext(ThemeContext)

  const [emblaRef, emblaApi] = useEmblaCarousel(
    {
      ...emblaOptions,
      direction: theme?.themeDir,
    },
    [Autoplay({ playOnInit: true, delay: 2000 })]
  )
  const { selectedIndex, scrollSnaps, onDotButtonClick } = useCarouselDotButton(emblaApi)

  return (
    <div className={clsx('relative flow-root', className)}>
      <HeadingWithSub subheading={subHeading} isCenter>
        {heading}
      </HeadingWithSub>
      <div className="relative mx-auto max-w-2xl md:mb-16">
        {/* BACKGROUND USER IMAGES */}
        <div className="hidden md:block">
          <Image sizes="100px" className="absolute top-9 -left-20 size-16" src={userImage2} alt="client" />
          <Image
            sizes="100px"
            className="absolute right-full bottom-[100px] mr-40 size-16"
            src={userImage3}
            alt="client"
          />
          <Image sizes="100px" className="absolute top-full left-[140px] size-16" src={userImage4} alt="client" />
          <Image sizes="100px" className="absolute right-[140px] -bottom-10 size-16" src={userImage5} alt="client" />
          <Image
            sizes="100px"
            className="absolute bottom-[80px] left-full ml-32 size-16"
            src={userImage6}
            alt="client"
          />
          <Image sizes="100px" className="absolute top-10 -right-10 size-16" src={userImage7} alt="client" />
        </div>

        {/* MAIN USER IMAGE */}
        <Image className="mx-auto size-32" src={userImage1} alt="main" />

        {/* SLIDER */}
        <div className="relative mt-12 lg:mt-16">
          <Image
            className="absolute top-1 right-full -mr-16 size-12 opacity-50 md:opacity-100 lg:mr-3"
            src={qlImage}
            alt="ql"
          />
          <Image
            className="absolute top-1 left-full -ml-16 size-12 opacity-50 md:opacity-100 lg:ml-3"
            src={qrImage}
            alt="qr"
          />
          <div className="embla" ref={emblaRef}>
            <ul className="embla__container">
              {DEMO_DATA.map((item) => (
                <li key={item.id} className="flex embla__slide basis-full flex-col items-center text-center">
                  <span className="block text-2xl">{item.content}</span>
                  <span className="mt-8 block text-2xl font-semibold">{item.clientName}</span>
                  <div className="mt-3.5 flex items-center space-x-0.5 text-yellow-500">
                    <StarIcon className="size-6" />
                    <StarIcon className="size-6" />
                    <StarIcon className="size-6" />
                    <StarIcon className="size-6" />
                    <StarIcon className="size-6" />
                  </div>
                </li>
              ))}
            </ul>

            <div className="embla__dots flex items-center justify-center pt-10">
              {scrollSnaps.map((_, index) => (
                <button
                  type="button"
                  key={index}
                  onClick={() => onDotButtonClick(index)}
                  className={clsx(
                    index === selectedIndex ? 'bg-neutral-700' : 'bg-neutral-300',
                    'mx-1 size-2 rounded-full focus:outline-none'
                  )}
                ></button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SectionClientSay
