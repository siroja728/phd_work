import { useEffect, useState } from 'react'
import type { Theme } from './theme'

// Colors the React Flow graph needs as concrete strings (it sets SVG fill/stroke
// attributes where CSS var() would not resolve). Read from the CSS variables so
// they always track the active theme.
export interface GraphColors {
  blue: string
  green: string
  amber: string
  paneBg: string
  paneBorder: string
  chromeBg: string
  chromeBorder: string
  mask: string
}

function readTheme(): Theme {
  return (document.documentElement.dataset.theme as Theme) || 'dark'
}

function readColors(theme: Theme): GraphColors {
  const s = getComputedStyle(document.documentElement)
  const v = (name: string) => s.getPropertyValue(name).trim()
  return {
    blue: v('--blue'),
    green: v('--green'),
    amber: v('--amber'),
    paneBg: v('--pane-bg'),
    paneBorder: v('--pane-border'),
    chromeBg: v('--chrome-bg'),
    chromeBorder: v('--chrome-border'),
    mask: theme === 'light' ? 'rgba(238, 240, 245, 0.6)' : 'rgba(11, 12, 18, 0.7)',
  }
}

// Reactively tracks the active theme (set via data-theme on <html>) and exposes
// resolved graph colors. Re-reads whenever the theme attribute changes.
export function useTheme(): { theme: Theme; colors: GraphColors } {
  const [theme, setTheme] = useState<Theme>(readTheme)
  const [colors, setColors] = useState<GraphColors>(() => readColors(readTheme()))

  useEffect(() => {
    const observer = new MutationObserver(() => {
      const next = readTheme()
      setTheme(next)
      setColors(readColors(next))
    })
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    })
    return () => observer.disconnect()
  }, [])

  return { theme, colors }
}
