import type {
  SimplifiedTransaction,
  SimplifiedTransactionCreateRequest,
  SimplifiedTransactionSearchFilters,
  SimplifiedTransactionStatus,
  SimplifiedTransactionType,
  SimplifiedTransactionUpdateRequest,
} from "@medical-crm/shared"
import { apiClient } from "./index"

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

interface SimplifiedTransactionStatistics {
  total: number
  byType: Record<SimplifiedTransactionType, number>
  byStatus: Record<SimplifiedTransactionStatus, number>
  totalAmountHt: number
  totalAmountTtc: number
  recentTransactions: SimplifiedTransaction[]
}

interface TimelineItem {
  id: string
  type: string
  title: string
  description: string
  date: Date
  amount: number
  status: string
  isExternal: true
  metadata: {
    transactionType: SimplifiedTransactionType
    referenceNumber?: string
    amountHt: number
    amountTtc: number
    vatRate: number
  }
}

export const simplifiedTransactionsApi = {
  /**
   * Get all simplified transactions with optional filtering and pagination
   */
  getAll: (
    filters?: SimplifiedTransactionSearchFilters & { page?: number; limit?: number }
  ) => {
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
    return apiClient.get<ApiResponse<SimplifiedTransaction[]>>(
      `/simplified-transactions${queryString ? `?${queryString}` : ""}`
    )
  },

  /**
   * Get a single simplified transaction by ID
   */
  getById: (id: string) =>
    apiClient.get<ApiResponse<SimplifiedTransaction>>(`/simplified-transactions/${id}`),

  /**
   * Get simplified transactions for a specific institution
   */
  getByInstitution: (
    institutionId: string,
    filters?: Omit<SimplifiedTransactionSearchFilters, "institutionId"> & {
      page?: number
      limit?: number
    }
  ) => {
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
    return apiClient.get<ApiResponse<SimplifiedTransaction[]>>(
      `/simplified-transactions/institution/${institutionId}${queryString ? `?${queryString}` : ""}`
    )
  },

  /**
   * Get simplified transactions by type
   */
  getByType: (type: SimplifiedTransactionType, page = 1, limit = 20) =>
    apiClient.get<ApiResponse<SimplifiedTransaction[]>>(
      `/simplified-transactions/type/${type}?page=${page}&limit=${limit}`
    ),

  /**
   * Get simplified transaction statistics
   */
  getStatistics: (institutionId?: string) => {
    const params = institutionId ? `?institutionId=${institutionId}` : ""
    return apiClient.get<ApiResponse<SimplifiedTransactionStatistics>>(
      `/simplified-transactions/statistics${params}`
    )
  },

  /**
   * Get simplified transactions formatted for timeline display
   */
  getForTimeline: (institutionId: string, dateFrom?: Date, dateTo?: Date) => {
    const params = new URLSearchParams()
    if (dateFrom) params.append("dateFrom", dateFrom.toISOString())
    if (dateTo) params.append("dateTo", dateTo.toISOString())
    const queryString = params.toString()
    return apiClient.get<ApiResponse<TimelineItem[]>>(
      `/simplified-transactions/timeline/${institutionId}${queryString ? `?${queryString}` : ""}`
    )
  },

  /**
   * Create a new simplified transaction
   */
  create: (data: SimplifiedTransactionCreateRequest) =>
    apiClient.post<ApiResponse<SimplifiedTransaction>>("/simplified-transactions", data),

  /**
   * Update an existing simplified transaction
   */
  update: (id: string, data: SimplifiedTransactionUpdateRequest) =>
    apiClient.put<ApiResponse<SimplifiedTransaction>>(
      `/simplified-transactions/${id}`,
      data
    ),

  /**
   * Delete a simplified transaction (soft delete)
   */
  delete: (id: string) => apiClient.delete(`/simplified-transactions/${id}`),
}

export default simplifiedTransactionsApi
