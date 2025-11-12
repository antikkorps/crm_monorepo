import { apiClient } from "./index"

/**
 * Reminder rule stats summary
 */
export interface ReminderStatsSummary {
  totalRules: number
  activeRules: number
  inactiveRules: number
}

/**
 * Reminder notification stats
 */
export interface ReminderNotificationStats {
  totalSent: number
  totalFailed: number
  successRate: number
  daysActive: number
  averagePerDay: number
}

/**
 * Top reminder rule
 */
export interface TopReminderRule {
  id: string
  entityType: string
  triggerType: string
  priority: string
  isActive: boolean
  notificationsSent: number
  lastTriggered: string | null
}

/**
 * Timeline entry for reminder notifications
 */
export interface ReminderTimelineEntry {
  date: string
  sent: number
  failed: number
}

/**
 * Detailed reminder stats
 */
export interface ReminderStats {
  summary: ReminderStatsSummary
  notifications: ReminderNotificationStats
  topRules: TopReminderRule[]
  timeline: ReminderTimelineEntry[]
  lastJobRun: string | null
  periodDays: number
}

export interface ReminderStatsResponse {
  success: boolean
  data: ReminderStats
}

/**
 * Reminder Rules API service
 */
export const reminderRulesApi = {
  /**
   * Get detailed reminder statistics
   * @param daysBack - Number of days to look back for statistics (default: 30)
   * @returns Detailed reminder stats
   */
  async getDetailedStats(daysBack: number = 30): Promise<ReminderStats> {
    const response = await apiClient.get<ReminderStatsResponse>(
      `/reminder-rules/stats/detailed?daysBack=${daysBack}`
    )
    return response.data
  }
}
