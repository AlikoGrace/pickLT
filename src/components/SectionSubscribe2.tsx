import rightImg from '@/images/svg-subcribe-2.png'
import { Badge } from '@/shared/Badge'
import ButtonCircle from '@/shared/ButtonCircle'
import { Heading, Subheading } from '@/shared/Heading'
import Input from '@/shared/Input'
import T from '@/utils/getT'
import { ArrowRightIcon } from '@heroicons/react/24/solid'
import Image from 'next/image'
import { FC } from 'react'

interface Props {
  className?: string
}

const SectionSubscribe2: FC<Props> = ({ className = '' }) => {
  return (
    <div className={`relative flex flex-col lg:flex-row lg:items-center ${className}`}>
      <div className="mb-10 shrink-0 lg:me-10 lg:mb-0 lg:w-2/5">
        <Heading>Join our newsletter 🎉</Heading>
        <Subheading className="mt-5">
          Read and share new perspectives on just about any topic. Everyone&apos;s welcome.
        </Subheading>
        <ul className="mt-10 space-y-4">
          <li className="flex items-center gap-x-4">
            <Badge color="blue">01</Badge>
            <span className="font-medium text-neutral-700 dark:text-neutral-300">Get more discount</span>
          </li>
          <li className="flex items-center gap-x-4">
            <Badge color="red">02</Badge>
            <span className="font-medium text-neutral-700 dark:text-neutral-300">Get premium magazines</span>
          </li>
        </ul>
        <form className="relative mt-10 max-w-sm" action={'#'} method="POST">
          <Input
            required
            aria-required
            placeholder={T['common']['Enter your email']}
            type="email"
            rounded="rounded-full"
            sizeClass="h-12 px-5 py-3"
          />
          <div className="absolute end-1.5 top-1/2 -translate-y-1/2">
            <ButtonCircle type="submit">
              <ArrowRightIcon className="size-4! rtl:rotate-180" />
            </ButtonCircle>
          </div>
        </form>
      </div>
      <div className="grow">
        <Image alt="newsletter" src={rightImg} />
      </div>
    </div>
  )
}

export default SectionSubscribe2
