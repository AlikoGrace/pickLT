import { Calendar01Icon, Comment01Icon, Timer02Icon } from '@/components/Icons'
import StartRating from '@/components/StartRating'
import ButtonSecondary from '@/shared/ButtonSecondary'
import { Divider } from '@/shared/divider'
import { Link } from '@/shared/link'
import { Award04Icon, Flag03Icon, Medal01Icon, Navigation03Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import HostAvatar from './HostAvatar'
import { SectionHeading } from './SectionHeading'

interface Props {
  className?: string
  avatarUrl: string
  displayName: string
  handle: string
  rating: number
  reviewsCount: number
  listingsCount: number
  description: string
  joinedDate: string
  responseRate: number
  responseTime: string
}

const SectionHost = ({
  avatarUrl,
  className,
  description,
  displayName,
  handle,
  joinedDate,
  rating,
  responseRate,
  responseTime,
  reviewsCount,
  listingsCount,
}: Props) => {
  return (
    <div className="listingSection__wrap">
      {/* host */}
      <div className="flex items-center gap-x-4">
        <HostAvatar avatarUrl={avatarUrl} />
        <div>
          <SectionHeading>
            <Link href={'/authors/' + handle}>{displayName}</Link>
          </SectionHeading>
          <div className="mt-1.5 flex items-center text-sm text-neutral-500 dark:text-neutral-400">
            <StartRating point={rating} reviewCount={reviewsCount} />
            <span className="mx-2">·</span>
            <span>{listingsCount} listings</span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-4">
        <div className="flex items-center gap-x-1.5">
          <HugeiconsIcon icon={Medal01Icon} size={20} color="currentColor" strokeWidth={1.5} />
          Supperhost
        </div>
        <div className="w-px bg-neutral-200 dark:bg-neutral-700"></div>
        <div className="flex items-center gap-x-1.5">
          <HugeiconsIcon icon={Award04Icon} size={20} color="currentColor" strokeWidth={1.5} />
          2+ years
        </div>
      </div>

      {/* desc */}
      <p className="block leading-relaxed text-neutral-700 dark:text-neutral-300">{description}</p>

      {/* info */}
      <div className="flex flex-col gap-y-2.5 text-neutral-700 dark:text-neutral-300">
        <div className="flex items-center gap-x-3">
          <Calendar01Icon className="h-6 w-6" />
          <span>Joined in {joinedDate}</span>
        </div>
        <div className="flex items-center gap-x-3">
          <Comment01Icon className="h-6 w-6" />
          <span>Response rate - {responseRate}%</span>
        </div>
        <div className="flex items-center gap-x-3">
          <Timer02Icon className="h-6 w-6" />

          <span>Fast response - {responseTime}</span>
        </div>
      </div>

      {/* == */}
      <div className="flex gap-2">
        <ButtonSecondary href={'/authors/' + handle}>See host profile</ButtonSecondary>
        <ButtonSecondary outline>
          Share
          <HugeiconsIcon icon={Navigation03Icon} size={20} color="currentColor" strokeWidth={1.5} className="mb-px" />
        </ButtonSecondary>
      </div>
      <Divider />
      <div className="flex items-center gap-x-2 text-sm text-neutral-700 dark:text-neutral-300">
        <HugeiconsIcon icon={Flag03Icon} size={16} color="currentColor" strokeWidth={1.5} />
        <span>Report this host</span>
      </div>
    </div>
  )
}

export default SectionHost
