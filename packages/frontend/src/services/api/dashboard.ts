import { apiClient } from "./index"

/**
 * Dashboard metrics types
 */
export interface DashboardMetrics {
  institutions: {
    total: number
    active: number
    inactive: number
  }
  tasks: {
    total: number
    todo: number
    inProgress: number
    completed: number
    cancelled: number
    overdue: number
  }
  team: {
    totalMembers: number
    activeMembers: number
    teams: number
  }
  billing: {
    totalRevenue: number
    paidRevenue: number
    unpaidRevenue: number
    quotesCount: number
    invoicesCount: number
    avgQuoteValue: number
    avgInvoiceValue: number
  }
  newClients: {
    count: number
    percentageChange: number
  }
  conversionRate: {
    rate: number
    quotesAccepted: number
    quotesTotal: number
  }
  growth: {
    revenueGrowth: number
    clientsGrowth: number
    tasksCompletedGrowth: number
  }
  period: {
    type: string
    startDate: string
    endDate: string
  }
}

export interface DashboardMetricsParams {
  period?: "week" | "month" | "quarter" | "year"
}

export interface DashboardMetricsResponse {
  success: boolean
  data: DashboardMetrics
}

/**
 * Dashboard API service
 */
export const dashboardApi = {
  /**
   * Get dashboard metrics with role-based filtering
   * @param params - Optional parameters for filtering
   * @returns Dashboard metrics data
   */
  async getMetrics(
    params?: DashboardMetricsParams
  ): Promise<DashboardMetrics> {
    const qp = new URLSearchParams()
    if (params?.period) qp.append("period", params.period)

    const url = `/dashboard/metrics${qp.toString() ? `?${qp.toString()}` : ""}`
    const response = await apiClient.get<DashboardMetricsResponse>(url)

    return response.data
  },
}
