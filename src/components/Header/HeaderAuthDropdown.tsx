'use client'

import { useAuth } from '@/context/auth'
import AvatarDropdown from './AvatarDropdown'
import CategoriesDropdown from './CategoriesDropdown'

interface Props {
  className?: string
  /** When true, show CategoriesDropdown (sign-in) even if the user is loading. Default false. */
  hideWhileLoading?: boolean
}

/**
 * Auth-aware header dropdown.
 * Shows AvatarDropdown when authenticated, CategoriesDropdown (sign-in) when not.
 */
export default function HeaderAuthDropdown({ className, hideWhileLoading }: Props) {
  const { isAuthenticated, isLoading } = useAuth()

  // While loading, optionally hide or show a placeholder
  if (isLoading) {
    if (hideWhileLoading) return null
    // Show a shimmer placeholder to avoid layout shift
    return (
      <div className={className}>
        <div className="size-8 animate-pulse rounded-full bg-neutral-200 dark:bg-neutral-700" />
      </div>
    )
  }

  if (isAuthenticated) {
    return <AvatarDropdown className={className} />
  }

  return <CategoriesDropdown />
}
