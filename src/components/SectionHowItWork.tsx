import HIW1img from '@/images/HIW1.png'
import HIW2img from '@/images/HIW2.png'
import HIW3img from '@/images/HIW3.png'
import VectorImg from '@/images/VectorHIW.svg'
import Heading from '@/shared/Heading'
import Image, { StaticImageData } from 'next/image'
import { FC } from 'react'

export interface SectionHowItWorkProps {
  className?: string
  data?: {
    id: number
    title: string
    desc: string
    img: StaticImageData
    imgDark?: StaticImageData
  }[]
  title?: string
}

const DEMO_DATA: SectionHowItWorkProps['data'] = [
  {
    id: 1,
    img: HIW1img,
    title: 'Book & relax',
    desc: 'Let each trip be an inspirational journey, each room a peaceful space',
  },
  {
    id: 2,
    img: HIW2img,
    title: 'Smart checklist',
    desc: 'Let each trip be an inspirational journey, each room a peaceful space',
  },
  {
    id: 3,
    img: HIW3img,
    title: 'Save more',
    desc: 'Let each trip be an inspirational journey, each room a peaceful space',
  },
]

const SectionHowItWork: FC<SectionHowItWorkProps> = ({ className = '', data = DEMO_DATA, title = 'How it work' }) => {
  return (
    <div className={`nc-SectionHowItWork ${className}`} data-nc-id="SectionHowItWork">
      <Heading isCenter subheading="Keep calm & travel on">
        {title}
      </Heading>
      <div className="relative mt-20 grid gap-20 md:grid-cols-3">
        <Image className="absolute inset-x-0 top-10 hidden md:block" src={VectorImg} alt="vector" />
        {data.map((item) => (
          <div key={item.id} className="relative mx-auto flex max-w-xs flex-col items-center">
            {item.imgDark ? (
              <>
                <Image className="mx-auto mb-8 block max-w-[180px] dark:hidden" src={item.img} alt="how it work" />
                <Image alt="how it work" className="mx-auto mb-8 hidden max-w-[180px] dark:block" src={item.imgDark} />
              </>
            ) : (
              <Image alt="" className="mx-auto mb-8 max-w-[180px]" src={item.img} />
            )}
            <div className="mt-auto text-center">
              <h3 className="text-xl font-semibold">{item.title}</h3>
              <span className="mt-5 block text-neutral-500 dark:text-neutral-400">{item.desc}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default SectionHowItWork
