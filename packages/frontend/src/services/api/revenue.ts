import { apiClient } from "./index"

/**
 * Revenue Analytics Response
 */
export interface RevenueAnalytics {
  institutionId: string
  institutionName: string
  summary: {
    totalRevenue: number
    pendingRevenue: number
    overdueRevenue: number
    totalQuotes: number
    acceptedQuotes: number
    conversionRate: number
    averageInvoiceValue: number
    averageQuoteValue: number
    lifetimeValue: number
  }
  quoteAnalytics: {
    totalQuotes: number
    acceptedQuotes: number
    sentQuotes: number
    rejectedQuotes: number
    totalQuoteValue: number
    acceptedQuoteValue: number
  }
  invoiceAnalytics: {
    totalInvoices: number
    paidInvoices: number
    partiallyPaidInvoices: number
    unpaidInvoices: number
    overdueInvoices: number
    totalInvoiceValue: number
    paidValue: number
    pendingValue: number
  }
}

export const revenueApi = {
  /**
   * Get revenue analytics for an institution
   */
  getInstitutionRevenue: (institutionId: string) =>
    apiClient.get<{ success: boolean; data: RevenueAnalytics }>(
      `/institutions/${institutionId}/revenue`
    ),
}
