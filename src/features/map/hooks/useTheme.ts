import { useEffect, useState } from 'react'

/**
 * Theme management.
 *
 * Theme modes:
 *   - 'dark'  — Admiralty Night (default)
 *   - 'light' — Admiralty Day (parchment)
 *
 * Precedence:
 *   1. localStorage 'searoute-theme' (explicit user choice)
 *   2. window.matchMedia('(prefers-color-scheme: light)') (system default)
 *   3. 'dark' (hard fallback)
 *
 * The theme is applied via `document.documentElement.dataset.theme`,
 * which the tokens.css selectors match against. This lets the rest
 * of the app keep using `var(--color-*)` without knowing the theme.
 */

export type ThemeMode = 'dark' | 'light'
export type ThemePreference = ThemeMode | 'system'

const STORAGE_KEY = 'searoute-theme'

function systemPrefersLight(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-color-scheme: light)').matches
}

function readStoredTheme(): ThemePreference | null {
  if (typeof window === 'undefined') return null
  const v = window.localStorage.getItem(STORAGE_KEY)
  if (v === 'dark' || v === 'light' || v === 'system') return v
  return null
}

function writeStoredTheme(theme: ThemePreference): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, theme)
}

function applyTheme(theme: ThemeMode): void {
  if (typeof document === 'undefined') return
  document.documentElement.dataset.theme = theme
  document.documentElement.style.colorScheme = theme
}

/** Resolve the initial theme, with the precedence rules above. */
function resolveInitialPreference(): ThemePreference {
  const stored = readStoredTheme()
  if (stored) return stored
  return 'system'
}

function resolveTheme(preference: ThemePreference): ThemeMode {
  if (preference === 'system') return systemPrefersLight() ? 'light' : 'dark'
  return preference
}

/**
 * Read the current theme reactively. Returns the theme and a setter
 * that persists the choice. Mounts a `matchMedia` listener so the
 * theme follows the system preference when the user hasn't made an
 * explicit choice.
 */
export function useTheme(): {
  theme: ThemeMode
  preference: ThemePreference
  setPreference: (next: ThemePreference) => void
} {
  const [preference, setPreferenceState] = useState<ThemePreference>(resolveInitialPreference)
  const theme = resolveTheme(preference)

  // Apply the theme to the document and re-apply on theme change.
  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  // Follow system preference if the user hasn't explicitly chosen.
  // The matchMedia event fires when the OS theme changes (e.g., the
  // user toggles dark mode in their system settings at sunset).
  useEffect(() => {
    if (typeof window === 'undefined') return
    const mql = window.matchMedia('(prefers-color-scheme: light)')
    const onChange = () => {
      // Only auto-switch if no explicit choice has been stored.
      if (readStoredTheme() === null || readStoredTheme() === 'system') {
        setPreferenceState('system')
      }
    }
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])

  const setPreference = (next: ThemePreference): void => {
    writeStoredTheme(next)
    setPreferenceState(next)
  }

  return { theme, preference, setPreference }
}
