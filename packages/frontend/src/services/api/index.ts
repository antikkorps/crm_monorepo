import type { User } from "@medical-crm/shared"

export interface LoginCredentials {
  email: string
  password: string
}

const API_BASE_URL = import.meta.env.VITE_API_URL || "/api"
console.log("API_BASE_URL:", API_BASE_URL)

class ApiClient {
  private baseURL: string

  constructor(baseURL: string) {
    this.baseURL = baseURL
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = localStorage.getItem("token")

    const config: RequestInit = {
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    }

    const response = await fetch(`${this.baseURL}${endpoint}`, config)

    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem("token")
        window.location.href = "/login"
        throw new Error("Unauthorized")
      }
      // Try to extract error message from JSON body if available
      try {
        const contentType = response.headers.get("content-type") || ""
        if (contentType.includes("application/json")) {
          const errJson = await response.json().catch(() => null)
          const serverMsg = (errJson?.error?.message) || (errJson?.message) || null
          if (serverMsg) {
            const e = new Error(serverMsg)
            ;(e as any).status = response.status
            ;(e as any).code = errJson?.error?.code || errJson?.code
            throw e
          }
        }
      } catch (_) {
        // fallthrough to generic error
      }
      const e = new Error(`HTTP error ${response.status}`)
      ;(e as any).status = response.status
      throw e
    }

    // Handle empty responses (e.g., 204 No Content)
    if (response.status === 204 || response.status === 205) {
      return undefined as unknown as T
    }

    const contentType = response.headers.get("content-type") || ""
    if (!contentType.includes("application/json")) {
      // If server didn't return JSON, try to read text; if empty, return undefined
      const text = await response.text().catch(() => "")
      return (text ? (text as unknown as T) : (undefined as unknown as T))
    }

    // Parse JSON safely; treat empty body as undefined
    const text = await response.text()
    if (!text) return undefined as unknown as T
    return JSON.parse(text) as T
  }

  async get<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    // Special handling for blob requests
    if ((options as any).responseType === "blob") {
      console.log("Using blob handler for:", endpoint)
      return this.requestBlob(endpoint, { method: "GET", ...options }) as unknown as T
    }
    console.log("Using regular handler for:", endpoint)
    return this.request<T>(endpoint, { method: "GET", ...options })
  }

  private async requestBlob(endpoint: string, options: RequestInit = {}): Promise<Blob> {
    const token = localStorage.getItem("token")

    const config: RequestInit = {
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    }

    const response = await fetch(`${this.baseURL}${endpoint}`, config)

    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem("token")
        window.location.href = "/login"
        throw new Error("Unauthorized")
      }
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return response.blob()
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async patch<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: "PATCH",
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: "DELETE" })
  }
}

export const apiClient = new ApiClient(API_BASE_URL)
// Backwards-compatible alias for modules importing `{ api }`
export const api = apiClient

export const authApi = {
  login: (credentials: LoginCredentials) =>
    apiClient.post<{ data: { accessToken: string; user: User } }>("/auth/login", credentials),

  logout: () => apiClient.post("/auth/logout"),

  getProfile: () => apiClient.get<{ data: User }>("/users/profile/me").then(res => res.data),

  updateProfile: (data: Partial<User>) =>
    apiClient.put<{ data: { user: User } }>("/users/profile/me", data).then(res => res.data.user),

  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    apiClient.post<{ data: { message: string } }>("/users/profile/password", data),
}

export const institutionsApi = {
  getAll: (filters?: any) => {
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
    return apiClient.get(`/institutions${queryString ? `?${queryString}` : ""}`)
  },
  getById: (id: string) => apiClient.get(`/institutions/${id}`),
  create: (data: any) => apiClient.post("/institutions", data),
  update: (id: string, data: any) => apiClient.put(`/institutions/${id}`, data),
  delete: (id: string) => apiClient.delete(`/institutions/${id}`),
  search: (query: string, filters?: { limit?: number; type?: string; city?: string }) => {
    const params = new URLSearchParams()
    params.append("name", query)
    if (filters?.limit !== undefined) params.append("limit", filters.limit.toString())
    if (filters?.type) params.append("type", filters.type)
    if (filters?.city) params.append("city", filters.city)
    return apiClient.get(`/institutions/search?${params.toString()}`)
  },
  // Collaboration endpoints
  getCollaboration: (id: string) => apiClient.get(`/institutions/${id}/collaboration`),
  getTimeline: (
    id: string,
    params?: { limit?: number; offset?: number; startDate?: string; endDate?: string }
  ) => {
    const qp = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          qp.append(key, String(value))
        }
      })
    }
    const queryString = qp.toString()
    return apiClient.get(`/institutions/${id}/timeline${queryString ? `?${queryString}` : ""}`)
  },
  unifiedSearch: (params: {
    q: string
    type?: "institutions" | "tasks" | "notes" | "meetings" | "calls" | "reminders" | "all"
    institutionId?: string
    limit?: number
    offset?: number
    startDate?: string
    endDate?: string
    scope?: "own" | "team" | "all"
  }) => {
    const qp = new URLSearchParams()
    qp.append("q", params.q)
    if (params.type) qp.append("type", params.type)
    if (params.institutionId) qp.append("institutionId", params.institutionId)
    if (params.limit !== undefined) qp.append("limit", String(params.limit))
    if (params.offset !== undefined) qp.append("offset", String(params.offset))
    if (params.startDate) qp.append("startDate", params.startDate)
    if (params.endDate) qp.append("endDate", params.endDate)
    if (params.scope) qp.append("scope", params.scope)
    const queryString = qp.toString()
    return apiClient.get(`/institutions/search/unified?${queryString}`)
  },
  importCsv: (
    file: File,
    options?: { skipDuplicates?: boolean; mergeDuplicates?: boolean; validateOnly?: boolean }
  ) => {
    const formData = new FormData()
    formData.append("file", file)
    const qp = new URLSearchParams()
    if (options?.skipDuplicates !== undefined) qp.append("skipDuplicates", String(options.skipDuplicates))
    if (options?.mergeDuplicates !== undefined) qp.append("mergeDuplicates", String(options.mergeDuplicates))
    if (options?.validateOnly !== undefined) qp.append("validateOnly", String(options.validateOnly))
    const query = qp.toString()
    return fetch(`${API_BASE_URL}/institutions/import${query ? `?${query}` : ""}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: formData,
    }).then((response) => response.json())
  },
  validateCsv: (file: File) => {
    const formData = new FormData()
    formData.append("file", file)
    return fetch(`${API_BASE_URL}/institutions/import/validate`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: formData,
    }).then((response) => response.json())
  },

  previewCsv: (file: File) => {
    const formData = new FormData()
    formData.append("file", file)
    return fetch(`${API_BASE_URL}/institutions/import/preview`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: formData,
    }).then((response) => response.json())
  },

  downloadImportTemplate: async (): Promise<Blob> => {
    const response = await fetch(`${API_BASE_URL}/institutions/import/template`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    })
    if (!response.ok) {
      throw new Error(`Failed to download template (${response.status})`)
    }
    return await response.blob()
  },
  // Contact person endpoints
  contacts: {
    create: (institutionId: string, data: any) =>
      apiClient.post(`/institutions/${institutionId}/contacts`, data),
    update: (institutionId: string, contactId: string, data: any) =>
      apiClient.put(`/institutions/${institutionId}/contacts/${contactId}`, data),
    delete: (institutionId: string, contactId: string) =>
      apiClient.delete(`/institutions/${institutionId}/contacts/${contactId}`),
  },
}

export const tasksApi = {
  getAll: (filters?: any) => {
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
    return apiClient.get(`/tasks${queryString ? `?${queryString}` : ""}`)
  },
  getById: (id: string) => apiClient.get(`/tasks/${id}`),
  create: (data: any) => apiClient.post("/tasks", data),
  update: (id: string, data: any) => apiClient.put(`/tasks/${id}`, data),
  delete: (id: string) => apiClient.delete(`/tasks/${id}`),
  getAssigned: (userId: string) => apiClient.get(`/tasks/assigned/${userId}`),
}

export const quotesApi = {
  getAll: (filters?: any) => {
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
    return apiClient.get(`/quotes${queryString ? `?${queryString}` : ""}`)
  },
  getById: (id: string) => apiClient.get(`/quotes/${id}`),
  create: (data: any) => apiClient.post("/quotes", data),
  update: (id: string, data: any) => apiClient.put(`/quotes/${id}`, data),
  delete: (id: string) => apiClient.delete(`/quotes/${id}`),

  // Quote status workflow
  send: (id: string) => apiClient.put(`/quotes/${id}/send`),
  accept: (id: string) => apiClient.put(`/quotes/${id}/accept`),
  reject: (id: string) => apiClient.put(`/quotes/${id}/reject`),
  cancel: (id: string) => apiClient.put(`/quotes/${id}/cancel`),
  order: (id: string) => apiClient.put(`/quotes/${id}/order`),

  // Quote lines
  lines: {
    getAll: (quoteId: string) => apiClient.get(`/quotes/${quoteId}/lines`),
    create: (quoteId: string, data: any) =>
      apiClient.post(`/quotes/${quoteId}/lines`, data),
    update: (quoteId: string, lineId: string, data: any) =>
      apiClient.put(`/quotes/${quoteId}/lines/${lineId}`, data),
    delete: (quoteId: string, lineId: string) =>
      apiClient.delete(`/quotes/${quoteId}/lines/${lineId}`),
    reorder: (quoteId: string, lineIds: string[]) =>
      apiClient.put(`/quotes/${quoteId}/lines/reorder`, { lineIds }),
  },

  // Statistics and reporting
  getStatistics: (userId?: string) => {
    const params = userId ? `?userId=${userId}` : ""
    return apiClient.get(`/quotes/statistics${params}`)
  },
  getByInstitution: (institutionId: string) =>
    apiClient.get(`/quotes/institution/${institutionId}`),
  getByUser: (userId: string) => apiClient.get(`/quotes/user/${userId}`),
  getByStatus: (status: string) => apiClient.get(`/quotes/status/${status}`),

  // PDF generation
  generatePdf: (id: string, templateId?: string, email?: boolean) => {
    const params = new URLSearchParams()
    if (templateId) params.append("templateId", templateId)
    if (email) params.append("email", "true")
    const queryString = params.toString()
    return fetch(
      `${API_BASE_URL}/quotes/${id}/pdf${queryString ? `?${queryString}` : ""}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      }
    )
  },
  generateOrderPdf: (id: string, templateId?: string) => {
    const params = new URLSearchParams()
    if (templateId) params.append("templateId", templateId)
    const queryString = params.toString()
    return fetch(
      `${API_BASE_URL}/quotes/${id}/order-pdf${queryString ? `?${queryString}` : ""}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      }
    )
  },
  getVersions: (id: string) => apiClient.get(`/quotes/${id}/versions`),
}

export const invoicesApi = {
  getAll: (filters?: any) => {
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
    return apiClient.get(`/invoices${queryString ? `?${queryString}` : ""}`)
  },
  getById: (id: string) => apiClient.get(`/invoices/${id}`),
  create: (data: any) => apiClient.post("/invoices", data),
  createFromQuote: (quoteId: string) => apiClient.post(`/invoices/from-quote/${quoteId}`),
  update: (id: string, data: any) => apiClient.put(`/invoices/${id}`, data),
  delete: (id: string) => apiClient.delete(`/invoices/${id}`),
  send: (id: string) => apiClient.put(`/invoices/${id}/send`),
  cancel: (id: string) => apiClient.put(`/invoices/${id}/cancel`),
  reconcile: (id: string) => apiClient.put(`/invoices/${id}/reconcile`),
  updateStatus: (id: string, status: string, reason?: string) =>
    apiClient.put(`/invoices/${id}/status`, { status, reason }),
  archive: (id: string) => apiClient.put(`/invoices/${id}/archive`),
  unarchive: (id: string) => apiClient.put(`/invoices/${id}/unarchive`),

  // Invoice lines
  lines: {
    getAll: (invoiceId: string) => apiClient.get(`/invoices/${invoiceId}/lines`),
    create: (invoiceId: string, data: any) =>
      apiClient.post(`/invoices/${invoiceId}/lines`, data),
    update: (invoiceId: string, lineId: string, data: any) =>
      apiClient.put(`/invoices/${invoiceId}/lines/${lineId}`, data),
    delete: (invoiceId: string, lineId: string) =>
      apiClient.delete(`/invoices/${invoiceId}/lines/${lineId}`),
    reorder: (invoiceId: string, lineIds: string[]) =>
      apiClient.put(`/invoices/${invoiceId}/lines/reorder`, { lineIds }),
  },

  // Payments
  payments: {
    getAll: (invoiceId: string) => apiClient.get(`/invoices/${invoiceId}/payments`),
    create: (invoiceId: string, data: any) =>
      apiClient.post(`/invoices/${invoiceId}/payments`, data),
    confirm: (paymentId: string) =>
      apiClient.put(`/invoices/payments/${paymentId}/confirm`),
    cancel: (paymentId: string, reason?: string) =>
      apiClient.put(`/invoices/payments/${paymentId}/cancel`, { reason }),
    getHistory: (filters?: any) => {
      const params = new URLSearchParams()
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== "") {
            params.append(key, value.toString())
          }
        })
      }
      const queryString = params.toString()
      return apiClient.get(
        `/invoices/payments/history${queryString ? `?${queryString}` : ""}`
      )
    },
    getSummary: (filters?: any) => {
      const params = new URLSearchParams()
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== "") {
            params.append(key, value.toString())
          }
        })
      }
      const queryString = params.toString()
      return apiClient.get(
        `/invoices/payments/summary${queryString ? `?${queryString}` : ""}`
      )
    },
  },

  // Statistics and reporting
  getStatistics: (userId?: string) => {
    const params = userId ? `?userId=${userId}` : ""
    return apiClient.get(`/invoices/statistics${params}`)
  },
  getByInstitution: (institutionId: string) =>
    apiClient.get(`/invoices/institution/${institutionId}`),
  getByUser: (userId: string) => apiClient.get(`/invoices/user/${userId}`),
  getByStatus: (status: string) => apiClient.get(`/invoices/status/${status}`),

  // PDF generation
  generatePdf: (id: string, templateId?: string, email?: boolean) => {
    const params = new URLSearchParams()
    if (templateId) params.append("templateId", templateId)
    if (email) params.append("email", "true")
    const queryString = params.toString()
    return fetch(
      `${API_BASE_URL}/invoices/${id}/pdf${queryString ? `?${queryString}` : ""}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      }
    )
  },
  getVersions: (id: string) => apiClient.get(`/invoices/${id}/versions`),
}

export const teamApi = {
  getAll: () => apiClient.get("/teams"),
  getById: (id: string) => apiClient.get(`/teams/${id}`),
  create: (data: any) => apiClient.post("/teams", data),
  update: (id: string, data: any) => apiClient.put(`/teams/${id}`, data),
  delete: (id: string) => apiClient.delete(`/teams/${id}`),
  getMembers: (id: string) => apiClient.get(`/teams/${id}/members`),
  addMember: (id: string, userId: string) =>
    apiClient.post(`/teams/${id}/members`, { userId }),
  removeMember: (id: string, userId: string) =>
    apiClient.delete(`/teams/${id}/members/${userId}`),
}

export const usersApi = {
  getAll: (filters?: any) => {
    const params = new URLSearchParams()
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          params.append(key, value.toString())
        }
      })
    }
    const queryString = params.toString()
    return apiClient.get(`/users${queryString ? `?${queryString}` : ""}`)
  },
  getById: (id: string) => apiClient.get(`/users/${id}`),
  create: (data: any) => apiClient.post("/users", data),
  update: (id: string, data: any) => apiClient.put(`/users/${id}`, data),
  delete: (id: string) => apiClient.delete(`/users/${id}`),
  resetPassword: (userId: string, newPassword: string) =>
    apiClient.post(`/users/${userId}/reset-password`, { newPassword }),
  assignTerritory: (userId: string, institutionIds: string[]) =>
    apiClient.post(`/users/${userId}/territory`, { institutionIds }),
}

export const templatesApi = {
  getAll: (filters?: any) => {
    const params = new URLSearchParams()
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          params.append(key, value.toString())
        }
      })
    }
    const queryString = params.toString()
    return apiClient.get(`/templates${queryString ? `?${queryString}` : ""}`)
  },
  getById: (id: string) => apiClient.get(`/templates/${id}`),
  create: (data: any) => apiClient.post("/templates", data),
  update: (id: string, data: any) => apiClient.put(`/templates/${id}`, data),
  delete: (id: string) => apiClient.delete(`/templates/${id}`),
  setDefault: (id: string) => apiClient.put(`/templates/${id}/set-default`),
  duplicate: (id: string, name: string) =>
    apiClient.post(`/templates/${id}/duplicate`, { name }),
  preview: (id: string, sampleData?: any) =>
    sampleData
      ? fetch(`${API_BASE_URL}/templates/${id}/preview`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(sampleData),
        }).then(async (res) => {
          if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`)
          return res.text()
        })
      : fetch(`${API_BASE_URL}/templates/${id}/preview`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }).then(async (res) => {
          if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`)
          return res.text()
        }),
  uploadLogo: (file: File, templateId?: string) => {
    const formData = new FormData()
    formData.append("logo", file)
    const endpoint = templateId
      ? `/templates/${templateId}/upload-logo`
      : "/templates/upload-logo"
    return fetch(`${API_BASE_URL}${endpoint}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: formData,
    }).then((response) => response.json())
  },
  listLogos: () => apiClient.get(`/templates/logos`),
}

// Export documents API
export { documentsApi } from "./documents"

// Export billing analytics API
export { billingAnalyticsApi } from "./billing-analytics"

// Export webhooks API
export { webhooksApi } from "./webhooks"

// Export plugins API
export { PluginService } from "./plugins"

// Export contacts API
export { contactsApi } from "./contacts"

// Export catalog API
export const catalogApi = {
  getAll: (filters?: any) => {
    const params = new URLSearchParams()
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          params.append(key, value.toString())
        }
      })
    }
    const queryString = params.toString()
    return apiClient.get(`/catalog${queryString ? `?${queryString}` : ""}`)
  },
  getById: (id: string) => apiClient.get(`/catalog/${id}`),
  create: (data: any) => apiClient.post("/catalog", data),
  update: (id: string, data: any) => apiClient.put(`/catalog/${id}`, data),
  delete: (id: string) => apiClient.delete(`/catalog/${id}`),
  toggle: (id: string) => apiClient.patch(`/catalog/${id}/toggle`),
  search: (query: string) => apiClient.get(`/catalog/search?q=${encodeURIComponent(query)}`),
  getCategories: () => apiClient.get("/catalog/categories"),
}

// Export Digiforma API
export { digiformaApi } from './digiforma'

// Export Dashboard API
export { dashboardApi } from './dashboard'

// Export Reminder Rules API
export { reminderRulesApi } from './reminderRules'

// Export Meetings API
export { meetingsApi } from './meetings'

// Export Calls API
export { callsApi } from './calls'

// Export Notes API
export { notesApi } from './notes'

// Export Reminders API
export { remindersApi } from './reminders'

// System Settings API
export const settingsApi = {
  getPublic: () => apiClient.get("/settings/public"),
  getAll: () => apiClient.get("/settings"),
  getByCategory: (category: string) => apiClient.get(`/settings/category/${category}`),
  updateSetting: (key: string, value: any) => apiClient.put(`/settings/${key}`, { value }),
  bulkUpdate: (settings: Array<{ key: string; value: any }>) =>
    apiClient.post("/settings/bulk-update", { settings }),
}
