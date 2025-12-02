'use client'

import { ButtonCircle } from '@/shared/Button'
import SocialsShare from '@/shared/SocialsShare'
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react'
import { HeartIcon as HeartIconOutline } from '@heroicons/react/24/outline'
import { HeartIcon } from '@heroicons/react/24/solid'
import { Share03Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import clsx from 'clsx'
import { useState } from 'react'

export const LikeButton = () => {
  const [isLiked, setIsLiked] = useState(false)
  return (
    <ButtonCircle outline onClick={() => setIsLiked(!isLiked)}>
      {isLiked ? <HeartIcon className={'size-5! text-red-400'} /> : <HeartIconOutline className="size-5!" />}
    </ButtonCircle>
  )
}

export const ShareButton = () => {
  return (
    <Popover className="relative">
      <PopoverButton as={ButtonCircle} outline>
        <HugeiconsIcon icon={Share03Icon} size={20} color="currentColor" strokeWidth={1.5} />
      </PopoverButton>
      <PopoverPanel
        anchor={{
          to: 'bottom end',
          gap: 12,
        }}
        className="relative z-10"
      >
        <div className="w-48 rounded-xl border bg-white px-4 py-2.5 dark:bg-neutral-800">
          <SocialsShare />
        </div>
      </PopoverPanel>
    </Popover>
  )
}

const LikeSaveBtns = ({ className }: { className?: string }) => {
  return (
    <div className={clsx('flex gap-2', className)}>
      <LikeButton />
      <ShareButton />
    </div>
  )
}

export default LikeSaveBtns
