import { TCategory } from '@/data/categories'
import convertNumbThousand from '@/utils/convertNumbThousand'
import Image from 'next/image'
import Link from 'next/link'
import { FC } from 'react'

export interface CardCategory6Props {
  className?: string
  category: TCategory
}

const CardCategory6: FC<CardCategory6Props> = ({ className = 'flex-1', category }) => {
  const { count, name, href, thumbnail } = category
  return (
    <Link href={href} className={`group relative z-0 flex w-full overflow-hidden rounded-2xl ${className}`}>
      <div className="aspect-w-16 h-0 w-full aspect-h-10 sm:aspect-h-12 xl:aspect-h-9"></div>
      <Image
        fill
        alt={name}
        src={thumbnail}
        className="rounded-2xl object-cover duration-300 group-hover:scale-105"
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
      />
      <div className="absolute inset-x-0 bottom-0 p-4 text-white sm:p-6">
        <span className="absolute inset-0 bg-linear-to-t from-black/60"></span>
        <h2 className={`relative text-lg font-semibold`}>{name}</h2>
        <span className={`relative mt-1.5 block text-sm text-neutral-100`}>
          {convertNumbThousand(count)}+ properties
        </span>
      </div>
    </Link>
  )
}

export default CardCategory6
