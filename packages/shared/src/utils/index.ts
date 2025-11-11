// Shared utility functions

export const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date)
}

export const generateId = (): string => {
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Format a number as currency based on locale
 * @param amount - The amount to format
 * @param currency - The currency code (default: EUR)
 * @param locale - The locale to use for formatting (default: fr-FR)
 * @returns Formatted currency string
 */
export const formatCurrency = (
  amount: number,
  currency: string = "EUR",
  locale: string = "fr-FR"
): string => {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency,
  }).format(amount)
}
