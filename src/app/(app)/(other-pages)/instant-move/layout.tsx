'use client'

import { AuthGate } from '@/components/AuthGate'
import { usePathname } from 'next/navigation'
import React from 'react'

/**
 * Layout for all instant-move flow pages.
 * Requires authentication — if user is not signed in,
 * AuthGate saves move state and redirects to /login.
 */
const InstantMoveLayout = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname()

  return (
    <AuthGate redirectBack={pathname || '/instant-move/inventory'}>
      {children}
    </AuthGate>
  )
}

export default InstantMoveLayout
