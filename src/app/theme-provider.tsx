'use client'

import { APIProvider } from '@vis.gl/react-google-maps'
import { createContext, useCallback, useEffect, useState } from 'react'

interface ThemeContextValue {
  isDarkMode: boolean
  toggleDarkMode: () => void
  themeDir: 'rtl' | 'ltr'
  setThemeDir: (value: 'rtl' | 'ltr') => void
}

export const ThemeContext = createContext<ThemeContextValue | null>(null)

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false)
  const [themeDir, setThemeDir] = useState<'rtl' | 'ltr'>('ltr')

  // themeMode
  useEffect(() => {
    if (localStorage.getItem('theme') === 'dark-mode') {
      setIsDarkMode(true)
      const root = document.querySelector('html')
      if (root && !root.classList.contains('dark')) {
        root.classList.add('dark')
      }
    } else {
      setIsDarkMode(false)
      const root = document.querySelector('html')
      if (root) {
        root.classList.remove('dark')
      }
    }
  }, [])

  // themeDir
  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.documentElement.getAttribute('dir') === 'rtl' ? setThemeDir('rtl') : setThemeDir('ltr')
    }
  }, [])

  // Update themeDir when it changes
  // This ensures that the document's direction is set correctly
  // when the themeDir state changes.
  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.documentElement.setAttribute('dir', themeDir)
    }
  }, [themeDir])

  // toggleDarkMode
  // This function toggles the dark mode state and updates the localStorage
  // and the HTML class accordingly
  const toggleDarkMode = useCallback((): void => {
    if (localStorage.getItem('theme') === 'light-mode') {
      setIsDarkMode(true)
      const root = document.querySelector('html')
      if (root && !root.classList.contains('dark')) {
        root.classList.add('dark')
      }
      localStorage.setItem('theme', 'dark-mode')
    } else {
      setIsDarkMode(false)
      const root = document.querySelector('html')
      if (root) {
        root.classList.remove('dark')
      }
      localStorage.setItem('theme', 'light-mode')
    }
  }, [])

  //
  return (
    <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAP_API_KEY || ''}>
      <ThemeContext.Provider
        value={{
          isDarkMode,
          toggleDarkMode,
          themeDir,
          setThemeDir,
        }}
      >
        {children}
      </ThemeContext.Provider>
    </APIProvider>
  )
}
