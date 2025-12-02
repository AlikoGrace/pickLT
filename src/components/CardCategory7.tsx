import { TCategory } from '@/data/categories'
import ButtonSecondary from '@/shared/ButtonSecondary'
import { Link } from '@/shared/link'
import Image from 'next/image'
import { FC } from 'react'

interface Props {
  className?: string
  category: TCategory
}

const CardCategory7: FC<Props> = ({ className = '', category: { name, description, count, href, thumbnail } }) => {
  return (
    <div className={className}>
      <div
        className={
          'group/CardCategory7 aspect-w-16 relative h-0 w-full overflow-hidden rounded-2xl aspect-h-10 2xl:aspect-h-9'
        }
      >
        <div>
          <Image
            src={thumbnail}
            fill
            alt={name}
            className="object-cover brightness-100 transition-[filter] group-hover/CardCategory7:brightness-75"
            sizes="300px"
          />
        </div>

        <div>
          <div className="absolute inset-5 flex flex-col items-start gap-y-2.5">
            <div className="max-w-sm">
              <p className={`mb-2 block text-sm text-slate-700`}>Collection</p>
              <h2 className={`text-xl font-semibold text-slate-900 md:text-2xl`}>
                <Link href={href} className="absolute inset-0"></Link>
                {name}
              </h2>
            </div>
            <ButtonSecondary className="mt-auto" href={href}>
              Show more
            </ButtonSecondary>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CardCategory7
