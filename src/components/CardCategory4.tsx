import { TCategory } from '@/data/categories'
import convertNumbThousand from '@/utils/convertNumbThousand'
import Image from 'next/image'
import Link from 'next/link'
import { FC } from 'react'

export interface CardCategory4Props {
  className?: string
  category: TCategory
}

const CardCategory4: FC<CardCategory4Props> = ({ className = '', category }) => {
  const { count, name, href, thumbnail } = category
  return (
    <Link href={href} className={`group flex flex-col ${className}`}>
      <div className={`aspect-w-5 relative h-0 w-full shrink-0 overflow-hidden rounded-2xl aspect-h-5`}>
        <Image
          src={thumbnail || ''}
          className="rounded-2xl object-cover"
          fill
          alt={name}
          sizes="(max-width: 400px) 100vw, 400px"
        />
        <span className="absolute inset-0 bg-black/10 opacity-0 transition-opacity group-hover:opacity-100"></span>
      </div>
      <div className="mt-4 truncate px-2 text-center">
        <h2 className={`truncate text-base font-medium text-neutral-900 lg:text-lg dark:text-neutral-100`}>{name}</h2>
        <span className={`mt-2 block text-sm text-neutral-600 dark:text-neutral-400`}>
          {convertNumbThousand(count || 0)}+ properties
        </span>
      </div>
    </Link>
  )
}

export default CardCategory4
