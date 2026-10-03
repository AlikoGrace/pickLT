'use client'

import { useEffect } from 'react'

/**
 * Re-run `refetch` when the user comes back to the tab (window focus, or the
 * page becoming visible again). Lists here refresh on realtime events, but a
 * socket that drops replays nothing, so a move booked or re-offered meanwhile
 * never showed up (device pass 2026-10-03, mirrored from the client app).
 */
export function useRefetchOnReturn(refetch: () => void) {
  useEffect(() => {
    const onFocus = () => refetch()
    const onVisible = () => {
      if (document.visibilityState === 'visible') refetch()
    }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [refetch])
}
