import { Op } from "sequelize"
import { Invoice } from "../models/Invoice"
import { Quote } from "../models/Quote"
import { MedicalInstitution } from "../models/MedicalInstitution"
import { InvoiceStatus, QuoteStatus } from "@medical-crm/shared"

/**
 * Revenue Analytics Response Interface
 */
export interface InstitutionRevenueAnalytics {
  institutionId: string
  institutionName: string
  summary: {
    totalRevenue: number // Total paid invoices
    pendingRevenue: number // Unpaid/partially paid invoices
    overdueRevenue: number // Overdue invoices
    totalQuotes: number
    acceptedQuotes: number
    conversionRate: number // % of quotes accepted
    averageInvoiceValue: number
    averageQuoteValue: number
    lifetimeValue: number // LTV = totalRevenue
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

/**
 * Institution Revenue Analytics Service
 * Calculates revenue metrics, LTV, conversion rates for institutions
 */
export class InstitutionRevenueService {
  /**
   * Get comprehensive revenue analytics for an institution
   */
  static async getRevenueAnalytics(
    institutionId: string,
    options: {
      months?: number // For future use
    } = {}
  ): Promise<InstitutionRevenueAnalytics> {
    // Fetch institution
    const institution = await MedicalInstitution.findByPk(institutionId)
    if (!institution) {
      throw new Error("Institution not found")
    }

    // Fetch all quotes for this institution
    const quotes = await Quote.findAll({
      where: { institutionId: institutionId },
      attributes: ["id", "quoteNumber", "status", "total", "createdAt"],
    })

    // Fetch all invoices for this institution
    const invoices = await Invoice.findAll({
      where: { institutionId: institutionId },
      attributes: ["id", "invoiceNumber", "status", "total", "totalPaid", "dueDate", "createdAt"],
    })

    // Calculate quote analytics
    const quoteAnalytics = {
      totalQuotes: quotes.length,
      acceptedQuotes: quotes.filter((q) => q.status === QuoteStatus.ACCEPTED).length,
      sentQuotes: quotes.filter((q) => q.status === QuoteStatus.SENT).length,
      rejectedQuotes: quotes.filter((q) => q.status === QuoteStatus.REJECTED || q.status === QuoteStatus.EXPIRED).length,
      totalQuoteValue: quotes.reduce((sum, q) => sum + parseFloat(q.total.toString()), 0),
      acceptedQuoteValue: quotes
        .filter((q) => q.status === QuoteStatus.ACCEPTED)
        .reduce((sum, q) => sum + parseFloat(q.total.toString()), 0),
    }

    // Calculate invoice analytics
    const now = new Date()
    const invoiceAnalytics = {
      totalInvoices: invoices.length,
      paidInvoices: invoices.filter((i) => i.status === InvoiceStatus.PAID).length,
      partiallyPaidInvoices: invoices.filter((i) => i.status === InvoiceStatus.PARTIALLY_PAID).length,
      unpaidInvoices: invoices.filter((i) => i.status === InvoiceStatus.SENT || i.status === InvoiceStatus.DRAFT).length,
      overdueInvoices: invoices.filter(
        (i) =>
          (i.status === InvoiceStatus.SENT || i.status === InvoiceStatus.OVERDUE || i.status === InvoiceStatus.PARTIALLY_PAID) &&
          i.dueDate &&
          new Date(i.dueDate) < now
      ).length,
      totalInvoiceValue: invoices.reduce((sum, i) => sum + parseFloat(i.total.toString()), 0),
      paidValue: invoices.reduce((sum, i) => sum + parseFloat(i.totalPaid.toString()), 0),
      pendingValue: invoices.reduce(
        (sum, i) => sum + (parseFloat(i.total.toString()) - parseFloat(i.totalPaid.toString())),
        0
      ),
    }

    // Summary metrics
    const totalRevenue = invoiceAnalytics.paidValue
    const pendingRevenue = invoiceAnalytics.pendingValue
    const overdueRevenue = invoices
      .filter(
        (i) =>
          (i.status === InvoiceStatus.SENT || i.status === InvoiceStatus.OVERDUE || i.status === InvoiceStatus.PARTIALLY_PAID) &&
          i.dueDate &&
          new Date(i.dueDate) < now
      )
      .reduce(
        (sum, i) => sum + (parseFloat(i.total.toString()) - parseFloat(i.totalPaid.toString())),
        0
      )

    const conversionRate =
      quoteAnalytics.totalQuotes > 0
        ? (quoteAnalytics.acceptedQuotes / quoteAnalytics.totalQuotes) * 100
        : 0

    const averageInvoiceValue =
      invoices.length > 0 ? invoiceAnalytics.totalInvoiceValue / invoices.length : 0

    const averageQuoteValue =
      quotes.length > 0 ? quoteAnalytics.totalQuoteValue / quotes.length : 0

    return {
      institutionId,
      institutionName: institution.name,
      summary: {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        pendingRevenue: Math.round(pendingRevenue * 100) / 100,
        overdueRevenue: Math.round(overdueRevenue * 100) / 100,
        totalQuotes: quoteAnalytics.totalQuotes,
        acceptedQuotes: quoteAnalytics.acceptedQuotes,
        conversionRate: Math.round(conversionRate * 100) / 100,
        averageInvoiceValue: Math.round(averageInvoiceValue * 100) / 100,
        averageQuoteValue: Math.round(averageQuoteValue * 100) / 100,
        lifetimeValue: Math.round(totalRevenue * 100) / 100,
      },
      quoteAnalytics,
      invoiceAnalytics,
    }
  }
}
