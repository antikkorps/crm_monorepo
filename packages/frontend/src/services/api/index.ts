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

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: "GET" })
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

const apiClient = new ApiClient(API_BASE_URL)

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
  getAll: () => apiClient.get("/tasks"),
  getById: (id: string) => apiClient.get(`/tasks/${id}`),
  create: (data: any) => apiClient.post("/tasks", data),
  update: (id: string, data: any) => apiClient.put(`/tasks/${id}`, data),
  delete: (id: string) => apiClient.delete(`/tasks/${id}`),
}

export const quotesApi = {
  getAll: () => apiClient.get("/quotes"),
  getById: (id: string) => apiClient.get(`/quotes/${id}`),
  create: (data: any) => apiClient.post("/quotes", data),
  update: (id: string, data: any) => apiClient.put(`/quotes/${id}`, data),
  delete: (id: string) => apiClient.delete(`/quotes/${id}`),
}

export const invoicesApi = {
  getAll: () => apiClient.get("/invoices"),
  getById: (id: string) => apiClient.get(`/invoices/${id}`),
  create: (data: any) => apiClient.post("/invoices", data),
  update: (id: string, data: any) => apiClient.put(`/invoices/${id}`, data),
  delete: (id: string) => apiClient.delete(`/invoices/${id}`),
}

export const teamApi = {
  getAll: () => apiClient.get("/teams"),
  getById: (id: string) => apiClient.get(`/teams/${id}`),
  create: (data: any) => apiClient.post("/teams", data),
  update: (id: string, data: any) => apiClient.put(`/teams/${id}`, data),
  delete: (id: string) => apiClient.delete(`/teams/${id}`),
}
