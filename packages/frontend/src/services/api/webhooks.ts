import { apiClient } from "./index"

export interface WebhookEvent {
  value: string
  label: string
  category: string
}

export interface WebhookEventGroup {
  [category: string]: WebhookEvent[]
}

export interface Webhook {
  id: string
  name: string
  url: string
  events: string[]
  status: "active" | "inactive" | "disabled"
  secret?: string
  headers?: Record<string, string>
  timeout: number
  maxRetries: number
  retryDelay: number
  lastTriggeredAt?: string
  lastSuccessAt?: string
  lastFailureAt?: string
  failureCount: number
  isActive: boolean
  createdBy: string
  createdAt: string
  updatedAt: string
  creator?: {
    id: string
    email: string
    firstName: string
    lastName: string
  }
  stats?: {
    totalDeliveries: number
    successfulDeliveries: number
    failedDeliveries: number
    successRate: number
    lastDelivery?: string
    lastSuccess?: string
    lastFailure?: string
  }
}

export interface WebhookLog {
  id: string
  webhookId: string
  event: string
  payload: Record<string, any>
  status: "pending" | "success" | "failed" | "retrying"
  httpStatus?: number
  responseBody?: string
  errorMessage?: string
  attemptCount: number
  maxAttempts: number
  nextRetryAt?: string
  deliveredAt?: string
  duration?: string
  createdAt: string
  updatedAt: string
}

export interface WebhookFilters {
  page?: number
  limit?: number
  status?: string
  event?: string
  search?: string
}

export interface WebhookLogFilters {
  page?: number
  limit?: number
  status?: string
  event?: string
  from?: string
  to?: string
}

export interface WebhookTestResult {
  success: boolean
  httpStatus?: number
  responseBody?: string
  errorMessage?: string
  duration: number
}

export interface CreateWebhookData {
  name: string
  url: string
  events: string[]
  secret?: string
  headers?: Record<string, string>
  timeout?: number
  maxRetries?: number
  retryDelay?: number
}

export interface UpdateWebhookData {
  name?: string
  url?: string
  events?: string[]
  secret?: string
  headers?: Record<string, string>
  timeout?: number
  maxRetries?: number
  retryDelay?: number
  status?: string
  isActive?: boolean
}

export const webhooksApi = {
  // Webhook CRUD operations
  getAll: (filters?: WebhookFilters) => {
    const params = new URLSearchParams()
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          params.append(key, value.toString())
        }
      })
    }
    const queryString = params.toString()
    return apiClient.get<{
      success: boolean
      data: {
        webhooks: Webhook[]
        pagination: {
          page: number
          limit: number
          total: number
          pages: number
        }
      }
    }>(`/webhooks${queryString ? `?${queryString}` : ""}`)
  },

  getById: (id: string) =>
    apiClient.get<{
      success: boolean
      data: {
        webhook: Webhook
      }
    }>(`/webhooks/${id}`),

  create: (data: CreateWebhookData) =>
    apiClient.post<{
      success: boolean
      message: string
      data: {
        webhook: Webhook
      }
    }>("/webhooks", data),

  update: (id: string, data: UpdateWebhookData) =>
    apiClient.put<{
      success: boolean
      message: string
      data: {
        webhook: Webhook
      }
    }>(`/webhooks/${id}`, data),

  delete: (id: string) =>
    apiClient.delete<{
      success: boolean
      message: string
    }>(`/webhooks/${id}`),

  // Webhook testing and management
  test: (id: string) =>
    apiClient.post<{
      success: boolean
      message: string
      data: {
        result: WebhookTestResult
      }
    }>(`/webhooks/${id}/test`),

  reset: (id: string) =>
    apiClient.post<{
      success: boolean
      message: string
    }>(`/webhooks/${id}/reset`),

  // Webhook logs
  getLogs: (id: string, filters?: WebhookLogFilters) => {
    const params = new URLSearchParams()
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          params.append(key, value.toString())
        }
      })
    }
    const queryString = params.toString()
    return apiClient.get<{
      success: boolean
      data: {
        logs: WebhookLog[]
        pagination: {
          page: number
          limit: number
          total: number
          pages: number
        }
      }
    }>(`/webhooks/${id}/logs${queryString ? `?${queryString}` : ""}`)
  },

  // Available events
  getEvents: () =>
    apiClient.get<{
      success: boolean
      data: {
        events: WebhookEvent[]
        groupedEvents: WebhookEventGroup
      }
    }>("/webhooks/events"),

  // Retry failed webhooks
  retryFailed: () =>
    apiClient.post<{
      success: boolean
      message: string
    }>("/webhooks/retry-failed"),
}
