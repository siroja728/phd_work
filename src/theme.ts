// Theme handling: dark (default) / light, persisted to localStorage and applied
// via the data-theme attribute on <html> (see index.css theme blocks).
export type Theme = 'dark' | 'light'

const STORAGE_KEY = 'theme'

export function getInitialTheme(): Theme {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved === 'dark' || saved === 'light') return saved
  // Fall back to the OS preference, defaulting to dark.
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme
}

export function setTheme(theme: Theme): void {
  localStorage.setItem(STORAGE_KEY, theme)
  applyTheme(theme)
}
