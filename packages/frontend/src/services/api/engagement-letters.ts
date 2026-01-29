import type {
  EngagementLetter,
  EngagementLetterCreateRequest,
  EngagementLetterMemberRequest,
  EngagementLetterSearchFilters,
  EngagementLetterStatistics,
  EngagementLetterStatus,
  EngagementLetterUpdateRequest,
} from "@medical-crm/shared"
import { apiClient } from "./index"

const API_BASE_URL = import.meta.env.VITE_API_URL || "/api"

interface ApiResponse<T> {
  success: boolean
  data: T
  meta?: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export const engagementLettersApi = {
  // CRUD operations
  getAll: (filters?: EngagementLetterSearchFilters & { page?: number; limit?: number }) => {
    const params = new URLSearchParams()
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          if (value instanceof Date) {
            params.append(key, value.toISOString())
          } else {
            params.append(key, String(value))
          }
        }
      })
    }
    const queryString = params.toString()
    return apiClient.get<ApiResponse<EngagementLetter[]>>(
      `/engagement-letters${queryString ? `?${queryString}` : ""}`
    )
  },

  getById: (id: string) =>
    apiClient.get<ApiResponse<EngagementLetter>>(`/engagement-letters/${id}`),

  create: (data: EngagementLetterCreateRequest) =>
    apiClient.post<ApiResponse<EngagementLetter>>("/engagement-letters", data),

  update: (id: string, data: EngagementLetterUpdateRequest) =>
    apiClient.put<ApiResponse<EngagementLetter>>(`/engagement-letters/${id}`, data),

  delete: (id: string) => apiClient.delete(`/engagement-letters/${id}`),

  // Workflow operations
  send: (id: string, recipientEmail?: string) =>
    apiClient.put<ApiResponse<EngagementLetter>>(`/engagement-letters/${id}/send`, {
      recipientEmail,
    }),

  accept: (id: string, clientComments?: string) =>
    apiClient.put<ApiResponse<EngagementLetter>>(`/engagement-letters/${id}/accept`, {
      clientComments,
    }),

  reject: (id: string, clientComments?: string) =>
    apiClient.put<ApiResponse<EngagementLetter>>(`/engagement-letters/${id}/reject`, {
      clientComments,
    }),

  complete: (id: string) =>
    apiClient.put<ApiResponse<EngagementLetter>>(`/engagement-letters/${id}/complete`),

  cancel: (id: string) =>
    apiClient.put<ApiResponse<EngagementLetter>>(`/engagement-letters/${id}/cancel`),

  // Member operations
  members: {
    getAll: (letterId: string) =>
      apiClient.get(`/engagement-letters/${letterId}/members`),

    add: (letterId: string, data: EngagementLetterMemberRequest) =>
      apiClient.post(`/engagement-letters/${letterId}/members`, data),

    update: (
      letterId: string,
      memberId: string,
      data: Partial<EngagementLetterMemberRequest>
    ) => apiClient.put(`/engagement-letters/${letterId}/members/${memberId}`, data),

    remove: (letterId: string, memberId: string) =>
      apiClient.delete(`/engagement-letters/${letterId}/members/${memberId}`),

    reorder: (letterId: string, memberIds: string[]) =>
      apiClient.put(`/engagement-letters/${letterId}/members/reorder`, { memberIds }),
  },

  // Statistics and filtering
  getStatistics: (userId?: string) => {
    const params = userId ? `?userId=${userId}` : ""
    return apiClient.get<ApiResponse<EngagementLetterStatistics>>(
      `/engagement-letters/statistics${params}`
    )
  },

  getByInstitution: (institutionId: string) =>
    apiClient.get<ApiResponse<EngagementLetter[]>>(
      `/engagement-letters/institution/${institutionId}`
    ),

  getByStatus: (status: EngagementLetterStatus) =>
    apiClient.get<ApiResponse<EngagementLetter[]>>(
      `/engagement-letters/status/${status}`
    ),

  // PDF generation
  generatePdf: (id: string, templateId?: string) => {
    const params = new URLSearchParams()
    if (templateId) params.append("templateId", templateId)
    const queryString = params.toString()
    return fetch(
      `${API_BASE_URL}/engagement-letters/${id}/pdf${queryString ? `?${queryString}` : ""}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      }
    )
  },

  // Version history
  getVersions: (id: string) => apiClient.get(`/engagement-letters/${id}/versions`),
}

export default engagementLettersApi
