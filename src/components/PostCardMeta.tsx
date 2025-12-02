import Avatar from '@/shared/Avatar'
import { FC } from 'react'

interface PostCardMetaProps {
  className?: string
  author: {
    displayName: string
    href: string
    avatar: string
  }
  date: string
  // Optional props
  hiddenAvatar?: boolean
  size?: 'large' | 'normal'
}

const PostCardMeta: FC<PostCardMetaProps> = ({
  className = 'leading-none',
  author,
  date,
  hiddenAvatar = false,
  size = 'normal',
}) => {
  return (
    <div
      className={`inline-flex flex-wrap items-center text-neutral-800 dark:text-neutral-200 ${
        size === 'normal' ? 'text-sm' : 'text-base'
      } ${className}`}
    >
      <div className="relative flex shrink-0 items-center gap-x-2">
        {!hiddenAvatar && <Avatar className={size === 'normal' ? 'size-7' : 'size-10'} src={author.avatar} />}
        <span className="block font-medium text-neutral-600 hover:text-black dark:text-neutral-300 dark:hover:text-white">
          {author.displayName}
        </span>
      </div>
      <>
        <span className="mx-[6px] font-medium text-neutral-500 dark:text-neutral-400">·</span>
        <span className="line-clamp-1 font-normal text-neutral-500 dark:text-neutral-400">{date}</span>
      </>
    </div>
  )
}

export default PostCardMeta
