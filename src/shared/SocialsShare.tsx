import { Facebook01Icon, Mail01Icon, NewTwitterIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon, IconSvgElement } from '@hugeicons/react'
import Link from 'next/link'
import { FC } from 'react'

interface SocialsShareProps {
  className?: string
  itemClass?: string
  socials?: SocialType[]
}

export interface SocialType {
  name: string
  icon: IconSvgElement
  href: string
}

const socialsDemo: SocialType[] = [
  {
    name: 'Facebook',
    href: '#',
    icon: Facebook01Icon,
  },
  {
    name: 'Email',
    href: '#',
    icon: Mail01Icon,
  },
  {
    name: 'Twitter',
    href: '#',
    icon: NewTwitterIcon,
  },
]

const SocialsShare: FC<SocialsShareProps> = ({
  className = 'flex flex-col',
  itemClass = '',
  socials = socialsDemo,
}) => {
  const renderItem = (item: SocialType, index: number) => {
    return (
      <Link
        key={index}
        href={item.href}
        className={`-mx-2 flex items-center gap-x-2.5 rounded-lg bg-white p-2.5 text-neutral-600 hover:bg-neutral-100 ${itemClass}`}
        title={`Share on ${item.name}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        <HugeiconsIcon icon={item.icon} size={24} color="currentColor" strokeWidth={1.5} />
        <p className="text-sm">{item.name}</p>
      </Link>
    )
  }

  return <div className={className}>{socials.map(renderItem)}</div>
}

export default SocialsShare
