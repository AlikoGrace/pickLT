import LikeSaveBtns from '@/components/LikeSaveBtns'
import StartRating from '@/components/StartRating'
import { Badge } from '@/shared/Badge'
import { Divider } from '@/shared/divider'
import { Location06Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import React from 'react'
import HostAvatar from './HostAvatar'

interface Props {
  title: string
  listingCategory: string
  reviewStart: number
  reviewCount: number
  address: string
  host: {
    displayName: string
    avatarUrl: string
  }
  children?: React.ReactNode
}

const SectionHeader = ({ address, host, listingCategory, reviewCount, reviewStart, title, children }: Props) => {
  return (
    <div className="relative listingSection__wrap">
      <LikeSaveBtns className="absolute end-0 -top-2 sm:end-3 sm:top-3 md:end-5 md:top-5" />
      <div className="flex flex-col items-start gap-y-6">
        <Badge>{listingCategory}</Badge>
        <h1 className="text-2xl font-semibold sm:text-3xl">{title}</h1>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
          <StartRating size="lg" point={reviewStart} reviewCount={reviewCount} />
          <span>·</span>
          <div className="flex items-center">
            <HugeiconsIcon icon={Location06Icon} size={20} color="currentColor" className="mb-0.5" strokeWidth={1.5} />
            <span className="ms-1.5 text-neutral-700 dark:text-neutral-300">{address}</span>
          </div>
        </div>

        <div className="flex items-center">
          <HostAvatar
            verifiedSize="size-4 *:data-[slot=icon]:size-3!"
            avatarUrl={host.avatarUrl}
            avatarSize="size-10"
          />
          <span className="ms-2.5 text-neutral-500 dark:text-neutral-400">
            Hosted by <span className="font-medium text-neutral-900 dark:text-neutral-200">{host.displayName}</span>
          </span>
        </div>
      </div>

      <Divider className="w-14!" />

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-neutral-700 sm:gap-x-8 xl:justify-start xl:gap-x-12 dark:text-neutral-300">
        {children}
      </div>
    </div>
  )
}

export default SectionHeader
