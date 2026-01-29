import type { QuoteLine, InvoiceLine } from "@medical-crm/shared"
import { DiscountType } from "@medical-crm/shared"

/**
 * Utility functions for billing line management with catalog integration
 */

/**
 * Extract plain text from TipTap JSON content
 * Recursively traverses the JSON structure to extract all text
 */
export function extractTextFromTipTap(content: any): string {
  if (!content) return ''
  if (typeof content === 'string') {
    // Try to parse as JSON
    if (content.trim().startsWith('{')) {
      try {
        const json = JSON.parse(content)
        return extractTextFromTipTap(json)
      } catch {
        return content
      }
    }
    return content
  }
  if (content.type === 'text') return content.text || ''
  if (content.content && Array.isArray(content.content)) {
    return content.content.map(extractTextFromTipTap).join(' ').replace(/\s+/g, ' ').trim()
  }
  return ''
}

/**
 * Truncate text to a maximum length with ellipsis
 */
export function truncateText(text: string, maxLength: number = 100): string {
  if (!text || text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

/**
 * Get display text from a potentially rich text field
 * Handles both plain text and TipTap JSON
 */
export function getDisplayText(content: string | undefined | null, maxLength?: number): string {
  if (!content) return ''
  const text = extractTextFromTipTap(content)
  return maxLength ? truncateText(text, maxLength) : text
}

export type LineWithCatalog<T> = T & {
  tempId?: string
  catalogItemId?: string | null
  isCustomLine?: boolean
  originalCatalogPrice?: number | null
  originalCatalogTaxRate?: number | null
}

export function createQuoteLineDefaults(overrides: Partial<QuoteLine> = {}): LineWithCatalog<QuoteLine> {
  const defaults: QuoteLine = {
    id: `temp-${Date.now()}`,
    quoteId: "",
    orderIndex: 0,
    catalogItemId: null,
    description: "",
    quantity: 1,
    unitPrice: 0,
    discountType: DiscountType.PERCENTAGE,
    discountValue: 0,
    discountAmount: 0,
    taxRate: 0,
    taxAmount: 0,
    subtotal: 0,
    totalAfterDiscount: 0,
    total: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  return {
    ...defaults,
    tempId: `temp-${Date.now()}`,
    // Catalog integration fields
    catalogItemId: null,
    isCustomLine: true,
    originalCatalogPrice: null,
    originalCatalogTaxRate: null,
    ...overrides,
  }
}

export function createInvoiceLineDefaults(overrides: Partial<InvoiceLine> = {}): LineWithCatalog<InvoiceLine> {
  const defaults: InvoiceLine = {
    id: `temp-${Date.now()}`,
    invoiceId: "",
    orderIndex: 0,
    description: "",
    quantity: 1,
    unitPrice: 0,
    discountType: DiscountType.PERCENTAGE,
    discountValue: 0,
    discountAmount: 0,
    taxRate: 0,
    taxAmount: 0,
    subtotal: 0,
    totalAfterDiscount: 0,
    total: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  return {
    ...defaults,
    tempId: `temp-${Date.now()}`,
    // Catalog integration fields
    catalogItemId: null,
    isCustomLine: true,
    originalCatalogPrice: null,
    originalCatalogTaxRate: null,
    ...overrides,
  }
}

/**
 * Calculate line totals including discounts and taxes
 */
export function calculateLineTotal(line: Partial<QuoteLine> | Partial<InvoiceLine>) {
  const quantity = line.quantity || 0
  const unitPrice = line.unitPrice || 0
  const subtotal = quantity * unitPrice

  // Calculate discount
  let discountAmount = 0
  if (line.discountValue && line.discountValue > 0) {
    if (line.discountType === DiscountType.PERCENTAGE) {
      discountAmount = subtotal * (line.discountValue / 100)
    } else if (line.discountType === DiscountType.FIXED_AMOUNT) {
      discountAmount = Math.min(line.discountValue, subtotal) // Can't discount more than subtotal
    }
  }

  // Calculate tax on discounted amount
  const taxableAmount = subtotal - discountAmount
  const taxAmount = taxableAmount * ((line.taxRate || 0) / 100)

  const total = subtotal - discountAmount + taxAmount

  return {
    subtotal,
    discountAmount,
    taxAmount,
    total,
    totalAfterDiscount: subtotal - discountAmount,
  }
}

/**
 * Validate line data
 */
export function validateLine(line: Partial<QuoteLine> | Partial<InvoiceLine>): Record<string, string> {
  const errors: Record<string, string> = {}

  if (!line.description?.trim()) {
    errors.description = "La description est requise"
  }

  if (!line.quantity || line.quantity <= 0) {
    errors.quantity = "La quantité doit être supérieure à 0"
  }

  if (line.unitPrice !== undefined && line.unitPrice < 0) {
    errors.unitPrice = "Le prix unitaire ne peut pas être négatif"
  }

  if (line.taxRate !== undefined && (line.taxRate < 0 || line.taxRate > 100)) {
    errors.taxRate = "Le taux de taxe doit être entre 0 et 100%"
  }

  if (line.discountType === DiscountType.PERCENTAGE && line.discountValue !== undefined) {
    if (line.discountValue < 0 || line.discountValue > 100) {
      errors.discountValue = "Le pourcentage de remise doit être entre 0 et 100%"
    }
  } else if (line.discountType === DiscountType.FIXED_AMOUNT && line.discountValue !== undefined) {
    if (line.discountValue < 0) {
      errors.discountValue = "Le montant de remise ne peut pas être négatif"
    }
  }

  return errors
}

/**
 * Clean line data for API submission (remove temporary fields)
 */
export function cleanLineForSubmission<T extends QuoteLine | InvoiceLine>(
  line: LineWithCatalog<T>
): Omit<T, 'id' | 'createdAt' | 'updatedAt'> {
  const cleanLine = { ...line }

  // Remove temporary catalog-specific fields (keep catalogItemId as it's persisted)
  delete (cleanLine as any).tempId
  delete (cleanLine as any).isCustomLine
  delete (cleanLine as any).originalCatalogPrice
  delete (cleanLine as any).originalCatalogTaxRate

  // Remove entity fields for API submission
  delete (cleanLine as any).id
  delete (cleanLine as any).createdAt
  delete (cleanLine as any).updatedAt

  // Convert string numbers to actual numbers for API
  const result = cleanLine as any
  if (typeof result.quantity === 'string') result.quantity = parseFloat(result.quantity) || 0
  if (typeof result.unitPrice === 'string') result.unitPrice = parseFloat(result.unitPrice) || 0
  if (typeof result.discountValue === 'string') result.discountValue = parseFloat(result.discountValue) || 0
  if (typeof result.discountAmount === 'string') result.discountAmount = parseFloat(result.discountAmount) || 0
  if (typeof result.taxRate === 'string') result.taxRate = parseFloat(result.taxRate) || 0
  if (typeof result.taxAmount === 'string') result.taxAmount = parseFloat(result.taxAmount) || 0
  if (typeof result.subtotal === 'string') result.subtotal = parseFloat(result.subtotal) || 0
  if (typeof result.totalAfterDiscount === 'string') result.totalAfterDiscount = parseFloat(result.totalAfterDiscount) || 0
  if (typeof result.total === 'string') result.total = parseFloat(result.total) || 0

  return result as Omit<T, 'id' | 'createdAt' | 'updatedAt'>
}

/**
 * Calculate totals for a collection of lines
 */
export function calculateTotals(lines: Array<Partial<QuoteLine> | Partial<InvoiceLine>>) {
  let subtotal = 0
  let totalDiscountAmount = 0
  let totalTaxAmount = 0

  lines.forEach((line) => {
    const lineCalculations = calculateLineTotal(line)
    subtotal += lineCalculations.subtotal
    totalDiscountAmount += lineCalculations.discountAmount
    totalTaxAmount += lineCalculations.taxAmount
  })

  const total = subtotal - totalDiscountAmount + totalTaxAmount

  return {
    subtotal,
    totalDiscountAmount,
    totalTaxAmount,
    total,
  }
}