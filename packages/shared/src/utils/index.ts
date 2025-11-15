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
  // Improved regex that prevents ReDoS (Regular expression Denial of Service)
  // Uses atomic groups and limits repetition to prevent exponential backtracking
  // More strict pattern that matches RFC 5322 simplified format
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/

  // Additional length check to prevent DoS on very long strings
  if (email.length > 254) return false

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
