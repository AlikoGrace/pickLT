import React, { FC } from 'react'

export interface BackgroundSectionProps {
  className?: string
  children?: React.ReactNode
}

const BackgroundSection: FC<BackgroundSectionProps> = ({ className = 'bg-neutral-50 dark:bg-black/20 ', children }) => {
  return (
    <div
      className={`absolute inset-y-0 left-1/2 z-0 w-screen -translate-x-1/2 xl:max-w-[1340px] xl:rounded-[40px] 2xl:max-w-(--breakpoint-2xl) ${className}`}
    >
      {children}
    </div>
  )
}

export default BackgroundSection
