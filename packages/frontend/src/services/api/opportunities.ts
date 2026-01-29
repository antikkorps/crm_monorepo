import type {
  Opportunity,
  OpportunityCreateRequest,
  OpportunityUpdateRequest,
  OpportunityStage,
  OpportunityStatus,
  PipelineStage,
  ForecastResponse,
  ApiResponse,
} from "@medical-crm/shared"
import { apiClient } from "./index"

export interface OpportunityFilters {
  page?: number
  limit?: number
  stage?: OpportunityStage | OpportunityStage[]
  status?: OpportunityStatus | OpportunityStatus[]
  institutionId?: string
  assignedUserId?: string
  minValue?: number
  maxValue?: number
  minProbability?: number
  maxProbability?: number
  search?: string
  sortBy?: string
  sortOrder?: "ASC" | "DESC"
}

export const opportunitiesApi = {
  /**
   * Get all opportunities with filters
   */
  getAll: (filters?: OpportunityFilters) => {
    const params = new URLSearchParams()
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          if (Array.isArray(value)) {
            value.forEach((v) => params.append(key, v.toString()))
          } else {
            params.append(key, value.toString())
          }
        }
      })
    }
    const queryString = params.toString()
    return apiClient.get<
      ApiResponse<{
        opportunities: Opportunity[]
        pagination: {
          total: number
          page: number
          limit: number
          pages: number
        }
      }>
    >(`/opportunities${queryString ? `?${queryString}` : ""}`)
  },

  /**
   * Get single opportunity by ID
   */
  getById: (id: string) =>
    apiClient.get<ApiResponse<{ opportunity: Opportunity }>>(`/opportunities/${id}`),

  /**
   * Create new opportunity
   */
  create: (data: OpportunityCreateRequest) =>
    apiClient.post<ApiResponse<{ opportunity: Opportunity }>>("/opportunities", data),

  /**
   * Update opportunity
   */
  update: (id: string, data: OpportunityUpdateRequest) =>
    apiClient.put<ApiResponse<{ opportunity: Opportunity }>>(`/opportunities/${id}`, data),

  /**
   * Update opportunity stage (for drag & drop)
   */
  updateStage: (
    id: string,
    data: {
      stage: OpportunityStage
      wonReason?: string
      lostReason?: string
    }
  ) =>
    apiClient.put<ApiResponse<{ opportunity: Opportunity }>>(
      `/opportunities/${id}/stage`,
      data
    ),

  /**
   * Delete opportunity
   */
  delete: (id: string) =>
    apiClient.delete<ApiResponse<{ message: string }>>(`/opportunities/${id}`),

  /**
   * Get pipeline view (opportunities grouped by stage)
   */
  getPipeline: (filters?: { assignedUserId?: string; institutionId?: string; includeArchived?: boolean }) => {
    const params = new URLSearchParams()
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          params.append(key, value.toString())
        }
      })
    }
    const queryString = params.toString()
    return apiClient.get<ApiResponse<{ pipeline: PipelineStage[] }>>(
      `/opportunities/pipeline${queryString ? `?${queryString}` : ""}`
    )
  },

  /**
   * Get revenue forecast
   */
  getForecast: (filters?: { assignedUserId?: string; months?: number }) => {
    const params = new URLSearchParams()
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          params.append(key, value.toString())
        }
      })
    }
    const queryString = params.toString()
    return apiClient.get<ApiResponse<ForecastResponse>>(
      `/opportunities/forecast${queryString ? `?${queryString}` : ""}`
    )
  },

  /**
   * Get opportunity statistics grouped by assigned user
   */
  getStatsByUser: () =>
    apiClient.get<
      ApiResponse<{
        statsByUser: Array<{
          userId: string
          userName: string
          userEmail: string
          count: number
          totalValue: number
          weightedValue: number
          overdueCount: number
        }>
      }>
    >("/opportunities/stats/by-user"),
}
