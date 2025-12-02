import CardAuthorBox from '@/components/CardAuthorBox'
import CardAuthorBox2 from '@/components/CardAuthorBox2'
import { TAuthor } from '@/data/authors'
import { Button } from '@/shared/Button'
import ButtonPrimary from '@/shared/ButtonPrimary'
import T from '@/utils/getT'
import { FC } from 'react'

interface Props {
  className?: string
  authors: TAuthor[]
  boxCard?: 'box1' | 'box2'
  gridClassName?: string
}

const SectionGridAuthorBox: FC<Props> = ({
  className = '',
  authors,
  boxCard = 'box1',
  gridClassName = 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 ',
}) => {
  return (
    <div className={`relative ${className}`}>
      <div className={`grid gap-6 md:gap-8 ${gridClassName}`}>
        {authors.map((author, index) =>
          boxCard === 'box2' ? (
            <CardAuthorBox2 key={author.id} author={author} />
          ) : (
            <CardAuthorBox index={index < 3 ? index + 1 : undefined} key={author.id} author={author} />
          )
        )}
      </div>
      <div className="mt-16 flex flex-col justify-center gap-y-3 sm:flex-row sm:gap-x-5 sm:gap-y-0">
        <Button color="light">{T['common']['Show me more']}</Button>
        <ButtonPrimary>{T['common']['Become a host']}</ButtonPrimary>
      </div>
    </div>
  )
}

export default SectionGridAuthorBox
