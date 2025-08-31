import { authApi, type LoginCredentials } from "@/services/api"
import type { User } from "@medical-crm/shared"
import { defineStore } from "pinia"

export const useAuthStore = defineStore("auth", {
  state: () => {
    const token = localStorage.getItem("token")
    console.log("Auth store initializing with token:", !!token)
    return {
      user: null as User | null,
      token: token,
      isAuthenticated: !!token,
    }
  },

  getters: {
    currentUser: (state) => state.user,
    isLoggedIn: (state) => state.isAuthenticated && !!state.token,
    userName: (state) =>
      state.user ? `${state.user.firstName} ${state.user.lastName}` : "User",
    userAvatar: (state) => state.user?.avatarSeed || undefined,
    userRole: (state) => state.user?.role,
    accessToken: (state) => {
      console.log("accessToken getter called, returning:", !!state.token)
      return state.token
    },
  },

  actions: {
    async login(credentials: LoginCredentials) {
      try {
        const response = await authApi.login(credentials)
        console.log("Login response:", {
          hasToken: !!response.data.accessToken,
          tokenPreview: response.data.accessToken ? response.data.accessToken.substring(0, 20) + '...' : 'undefined',
          hasUser: !!response.data.user,
          response: response
        })
        this.token = response.data.accessToken
        this.user = response.data.user
        console.log("Setting isAuthenticated = true in login")
        this.isAuthenticated = true
        if (response.data.accessToken) {
          localStorage.setItem("token", response.data.accessToken)
        }
        return response
      } catch (error) {
        this.logout()
        throw error
      }
    },

    async logout() {
      try {
        if (this.token) {
          await authApi.logout()
        }
      } catch (error) {
        console.error("Logout error:", error)
      } finally {
        this.user = null
        this.token = null
        this.isAuthenticated = false
        localStorage.removeItem("token")
      }
    },

    async fetchUser() {
      if (!this.token) return null

      try {
        const user = await authApi.getProfile()
        this.user = user
        console.log("Setting isAuthenticated = true in fetchUser")
        this.isAuthenticated = true
        return user
      } catch (error) {
        this.logout()
        throw error
      }
    },

    async updateProfile(data: Partial<User>) {
      if (!this.user) throw new Error("No user logged in")

      try {
        const updatedUser = await authApi.updateProfile(data)
        this.user = updatedUser
        return updatedUser
      } catch (error) {
        throw error
      }
    },

    async initializeAuth() {
      console.log("initializeAuth called - token:", !!this.token, "isAuthenticated:", this.isAuthenticated)
      if (this.token && !this.user) {
        try {
          await this.fetchUser()
        } catch (error) {
          console.log("initializeAuth failed, logging out:", error)
          this.logout()
        }
      }
    },
  },
})
