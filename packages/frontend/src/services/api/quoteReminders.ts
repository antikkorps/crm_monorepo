import { api } from "./index"

export interface QuoteNeedingAttention {
  id: string
  quoteNumber: string
  institutionId: string
  title: string
  total: number
  validUntil: string
  status: string
  daysUntilExpiry: number
  isExpired: boolean
  lastReminderSent?: string
  institution?: {
    id: string
    name: string
    type: string
  }
  assignedUser?: {
    id: string
    firstName: string
    lastName: string
    email: string
  }
  reminders?: QuoteReminder[]
}

export interface QuoteReminder {
  id: string
  quoteId: string
  reminderType: string
  sentAt: string
  sentByUserId?: string
  recipientEmail?: string
  message?: string
  actionTaken: string
  metadata?: Record<string, any>
  sentBy?: {
    id: string
    firstName: string
    lastName: string
    email: string
  }
}

export interface ReminderStatistics {
  totalSent: number
  byType: Record<string, number>
  byAction: Record<string, number>
  emailsSent: number
  tasksCreated: number
}

export interface SendReminderRequest {
  reminderType: string
  message?: string
}

export interface SendReminderResponse {
  success: boolean
  data: {
    quoteId: string
    quoteNumber: string
    reminderType: string
    success: boolean
    actionTaken: string
    error?: string
  }
  message?: string
}

export const quoteRemindersApi = {
  /**
   * Get quotes that need attention (expiring soon or expired)
   */
  async getQuotesNeedingAttention(): Promise<QuoteNeedingAttention[]> {
    const response = await api.get<{ success: boolean; data: QuoteNeedingAttention[]; count: number }>(
      "/quotes/reminders/needing-attention"
    )
    return response.data
  },

  /**
   * Get reminders for a specific quote
   */
  async getQuoteReminders(quoteId: string): Promise<QuoteReminder[]> {
    const response = await api.get<{ success: boolean; data: QuoteReminder[]; count: number }>(
      `/quotes/${quoteId}/reminders`
    )
    return response.data
  },

  /**
   * Send a manual reminder for a quote
   */
  async sendQuoteReminder(quoteId: string, data: SendReminderRequest): Promise<SendReminderResponse> {
    return api.post<SendReminderResponse>(`/quotes/${quoteId}/reminders`, data)
  },

  /**
   * Get reminder statistics
   */
  async getReminderStatistics(startDate?: string, endDate?: string): Promise<ReminderStatistics> {
    const params = new URLSearchParams()
    if (startDate) params.append("startDate", startDate)
    if (endDate) params.append("endDate", endDate)

    const queryString = params.toString()
    const endpoint = queryString ? `/quotes/reminders/statistics?${queryString}` : "/quotes/reminders/statistics"

    const response = await api.get<{ success: boolean; data: ReminderStatistics }>(endpoint)
    return response.data
  },
}
