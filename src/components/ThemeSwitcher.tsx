import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { type Theme, getInitialTheme, setTheme } from '../theme'

const THEMES: { id: Theme; icon: string }[] = [
  { id: 'dark', icon: '☾' },
  { id: 'light', icon: '☀' },
]

export function ThemeSwitcher() {
  const { t } = useTranslation()
  const [current, setCurrent] = useState<Theme>(getInitialTheme())

  function choose(theme: Theme) {
    setTheme(theme)
    setCurrent(theme)
  }

  return (
    <div className="theme-switcher" role="group" aria-label={t('theme.label')}>
      {THEMES.map(({ id, icon }) => (
        <button
          key={id}
          className={`theme-btn ${id === current ? 'theme-active' : ''}`}
          onClick={() => choose(id)}
          title={t(`theme.${id}`)}
          aria-pressed={id === current}
        >
          <span className="theme-icon">{icon}</span>
        </button>
      ))}
    </div>
  )
}
