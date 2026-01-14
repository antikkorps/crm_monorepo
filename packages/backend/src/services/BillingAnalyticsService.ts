import { InvoiceStatus, PaymentMethod, PaymentStatus } from "@medical-crm/shared"
import { Op, QueryTypes } from "sequelize"
import { sequelize } from "../config/database"
import { Invoice } from "../models/Invoice"
import { MedicalInstitution } from "../models/MedicalInstitution"
import { MedicalProfile } from "../models/MedicalProfile"
import { Payment } from "../models/Payment"

export interface RevenueAnalytics {
  totalRevenue: number
  paidRevenue: number
  pendingRevenue: number
  overdueRevenue: number
  monthlyRevenue: MonthlyRevenue[]
  revenueByStatus: RevenueByStatus[]
  averageInvoiceValue: number
  averagePaymentTime: number // in days
}

export interface MonthlyRevenue {
  month: string
  year: number
  totalInvoiced: number
  totalPaid: number
  invoiceCount: number
  paymentCount: number
}

export interface RevenueByStatus {
  status: InvoiceStatus
  amount: number
  count: number
  percentage: number
}

export interface PaymentAnalytics {
  totalPayments: number
  paymentsByMethod: PaymentMethodAnalytics[]
  paymentsByStatus: PaymentStatusAnalytics[]
  averagePaymentAmount: number
  paymentTrends: PaymentTrend[]
  partialPaymentStats: PartialPaymentStats
}

export interface PaymentMethodAnalytics {
  method: PaymentMethod
  amount: number
  count: number
  percentage: number
  averageAmount: number
}

export interface PaymentStatusAnalytics {
  status: PaymentStatus
  amount: number
  count: number
  percentage: number
}

export interface PaymentTrend {
  date: string
  amount: number
  count: number
}

export interface PartialPaymentStats {
  invoicesWithPartialPayments: number
  averagePartialPaymentRatio: number
  totalPartiallyPaidAmount: number
  averageTimeToFullPayment: number // in days
}

export interface OutstandingInvoiceAnalytics {
  totalOutstanding: number
  overdueAmount: number
  overdueCount: number
  partiallyPaidAmount: number
  partiallyPaidCount: number
  agingBuckets: AgingBucket[]
  topOverdueInvoices: OutstandingInvoice[]
}

export interface AgingBucket {
  label: string
  daysMin: number
  daysMax: number | null
  amount: number
  count: number
}

export interface OutstandingInvoice {
  id: string
  invoiceNumber: string
  institutionName: string
  amount: number
  remainingAmount: number
  daysOverdue: number
  status: InvoiceStatus
}

export interface MedicalInstitutionSegmentAnalytics {
  segmentName: string
  totalRevenue: number
  invoiceCount: number
  averageInvoiceValue: number
  paymentRate: number // percentage of invoices paid
  institutions: InstitutionSegmentData[]
}

export interface InstitutionSegmentData {
  institutionId: string
  institutionName: string
  institutionType: string
  totalRevenue: number
  invoiceCount: number
  paymentRate: number
  lastInvoiceDate?: Date
}

export interface CashFlowProjection {
  projectionDate: Date
  expectedInflow: number
  confirmedInflow: number
  pendingInflow: number
  overdueInflow: number
  projectionDetails: CashFlowDetail[]
}

export interface CashFlowDetail {
  invoiceId: string
  invoiceNumber: string
  institutionName: string
  dueDate: Date
  amount: number
  remainingAmount: number
  probability: number // 0-1 based on payment history
  projectedPaymentDate: Date
}

export interface BillingDashboardData {
  revenueAnalytics: RevenueAnalytics
  paymentAnalytics: PaymentAnalytics
  outstandingAnalytics: OutstandingInvoiceAnalytics
  segmentAnalytics: MedicalInstitutionSegmentAnalytics[]
  cashFlowProjections: CashFlowProjection[]
  kpis: BillingKPIs
}

export interface BillingKPIs {
  totalActiveInvoices: number
  averageCollectionTime: number // in days
  collectionRate: number // percentage
  overdueRate: number // percentage
  monthlyGrowthRate: number // percentage
  customerPaymentScore: number // 0-100
}

export class BillingAnalyticsService {
  /**
   * Get comprehensive revenue analytics
   */
  public static async getRevenueAnalytics(
    startDate?: Date,
    endDate?: Date,
    userId?: string
  ): Promise<RevenueAnalytics> {
    const dateFilter = this.buildDateFilter(startDate, endDate)
    const userFilter = userId ? { assignedUserId: userId } : {}

    // Get total revenue metrics
    const invoices = await Invoice.findAll({
      where: {
        ...dateFilter,
        ...userFilter,
        status: {
          [Op.ne]: InvoiceStatus.CANCELLED,
        },
      },
      include: [
        {
          model: Payment,
          as: "payments",
          where: { status: PaymentStatus.CONFIRMED },
          required: false,
        },
      ],
    })

    const totalRevenue = invoices.reduce((sum, inv) => sum + inv.total, 0)
    const paidRevenue = invoices
      .filter((inv) => inv.status === InvoiceStatus.PAID)
      .reduce((sum, inv) => sum + inv.total, 0)
    const pendingRevenue = invoices
      .filter((inv) =>
        [InvoiceStatus.SENT, InvoiceStatus.PARTIALLY_PAID].includes(inv.status)
      )
      .reduce((sum, inv) => sum + inv.remainingAmount, 0)
    const overdueRevenue = invoices
      .filter((inv) => inv.status === InvoiceStatus.OVERDUE)
      .reduce((sum, inv) => sum + inv.remainingAmount, 0)

    // Get monthly revenue breakdown
    const monthlyRevenue = await this.getMonthlyRevenue(startDate, endDate, userId)

    // Get revenue by status
    const revenueByStatus = await this.getRevenueByStatus(startDate, endDate, userId)

    // Calculate averages
    const averageInvoiceValue = invoices.length > 0 ? totalRevenue / invoices.length : 0
    const averagePaymentTime = await this.calculateAveragePaymentTime(userId)

    return {
      totalRevenue,
      paidRevenue,
      pendingRevenue,
      overdueRevenue,
      monthlyRevenue,
      revenueByStatus,
      averageInvoiceValue,
      averagePaymentTime,
    }
  }

  /**
   * Get payment analytics and trends
   */
  public static async getPaymentAnalytics(
    startDate?: Date,
    endDate?: Date,
    userId?: string
  ): Promise<PaymentAnalytics> {
    const dateFilter =
      startDate && endDate
        ? {
            paymentDate: {
              [Op.between]: [startDate, endDate],
            },
          }
        : {}

    const userFilter = userId
      ? {
          "$invoice.assignedUserId$": userId,
        }
      : {}

    const payments = await Payment.findAll({
      where: {
        ...dateFilter,
        status: PaymentStatus.CONFIRMED,
      },
      include: [
        {
          model: Invoice,
          as: "invoice",
          where: userFilter,
          attributes: ["id", "assignedUserId"],
        },
      ],
    })

    const totalPayments = payments.reduce((sum, payment) => sum + payment.amount, 0)
    const averagePaymentAmount = payments.length > 0 ? totalPayments / payments.length : 0

    // Payment method analytics
    const paymentsByMethod = await this.getPaymentsByMethod(payments)

    // Payment status analytics
    const paymentsByStatus = await this.getPaymentsByStatus(startDate, endDate, userId)

    // Payment trends
    const paymentTrends = await this.getPaymentTrends(startDate, endDate, userId)

    // Partial payment statistics
    const partialPaymentStats = await this.getPartialPaymentStats(userId)

    return {
      totalPayments,
      paymentsByMethod,
      paymentsByStatus,
      averagePaymentAmount,
      paymentTrends,
      partialPaymentStats,
    }
  }

  /**
   * Get outstanding invoice analytics
   */
  public static async getOutstandingInvoiceAnalytics(
    userId?: string
  ): Promise<OutstandingInvoiceAnalytics> {
    const userFilter = userId ? { assignedUserId: userId } : {}

    const outstandingInvoices = await Invoice.findAll({
      where: {
        ...userFilter,
        status: {
          [Op.in]: [
            InvoiceStatus.SENT,
            InvoiceStatus.PARTIALLY_PAID,
            InvoiceStatus.OVERDUE,
          ],
        },
      },
      include: [
        {
          model: MedicalInstitution,
          as: "institution",
          attributes: ["id", "name", "type"],
        },
      ],
    })

    const totalOutstanding = outstandingInvoices.reduce(
      (sum, inv) => sum + inv.remainingAmount,
      0
    )
    const overdueInvoices = outstandingInvoices.filter(
      (inv) => inv.status === InvoiceStatus.OVERDUE
    )
    const overdueAmount = overdueInvoices.reduce(
      (sum, inv) => sum + inv.remainingAmount,
      0
    )
    const overdueCount = overdueInvoices.length

    const partiallyPaidInvoices = outstandingInvoices.filter(
      (inv) => inv.status === InvoiceStatus.PARTIALLY_PAID
    )
    const partiallyPaidAmount = partiallyPaidInvoices.reduce(
      (sum, inv) => sum + inv.remainingAmount,
      0
    )
    const partiallyPaidCount = partiallyPaidInvoices.length

    // Aging buckets
    const agingBuckets = this.calculateAgingBuckets(outstandingInvoices)

    // Top overdue invoices
    const topOverdueInvoices = overdueInvoices
      .sort((a, b) => b.remainingAmount - a.remainingAmount)
      .slice(0, 10)
      .map((inv) => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        institutionName: inv.institution?.name || "Unknown",
        amount: inv.total,
        remainingAmount: inv.remainingAmount,
        daysOverdue: inv.getDaysOverdue() || 0,
        status: inv.status,
      }))

    return {
      totalOutstanding,
      overdueAmount,
      overdueCount,
      partiallyPaidAmount,
      partiallyPaidCount,
      agingBuckets,
      topOverdueInvoices,
    }
  }

  /**
   * Get medical institution segment analytics
   */
  public static async getMedicalInstitutionSegmentAnalytics(
    userId?: string
  ): Promise<MedicalInstitutionSegmentAnalytics[]> {
    const userFilter = userId ? { assignedUserId: userId } : {}

    // Get all invoices with institution data
    const invoices = await Invoice.findAll({
      where: {
        ...userFilter,
        status: {
          [Op.ne]: InvoiceStatus.CANCELLED,
        },
      },
      include: [
        {
          model: MedicalInstitution,
          as: "institution",
          include: [
            {
              model: MedicalProfile,
              as: "medicalProfile",
            },
          ],
        },
      ],
    })

    // Group by institution type
    const segmentMap = new Map<
      string,
      {
        totalRevenue: number
        invoiceCount: number
        paidInvoices: number
        institutions: Map<string, InstitutionSegmentData>
      }
    >()

    invoices.forEach((invoice) => {
      const institutionType = invoice.institution?.type || "Unknown"
      const institutionId = invoice.institution?.id || "unknown"
      const institutionName = invoice.institution?.name || "Unknown"

      if (!segmentMap.has(institutionType)) {
        segmentMap.set(institutionType, {
          totalRevenue: 0,
          invoiceCount: 0,
          paidInvoices: 0,
          institutions: new Map(),
        })
      }

      const segment = segmentMap.get(institutionType)!
      segment.totalRevenue += invoice.total
      segment.invoiceCount += 1

      if (invoice.status === InvoiceStatus.PAID) {
        segment.paidInvoices += 1
      }

      // Track institution-level data
      if (!segment.institutions.has(institutionId)) {
        segment.institutions.set(institutionId, {
          institutionId,
          institutionName,
          institutionType,
          totalRevenue: 0,
          invoiceCount: 0,
          paymentRate: 0,
          lastInvoiceDate: invoice.createdAt,
        })
      }

      const institutionData = segment.institutions.get(institutionId)!
      institutionData.totalRevenue += invoice.total
      institutionData.invoiceCount += 1
      if (invoice.createdAt > institutionData.lastInvoiceDate!) {
        institutionData.lastInvoiceDate = invoice.createdAt
      }
    })

    // Convert to array and calculate metrics
    return Array.from(segmentMap.entries())
      .map(([segmentName, data]) => {
        const paymentRate =
          data.invoiceCount > 0 ? (data.paidInvoices / data.invoiceCount) * 100 : 0
        const averageInvoiceValue =
          data.invoiceCount > 0 ? data.totalRevenue / data.invoiceCount : 0

        // Calculate payment rate for each institution
        const institutions = Array.from(data.institutions.values()).map((inst) => {
          const institutionInvoices = invoices.filter(
            (inv) => inv.institution?.id === inst.institutionId
          )
          const paidCount = institutionInvoices.filter(
            (inv) => inv.status === InvoiceStatus.PAID
          ).length
          inst.paymentRate =
            institutionInvoices.length > 0
              ? (paidCount / institutionInvoices.length) * 100
              : 0
          return inst
        })

        return {
          segmentName,
          totalRevenue: data.totalRevenue,
          invoiceCount: data.invoiceCount,
          averageInvoiceValue,
          paymentRate,
          institutions: institutions.sort((a, b) => b.totalRevenue - a.totalRevenue),
        }
      })
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
  }

  /**
   * Generate cash flow projections
   */
  public static async getCashFlowProjections(
    projectionDays: number = 90,
    userId?: string
  ): Promise<CashFlowProjection[]> {
    const userFilter = userId ? { assignedUserId: userId } : {}

    // Get outstanding invoices
    const outstandingInvoices = await Invoice.findAll({
      where: {
        ...userFilter,
        status: {
          [Op.in]: [
            InvoiceStatus.SENT,
            InvoiceStatus.PARTIALLY_PAID,
            InvoiceStatus.OVERDUE,
          ],
        },
      },
      include: [
        {
          model: MedicalInstitution,
          as: "institution",
          attributes: ["id", "name"],
        },
        {
          model: Payment,
          as: "payments",
          where: { status: PaymentStatus.CONFIRMED },
          required: false,
        },
      ],
    })

    // Calculate payment probabilities based on historical data
    const paymentProbabilities = await this.calculatePaymentProbabilities(userId)

    const projections: CashFlowProjection[] = []
    const startDate = new Date()

    for (let i = 0; i <= projectionDays; i += 7) {
      // Weekly projections
      const projectionDate = new Date(startDate)
      projectionDate.setDate(startDate.getDate() + i)

      const weekEndDate = new Date(projectionDate)
      weekEndDate.setDate(projectionDate.getDate() + 6)

      let expectedInflow = 0
      let confirmedInflow = 0
      let pendingInflow = 0
      let overdueInflow = 0
      const projectionDetails: CashFlowDetail[] = []

      outstandingInvoices.forEach((invoice) => {
        const institutionId = invoice.institution?.id || "unknown"
        const probability = paymentProbabilities.get(institutionId) || 0.5

        // Estimate payment date based on due date and payment history
        const projectedPaymentDate = this.estimatePaymentDate(invoice, probability)

        if (
          projectedPaymentDate >= projectionDate &&
          projectedPaymentDate <= weekEndDate
        ) {
          const expectedAmount = invoice.remainingAmount * probability

          expectedInflow += expectedAmount

          if (invoice.status === InvoiceStatus.OVERDUE) {
            overdueInflow += expectedAmount
          } else {
            pendingInflow += expectedAmount
          }

          projectionDetails.push({
            invoiceId: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            institutionName: invoice.institution?.name || "Unknown",
            dueDate: invoice.dueDate,
            amount: invoice.total,
            remainingAmount: invoice.remainingAmount,
            probability,
            projectedPaymentDate,
          })
        }
      })

      projections.push({
        projectionDate,
        expectedInflow,
        confirmedInflow, // No confirmed future payments
        pendingInflow,
        overdueInflow,
        projectionDetails: projectionDetails.sort(
          (a, b) => b.remainingAmount - a.remainingAmount
        ),
      })
    }

    return projections
  }

  /**
   * Get comprehensive billing dashboard data
   */
  public static async getBillingDashboardData(
    startDate?: Date,
    endDate?: Date,
    userId?: string
  ): Promise<BillingDashboardData> {
    try {
      // Use Promise.allSettled to handle individual failures gracefully
      const results = await Promise.allSettled([
        this.getRevenueAnalytics(startDate, endDate, userId),
        this.getPaymentAnalytics(startDate, endDate, userId),
        this.getOutstandingInvoiceAnalytics(userId),
        this.getMedicalInstitutionSegmentAnalytics(userId),
        this.getCashFlowProjections(90, userId),
        this.calculateBillingKPIs(userId),
      ])

      // Extract successful results or provide default values
      const [
        revenueAnalytics,
        paymentAnalytics,
        outstandingAnalytics,
        segmentAnalytics,
        cashFlowProjections,
        kpis,
      ] = results.map((result, index) => {
        if (result.status === 'fulfilled') {
          return result.value
        } else {
          // Log the specific error
          const methodNames = [
            'getRevenueAnalytics',
            'getPaymentAnalytics',
            'getOutstandingInvoiceAnalytics',
            'getMedicalInstitutionSegmentAnalytics',
            'getCashFlowProjections',
            'calculateBillingKPIs'
          ]
          console.error(`Error in ${methodNames[index]}:`, result.reason)

          // Return appropriate default value based on method
          switch (index) {
            case 0: // revenueAnalytics
              return {
                totalRevenue: 0,
                paidRevenue: 0,
                pendingRevenue: 0,
                overdueRevenue: 0,
                monthlyRevenue: [],
                revenueByStatus: [],
                averageInvoiceValue: 0,
                averagePaymentTime: 0
              }
            case 1: // paymentAnalytics
              return {
                totalPayments: 0,
                paymentsByMethod: [],
                paymentsByStatus: [],
                averagePaymentAmount: 0,
                paymentTrends: [],
                partialPaymentStats: {
                  invoicesWithPartialPayments: 0,
                  averagePartialPaymentRatio: 0,
                  totalPartiallyPaidAmount: 0,
                  averageTimeToFullPayment: 0
                }
              }
            case 2: // outstandingAnalytics
              return {
                totalOutstanding: 0,
                overdueAmount: 0,
                overdueCount: 0,
                partiallyPaidAmount: 0,
                partiallyPaidCount: 0,
                agingBuckets: [],
                topOverdueInvoices: []
              }
            case 3: // segmentAnalytics (must return array)
              return []
            case 4: // cashFlowProjections (must return array)
              return []
            case 5: // kpis
              return {
                totalActiveInvoices: 0,
                averageCollectionTime: 0,
                collectionRate: 0,
                overdueRate: 0,
                monthlyGrowthRate: 0,
                customerPaymentScore: 0
              }
            default:
              return {}
          }
        }
      }) as [
        RevenueAnalytics,
        PaymentAnalytics,
        OutstandingInvoiceAnalytics,
        MedicalInstitutionSegmentAnalytics[],
        CashFlowProjection[],
        BillingKPIs
      ]

      return {
        revenueAnalytics,
        paymentAnalytics,
        outstandingAnalytics,
        segmentAnalytics,
        cashFlowProjections,
        kpis,
      }
    } catch (error) {
      console.error('Fatal error in getBillingDashboardData:', error)
      throw error
    }
  }

  // Private helper methods

  private static buildDateFilter(startDate?: Date, endDate?: Date) {
    if (!startDate && !endDate) return {}

    const filter: any = {}
    if (startDate && endDate) {
      filter.createdAt = { [Op.between]: [startDate, endDate] }
    } else if (startDate) {
      filter.createdAt = { [Op.gte]: startDate }
    } else if (endDate) {
      filter.createdAt = { [Op.lte]: endDate }
    }

    return filter
  }

  private static async getMonthlyRevenue(
    startDate?: Date,
    endDate?: Date,
    userId?: string
  ): Promise<MonthlyRevenue[]> {
    // SECURITY: Use parameterized query to prevent SQL injection
    const userFilter = userId ? `AND i.assigned_user_id = :userId` : ""
    const dateFilter =
      startDate && endDate
        ? `AND i.created_at BETWEEN :startDate AND :endDate`
        : ""

    const query = `
      SELECT
        EXTRACT(YEAR FROM i.created_at) as year,
        EXTRACT(MONTH FROM i.created_at) as month,
        TO_CHAR(i.created_at, 'Month') as month_name,
        SUM(i.total) as total_invoiced,
        SUM(CASE WHEN i.status = 'paid' THEN i.total ELSE 0 END) as total_paid,
        COUNT(i.id) as invoice_count,
        COUNT(CASE WHEN i.status = 'paid' THEN 1 END) as payment_count
      FROM invoices i
      WHERE i.status != 'cancelled'
      ${userFilter}
      ${dateFilter}
      GROUP BY EXTRACT(YEAR FROM i.created_at), EXTRACT(MONTH FROM i.created_at), TO_CHAR(i.created_at, 'Month')
      ORDER BY year DESC, month DESC
      LIMIT 12
    `

    const results = (await sequelize.query(query, {
      replacements: {
        userId: userId,
        startDate: startDate?.toISOString(),
        endDate: endDate?.toISOString(),
      },
      type: QueryTypes.SELECT,
    })) as any[]

    return results.map((row) => ({
      month: row.month_name.trim(),
      year: Number.parseInt(row.year),
      totalInvoiced: parseFloat(row.total_invoiced) || 0,
      totalPaid: parseFloat(row.total_paid) || 0,
      invoiceCount: Number.parseInt(row.invoice_count) || 0,
      paymentCount: Number.parseInt(row.payment_count) || 0,
    }))
  }

  private static async getRevenueByStatus(
    startDate?: Date,
    endDate?: Date,
    userId?: string
  ): Promise<RevenueByStatus[]> {
    const dateFilter = this.buildDateFilter(startDate, endDate)
    const userFilter = userId ? { assignedUserId: userId } : {}

    const invoices = await Invoice.findAll({
      where: {
        ...dateFilter,
        ...userFilter,
        status: { [Op.ne]: InvoiceStatus.CANCELLED },
      },
      attributes: ["status", "total"],
    })

    const statusMap = new Map<InvoiceStatus, { amount: number; count: number }>()
    let totalAmount = 0

    invoices.forEach((invoice) => {
      if (!statusMap.has(invoice.status)) {
        statusMap.set(invoice.status, { amount: 0, count: 0 })
      }
      const statusData = statusMap.get(invoice.status)!
      statusData.amount += invoice.total
      statusData.count += 1
      totalAmount += invoice.total
    })

    return Array.from(statusMap.entries()).map(([status, data]) => ({
      status,
      amount: data.amount,
      count: data.count,
      percentage: totalAmount > 0 ? (data.amount / totalAmount) * 100 : 0,
    }))
  }

  private static async calculateAveragePaymentTime(userId?: string): Promise<number> {
    // SECURITY: Use parameterized query to prevent SQL injection
    const userFilter = userId ? `AND i.assigned_user_id = :userId` : ""

    // Note: Since sent_at and paid_at columns don't exist in the current schema,
    // we'll calculate based on payment dates vs invoice creation dates
    const query = `
      SELECT AVG(EXTRACT(DAY FROM (p.payment_date - i.created_at))) as avg_payment_days
      FROM invoices i
      JOIN payments p ON p.invoice_id = i.id
      WHERE i.status = 'paid'
      AND p.status = 'confirmed'
      ${userFilter}
    `

    const result = (await sequelize.query(query, {
      replacements: { userId: userId },
      type: QueryTypes.SELECT,
    })) as any[]
    return result[0]?.avg_payment_days ? parseFloat(result[0].avg_payment_days) : 0
  }

  private static getPaymentsByMethod(payments: Payment[]): PaymentMethodAnalytics[] {
    const methodMap = new Map<PaymentMethod, { amount: number; count: number }>()
    let totalAmount = 0

    payments.forEach((payment) => {
      if (!methodMap.has(payment.paymentMethod)) {
        methodMap.set(payment.paymentMethod, { amount: 0, count: 0 })
      }
      const methodData = methodMap.get(payment.paymentMethod)!
      methodData.amount += payment.amount
      methodData.count += 1
      totalAmount += payment.amount
    })

    return Array.from(methodMap.entries()).map(([method, data]) => ({
      method,
      amount: data.amount,
      count: data.count,
      percentage: totalAmount > 0 ? (data.amount / totalAmount) * 100 : 0,
      averageAmount: data.count > 0 ? data.amount / data.count : 0,
    }))
  }

  private static async getPaymentsByStatus(
    startDate?: Date,
    endDate?: Date,
    userId?: string
  ): Promise<PaymentStatusAnalytics[]> {
    const dateFilter =
      startDate && endDate
        ? {
            paymentDate: { [Op.between]: [startDate, endDate] },
          }
        : {}

    const userFilter = userId ? { "$invoice.assignedUserId$": userId } : {}

    const payments = await Payment.findAll({
      where: dateFilter,
      include: [
        {
          model: Invoice,
          as: "invoice",
          where: userFilter,
          attributes: ["id"],
        },
      ],
      attributes: ["status", "amount"],
    })

    const statusMap = new Map<PaymentStatus, { amount: number; count: number }>()
    let totalAmount = 0

    payments.forEach((payment) => {
      if (!statusMap.has(payment.status)) {
        statusMap.set(payment.status, { amount: 0, count: 0 })
      }
      const statusData = statusMap.get(payment.status)!
      statusData.amount += payment.amount
      statusData.count += 1
      totalAmount += payment.amount
    })

    return Array.from(statusMap.entries()).map(([status, data]) => ({
      status,
      amount: data.amount,
      count: data.count,
      percentage: totalAmount > 0 ? (data.amount / totalAmount) * 100 : 0,
    }))
  }

  private static async getPaymentTrends(
    startDate?: Date,
    endDate?: Date,
    userId?: string
  ): Promise<PaymentTrend[]> {
    // SECURITY: Use parameterized queries to prevent SQL injection
    const userFilter = userId ? `AND i.assigned_user_id = :userId` : ""
    const dateFilter =
      startDate && endDate
        ? `AND p.payment_date BETWEEN :startDate AND :endDate`
        : "AND p.payment_date >= CURRENT_DATE - INTERVAL '30 days'"

    const query = `
      SELECT
        DATE(p.payment_date) as date,
        SUM(p.amount) as amount,
        COUNT(p.id) as count
      FROM payments p
      JOIN invoices i ON p.invoice_id = i.id
      WHERE p.status = 'confirmed'
      ${userFilter}
      ${dateFilter}
      GROUP BY DATE(p.payment_date)
      ORDER BY date ASC
    `

    const results = (await sequelize.query(query, {
      replacements: {
        userId: userId,
        startDate: startDate?.toISOString(),
        endDate: endDate?.toISOString(),
      },
      type: QueryTypes.SELECT,
    })) as any[]

    return results.map((row) => ({
      date: row.date,
      amount: parseFloat(row.amount) || 0,
      count: Number.parseInt(row.count) || 0,
    }))
  }

  private static async getPartialPaymentStats(
    userId?: string
  ): Promise<PartialPaymentStats> {
    // SECURITY: Use parameterized queries to prevent SQL injection
    const userFilter = userId ? `AND i.assigned_user_id = :userId` : ""

    const query = `
      SELECT
        COUNT(DISTINCT i.id) as invoices_with_partial_payments,
        AVG(i.paid_amount / NULLIF(i.total, 0)) as avg_partial_payment_ratio,
        SUM(i.paid_amount) as total_partially_paid_amount,
        AVG(EXTRACT(DAY FROM (i.paid_at - i.sent_at))) as avg_time_to_full_payment
      FROM invoices i
      WHERE i.status IN ('partially_paid', 'paid')
      AND i.paid_amount > 0
      AND i.paid_amount < i.total
      ${userFilter}
    `

    const result = (await sequelize.query(query, {
      replacements: { userId: userId },
      type: QueryTypes.SELECT,
    })) as any[]
    const row = result[0] as any

    return {
      invoicesWithPartialPayments: Number.parseInt(row?.invoices_with_partial_payments) || 0,
      averagePartialPaymentRatio: parseFloat(row?.avg_partial_payment_ratio) || 0,
      totalPartiallyPaidAmount: parseFloat(row?.total_partially_paid_amount) || 0,
      averageTimeToFullPayment: parseFloat(row?.avg_time_to_full_payment) || 0,
    }
  }

  private static calculateAgingBuckets(invoices: Invoice[]): AgingBucket[] {
    const buckets = [
      { label: "Current (0-30 days)", daysMin: 0, daysMax: 30, amount: 0, count: 0 },
      { label: "31-60 days", daysMin: 31, daysMax: 60, amount: 0, count: 0 },
      { label: "61-90 days", daysMin: 61, daysMax: 90, amount: 0, count: 0 },
      { label: "91-120 days", daysMin: 91, daysMax: 120, amount: 0, count: 0 },
      { label: "Over 120 days", daysMin: 121, daysMax: null, amount: 0, count: 0 },
    ]

    invoices.forEach((invoice) => {
      const daysOverdue = invoice.getDaysOverdue() || 0
      const bucket = buckets.find(
        (b) =>
          daysOverdue >= b.daysMin && (b.daysMax === null || daysOverdue <= b.daysMax)
      )

      if (bucket) {
        bucket.amount += invoice.remainingAmount
        bucket.count += 1
      }
    })

    return buckets
  }

  private static async calculatePaymentProbabilities(
    userId?: string
  ): Promise<Map<string, number>> {
    // SECURITY: Use parameterized queries to prevent SQL injection
    const userFilter = userId ? `AND i.assigned_user_id = :userId` : ""

    const query = `
      SELECT
        i.institution_id,
        CASE
          WHEN COUNT(i.id) = 0 THEN 0
          ELSE COUNT(CASE WHEN i.status = 'paid' THEN 1 END)::float / COUNT(i.id)
        END as payment_rate
      FROM invoices i
      WHERE i.status != 'cancelled'
      ${userFilter}
      GROUP BY i.institution_id
      HAVING COUNT(i.id) >= 3
    `

    const results = (await sequelize.query(query, {
      replacements: { userId: userId },
      type: QueryTypes.SELECT,
    })) as any[]
    const probabilityMap = new Map<string, number>()

    results.forEach((row: any) => {
      probabilityMap.set(row.institution_id, parseFloat(row.payment_rate))
    })

    return probabilityMap
  }

  private static estimatePaymentDate(invoice: Invoice, probability: number): Date {
    const baseDate = new Date()
    const daysUntilDue = invoice.getDaysUntilDue() || 0

    // Adjust based on probability and current status
    let estimatedDays = daysUntilDue

    if (invoice.status === InvoiceStatus.OVERDUE) {
      // For overdue invoices, estimate based on probability
      estimatedDays = Math.max(7, 30 * (1 - probability))
    } else if (probability > 0.8) {
      // High probability customers pay early
      estimatedDays = Math.max(0, daysUntilDue - 5)
    } else if (probability < 0.5) {
      // Low probability customers pay late
      estimatedDays = daysUntilDue + 15
    }

    const estimatedDate = new Date(baseDate)
    estimatedDate.setDate(baseDate.getDate() + estimatedDays)
    return estimatedDate
  }

  private static async calculateBillingKPIs(userId?: string): Promise<BillingKPIs> {
    const userFilter = userId ? { assignedUserId: userId } : {}

    const [totalActiveInvoices, collectionMetrics, overdueMetrics, growthMetrics] =
      await Promise.all([
        Invoice.count({
          where: {
            ...userFilter,
            status: {
              [Op.in]: [
                InvoiceStatus.SENT,
                InvoiceStatus.PARTIALLY_PAID,
                InvoiceStatus.OVERDUE,
              ],
            },
          },
        }),
        this.calculateCollectionMetrics(userId),
        this.calculateOverdueMetrics(userId),
        this.calculateGrowthMetrics(userId),
      ])

    return {
      totalActiveInvoices,
      averageCollectionTime: collectionMetrics.averageCollectionTime,
      collectionRate: collectionMetrics.collectionRate,
      overdueRate: overdueMetrics.overdueRate,
      monthlyGrowthRate: growthMetrics.monthlyGrowthRate,
      customerPaymentScore: collectionMetrics.customerPaymentScore,
    }
  }

  private static async calculateCollectionMetrics(userId?: string) {
    // SECURITY: Use parameterized queries to prevent SQL injection
    const userFilter = userId ? `AND assigned_user_id = :userId` : ""

    const query = `
      SELECT
        AVG(EXTRACT(DAY FROM (p.payment_date - i.created_at))) as avg_collection_time,
        CASE
          WHEN COUNT(DISTINCT i.id) = 0 THEN 0
          ELSE COUNT(DISTINCT CASE WHEN i.status = 'paid' THEN i.id END)::float / COUNT(DISTINCT i.id) * 100
        END as collection_rate,
        AVG(i.paid_amount / NULLIF(i.total, 0)) * 100 as customer_payment_score
      FROM invoices i
      LEFT JOIN payments p ON p.invoice_id = i.id AND p.status = 'confirmed'
      WHERE i.status != 'cancelled'
      ${userFilter}
    `

    const result = (await sequelize.query(query, {
      replacements: { userId: userId },
      type: QueryTypes.SELECT,
    })) as any[]
    const row = result[0] as any

    return {
      averageCollectionTime: parseFloat(row?.avg_collection_time) || 0,
      collectionRate: parseFloat(row?.collection_rate) || 0,
      customerPaymentScore: parseFloat(row?.customer_payment_score) || 0,
    }
  }

  private static async calculateOverdueMetrics(userId?: string) {
    // SECURITY: Use parameterized queries to prevent SQL injection
    const userFilter = userId ? `AND assigned_user_id = :userId` : ""

    const query = `
      SELECT
        CASE
          WHEN COUNT(*) = 0 THEN 0
          ELSE COUNT(CASE WHEN status = 'overdue' THEN 1 END)::float / COUNT(*) * 100
        END as overdue_rate
      FROM invoices
      WHERE status != 'cancelled'
      ${userFilter}
    `

    const result = (await sequelize.query(query, {
      replacements: { userId: userId },
      type: QueryTypes.SELECT,
    })) as any[]
    const row = result[0] as any

    return {
      overdueRate: parseFloat(row?.overdue_rate) || 0,
    }
  }

  private static async calculateGrowthMetrics(userId?: string) {
    // SECURITY: Use parameterized queries to prevent SQL injection
    const userFilter = userId ? `AND assigned_user_id = :userId` : ""

    const query = `
      WITH monthly_revenue AS (
        SELECT
          EXTRACT(YEAR FROM created_at) as year,
          EXTRACT(MONTH FROM created_at) as month,
          SUM(total) as revenue
        FROM invoices
        WHERE status != 'cancelled'
        ${userFilter}
        GROUP BY EXTRACT(YEAR FROM created_at), EXTRACT(MONTH FROM created_at)
        ORDER BY year DESC, month DESC
        LIMIT 2
      )
      SELECT
        CASE
          WHEN LAG(revenue) OVER (ORDER BY year, month) > 0
          THEN ((revenue - LAG(revenue) OVER (ORDER BY year, month)) / LAG(revenue) OVER (ORDER BY year, month)) * 100
          ELSE 0
        END as growth_rate
      FROM monthly_revenue
      ORDER BY year DESC, month DESC
      LIMIT 1
    `

    const result = (await sequelize.query(query, {
      replacements: { userId: userId },
      type: QueryTypes.SELECT,
    })) as any[]
    const row = result[0] as any

    return {
      monthlyGrowthRate: parseFloat(row?.growth_rate) || 0,
    }
  }
}
