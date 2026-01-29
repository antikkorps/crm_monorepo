import { apiClient } from "./index"

/**
 * Activity type
 */
export interface Activity {
  id: string
  type: "institution" | "task" | "quote" | "invoice" | "sync" | "external"
  action: string
  title: string
  description: string
  entityId: string
  entityType: string
  timestamp: string
  user: {
    id: string
    name: string
  } | null
  icon: string
  color: string
  isExternal?: boolean
  metadata?: {
    transactionType?: string
    referenceNumber?: string
    status?: string
  }
}

/**
 * Alert type
 */
export interface Alert {
  id: string
  type: "critical" | "warning" | "info"
  title: string
  message: string
  count: number
  icon: string
  color: string
  action: {
    label: string
    route: string
  }
  priority: number
}

/**
 * Quick Action type
 */
export interface QuickAction {
  id: string
  title: string
  description: string
  icon: string
  color: string
  route: string
  priority: number
  category: string
}

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

  /**
   * Get recent activities timeline
   * @param limit - Number of activities to fetch (default: 20)
   * @param offset - Pagination offset (default: 0)
   * @param type - Filter by activity type (optional)
   * @returns List of activities
   */
  async getActivities(
    limit?: number,
    offset?: number,
    type?: string
  ): Promise<Activity[]> {
    const qp = new URLSearchParams()
    if (limit !== undefined) qp.append("limit", limit.toString())
    if (offset !== undefined) qp.append("offset", offset.toString())
    if (type) qp.append("type", type)

    const url = `/dashboard/activities${qp.toString() ? `?${qp.toString()}` : ""}`
    const response = await apiClient.get<{ success: boolean; data: Activity[] }>(url)

    return response.data
  },

  /**
   * Get smart alerts for the current user
   * @returns List of alerts
   */
  async getAlerts(): Promise<Alert[]> {
    const response = await apiClient.get<{ success: boolean; data: Alert[] }>(
      "/dashboard/alerts"
    )

    return response.data
  },

  /**
   * Get personalized quick actions
   * @returns List of quick actions
   */
  async getQuickActions(): Promise<QuickAction[]> {
    const response = await apiClient.get<{
      success: boolean
      data: QuickAction[]
    }>("/dashboard/quick-actions")

    return response.data
  },
}
