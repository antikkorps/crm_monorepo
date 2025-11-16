import type {
  Reminder,
  ReminderCreateRequest,
  ReminderUpdateRequest,
  ReminderPriority,
  ReminderStatus,
  ApiResponse,
} from "@medical-crm/shared"
import { apiClient } from "./index"

export interface ReminderFilters {
  userId?: string
  institutionId?: string
  contactPersonId?: string
  priority?: ReminderPriority
  status?: ReminderStatus
  dateFrom?: string
  dateTo?: string
  search?: string
  page?: number
  limit?: number
}

export const remindersApi = {
  /**
   * Get all reminders with optional filters
   */
  getAll: (filters?: ReminderFilters) => {
    const params = new URLSearchParams()
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          params.append(key, value.toString())
        }
      })
    }
    const queryString = params.toString()
    return apiClient.get<ApiResponse<Reminder[]>>(
      `/reminders${queryString ? `?${queryString}` : ""}`
    )
  },

  /**
   * Get a single reminder by ID
   */
  getById: (id: string) => apiClient.get<ApiResponse<Reminder>>(`/reminders/${id}`),

  /**
   * Create a new reminder
   */
  create: (data: ReminderCreateRequest) =>
    apiClient.post<ApiResponse<Reminder>>("/reminders", data),

  /**
   * Update an existing reminder
   */
  update: (id: string, data: ReminderUpdateRequest) =>
    apiClient.put<ApiResponse<Reminder>>(`/reminders/${id}`, data),

  /**
   * Delete a reminder
   */
  delete: (id: string) => apiClient.delete<ApiResponse<void>>(`/reminders/${id}`),

  /**
   * Complete a reminder
   */
  completeReminder: (id: string) =>
    apiClient.patch<ApiResponse<Reminder>>(`/reminders/${id}/complete`),

  /**
   * Cancel a reminder
   */
  cancelReminder: (id: string) =>
    apiClient.patch<ApiResponse<Reminder>>(`/reminders/${id}/cancel`),

  /**
   * Get upcoming reminders
   */
  getUpcoming: () =>
    apiClient.get<ApiResponse<Reminder[]>>("/reminders/upcoming"),

  /**
   * Get overdue reminders
   */
  getOverdue: () =>
    apiClient.get<ApiResponse<Reminder[]>>("/reminders/overdue"),

  /**
   * Get reminders by institution
   */
  getByInstitution: (institutionId: string) =>
    apiClient.get<ApiResponse<Reminder[]>>(`/reminders/institution/${institutionId}`),
}
