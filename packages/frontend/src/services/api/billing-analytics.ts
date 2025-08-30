import { apiClient } from "./index"

export interface BillingAnalyticsParams {
  startDate?: string
  endDate?: string
  userId?: string
}

export interface CashFlowParams extends BillingAnalyticsParams {
  projectionDays?: number
}

export interface ExportParams extends BillingAnalyticsParams {
  type: "revenue" | "payments" | "outstanding" | "segments"
}

export const billingAnalyticsApi = {
  /**
   * Get comprehensive billing dashboard data
   */
  async getDashboard(params?: BillingAnalyticsParams) {
    const response = await apiClient.get("/billing/analytics/dashboard", { params })
    return response.data
  },

  /**
   * Get revenue analytics
   */
  async getRevenueAnalytics(params?: BillingAnalyticsParams) {
    const response = await apiClient.get("/billing/analytics/revenue", { params })
    return response.data
  },

  /**
   * Get payment analytics
   */
  async getPaymentAnalytics(params?: BillingAnalyticsParams) {
    const response = await apiClient.get("/billing/analytics/payments", { params })
    return response.data
  },

  /**
   * Get outstanding invoice analytics
   */
  async getOutstandingAnalytics(params?: Pick<BillingAnalyticsParams, "userId">) {
    const response = await apiClient.get("/billing/analytics/outstanding", { params })
    return response.data
  },

  /**
   * Get medical institution segment analytics
   */
  async getSegmentAnalytics(params?: Pick<BillingAnalyticsParams, "userId">) {
    const response = await apiClient.get("/billing/analytics/segments", { params })
    return response.data
  },

  /**
   * Get cash flow projections
   */
  async getCashFlowProjections(params?: CashFlowParams) {
    const response = await apiClient.get("/billing/analytics/cash-flow", { params })
    return response.data
  },

  /**
   * Get billing KPIs
   */
  async getBillingKPIs(params?: Pick<BillingAnalyticsParams, "userId">) {
    const response = await apiClient.get("/billing/analytics/kpis", { params })
    return response.data
  },

  /**
   * Export analytics data to CSV
   */
  async exportData(params: ExportParams) {
    const response = await apiClient.get("/billing/analytics/export", {
      params,
      responseType: "blob",
    })
    return response
  },
}
