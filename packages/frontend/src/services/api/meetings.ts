import type {
  Meeting,
  MeetingCreateRequest,
  MeetingUpdateRequest,
  MeetingStatus,
  ApiResponse,
} from "@medical-crm/shared"
import { apiClient } from "./index"

export interface MeetingFilters {
  organizerId?: string
  participantId?: string
  institutionId?: string
  status?: MeetingStatus
  startDateFrom?: string
  startDateTo?: string
  search?: string
  page?: number
  limit?: number
}

export const meetingsApi = {
  /**
   * Get all meetings with optional filters
   */
  getAll: (filters?: MeetingFilters) => {
    const params = new URLSearchParams()
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          params.append(key, value.toString())
        }
      })
    }
    const queryString = params.toString()
    return apiClient.get<ApiResponse<Meeting[]>>(
      `/meetings${queryString ? `?${queryString}` : ""}`
    )
  },

  /**
   * Get a single meeting by ID
   */
  getById: (id: string) => apiClient.get<ApiResponse<Meeting>>(`/meetings/${id}`),

  /**
   * Create a new meeting
   */
  create: (data: MeetingCreateRequest) =>
    apiClient.post<ApiResponse<Meeting>>("/meetings", data),

  /**
   * Update an existing meeting
   */
  update: (id: string, data: MeetingUpdateRequest) =>
    apiClient.put<ApiResponse<Meeting>>(`/meetings/${id}`, data),

  /**
   * Delete a meeting
   */
  delete: (id: string) => apiClient.delete<ApiResponse<void>>(`/meetings/${id}`),

  /**
   * Update meeting status
   */
  updateStatus: (id: string, status: MeetingStatus) =>
    apiClient.put<ApiResponse<Meeting>>(`/meetings/${id}/status`, { status }),

  /**
   * Add participants to a meeting
   */
  addParticipants: (id: string, userIds: string[]) =>
    apiClient.post<ApiResponse<void>>(`/meetings/${id}/participants`, { userIds }),

  /**
   * Remove a participant from a meeting
   */
  removeParticipant: (id: string, participantId: string) =>
    apiClient.delete<ApiResponse<void>>(`/meetings/${id}/participants/${participantId}`),

  /**
   * Update participant status
   */
  updateParticipantStatus: (
    id: string,
    participantId: string,
    status: "accepted" | "declined" | "tentative"
  ) =>
    apiClient.put<ApiResponse<void>>(`/meetings/${id}/participants/${participantId}/status`, {
      status,
    }),

  /**
   * Get meetings by institution
   */
  getByInstitution: (institutionId: string) =>
    apiClient.get<ApiResponse<Meeting[]>>(`/meetings/institution/${institutionId}`),

  /**
   * Get meetings by user (organizer or participant)
   */
  getByUser: (userId: string) =>
    apiClient.get<ApiResponse<Meeting[]>>(`/meetings/user/${userId}`),

  /**
   * Export meeting as .ics file (iCalendar format for Outlook/Teams)
   */
  exportToIcs: async (id: string): Promise<Blob> => {
    const response = await fetch(`${import.meta.env.VITE_API_URL || "/api"}/meetings/${id}/export/ics`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    })
    if (!response.ok) {
      throw new Error(`Failed to export meeting (${response.status})`)
    }
    return await response.blob()
  },

  /**
   * Send meeting invitation by email with .ics attachment
   */
  sendInvitation: (id: string, emails?: string[]) =>
    apiClient.post<ApiResponse<void>>(`/meetings/${id}/send-invitation`, { emails }),
}
