'use client'

import avatarImage from '@/images/avatars/Image-1.png'
import Avatar from '@/shared/Avatar'
import { Divider } from '@/shared/divider'
import { Link } from '@/shared/link'
import SwitchDarkMode2 from '@/shared/SwitchDarkMode2'
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react'
import {
  BulbChargingIcon,
  FavouriteIcon,
  Idea01Icon,
  Logout01Icon,
  Task01Icon,
  UserIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

interface Props {
  className?: string
}

export default function AvatarDropdown({ className }: Props) {
  return (
    <div className={className}>
      <Popover>
        <PopoverButton className="-m-1.5 flex cursor-pointer items-center justify-center rounded-full p-1.5 hover:bg-neutral-100 focus-visible:outline-hidden dark:hover:bg-neutral-800">
          <Avatar src={avatarImage.src} className="size-8" />
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
            <div className="flex items-center space-x-3">
              <Avatar src={avatarImage.src} className="size-12" />

              <div className="grow">
                <h4 className="font-semibold">Eden Smith</h4>
                <p className="mt-0.5 text-xs">Los Angeles, CA</p>
              </div>
            </div>

            <Divider />

            {/* ------------------ 1 --------------------- */}
            <Link
              href={'/authors/john-doe'}
              className="-m-3 flex items-center rounded-lg p-2 transition duration-150 ease-in-out hover:bg-neutral-100 focus:outline-hidden focus-visible:ring-3 focus-visible:ring-orange-500/50 dark:hover:bg-neutral-700"
            >
              <div className="flex shrink-0 items-center justify-center text-neutral-500 dark:text-neutral-300">
                <HugeiconsIcon icon={UserIcon} size={24} strokeWidth={1.5} />
              </div>
              <p className="ms-4 text-sm font-medium">{'My Account'}</p>
            </Link>

            {/* ------------------ 2 --------------------- */}
            <Link
              href={'/authors/john-doe'}
              className="-m-3 flex items-center rounded-lg p-2 transition duration-150 ease-in-out hover:bg-neutral-100 focus:outline-hidden focus-visible:ring-3 focus-visible:ring-orange-500/50 dark:hover:bg-neutral-700"
            >
              <div className="flex shrink-0 items-center justify-center text-neutral-500 dark:text-neutral-300">
                <HugeiconsIcon icon={Task01Icon} size={24} strokeWidth={1.5} />
              </div>
              <p className="ms-4 text-sm font-medium">My Listings</p>
            </Link>

            {/* ------------------ 2 --------------------- */}
            <Link
              href={'/account-savelists'}
              className="-m-3 flex items-center rounded-lg p-2 transition duration-150 ease-in-out hover:bg-neutral-100 focus:outline-hidden focus-visible:ring-3 focus-visible:ring-orange-500/50 dark:hover:bg-neutral-700"
            >
              <div className="flex shrink-0 items-center justify-center text-neutral-500 dark:text-neutral-300">
                <HugeiconsIcon icon={FavouriteIcon} size={24} strokeWidth={1.5} />
              </div>
              <p className="ms-4 text-sm font-medium">Wishlist</p>
            </Link>

            <Divider />

            {/* ------------------ 2 --------------------- */}
            <div className="focus-visible:ring-opacity-50 -m-3 flex items-center justify-between rounded-lg p-2 hover:bg-neutral-100 focus:outline-none focus-visible:ring focus-visible:ring-orange-500 dark:hover:bg-neutral-700">
              <div className="flex items-center">
                <div className="flex flex-shrink-0 items-center justify-center text-neutral-500 dark:text-neutral-300">
                  <HugeiconsIcon icon={Idea01Icon} size={24} strokeWidth={1.5} />
                </div>
                <p className="ms-4 text-sm font-medium">Dark theme</p>
              </div>
              <SwitchDarkMode2 />
            </div>

            {/* ------------------ 2 --------------------- */}

            <Link
              href={'#'}
              className="-m-3 flex items-center rounded-lg p-2 transition duration-150 ease-in-out hover:bg-neutral-100 focus:outline-hidden focus-visible:ring-3 focus-visible:ring-orange-500/50 dark:hover:bg-neutral-700"
            >
              <div className="flex shrink-0 items-center justify-center text-neutral-500 dark:text-neutral-300">
                <HugeiconsIcon icon={BulbChargingIcon} size={24} strokeWidth={1.5} />
              </div>
              <p className="ms-4 text-sm font-medium">{'Help'}</p>
            </Link>

            {/* ------------------ 2 --------------------- */}
            <Link
              href={'#'}
              className="-m-3 flex items-center rounded-lg p-2 transition duration-150 ease-in-out hover:bg-neutral-100 focus:outline-hidden focus-visible:ring-3 focus-visible:ring-orange-500/50 dark:hover:bg-neutral-700"
            >
              <div className="flex shrink-0 items-center justify-center text-neutral-500 dark:text-neutral-300">
                <HugeiconsIcon icon={Logout01Icon} size={24} strokeWidth={1.5} />
              </div>
              <p className="ms-4 text-sm font-medium">{'Log out'}</p>
            </Link>
          </div>
        </PopoverPanel>
      </Popover>
    </div>
  )
}
