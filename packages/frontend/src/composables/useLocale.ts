import { getCurrentLocale, setLocale, type SupportedLocale } from "@/plugins/i18n"
import { computed, ref } from "vue"
import { useI18n } from "vue-i18n"

export function useLocale() {
  const { locale, t, d, n } = useI18n()
  const isChangingLocale = ref(false)

  // Available locales with display names
  const availableLocales = computed(() => [
    { code: "fr", name: "Français", flag: "🇫🇷" },
    { code: "en", name: "English", flag: "🇺🇸" },
    { code: "es", name: "Español", flag: "🇪🇸" },
    { code: "de", name: "Deutsch", flag: "🇩🇪" },
  ])

  // Current locale info
  const currentLocale = computed(() => {
    const current = getCurrentLocale()
    return (
      availableLocales.value.find((l) => l.code === current) || availableLocales.value[0]
    )
  })

  // Change locale function
  const changeLocale = async (newLocale: SupportedLocale) => {
    if (newLocale === getCurrentLocale()) {
      return
    }

    try {
      isChangingLocale.value = true
      await setLocale(newLocale)
    } catch (error) {
      console.error("Failed to change locale:", error)
      throw error
    } finally {
      isChangingLocale.value = false
    }
  }

  // Format currency based on current locale
  const formatCurrency = (amount: number, _currency?: string) => {
    // Note: currency parameter kept for API compatibility but not used in i18n format
    return n(amount, "currency")
  }

  // Format date based on current locale
  const formatDate = (
    date: Date | string,
    format: "short" | "long" | "time" | "datetime" = "short"
  ) => {
    const dateObj = typeof date === "string" ? new Date(date) : date
    return d(dateObj, format)
  }

  // Format number based on current locale
  const formatNumber = (
    number: number,
    format: "decimal" | "percent" | "integer" = "decimal"
  ) => {
    return n(number, format)
  }

  // Get currency for locale
  const getCurrencyForLocale = (locale: SupportedLocale): string => {
    const currencyMap: Record<SupportedLocale, string> = {
      fr: "EUR",
      en: "USD",
      es: "EUR",
      de: "EUR",
    }
    return currencyMap[locale]
  }

  // Get date format for locale
  const getDateFormatForLocale = (locale: SupportedLocale): string => {
    const formatMap: Record<SupportedLocale, string> = {
      fr: "DD/MM/YYYY",
      en: "MM/DD/YYYY",
      es: "DD/MM/YYYY",
      de: "DD.MM.YYYY",
    }
    return formatMap[locale]
  }

  // Check if locale is RTL (Right-to-Left)
  const isRTL = computed(() => {
    const rtlLocales: SupportedLocale[] = []
    return rtlLocales.includes(getCurrentLocale())
  })

  // Get text direction
  const textDirection = computed(() => (isRTL.value ? "rtl" : "ltr"))

  // Translate with fallback
  const translate = (key: string, params?: Record<string, any>, fallback?: string) => {
    try {
      const translation = params ? t(key, params as any) : t(key)
      return translation !== key ? translation : fallback || key
    } catch (error) {
      console.warn(`Translation missing for key: ${key}`)
      return fallback || key
    }
  }

  // Pluralization helper
  const translatePlural = (key: string, count: number, params?: Record<string, any>) => {
    return t(key, { count, ...params }, count)
  }

  // Get locale-specific configuration
  const getLocaleConfig = () => {
    const current = getCurrentLocale()
    return {
      locale: current,
      currency: getCurrencyForLocale(current),
      dateFormat: getDateFormatForLocale(current),
      isRTL: isRTL.value,
      textDirection: textDirection.value,
    }
  }

  return {
    // State
    locale,
    currentLocale,
    availableLocales,
    isChangingLocale,
    isRTL,
    textDirection,

    // Methods
    changeLocale,
    formatCurrency,
    formatDate,
    formatNumber,
    translate,
    translatePlural,
    getLocaleConfig,
    getCurrencyForLocale,
    getDateFormatForLocale,

    // Vue I18n methods
    t,
    d,
    n,
  }
}
