import { Op } from 'sequelize'
import { Invoice } from '../models/Invoice'
import { DigiformaInvoice } from '../models/DigiformaInvoice'
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
      where.issueDate = {}
      if (startDate) where.issueDate[Op.gte] = startDate
      if (endDate) where.issueDate[Op.lte] = endDate
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
   * Get formation revenue from Digiforma invoices
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
    const where: any = {}

    if (institutionId) {
      where.institutionId = institutionId
    }

    if (startDate || endDate) {
      where.issueDate = {}
      if (startDate) where.issueDate[Op.gte] = startDate
      if (endDate) where.issueDate[Op.lte] = endDate
    }

    const invoices = await DigiformaInvoice.findAll({ where })

    const totalRevenue = invoices.reduce(
      (sum, inv) => sum + parseFloat(inv.totalAmount?.toString() || '0'),
      0
    )
    const paidRevenue = invoices.reduce(
      (sum, inv) => sum + parseFloat(inv.paidAmount?.toString() || '0'),
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
