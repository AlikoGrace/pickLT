import { TCategory } from '@/data/categories'
import { Badge } from '@/shared/Badge'
import { Link } from '@/shared/link'
import convertNumbThousand from '@/utils/convertNumbThousand'
import Image from 'next/image'
import { FC } from 'react'

export interface CardCategoryBox1Props {
  className?: string
  category: TCategory
}

const CardCategoryBox1: FC<CardCategoryBox1Props> = ({ className = '', category }) => {
  const { count, name, thumbnail, href } = category
  return (
    <Link href={href} className={`relative flex items-center nc-box-has-hover p-3 sm:p-6 ${className}`}>
      <Badge className="absolute end-2.5 top-2.5" color="zinc">
        +{convertNumbThousand(count)}
      </Badge>

      <div className="relative size-24 shrink-0 overflow-hidden rounded-full">
        <Image src={thumbnail || ''} fill alt={name} sizes="(max-width: 400px) 100vw, 400px" />
      </div>
      <div className="ms-4 grow overflow-hidden">
        <h2 className="text-base font-medium">
          <span className="line-clamp-1">{name}</span>
        </h2>
        <span className={`mt-2 block text-sm text-neutral-500 dark:text-neutral-400`}>19 minutes drive</span>
      </div>
    </Link>
  )
}

export default CardCategoryBox1
