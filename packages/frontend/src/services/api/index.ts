import type { LoginCredentials } from "@/stores/auth"
import type { User } from "@medical-crm/shared"
import axios, { type AxiosInstance, type AxiosResponse } from "axios"

// Create axios instance with base configuration
const apiClient: AxiosInstance = axios.create({
  baseURL: "/api",
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
})

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("accessToken")
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor for error handling and token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    // Handle 401 errors (unauthorized)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        const refreshToken = localStorage.getItem("refreshToken")
        if (refreshToken) {
          const response = await axios.post("/api/auth/refresh", {
            refreshToken,
          })

          const { accessToken, refreshToken: newRefreshToken } = response.data
          localStorage.setItem("accessToken", accessToken)
          localStorage.setItem("refreshToken", newRefreshToken)

          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${accessToken}`
          return apiClient(originalRequest)
        }
      } catch (refreshError) {
        // Refresh failed, redirect to login
        localStorage.removeItem("accessToken")
        localStorage.removeItem("refreshToken")
        window.location.href = "/login"
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  }
)

// Auth API endpoints
export const authApi = {
  login: (
    credentials: LoginCredentials
  ): Promise<
    AxiosResponse<{
      user: User
      accessToken: string
      refreshToken: string
    }>
  > => {
    return apiClient.post("/auth/login", credentials)
  },

  logout: (refreshToken: string): Promise<AxiosResponse<void>> => {
    return apiClient.post("/auth/logout", { refreshToken })
  },

  refresh: (
    refreshToken: string
  ): Promise<
    AxiosResponse<{
      accessToken: string
      refreshToken: string
    }>
  > => {
    return apiClient.post("/auth/refresh", { refreshToken })
  },

  getCurrentUser: (): Promise<AxiosResponse<User>> => {
    return apiClient.get("/auth/me")
  },

  updateProfile: (profileData: Partial<User>): Promise<AxiosResponse<User>> => {
    return apiClient.put("/auth/profile", profileData)
  },
}

export default apiClient
