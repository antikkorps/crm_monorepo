import { createI18n } from "vue-i18n"

// Import translation files
import enCommon from "@/locales/en/common.json"
import frCommon from "@/locales/fr/common.json"

// Define supported locales
export const SUPPORTED_LOCALES = ["fr", "en", "es", "de"] as const
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]

// Default locale
export const DEFAULT_LOCALE: SupportedLocale = "fr"
export const FALLBACK_LOCALE: SupportedLocale = "en"

// Date time formats for each locale
const dateTimeFormats = {
  fr: {
    short: {
      year: "numeric",
      month: "short",
      day: "numeric",
    },
    long: {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "long",
    },
    time: {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    },
    datetime: {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    },
  },
  en: {
    short: {
      year: "numeric",
      month: "short",
      day: "numeric",
    },
    long: {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "long",
    },
    time: {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    },
    datetime: {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    },
  },
  es: {
    short: {
      year: "numeric",
      month: "short",
      day: "numeric",
    },
    long: {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "long",
    },
    time: {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    },
    datetime: {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    },
  },
  de: {
    short: {
      year: "numeric",
      month: "short",
      day: "numeric",
    },
    long: {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "long",
    },
    time: {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    },
    datetime: {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    },
  },
}

// Number formats for each locale
const numberFormats = {
  fr: {
    currency: {
      style: "currency",
      currency: "EUR",
      notation: "standard",
    },
    decimal: {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
    percent: {
      style: "percent",
      minimumFractionDigits: 1,
    },
    integer: {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    },
  },
  en: {
    currency: {
      style: "currency",
      currency: "USD",
      notation: "standard",
    },
    decimal: {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
    percent: {
      style: "percent",
      minimumFractionDigits: 1,
    },
    integer: {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    },
  },
  es: {
    currency: {
      style: "currency",
      currency: "EUR",
      notation: "standard",
    },
    decimal: {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
    percent: {
      style: "percent",
      minimumFractionDigits: 1,
    },
    integer: {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    },
  },
  de: {
    currency: {
      style: "currency",
      currency: "EUR",
      notation: "standard",
    },
    decimal: {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
    percent: {
      style: "percent",
      minimumFractionDigits: 1,
    },
    integer: {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    },
  },
}

// Initial messages (more will be loaded dynamically)
const messages = {
  fr: {
    common: frCommon,
  },
  en: {
    common: enCommon,
  },
  es: {
    common: {}, // Will be loaded dynamically
  },
  de: {
    common: {}, // Will be loaded dynamically
  },
}

// Detect user's preferred locale
function getInitialLocale(): SupportedLocale {
  // 1. Check localStorage for saved preference
  const savedLocale = localStorage.getItem("user-locale") as SupportedLocale
  if (savedLocale && SUPPORTED_LOCALES.includes(savedLocale)) {
    return savedLocale
  }

  // 2. Check browser language
  const browserLocale = navigator.language.split("-")[0] as SupportedLocale
  if (SUPPORTED_LOCALES.includes(browserLocale)) {
    return browserLocale
  }

  // 3. Fall back to default
  return DEFAULT_LOCALE
}

// Create i18n instance
export const i18n = createI18n({
  locale: getInitialLocale(),
  fallbackLocale: FALLBACK_LOCALE,
  messages,
  dateTimeFormats,
  numberFormats,
  legacy: false, // Use Composition API
  globalInjection: true,
  missingWarn: false,
  fallbackWarn: false,
})

// Function to load locale messages dynamically
export async function loadLocaleMessages(locale: SupportedLocale) {
  if (i18n.global.availableLocales.includes(locale)) {
    return
  }

  try {
    // Load all translation files for the locale
    const messages = await Promise.all([
      import(`@/locales/${locale}/common.json`),
      import(`@/locales/${locale}/auth.json`).catch(() => ({ default: {} })),
      import(`@/locales/${locale}/institutions.json`).catch(() => ({ default: {} })),
      import(`@/locales/${locale}/billing.json`).catch(() => ({ default: {} })),
      import(`@/locales/${locale}/tasks.json`).catch(() => ({ default: {} })),
      import(`@/locales/${locale}/plugins.json`).catch(() => ({ default: {} })),
    ])

    // Set the locale messages
    i18n.global.setLocaleMessage(locale, {
      common: messages[0].default,
      auth: messages[1].default,
      institutions: messages[2].default,
      billing: messages[3].default,
      tasks: messages[4].default,
      plugins: messages[5].default,
    })
  } catch (error) {
    console.warn(`Failed to load locale messages for ${locale}:`, error)
  }
}

// Function to set locale
export async function setLocale(locale: SupportedLocale) {
  // Load messages if not already loaded
  await loadLocaleMessages(locale)

  // Set the locale
  i18n.global.locale.value = locale

  // Save to localStorage
  localStorage.setItem("user-locale", locale)

  // Update document language
  document.documentElement.lang = locale
}

// Utility function to get current locale
export function getCurrentLocale(): SupportedLocale {
  return i18n.global.locale.value as SupportedLocale
}

// Utility function to check if locale is supported
export function isSupportedLocale(locale: string): locale is SupportedLocale {
  return SUPPORTED_LOCALES.includes(locale as SupportedLocale)
}

export default i18n
