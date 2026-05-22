'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'

type Theme = 'light' | 'dark'

interface ThemeContextValue {
  theme: Theme
  setTheme: (t: Theme) => void
  toggle: () => void
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

const STORAGE_KEY = 'stamppass-theme'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Default to light; useEffect will read storage on mount
  const [theme, setThemeState] = useState<Theme>('light')

  // Read stored preference on mount (avoids hydration mismatch — the inline script
  // in <head> applies the class before React hydrates)
  useEffect(() => {
    const stored = (typeof window !== 'undefined' && (localStorage.getItem(STORAGE_KEY) as Theme | null)) || null
    if (stored === 'dark' || stored === 'light') {
      setThemeState(stored)
    } else if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
      setThemeState('dark')
    }
  }, [])

  // Apply class to <html> when theme changes
  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    localStorage.setItem(STORAGE_KEY, theme)
  }, [theme])

  const setTheme = useCallback((t: Theme) => setThemeState(t), [])
  const toggle = useCallback(() => setThemeState((t) => (t === 'dark' ? 'light' : 'dark')), [])

  return <ThemeContext.Provider value={{ theme, setTheme, toggle }}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
