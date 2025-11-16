import { apiClient } from "./index"

/**
 * Health Score Level
 */
export type HealthScoreLevel = "excellent" | "good" | "fair" | "poor" | "critical"

/**
 * Health Score Breakdown Interface
 */
export interface HealthScoreBreakdown {
  total: number // 0-100
  activityScore: number // 0-30
  recencyScore: number // 0-20
  revenueScore: number // 0-30
  engagementScore: number // 0-20
  factors: {
    totalInteractions: number
    lastInteractionDays: number
    lifetimeValue: number
    conversionRate: number
    overdueAmount: number
    pendingTasks: number
    completionRate: number
  }
  level: HealthScoreLevel
  color: string
}

export const healthScoreApi = {
  /**
   * Get health score for an institution
   */
  getInstitutionHealthScore: (institutionId: string) =>
    apiClient.get<{ success: boolean; data: HealthScoreBreakdown }>(
      `/institutions/${institutionId}/health-score`
    ),
}
