import { useTranslation } from 'react-i18next'
import type { SupportedLanguage } from '../i18n'
import { SUPPORTED_LANGUAGES } from '../i18n'

const FLAG: Record<SupportedLanguage, string> = {
  uk: '🇺🇦',
  en: '🇬🇧',
}

const SHORT: Record<SupportedLanguage, string> = {
  uk: 'UA',
  en: 'EN',
}

export function LanguageSwitcher() {
  const { i18n } = useTranslation()
  const current = i18n.language as SupportedLanguage

  function toggle() {
    const next = current === 'uk' ? 'en' : 'uk'
    i18n.changeLanguage(next)
  }

  return (
    <div className="lang-switcher">
      {SUPPORTED_LANGUAGES.map(lang => (
        <button
          key={lang}
          className={`lang-btn ${lang === current ? 'lang-active' : ''}`}
          onClick={() => i18n.changeLanguage(lang)}
          title={lang === 'uk' ? 'Українська' : 'English'}
        >
          <span className="lang-flag">{FLAG[lang]}</span>
          <span className="lang-short">{SHORT[lang]}</span>
        </button>
      ))}
    </div>
  )
}
