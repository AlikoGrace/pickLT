'use client'

import { useAuth } from '@/context/auth'
import Avatar from '@/shared/Avatar'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'

const MobileAuthIndicator = () => {
  const { t } = useTranslation()
  const { user, isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return <div className="size-9 shrink-0 animate-pulse rounded-full bg-neutral-200 dark:bg-neutral-700" />
  }

  if (!isAuthenticated || !user) {
    return <div className="w-9 shrink-0" />
  }

  const initials = user.fullName
    ? user.fullName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?'

  return (
    <Link
      href={user.userType === 'mover' ? '/dashboard' : '/account'}
      className="shrink-0 rounded-full"
      aria-label={t('web:nav.account.a11y')}
    >
      <Avatar
        src={user.profilePhoto || undefined}
        initials={!user.profilePhoto ? initials : undefined}
        className="size-9 bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300"
      />
    </Link>
  )
}

export default MobileAuthIndicator
