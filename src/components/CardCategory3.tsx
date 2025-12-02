import { TCategory } from '@/data/categories'
import convertNumbThousand from '@/utils/convertNumbThousand'
import Image from 'next/image'
import Link from 'next/link'
import { FC } from 'react'

export interface CardCategory3Props {
  className?: string
  category: TCategory
}

const CardCategory3: FC<CardCategory3Props> = ({ className = '', category }) => {
  const { count, name, href, thumbnail } = category

  return (
    <div className={`group relative flex flex-col ${className}`}>
      <div className={`aspect-w-5 relative h-0 w-full shrink-0 overflow-hidden rounded-2xl aspect-h-5 sm:aspect-h-6`}>
        {thumbnail ? (
          <Image
            src={thumbnail}
            className="rounded-2xl object-cover"
            alt={name}
            fill
            sizes="(max-width: 400px) 100vw, 300px"
          />
        ) : null}
        <span className="absolute inset-0 bg-black/10 opacity-0 transition-opacity group-hover:opacity-100"></span>
      </div>
      <div className="mt-4">
        <h2 className="text-base font-medium text-neutral-900 dark:text-neutral-100">
          <Link href={href} className="absolute inset-0"></Link>
          <span className="line-clamp-1">{name}</span>
        </h2>
        <span className={`mt-1.5 block text-sm text-neutral-600 dark:text-neutral-400`}>
          {convertNumbThousand(count || 0)}+ properties
        </span>
      </div>
    </div>
  )
}

export default CardCategory3
