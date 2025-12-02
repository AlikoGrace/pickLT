'use client'

import avatar4 from '@/images/avatars/Image-4.png'
import avatar5 from '@/images/avatars/Image-5.png'
import avatar6 from '@/images/avatars/Image-6.png'
import Avatar from '@/shared/Avatar'
import T from '@/utils/getT'
import { CloseButton, Popover, PopoverButton, PopoverPanel } from '@headlessui/react'
import { BellIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'
import { FC } from 'react'

const notifications = [
  {
    name: 'John Doe',
    description: 'Measure actions your users take',
    time: '3 minutes ago',
    href: '#',
    avatar: avatar4,
  },
  {
    name: 'Jane Smith',
    description: 'Create your own targeted content',
    time: '1 minute ago',
    href: '#',
    avatar: avatar5,
  },
  {
    name: 'Alice Johnson',
    description: 'Keep track of your growth',
    time: '3 minutes ago',
    href: '#',
    avatar: avatar6,
  },
]

interface Props {
  className?: string
}

const NotifyDropdown: FC<Props> = ({ className = '' }) => {
  return (
    <Popover className={className}>
      <>
        <PopoverButton
          className={
            'relative -m-2.5 flex cursor-pointer items-center justify-center rounded-full p-2.5 hover:bg-neutral-100 focus-visible:outline-hidden dark:hover:bg-neutral-800'
          }
        >
          <span className="absolute end-2 top-2 h-2 w-2 rounded-full bg-blue-500"></span>
          <BellIcon className="h-6 w-6" />
        </PopoverButton>

        <PopoverPanel
          transition
          anchor={{
            to: 'bottom end',
            gap: 16,
          }}
          className="z-40 w-sm rounded-3xl shadow-lg ring-1 ring-black/5 transition duration-200 ease-in-out data-closed:translate-y-1 data-closed:opacity-0"
        >
          <div className="relative grid gap-8 bg-white p-7 dark:bg-neutral-800">
            <h3 className="text-xl font-semibold">{T['Header']['Notifications']['Notifications']}</h3>
            {notifications.map((item, index) => (
              <CloseButton
                as={Link}
                key={index}
                href={item.href}
                className="relative -m-3 flex rounded-lg p-2 pe-8 transition duration-150 ease-in-out hover:bg-gray-100 focus:outline-hidden focus-visible:ring-3 focus-visible:ring-orange-500/50 dark:hover:bg-gray-700"
              >
                <Avatar src={item.avatar.src} className="size-8 sm:size-12" />
                <div className="ms-3 space-y-1 sm:ms-4">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-200">{item.name}</p>
                  <p className="text-xs text-gray-500 sm:text-sm dark:text-gray-400">{item.description}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-400">{item.time}</p>
                </div>
                <span className="absolute end-1 top-1/2 h-2 w-2 -translate-y-1/2 transform rounded-full bg-blue-500"></span>
              </CloseButton>
            ))}
          </div>
        </PopoverPanel>
      </>
    </Popover>
  )
}

export default NotifyDropdown
