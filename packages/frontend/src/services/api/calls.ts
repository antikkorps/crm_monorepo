import type {
  Call,
  CallCreateRequest,
  CallUpdateRequest,
  CallType,
  ApiResponse,
} from "@medical-crm/shared"
import { apiClient } from "./index"

export interface CallFilters {
  userId?: string
  institutionId?: string
  contactPersonId?: string
  callType?: CallType
  phoneNumber?: string
  dateFrom?: string
  dateTo?: string
  search?: string
  page?: number
  limit?: number
}

export const callsApi = {
  /**
   * Get all calls with optional filters
   */
  getAll: (filters?: CallFilters) => {
    const params = new URLSearchParams()
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          params.append(key, value.toString())
        }
      })
    }
    const queryString = params.toString()
    return apiClient.get<ApiResponse<Call[]>>(
      `/calls${queryString ? `?${queryString}` : ""}`
    )
  },

  /**
   * Get a single call by ID
   */
  getById: (id: string) => apiClient.get<ApiResponse<Call>>(`/calls/${id}`),

  /**
   * Create a new call
   */
  create: (data: CallCreateRequest) =>
    apiClient.post<ApiResponse<Call>>("/calls", data),

  /**
   * Update an existing call
   */
  update: (id: string, data: CallUpdateRequest) =>
    apiClient.put<ApiResponse<Call>>(`/calls/${id}`, data),

  /**
   * Delete a call
   */
  delete: (id: string) => apiClient.delete<ApiResponse<void>>(`/calls/${id}`),

  /**
   * Get calls by institution
   */
  getByInstitution: (institutionId: string) =>
    apiClient.get<ApiResponse<Call[]>>(`/calls/institution/${institutionId}`),

  /**
   * Get calls by user
   */
  getByUser: (userId: string) =>
    apiClient.get<ApiResponse<Call[]>>(`/calls/user/${userId}`),

  /**
   * Get calls by contact person
   */
  getByContactPerson: (contactPersonId: string) =>
    apiClient.get<ApiResponse<Call[]>>(`/calls/contact/${contactPersonId}`),
}
