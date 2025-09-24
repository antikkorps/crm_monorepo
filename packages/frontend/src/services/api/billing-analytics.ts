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
    const qp = new URLSearchParams()
    if (params?.startDate) qp.append("startDate", params.startDate)
    if (params?.endDate) qp.append("endDate", params.endDate)
    if (params?.userId) qp.append("userId", params.userId)
    const url = `/billing/analytics/dashboard${qp.toString() ? `?${qp.toString()}` : ""}`
    const response = await apiClient.get<any>(url)
    return response
  },

  /**
   * Get revenue analytics
   */
  async getRevenueAnalytics(params?: BillingAnalyticsParams) {
    const qp = new URLSearchParams()
    if (params?.startDate) qp.append("startDate", params.startDate)
    if (params?.endDate) qp.append("endDate", params.endDate)
    if (params?.userId) qp.append("userId", params.userId)
    const url = `/billing/analytics/revenue${qp.toString() ? `?${qp.toString()}` : ""}`
    const response = await apiClient.get<any>(url)
    return response
  },

  /**
   * Get payment analytics
   */
  async getPaymentAnalytics(params?: BillingAnalyticsParams) {
    const qp = new URLSearchParams()
    if (params?.startDate) qp.append("startDate", params.startDate)
    if (params?.endDate) qp.append("endDate", params.endDate)
    if (params?.userId) qp.append("userId", params.userId)
    const url = `/billing/analytics/payments${qp.toString() ? `?${qp.toString()}` : ""}`
    const response = await apiClient.get<any>(url)
    return response
  },

  /**
   * Get outstanding invoice analytics
   */
  async getOutstandingAnalytics(params?: Pick<BillingAnalyticsParams, "userId">) {
    const qp = new URLSearchParams()
    if (params?.userId) qp.append("userId", params.userId)
    const url = `/billing/analytics/outstanding${qp.toString() ? `?${qp.toString()}` : ""}`
    const response = await apiClient.get<any>(url)
    return response
  },

  /**
   * Get medical institution segment analytics
   */
  async getSegmentAnalytics(params?: Pick<BillingAnalyticsParams, "userId">) {
    const qp = new URLSearchParams()
    if (params?.userId) qp.append("userId", params.userId)
    const url = `/billing/analytics/segments${qp.toString() ? `?${qp.toString()}` : ""}`
    const response = await apiClient.get<any>(url)
    return response
  },

  /**
   * Get cash flow projections
   */
  async getCashFlowProjections(params?: CashFlowParams) {
    const qp = new URLSearchParams()
    if (params?.startDate) qp.append("startDate", params.startDate)
    if (params?.endDate) qp.append("endDate", params.endDate)
    if (params?.userId) qp.append("userId", params.userId)
    if (params?.projectionDays != null) qp.append("projectionDays", String(params.projectionDays))
    const url = `/billing/analytics/cash-flow${qp.toString() ? `?${qp.toString()}` : ""}`
    const response = await apiClient.get<any>(url)
    return response
  },

  /**
   * Get billing KPIs
   */
  async getBillingKPIs(params?: Pick<BillingAnalyticsParams, "userId">) {
    const qp = new URLSearchParams()
    if (params?.userId) qp.append("userId", params.userId)
    const url = `/billing/analytics/kpis${qp.toString() ? `?${qp.toString()}` : ""}`
    const response = await apiClient.get<any>(url)
    return response
  },

  /**
   * Export analytics data to CSV
   */
  async exportData(params: ExportParams) {
    const qp = new URLSearchParams()
    if (params.startDate) qp.append("startDate", params.startDate)
    if (params.endDate) qp.append("endDate", params.endDate)
    if (params.userId) qp.append("userId", params.userId)
    qp.append("type", params.type)
    const url = `/billing/analytics/export${qp.toString() ? `?${qp.toString()}` : ""}`
    const blob = await apiClient.get<Blob>(url, { responseType: "blob" } as any)
    return blob
  },
}
