'use client'

import { HeartIcon } from '@heroicons/react/24/outline'
import { HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid'
import clsx from 'clsx'
import { FC, useState } from 'react'

interface BtnLikeIconProps {
  className?: string
  colorClass?: string
  sizeClass?: string
  isLiked?: boolean
}

const BtnLikeIcon: FC<BtnLikeIconProps> = ({
  className,
  colorClass = 'text-white bg-black/30 hover:bg-black/50',
  sizeClass = 'w-8 h-8',
  isLiked = false,
}) => {
  const [likedState, setLikedState] = useState(isLiked)

  return (
    <div
      className={clsx(
        `flex cursor-pointer items-center justify-center rounded-full transition-colors`,
        className,
        colorClass,
        sizeClass,
        likedState && 'text-red-500'
      )}
      onClick={() => setLikedState(!likedState)}
    >
      {likedState ? <HeartIconSolid className="size-5" /> : <HeartIcon className="size-5" />}
    </div>
  )
}

export default BtnLikeIcon
