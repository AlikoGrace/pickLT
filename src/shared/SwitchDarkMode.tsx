'use client'

import { ThemeContext } from '@/app/theme-provider'
import { SunIcon } from '@heroicons/react/24/outline'
import { MoonIcon } from '@heroicons/react/24/solid'
import React, { useContext } from 'react'
interface SwitchDarkModeProps {
  className?: string
}
const SwitchDarkMode: React.FC<SwitchDarkModeProps> = ({ className = '' }) => {
  const theme = useContext(ThemeContext)

  return (
    <button
      onClick={theme?.toggleDarkMode}
      className={`flex h-12 w-12 items-center justify-center self-center rounded-full text-2xl text-neutral-700 hover:bg-neutral-100 focus:outline-hidden md:text-3xl dark:text-neutral-300 dark:hover:bg-neutral-800 ${className}`}
    >
      <span className="sr-only">Enable dark mode</span>
      {theme?.isDarkMode ? (
        <MoonIcon className="h-7 w-7" aria-hidden="true" />
      ) : (
        <SunIcon className="h-7 w-7" aria-hidden="true" />
      )}
    </button>
  )
}

export default SwitchDarkMode
