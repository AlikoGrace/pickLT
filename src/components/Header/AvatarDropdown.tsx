'use client'

import { useAuth } from '@/context/auth'
import Avatar from '@/shared/Avatar'
import { Divider } from '@/shared/divider'
import { Link } from '@/shared/link'
import SwitchDarkMode2 from '@/shared/SwitchDarkMode2'
import { CloseButton, Popover, PopoverButton, PopoverPanel } from '@headlessui/react'
import {
  BulbChargingIcon,
  DashboardSquare01Icon,
  Idea01Icon,
  Logout01Icon,
  Task01Icon,
  TruckIcon,
  UserIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useRouter } from 'next/navigation'

interface Props {
  className?: string
}

export default function AvatarDropdown({ className }: Props) {
  const { user, logout } = useAuth()
  const router = useRouter()

  const handleLogout = async () => {
    await logout()
    router.push('/')
  }

  // Compute initials from user's full name
  const initials = user?.fullName
    ? user.fullName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?'

  const isMover = user?.userType === 'mover'

  return (
    <div className={className}>
      <Popover>
        <PopoverButton className="-m-1.5 flex cursor-pointer items-center justify-center rounded-full p-1.5 hover:bg-neutral-100 focus-visible:outline-hidden dark:hover:bg-neutral-800">
          <Avatar
            src={user?.profilePhoto || undefined}
            initials={!user?.profilePhoto ? initials : undefined}
            className="size-8 bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300"
          />
        </PopoverButton>

        <PopoverPanel
          transition
          anchor={{
            to: 'bottom end',
            gap: 16,
          }}
          className="z-40 w-80 rounded-3xl shadow-lg ring-1 ring-black/5 transition duration-200 ease-in-out data-closed:translate-y-1 data-closed:opacity-0"
        >
          <div className="relative grid grid-cols-1 gap-6 bg-white px-6 py-7 dark:bg-neutral-800">
            {/* User identity */}
            <div className="flex items-center space-x-3">
              <Avatar
                src={user?.profilePhoto || undefined}
                initials={!user?.profilePhoto ? initials : undefined}
                className="size-12 bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300"
              />
              <div className="min-w-0 grow">
                <h4 className="truncate font-semibold">{user?.fullName || 'User'}</h4>
                <p className="mt-0.5 truncate text-xs text-neutral-500">
                  {user?.email || ''}
                </p>
              </div>
            </div>

            <Divider />

            {/* Mover-specific links */}
            {isMover && (
              <CloseButton
                as={Link}
                href="/dashboard"
                className="-m-3 flex items-center rounded-lg p-2 transition duration-150 ease-in-out hover:bg-neutral-100 focus:outline-hidden focus-visible:ring-3 focus-visible:ring-orange-500/50 dark:hover:bg-neutral-700"
              >
                <div className="flex shrink-0 items-center justify-center text-neutral-500 dark:text-neutral-300">
                  <HugeiconsIcon icon={DashboardSquare01Icon} size={24} strokeWidth={1.5} />
                </div>
                <p className="ms-4 text-sm font-medium">Mover Dashboard</p>
              </CloseButton>
            )}

            {/* Client links */}
            {!isMover && (
              <CloseButton
                as={Link}
                href="/dashboard"
                className="-m-3 flex items-center rounded-lg p-2 transition duration-150 ease-in-out hover:bg-neutral-100 focus:outline-hidden focus-visible:ring-3 focus-visible:ring-orange-500/50 dark:hover:bg-neutral-700"
              >
                <div className="flex shrink-0 items-center justify-center text-neutral-500 dark:text-neutral-300">
                  <HugeiconsIcon icon={Task01Icon} size={24} strokeWidth={1.5} />
                </div>
                <p className="ms-4 text-sm font-medium">My Moves</p>
              </CloseButton>
            )}

            {/* My Account / Settings */}
            <CloseButton
              as={Link}
              href={isMover ? '/settings' : '/account'}
              className="-m-3 flex items-center rounded-lg p-2 transition duration-150 ease-in-out hover:bg-neutral-100 focus:outline-hidden focus-visible:ring-3 focus-visible:ring-orange-500/50 dark:hover:bg-neutral-700"
            >
              <div className="flex shrink-0 items-center justify-center text-neutral-500 dark:text-neutral-300">
                <HugeiconsIcon icon={UserIcon} size={24} strokeWidth={1.5} />
              </div>
              <p className="ms-4 text-sm font-medium">
                {isMover ? 'Settings' : 'My Account'}
              </p>
            </CloseButton>

            {/* Become a Mover link (only for clients) */}
            {!isMover && (
              <CloseButton
                as={Link}
                href="/login?type=mover"
                className="-m-3 flex items-center rounded-lg p-2 transition duration-150 ease-in-out hover:bg-neutral-100 focus:outline-hidden focus-visible:ring-3 focus-visible:ring-orange-500/50 dark:hover:bg-neutral-700"
              >
                <div className="flex shrink-0 items-center justify-center text-neutral-500 dark:text-neutral-300">
                  <HugeiconsIcon icon={TruckIcon} size={24} strokeWidth={1.5} />
                </div>
                <p className="ms-4 text-sm font-medium">Become a Mover</p>
              </CloseButton>
            )}

            <Divider />

            {/* Dark Mode toggle */}
            <div className="-m-3 flex items-center justify-between rounded-lg p-2 hover:bg-neutral-100 focus:outline-none focus-visible:ring-3 focus-visible:ring-orange-500/50 dark:hover:bg-neutral-700">
              <div className="flex items-center">
                <div className="flex shrink-0 items-center justify-center text-neutral-500 dark:text-neutral-300">
                  <HugeiconsIcon icon={Idea01Icon} size={24} strokeWidth={1.5} />
                </div>
                <p className="ms-4 text-sm font-medium">Dark theme</p>
              </div>
              <SwitchDarkMode2 />
            </div>

            {/* Help */}
            <CloseButton
              as={Link}
              href="#"
              className="-m-3 flex items-center rounded-lg p-2 transition duration-150 ease-in-out hover:bg-neutral-100 focus:outline-hidden focus-visible:ring-3 focus-visible:ring-orange-500/50 dark:hover:bg-neutral-700"
            >
              <div className="flex shrink-0 items-center justify-center text-neutral-500 dark:text-neutral-300">
                <HugeiconsIcon icon={BulbChargingIcon} size={24} strokeWidth={1.5} />
              </div>
              <p className="ms-4 text-sm font-medium">Help</p>
            </CloseButton>

            {/* Log out */}
            <button
              onClick={handleLogout}
              className="-m-3 flex w-full items-center rounded-lg p-2 text-left transition duration-150 ease-in-out hover:bg-neutral-100 focus:outline-hidden focus-visible:ring-3 focus-visible:ring-orange-500/50 dark:hover:bg-neutral-700"
            >
              <div className="flex shrink-0 items-center justify-center text-red-500 dark:text-red-400">
                <HugeiconsIcon icon={Logout01Icon} size={24} strokeWidth={1.5} />
              </div>
              <p className="ms-4 text-sm font-medium text-red-500 dark:text-red-400">Log out</p>
            </button>
          </div>
        </PopoverPanel>
      </Popover>
    </div>
  )
}
