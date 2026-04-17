import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import uk from './locales/uk'
import en from './locales/en'

export const SUPPORTED_LANGUAGES = ['uk', 'en'] as const
export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number]

export const resources = {
  uk: { translation: uk },
  en: { translation: en },
} as const

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'uk',
    defaultNS: 'translation',

    // LanguageDetector config — check localStorage first, then browser
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'automata-lang',
      caches: ['localStorage'],
    },

    interpolation: {
      escapeValue: false, // React handles XSS
    },

    // Only allow supported languages
    supportedLngs: SUPPORTED_LANGUAGES,
  })

export default i18n
