import { Op } from 'sequelize'
import { Invoice } from '../models/Invoice'
import { DigiformaInvoice } from '../models/DigiformaInvoice'
import { DigiformaCompany } from '../models/DigiformaCompany'
import { DigiformaSettings } from '../models/DigiformaSettings'
import { DigiformaService } from './DigiformaService'
import { MedicalInstitution } from '../models/MedicalInstitution'
import { logger } from '../utils/logger'

export enum RevenueSource {
  AUDIT = 'audit',
  FORMATION = 'formation',
  OTHER = 'other',
}

export interface ConsolidatedRevenueData {
  audit: {
    totalRevenue: number
    paidRevenue: number
    unpaidRevenue: number
    invoiceCount: number
  }
  formation: {
    totalRevenue: number
    paidRevenue: number
    unpaidRevenue: number
    invoiceCount: number
  }
  other: {
    totalRevenue: number
    paidRevenue: number
    unpaidRevenue: number
    invoiceCount: number
  }
  total: {
    totalRevenue: number
    paidRevenue: number
    unpaidRevenue: number
  }
}

/**
 * ConsolidatedRevenueService - Calculate consolidated revenue across all sources
 *
 * This service aggregates revenue from:
 * - Audit: CRM invoices
 * - Formation: Digiforma invoices
 * - Other: Additional revenue sources
 */
export class ConsolidatedRevenueService {
  /**
   * Get consolidated revenue for a specific institution
   */
  static async getInstitutionRevenue(
    institutionId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<ConsolidatedRevenueData> {
    try {
      // Get Audit revenue (from CRM invoices)
      const auditRevenue = await this.getAuditRevenue(institutionId, startDate, endDate)

      // Get Formation revenue (from Digiforma invoices)
      const formationRevenue = await this.getFormationRevenue(institutionId, startDate, endDate)

      // Calculate totals
      const total = {
        totalRevenue: auditRevenue.totalRevenue + formationRevenue.totalRevenue,
        paidRevenue: auditRevenue.paidRevenue + formationRevenue.paidRevenue,
        unpaidRevenue: auditRevenue.unpaidRevenue + formationRevenue.unpaidRevenue,
      }

      return {
        audit: auditRevenue,
        formation: formationRevenue,
        other: {
          // Placeholder for other revenue sources
          totalRevenue: 0,
          paidRevenue: 0,
          unpaidRevenue: 0,
          invoiceCount: 0,
        },
        total,
      }
    } catch (error) {
      logger.error('Failed to get consolidated institution revenue', {
        institutionId,
        error: (error as Error).message,
      })
      throw error
    }
  }

  /**
   * Get global consolidated revenue (all institutions)
   */
  static async getGlobalRevenue(
    startDate?: Date,
    endDate?: Date
  ): Promise<ConsolidatedRevenueData> {
    try {
      // Get Audit revenue (from all CRM invoices)
      const auditRevenue = await this.getAuditRevenue(undefined, startDate, endDate)

      // Get Formation revenue (from all Digiforma invoices)
      const formationRevenue = await this.getFormationRevenue(undefined, startDate, endDate)

      // Calculate totals
      const total = {
        totalRevenue: auditRevenue.totalRevenue + formationRevenue.totalRevenue,
        paidRevenue: auditRevenue.paidRevenue + formationRevenue.paidRevenue,
        unpaidRevenue: auditRevenue.unpaidRevenue + formationRevenue.unpaidRevenue,
      }

      return {
        audit: auditRevenue,
        formation: formationRevenue,
        other: {
          totalRevenue: 0,
          paidRevenue: 0,
          unpaidRevenue: 0,
          invoiceCount: 0,
        },
        total,
      }
    } catch (error) {
      logger.error('Failed to get consolidated global revenue', {
        error: (error as Error).message,
      })
      throw error
    }
  }

  /**
   * Get audit revenue from CRM invoices
   */
  private static async getAuditRevenue(
    institutionId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    totalRevenue: number
    paidRevenue: number
    unpaidRevenue: number
    invoiceCount: number
  }> {
    const where: any = {}

    if (institutionId) {
      where.institutionId = institutionId
    }

    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) where.createdAt[Op.gte] = startDate
      if (endDate) where.createdAt[Op.lte] = endDate
    }

    const invoices = await Invoice.findAll({
      where,
      include: ['payments'] // Include payments to calculate paid amount
    })

    const totalRevenue = invoices.reduce(
      (sum, inv) => sum + parseFloat(inv.total?.toString() || '0'),
      0
    )

    const paidRevenue = invoices.reduce(
      (sum, inv) => {
        const payments = (inv as any).payments || []
        const invoicePaid = payments.reduce((pSum: number, p: any) => pSum + parseFloat(p.amount?.toString() || '0'), 0)
        return sum + invoicePaid
      },
      0
    )

    return {
      totalRevenue,
      paidRevenue,
      unpaidRevenue: totalRevenue - paidRevenue,
      invoiceCount: invoices.length,
    }
  }

  /**
   * Get formation revenue from Digiforma invoices (fetched from API)
   */
  private static async getFormationRevenue(
    institutionId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    totalRevenue: number
    paidRevenue: number
    unpaidRevenue: number
    invoiceCount: number
  }> {
    try {
      // Get Digiforma settings
      const settings = await DigiformaSettings.findOne()
      if (!settings || !settings.isEnabled) {
        return {
          totalRevenue: 0,
          paidRevenue: 0,
          unpaidRevenue: 0,
          invoiceCount: 0,
        }
      }

      // Get companies to fetch invoices for
      let companies: DigiformaCompany[]
      if (institutionId) {
        companies = await DigiformaCompany.findAll({
          where: { institutionId }
        })
        if (companies.length === 0) {
          return {
            totalRevenue: 0,
            paidRevenue: 0,
            unpaidRevenue: 0,
            invoiceCount: 0,
          }
        }
      } else {
        // Get all companies linked to institutions for global revenue
        companies = await DigiformaCompany.findAll({
          where: { institutionId: { [Op.not]: null } }
        })
      }

      // Fetch invoices from Digiforma API
      const token = settings.getDecryptedToken()
      const digiformaService = new DigiformaService(token)

      let allInvoices: any[] = []
      for (const company of companies) {
        try {
          const invoices = await digiformaService.fetchInvoicesByCompanyId(company.digiformaId)
          allInvoices.push(...invoices)
        } catch (error) {
          logger.warn('Failed to fetch invoices for company', {
            companyId: company.digiformaId,
            error: (error as Error).message
          })
        }
      }

      const totalFetched = allInvoices.length

      // Filter invoices by crmStatus WON and date range
      allInvoices = allInvoices.filter(invoice => {
        // Only count invoices where customer has WON status
        if (invoice.customer?.crmStatus !== 'WON') {
          return false
        }

        // Filter by date range if provided
        if (startDate || endDate) {
          if (!invoice.date) return false
          const invoiceDate = new Date(invoice.date)
          if (startDate && invoiceDate < startDate) return false
          if (endDate && invoiceDate > endDate) return false
        }

        return true
      })

      logger.info('Filtered invoices for formation revenue', {
        totalFetched,
        wonStatus: allInvoices.length,
        sampleStatuses: allInvoices.slice(0, 3).map(inv => inv.customer?.crmStatus)
      })

      // Calculate revenue from invoice items
      let totalRevenue = 0
      let paidRevenue = 0

      for (const invoice of allInvoices) {
        const items = invoice.items || []
        const invoiceTotal = items.reduce((sum: number, item: any) => {
          const quantity = parseFloat(item.quantity || 0)
          const unitPrice = parseFloat(item.unitPrice || 0)
          const vat = parseFloat(item.vat || 0)
          return sum + quantity * unitPrice * (1 + vat / 100)
        }, 0)

        totalRevenue += invoiceTotal

        // Calculate paid amount from payments
        const payments = invoice.payments || []
        const invoicePaid = payments.reduce((sum: number, payment: any) => {
          return sum + parseFloat(payment.amount || 0)
        }, 0)

        paidRevenue += invoicePaid
      }

      return {
        totalRevenue,
        paidRevenue,
        unpaidRevenue: totalRevenue - paidRevenue,
        invoiceCount: allInvoices.length,
      }
    } catch (error) {
      logger.error('Failed to get formation revenue from Digiforma API', {
        institutionId,
        error: (error as Error).message,
      })
      return {
        totalRevenue: 0,
        paidRevenue: 0,
        unpaidRevenue: 0,
        invoiceCount: 0,
      }
    }
  }

  /**
   * Get revenue evolution by month
   */
  static async getRevenueEvolution(
    months = 12,
    institutionId?: string
  ): Promise<
    Array<{
      month: string
      audit: number
      formation: number
      other: number
      total: number
    }>
  > {
    const evolution: Array<{
      month: string
      audit: number
      formation: number
      other: number
      total: number
    }> = []

    const now = new Date()

    for (let i = months - 1; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const nextMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1)

      const revenue = institutionId
        ? await this.getInstitutionRevenue(institutionId, monthDate, nextMonth)
        : await this.getGlobalRevenue(monthDate, nextMonth)

      evolution.push({
        month: monthDate.toISOString().slice(0, 7), // YYYY-MM format
        audit: revenue.audit.totalRevenue,
        formation: revenue.formation.totalRevenue,
        other: revenue.other.totalRevenue,
        total: revenue.total.totalRevenue,
      })
    }

    return evolution
  }

  /**
   * Get top institutions by revenue
   */
  static async getTopInstitutionsByRevenue(
    limit = 10,
    startDate?: Date,
    endDate?: Date
  ): Promise<
    Array<{
      institution: MedicalInstitution
      revenue: ConsolidatedRevenueData
    }>
  > {
    try {
      const institutions = await MedicalInstitution.findAll({
        where: { isActive: true },
        limit: limit * 2, // Get more to filter and sort
      })

      const institutionsWithRevenue = await Promise.all(
        institutions.map(async (institution) => {
          const revenue = await this.getInstitutionRevenue(institution.id, startDate, endDate)
          return { institution, revenue }
        })
      )

      // Sort by total revenue and take top N
      return institutionsWithRevenue
        .sort((a, b) => b.revenue.total.totalRevenue - a.revenue.total.totalRevenue)
        .slice(0, limit)
    } catch (error) {
      logger.error('Failed to get top institutions by revenue', {
        error: (error as Error).message,
      })
      throw error
    }
  }
}
