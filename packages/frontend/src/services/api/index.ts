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
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return response.json()
  }

  async get<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    return this.request<T>(endpoint, { method: "GET", ...options })
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

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: "DELETE" })
  }
}

export const apiClient = new ApiClient(API_BASE_URL)

export const authApi = {
  login: (credentials: LoginCredentials) =>
    apiClient.post<{ token: string; user: User }>("/auth/login", credentials),

  logout: () => apiClient.post("/auth/logout"),

  getProfile: () => apiClient.get<User>("/auth/profile"),

  updateProfile: (data: Partial<User>) => apiClient.put<User>("/auth/profile", data),
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
  search: (query: string) =>
    apiClient.get(`/institutions/search?q=${encodeURIComponent(query)}`),
  importCsv: (file: File) => {
    const formData = new FormData()
    formData.append("file", file)
    return fetch(`${API_BASE_URL}/institutions/import`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: formData,
    }).then((response) => response.json())
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
  getAll: () => apiClient.get("/quotes"),
  getById: (id: string) => apiClient.get(`/quotes/${id}`),
  create: (data: any) => apiClient.post("/quotes", data),
  update: (id: string, data: any) => apiClient.put(`/quotes/${id}`, data),
  delete: (id: string) => apiClient.delete(`/quotes/${id}`),
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
      ? apiClient.post(`/templates/${id}/preview`, sampleData)
      : apiClient.get(`/templates/${id}/preview`),
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
}

// Export documents API
export { documentsApi } from "./documents"

// Export billing analytics API
export { billingAnalyticsApi } from "./billing-analytics"

// Export webhooks API
export { webhooksApi } from "./webhooks"

// Export plugins API
export { PluginService } from "./plugins"
