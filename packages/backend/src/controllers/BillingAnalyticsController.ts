import { Context } from "koa"
import { createError } from "../middleware/errorHandler"
import { BillingAnalyticsService } from "../services/BillingAnalyticsService"

export class BillingAnalyticsController {
  /**
   * Get comprehensive billing dashboard data
   * GET /api/billing/analytics/dashboard
   */
  public static async getDashboard(ctx: Context): Promise<void> {
    try {
      const { startDate, endDate, userId } = ctx.query

      const parsedStartDate = startDate ? new Date(startDate as string) : undefined
      const parsedEndDate = endDate ? new Date(endDate as string) : undefined
      const filterUserId = userId as string | undefined

      // Validate dates
      if (startDate && isNaN(parsedStartDate!.getTime())) {
        throw createError("Invalid start date format", 400, "INVALID_DATE")
      }
      if (endDate && isNaN(parsedEndDate!.getTime())) {
        throw createError("Invalid end date format", 400, "INVALID_DATE")
      }

      const dashboardData = await BillingAnalyticsService.getBillingDashboardData(
        parsedStartDate,
        parsedEndDate,
        filterUserId
      )

      ctx.body = {
        success: true,
        data: dashboardData,
      }
    } catch (error) {
      console.error("Error fetching billing dashboard:", error)
      throw createError(
        "Failed to fetch billing dashboard data",
        500,
        "DASHBOARD_FETCH_ERROR",
        { originalError: error }
      )
    }
  }

  /**
   * Get revenue analytics
   * GET /api/billing/analytics/revenue
   */
  public static async getRevenueAnalytics(ctx: Context): Promise<void> {
    try {
      const { startDate, endDate, userId } = ctx.query

      const parsedStartDate = startDate ? new Date(startDate as string) : undefined
      const parsedEndDate = endDate ? new Date(endDate as string) : undefined
      const filterUserId = userId as string | undefined

      const revenueAnalytics = await BillingAnalyticsService.getRevenueAnalytics(
        parsedStartDate,
        parsedEndDate,
        filterUserId
      )

      ctx.body = {
        success: true,
        data: revenueAnalytics,
      }
    } catch (error) {
      console.error("Error fetching revenue analytics:", error)
      throw createError(
        "Failed to fetch revenue analytics",
        500,
        "REVENUE_ANALYTICS_ERROR",
        { originalError: error }
      )
    }
  }

  /**
   * Get payment analytics
   * GET /api/billing/analytics/payments
   */
  public static async getPaymentAnalytics(ctx: Context): Promise<void> {
    try {
      const { startDate, endDate, userId } = ctx.query

      const parsedStartDate = startDate ? new Date(startDate as string) : undefined
      const parsedEndDate = endDate ? new Date(endDate as string) : undefined
      const filterUserId = userId as string | undefined

      const paymentAnalytics = await BillingAnalyticsService.getPaymentAnalytics(
        parsedStartDate,
        parsedEndDate,
        filterUserId
      )

      ctx.body = {
        success: true,
        data: paymentAnalytics,
      }
    } catch (error) {
      console.error("Error fetching payment analytics:", error)
      throw createError(
        "Failed to fetch payment analytics",
        500,
        "PAYMENT_ANALYTICS_ERROR",
        { originalError: error }
      )
    }
  }

  /**
   * Get outstanding invoice analytics
   * GET /api/billing/analytics/outstanding
   */
  public static async getOutstandingAnalytics(ctx: Context): Promise<void> {
    try {
      const { userId } = ctx.query
      const filterUserId = userId as string | undefined

      const outstandingAnalytics =
        await BillingAnalyticsService.getOutstandingInvoiceAnalytics(filterUserId)

      ctx.body = {
        success: true,
        data: outstandingAnalytics,
      }
    } catch (error) {
      console.error("Error fetching outstanding analytics:", error)
      throw createError(
        "Failed to fetch outstanding invoice analytics",
        500,
        "OUTSTANDING_ANALYTICS_ERROR",
        { originalError: error }
      )
    }
  }

  /**
   * Get medical institution segment analytics
   * GET /api/billing/analytics/segments
   */
  public static async getSegmentAnalytics(ctx: Context): Promise<void> {
    try {
      const { userId } = ctx.query
      const filterUserId = userId as string | undefined

      const segmentAnalytics =
        await BillingAnalyticsService.getMedicalInstitutionSegmentAnalytics(filterUserId)

      ctx.body = {
        success: true,
        data: segmentAnalytics,
      }
    } catch (error) {
      console.error("Error fetching segment analytics:", error)
      throw createError(
        "Failed to fetch medical institution segment analytics",
        500,
        "SEGMENT_ANALYTICS_ERROR",
        { originalError: error }
      )
    }
  }

  /**
   * Get cash flow projections
   * GET /api/billing/analytics/cash-flow
   */
  public static async getCashFlowProjections(ctx: Context): Promise<void> {
    try {
      const { projectionDays = "90", userId } = ctx.query
      const filterUserId = userId as string | undefined
      const days = Number.parseInt(projectionDays as string, 10)

      if (isNaN(days) || days < 1 || days > 365) {
        throw createError(
          "Projection days must be between 1 and 365",
          400,
          "INVALID_PROJECTION_DAYS"
        )
      }

      const cashFlowProjections = await BillingAnalyticsService.getCashFlowProjections(
        days,
        filterUserId
      )

      ctx.body = {
        success: true,
        data: cashFlowProjections,
      }
    } catch (error) {
      console.error("Error fetching cash flow projections:", error)
      throw createError("Failed to fetch cash flow projections", 500, "CASH_FLOW_ERROR", {
        originalError: error,
      })
    }
  }

  /**
   * Get billing KPIs
   * GET /api/billing/analytics/kpis
   */
  public static async getBillingKPIs(ctx: Context): Promise<void> {
    try {
      const { userId } = ctx.query
      const filterUserId = userId as string | undefined

      // Get KPIs as part of dashboard data for consistency
      const dashboardData = await BillingAnalyticsService.getBillingDashboardData(
        undefined,
        undefined,
        filterUserId
      )

      ctx.body = {
        success: true,
        data: dashboardData.kpis,
      }
    } catch (error) {
      console.error("Error fetching billing KPIs:", error)
      throw createError("Failed to fetch billing KPIs", 500, "KPI_FETCH_ERROR", {
        originalError: error,
      })
    }
  }

  /**
   * Export analytics data to CSV
   * GET /api/billing/analytics/export
   */
  public static async exportAnalytics(ctx: Context): Promise<void> {
    try {
      const { type, startDate, endDate, userId } = ctx.query

      if (
        !type ||
        !["revenue", "payments", "outstanding", "segments"].includes(type as string)
      ) {
        throw createError(
          "Export type must be one of: revenue, payments, outstanding, segments",
          400,
          "INVALID_EXPORT_TYPE"
        )
      }

      const parsedStartDate = startDate ? new Date(startDate as string) : undefined
      const parsedEndDate = endDate ? new Date(endDate as string) : undefined
      const filterUserId = userId as string | undefined

      let csvData: string
      let filename: string

      switch (type) {
        case "revenue":
          const revenueData = await BillingAnalyticsService.getRevenueAnalytics(
            parsedStartDate,
            parsedEndDate,
            filterUserId
          )
          csvData = this.convertRevenueToCSV(revenueData)
          filename = `revenue-analytics-${new Date().toISOString().split("T")[0]}.csv`
          break

        case "payments":
          const paymentData = await BillingAnalyticsService.getPaymentAnalytics(
            parsedStartDate,
            parsedEndDate,
            filterUserId
          )
          csvData = this.convertPaymentsToCSV(paymentData)
          filename = `payment-analytics-${new Date().toISOString().split("T")[0]}.csv`
          break

        case "outstanding":
          const outstandingData =
            await BillingAnalyticsService.getOutstandingInvoiceAnalytics(filterUserId)
          csvData = this.convertOutstandingToCSV(outstandingData)
          filename = `outstanding-analytics-${new Date().toISOString().split("T")[0]}.csv`
          break

        case "segments":
          const segmentData =
            await BillingAnalyticsService.getMedicalInstitutionSegmentAnalytics(
              filterUserId
            )
          csvData = this.convertSegmentsToCSV(segmentData)
          filename = `segment-analytics-${new Date().toISOString().split("T")[0]}.csv`
          break

        default:
          throw createError("Invalid export type", 400, "INVALID_EXPORT_TYPE")
      }

      ctx.set("Content-Type", "text/csv")
      ctx.set("Content-Disposition", `attachment; filename="${filename}"`)
      ctx.body = csvData
    } catch (error) {
      console.error("Error exporting analytics:", error)
      throw createError("Failed to export analytics data", 500, "EXPORT_ERROR", {
        originalError: error,
      })
    }
  }

  // Private helper methods for CSV conversion

  private static convertRevenueToCSV(data: any): string {
    const headers = [
      "Total Revenue",
      "Paid Revenue",
      "Pending Revenue",
      "Overdue Revenue",
      "Average Invoice Value",
      "Average Payment Time (days)",
    ]

    const rows = [
      [
        data.totalRevenue,
        data.paidRevenue,
        data.pendingRevenue,
        data.overdueRevenue,
        data.averageInvoiceValue,
        data.averagePaymentTime,
      ],
    ]

    // Add monthly breakdown
    if (data.monthlyRevenue && data.monthlyRevenue.length > 0) {
      rows.push([]) // Empty row
      rows.push(["Monthly Breakdown"])
      rows.push([
        "Month",
        "Year",
        "Total Invoiced",
        "Total Paid",
        "Invoice Count",
        "Payment Count",
      ])

      data.monthlyRevenue.forEach((month: any) => {
        rows.push([
          month.month,
          month.year,
          month.totalInvoiced,
          month.totalPaid,
          month.invoiceCount,
          month.paymentCount,
        ])
      })
    }

    return [headers.join(","), ...rows.map((row) => row.join(","))].join("\n")
  }

  private static convertPaymentsToCSV(data: any): string {
    const headers = ["Payment Method", "Amount", "Count", "Percentage", "Average Amount"]
    const rows = data.paymentsByMethod.map((method: any) => [
      method.method,
      method.amount,
      method.count,
      method.percentage.toFixed(2) + "%",
      method.averageAmount,
    ])

    return [headers.join(","), ...rows.map((row: any) => row.join(","))].join("\n")
  }

  private static convertOutstandingToCSV(data: any): string {
    const headers = [
      "Invoice Number",
      "Institution Name",
      "Amount",
      "Remaining Amount",
      "Days Overdue",
      "Status",
    ]

    const rows = data.topOverdueInvoices.map((invoice: any) => [
      invoice.invoiceNumber,
      invoice.institutionName,
      invoice.amount,
      invoice.remainingAmount,
      invoice.daysOverdue,
      invoice.status,
    ])

    return [headers.join(","), ...rows.map((row: any) => row.join(","))].join("\n")
  }

  private static convertSegmentsToCSV(data: any): string {
    const headers = [
      "Segment Name",
      "Total Revenue",
      "Invoice Count",
      "Average Invoice Value",
      "Payment Rate (%)",
    ]

    const rows = data.map((segment: any) => [
      segment.segmentName,
      segment.totalRevenue,
      segment.invoiceCount,
      segment.averageInvoiceValue,
      segment.paymentRate.toFixed(2),
    ])

    return [headers.join(","), ...rows.map((row: any) => row.join(","))].join("\n")
  }
}
