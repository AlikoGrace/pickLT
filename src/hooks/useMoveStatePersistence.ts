'use client'

import { useCallback } from 'react'

const MOVE_STATE_KEY = 'picklt_move_state'
const REDIRECT_KEY = 'picklt_auth_redirect'

/**
 * Hook to persist move search state to sessionStorage before auth redirect
 * and restore it after authentication.
 */
export function useMoveStatePersistence() {
  /**
   * Save the current move search state and intended redirect path
   */
  const saveState = useCallback((state: Record<string, unknown>, redirectPath: string) => {
    try {
      sessionStorage.setItem(MOVE_STATE_KEY, JSON.stringify(state))
      sessionStorage.setItem(REDIRECT_KEY, redirectPath)
    } catch (e) {
      console.error('Failed to save move state:', e)
    }
  }, [])

  /**
   * Restore the saved move search state
   */
  const restoreState = useCallback((): Record<string, unknown> | null => {
    try {
      const raw = sessionStorage.getItem(MOVE_STATE_KEY)
      if (!raw) return null
      return JSON.parse(raw)
    } catch {
      return null
    }
  }, [])

  /**
   * Get the saved redirect path (where to go after auth)
   */
  const getRedirectPath = useCallback((): string | null => {
    try {
      return sessionStorage.getItem(REDIRECT_KEY)
    } catch {
      return null
    }
  }, [])

  /**
   * Clear saved state and redirect path
   */
  const clearSavedState = useCallback(() => {
    try {
      sessionStorage.removeItem(MOVE_STATE_KEY)
      sessionStorage.removeItem(REDIRECT_KEY)
    } catch {
      // noop
    }
  }, [])

  return { saveState, restoreState, getRedirectPath, clearSavedState }
}
