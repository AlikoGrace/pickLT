'use client'

import Logo from '@/shared/Logo'
import { ArrowLeft01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useRouter } from 'next/navigation'

const MobileHeader = () => {
  const router = useRouter()

  return (
    <div className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-neutral-200 bg-white px-4 lg:hidden dark:border-neutral-700 dark:bg-neutral-900">
      <button
        onClick={() => router.back()}
        className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800"
        aria-label="Go back"
      >
        <HugeiconsIcon icon={ArrowLeft01Icon} size={20} strokeWidth={1.5} className="text-neutral-700 dark:text-neutral-300" />
      </button>
      <Logo className="w-20" />
      <div className="w-9" /> {/* Spacer for centering */}
    </div>
  )
}

export default MobileHeader
