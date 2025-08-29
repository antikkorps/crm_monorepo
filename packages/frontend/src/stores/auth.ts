import { authApi } from "@/services/api"
import type { User } from "@medical-crm/shared"
import { defineStore } from "pinia"
import { computed, ref } from "vue"

export interface LoginCredentials {
  email: string
  password: string
}

export interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  isLoading: boolean
  isInitialized: boolean
}

export const useAuthStore = defineStore("auth", () => {
  // State
  const user = ref<User | null>(null)
  const accessToken = ref<string | null>(null)
  const refreshToken = ref<string | null>(null)
  const isLoading = ref(false)
  const isInitialized = ref(false)

  // Getters
  const isAuthenticated = computed(() => !!user.value && !!accessToken.value)
  const userRole = computed(() => user.value?.role)
  const userName = computed(() =>
    user.value ? `${user.value.firstName} ${user.value.lastName}` : ""
  )
  const userAvatar = computed(() =>
    user.value
      ? `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.value.avatarSeed}`
      : ""
  )

  // Actions
  async function login(credentials: LoginCredentials) {
    try {
      isLoading.value = true
      const response = await authApi.login(credentials)

      // Store tokens and user data
      accessToken.value = response.data.accessToken
      refreshToken.value = response.data.refreshToken
      user.value = response.data.user

      // Store tokens in localStorage for persistence
      localStorage.setItem("accessToken", response.data.accessToken)
      localStorage.setItem("refreshToken", response.data.refreshToken)

      return response.data
    } catch (error) {
      console.error("Login failed:", error)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  async function logout() {
    try {
      isLoading.value = true

      // Call logout API if we have a refresh token
      if (refreshToken.value) {
        await authApi.logout(refreshToken.value)
      }
    } catch (error) {
      console.error("Logout API call failed:", error)
      // Continue with local logout even if API call fails
    } finally {
      // Clear local state
      user.value = null
      accessToken.value = null
      refreshToken.value = null

      // Clear localStorage
      localStorage.removeItem("accessToken")
      localStorage.removeItem("refreshToken")

      isLoading.value = false
    }
  }

  async function refreshAccessToken() {
    try {
      if (!refreshToken.value) {
        throw new Error("No refresh token available")
      }

      const response = await authApi.refresh(refreshToken.value)

      // Update tokens
      accessToken.value = response.data.accessToken
      refreshToken.value = response.data.refreshToken

      // Update localStorage
      localStorage.setItem("accessToken", response.data.accessToken)
      localStorage.setItem("refreshToken", response.data.refreshToken)

      return response.data.accessToken
    } catch (error) {
      console.error("Token refresh failed:", error)
      // Clear auth state on refresh failure
      await logout()
      throw error
    }
  }

  async function initializeAuth() {
    try {
      isLoading.value = true

      // Try to restore tokens from localStorage
      const storedAccessToken = localStorage.getItem("accessToken")
      const storedRefreshToken = localStorage.getItem("refreshToken")

      if (!storedAccessToken || !storedRefreshToken) {
        isInitialized.value = true
        return
      }

      // Set tokens
      accessToken.value = storedAccessToken
      refreshToken.value = storedRefreshToken

      // Try to get current user info
      try {
        const response = await authApi.getCurrentUser()
        user.value = response.data
      } catch (error) {
        // If getting user info fails, try to refresh token
        try {
          await refreshAccessToken()
          const response = await authApi.getCurrentUser()
          user.value = response.data
        } catch (refreshError) {
          // If refresh also fails, clear auth state
          await logout()
        }
      }
    } catch (error) {
      console.error("Auth initialization failed:", error)
      await logout()
    } finally {
      isLoading.value = false
      isInitialized.value = true
    }
  }

  async function updateProfile(profileData: Partial<User>) {
    try {
      isLoading.value = true
      const response = await authApi.updateProfile(profileData)
      user.value = response.data
      return response.data
    } catch (error) {
      console.error("Profile update failed:", error)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  return {
    // State
    user,
    accessToken,
    refreshToken,
    isLoading,
    isInitialized,

    // Getters
    isAuthenticated,
    userRole,
    userName,
    userAvatar,

    // Actions
    login,
    logout,
    refreshAccessToken,
    initializeAuth,
    updateProfile,
  }
})
