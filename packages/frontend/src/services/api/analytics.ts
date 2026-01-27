import { apiClient } from "./index"

/**
 * Pipeline Analytics Interfaces
 */
export interface PipelineAnalytics {
  conversionRates: {
    byStage: Array<{
      stage: string
      totalEntered: number
      converted: number
      conversionRate: number
    }>
    overall: {
      totalOpportunities: number
      won: number
      lost: number
      winRate: number
      lossRate: number
    }
  }
  salesCycle: {
    averageDaysToClose: number
    averageDaysByStage: Array<{
      stage: string
      averageDays: number
    }>
    fastestDeal: {
      id: string
      name: string
      days: number
    } | null
    slowestDeal: {
      id: string
      name: string
      days: number
    } | null
  }
  winLossAnalysis: {
    wonDeals: {
      count: number
      totalValue: number
      averageValue: number
      topReasons: Array<{ reason: string; count: number }>
    }
    lostDeals: {
      count: number
      totalValue: number
      averageValue: number
      topReasons: Array<{ reason: string; count: number }>
    }
    competitorAnalysis: Array<{
      competitor: string
      lostDealsCount: number
      lostValue: number
    }>
  }
  revenue: {
    total: number
    won: number
    lost: number
    pipeline: number
  }
}

export interface RevenueForecast {
  summary: {
    totalPipelineValue: number
    weightedPipelineValue: number
    expectedRevenue: number
    confidence: "high" | "medium" | "low"
  }
  byStage: Array<{
    stage: string
    count: number
    totalValue: number
    weightedValue: number
    averageProbability: number
  }>
  byMonth: Array<{
    month: string
    opportunitiesClosing: number
    expectedRevenue: number
    pessimistic: number
    optimistic: number
  }>
  topOpportunities: Array<{
    id: string
    name: string
    value: number
    probability: number
    expectedCloseDate: string
    stage: string
    institution: string
  }>
}

export interface LeadScore {
  institutionId: string
  institutionName: string
  score: number
  level: "hot" | "warm" | "cold"
  factors: {
    sizeScore: number
    specialtyMatchScore: number
    engagementScore: number
    budgetScore: number
    responseScore: number
  }
  signals: Array<{
    type: "positive" | "negative" | "neutral"
    signalKey: string // i18n key for translation
    signalParams?: Record<string, string | number> // Parameters for interpolation
    impact: number
  }>
  recommendations: Array<{
    key: string // i18n key for translation
    params?: Record<string, string | number> // Parameters for interpolation
  }>
}

export interface NextBestAction {
  institutionId: string
  institutionName: string
  priority: "urgent" | "high" | "medium" | "low"
  actionKey: string
  actionParams?: Record<string, string | number>
  reasonKey: string
  reasonParams?: Record<string, string | number>
  category: "follow_up" | "upsell" | "retention" | "reactivation" | "closing"
  dueDate?: string
  relatedData?: {
    type: string
    id: string
    details: any
  }
}

export const analyticsApi = {
  /**
   * Get pipeline analytics
   */
  getPipelineAnalytics: (params?: {
    startDate?: string
    endDate?: string
    assignedUserId?: string
  }) => {
    const queryParams = new URLSearchParams()
    if (params?.startDate) queryParams.append("startDate", params.startDate)
    if (params?.endDate) queryParams.append("endDate", params.endDate)
    if (params?.assignedUserId) queryParams.append("assignedUserId", params.assignedUserId)

    const queryString = queryParams.toString()
    return apiClient.get<{ success: boolean; data: PipelineAnalytics }>(
      `/opportunities/analytics${queryString ? `?${queryString}` : ""}`
    )
  },

  /**
   * Get revenue forecast
   */
  getRevenueForecast: (params?: { months?: number; assignedUserId?: string }) => {
    const queryParams = new URLSearchParams()
    if (params?.months) queryParams.append("months", params.months.toString())
    if (params?.assignedUserId) queryParams.append("assignedUserId", params.assignedUserId)

    const queryString = queryParams.toString()
    return apiClient.get<{ success: boolean; data: RevenueForecast }>(
      `/opportunities/forecast/advanced${queryString ? `?${queryString}` : ""}`
    )
  },

  /**
   * Get lead score for an institution
   */
  getLeadScore: (institutionId: string) =>
    apiClient.get<{ success: boolean; data: LeadScore }>(
      `/institutions/${institutionId}/lead-score`
    ),

  /**
   * Get next best actions for an institution
   */
  getNextActions: (institutionId: string) =>
    apiClient.get<{ success: boolean; data: NextBestAction[] }>(
      `/institutions/${institutionId}/next-actions`
    ),

  /**
   * Get hot leads
   */
  getHotLeads: (limit = 20) =>
    apiClient.get<{ success: boolean; data: LeadScore[] }>(
      `/institutions/hot-leads?limit=${limit}`
    ),
}
