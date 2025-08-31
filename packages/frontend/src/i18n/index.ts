import { createI18n } from 'vue-i18n'

// Import language files
import fr from './locales/fr.json'
import en from './locales/en.json'

// Define available locales
export const availableLocales = [
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'en', name: 'English', flag: '🇺🇸' }
] as const

export type Locale = typeof availableLocales[number]['code']

// Get stored locale or default to French
const getStoredLocale = (): Locale => {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('locale') as Locale
    if (stored && availableLocales.some(locale => locale.code === stored)) {
      return stored
    }
    
    // Try to detect browser language
    const browserLang = navigator.language.split('-')[0]
    if (availableLocales.some(locale => locale.code === browserLang)) {
      return browserLang as Locale
    }
  }
  
  return 'fr' // Default to French
}

const messages = {
  fr,
  en
}

const i18n = createI18n({
  legacy: false, // Use Composition API mode
  locale: getStoredLocale(),
  fallbackLocale: 'en',
  messages,
  globalInjection: true, // Enable $t globally
})

// Helper function to change locale
export const setLocale = (locale: Locale) => {
  if (availableLocales.some(l => l.code === locale)) {
    i18n.global.locale.value = locale
    if (typeof window !== 'undefined') {
      localStorage.setItem('locale', locale)
      document.documentElement.lang = locale
    }
  }
}

// Helper function to get current locale
export const getCurrentLocale = (): Locale => {
  return i18n.global.locale.value as Locale
}

// Helper function to get locale info
export const getLocaleInfo = (code: Locale) => {
  return availableLocales.find(locale => locale.code === code)
}

export default i18n